"""WebSocket /api/chat — Bidirectional chat usando el LLM via OpenCode Go."""

import json
import asyncio
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from openai import AsyncOpenAI

# ── Token tracker ───────────────────────────────────────────────────
_SCRIPTS_DIR = Path.home() / ".hermes" / "scripts"
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))
try:
    from token_tracker import log_usage as _log_usage
    _HAS_TRACKER = True
except ImportError:
    _HAS_TRACKER = False

router = APIRouter(tags=["chat"])

# ── Config desde .hermes/.env ──────────────────────────────────────────
_HERMES_ENV = Path.home() / ".hermes" / ".env"


def _load_env() -> dict:
    """Lee OPENCODE_GO_API_KEY y OPENER_BASE_URL del .hermes/.env."""
    env = {}
    if _HERMES_ENV.exists():
        for line in _HERMES_ENV.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            env[key.strip()] = val.strip().strip("\"'")
    return env


_env = _load_env()
_API_KEY = _env.get("OPENCODE_GO_API_KEY") or os.environ.get("OPENCODE_GO_API_KEY", "")
_BASE_URL = _env.get("OPENER_BASE_URL") or "https://opencode.ai/zen/go/v1"
_MODEL = _env.get("OPENER_MODEL") or "deepseek-v4-flash"  # default del usuario
_SYSTEM_PROMPT = "Eres Hermes, el asistente personal de José. Responde en español, directo y cercano."

# ── Cliente OpenAI (compartido) ─────────────────────────────────────────
_client = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        if not _API_KEY:
            raise RuntimeError("OPENCODE_GO_API_KEY no configurada en .hermes/.env")
        _client = AsyncOpenAI(api_key=_API_KEY, base_url=_BASE_URL)
    return _client


# ── Historial por conexión (en prod usar Redis) ─────────────────────────
_histories: dict[str, list[dict]] = {}  # ws id -> messages
_history_lock = asyncio.Lock()


async def _get_history(session_id: str) -> list[dict]:
    async with _history_lock:
        if session_id not in _histories:
            _histories[session_id] = [
                {"role": "system", "content": _SYSTEM_PROMPT}
            ]
        return _histories[session_id]


async def _add_to_history(session_id: str, msg: dict) -> None:
    async with _history_lock:
        _histories.setdefault(session_id, []).append(msg)


# ── WebSocket endpoint ──────────────────────────────────────────────────

@router.websocket("/api/chat")
async def chat_websocket(ws: WebSocket):
    await ws.accept()

    session_id = f"ws_{id(ws)}"
    hb_task: asyncio.Task | None = None

    async def heartbeat():
        while True:
            await asyncio.sleep(30)
            try:
                await ws.send_json({"type": "heartbeat", "timestamp": datetime.now(timezone.utc).isoformat()})
            except Exception:
                break

    async def llm_stream(session_id: str, user_msg: str):
        """Envía mensaje al LLM y stremea la respuesta por WebSocket."""
        client = _get_client()
        history = await _get_history(session_id)

        history.append({"role": "user", "content": user_msg})

        try:
            stream = await client.chat.completions.create(
                model=_MODEL,
                messages=history,
                stream=True,
                temperature=0.7,
                max_tokens=2048,
            )

            full_content = ""
            chunk = None
            async for chunk in stream:
                delta = chunk.choices[0].delta if chunk.choices else None
                if delta is None:
                    continue
                # deepseek-v4-flash en opencode devuelve contenido en reasoning_content
                content = delta.content or getattr(delta, "reasoning_content", None) or ""
                if content:
                    full_content += content
                    await ws.send_json({
                        "type": "chunk",
                        "content": content,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    })

            # Enviar finish señal
            await ws.send_json({
                "type": "done",
                "content": full_content,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })

            # Guardar en historial
            history.append({"role": "assistant", "content": full_content})

            # ── Token tracking ───────────────────────────────────────
            if _HAS_TRACKER:
                try:
                    # Algunos providers (OpenAI) mandan usage en el último chunk
                    last_usage = getattr(chunk, "usage", None) if chunk else None
                    # Si no vino en el stream, estimamos ~4.5 chars/token
                    prompt_text = " ".join(
                        m.get("content", "") or ""
                        for m in history[:-1]
                        if isinstance(m.get("content"), str)
                    )
                    estimated_prompt = len(prompt_text) // 4
                    estimated_completion = len(full_content) // 4

                    _log_usage(
                        model=_MODEL,
                        prompt_tokens=getattr(last_usage, "prompt_tokens", 0) or estimated_prompt,
                        completion_tokens=getattr(last_usage, "completion_tokens", 0) or estimated_completion,
                        total_tokens=getattr(last_usage, "total_tokens", 0) or (estimated_prompt + estimated_completion),
                        cached_tokens=0,
                        project="hermes-dash",
                        category="chat-ws",
                    )
                except Exception:
                    pass

        except Exception as e:
            error_msg = f"⚠️ Error al contactar al LLM: {str(e)}"
            await ws.send_json({
                "type": "error",
                "content": error_msg,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
            history.append({"role": "assistant", "content": error_msg})

    # ── Iniciar heartbeat ──────────────────────────────────────────────
    hb_task = asyncio.create_task(heartbeat())

    try:
        while True:
            data = await ws.receive_text()

            try:
                msg = json.loads(data)
            except json.JSONDecodeError:
                msg = {"content": data, "type": "message"}

            content = msg.get("content", "").strip()
            msg_type = msg.get("type", "message")

            if msg_type == "clear":
                # Resetear historial
                async with _history_lock:
                    _histories[session_id] = [
                        {"role": "system", "content": _SYSTEM_PROMPT}
                    ]
                await ws.send_json({
                    "type": "cleared",
                    "content": "🧹 Historial limpiado",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
                continue

            if not content:
                continue

            # Llamar al LLM con streaming
            await llm_stream(session_id, content)

    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        if hb_task:
            hb_task.cancel()
            try:
                await hb_task
            except asyncio.CancelledError:
                pass
        # Limpiar historial después de un tiempo
        async with _history_lock:
            _histories.pop(session_id, None)
