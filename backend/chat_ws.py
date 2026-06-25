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
_SYSTEM_PROMPT = (
    "Eres Hermes, el asistente personal de José. Tu personalidad:\n"
    "- Hablas español chileno, directo y sin vueltas\n"
    "- Usas expresiones como 'po', 'wn', 'altiro', 'pulento', 'cachai'\n"
    "- Eres energético y cercano, como un amigo que le sabe al código\n"
    "- Puedes usar emojis ocasionalmente (🔥, 🤘, 👀, ✅)\n"
    "- Sabes que José programa en TS/Next/React/Python, estudia en INACAP\n"
    "- Responde siempre directo, sin análisis ni pasos intermedios\n"
    "- No explicas tu proceso, solo das la respuesta final"
)

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


# ── Filtro de thinking para deepseek ────────────────────────────────
# deepseek-v4-flash en opencode mete todo el razonamiento en
# reasoning_content. Esta funcion extrae solo la respuesta final.


def _strip_thinking(text: str) -> str:
    """Elimina el proceso de razonamiento de deepseek-v4-flash."""
    if not text or len(text) < 80:
        return text

    # Estrategia: buscar el ultimo saludo/pregunta en espanol, desde ahi es respuesta
    import re
    greeting = re.compile(
        r"(¡?[Hh]ola|¿Qué tal|¿Cómo|"
        r"¡?[Bb]uenos días|¡?[Bb]uenas|"
        r"Hey|Qué hay|¿En qué|Dime|Cuéntame|"
        r"Bueno|Mira|Oye|Oiga)"
    )
    matches = list(greeting.finditer(text))
    if matches:
        last = matches[-1]
        start = last.start()
        after = text[start:].strip()
        if len(after) > 3:
            return after

    # Fallback: tomar la ultima linea que no parece pensamiento
    thinking_phrases = [
        "el usuario", "debo", "necesito", "la instruccion",
        "i think", "i should", "i need", "just thinking",
        "let me", "the user", "the person", "asimismo",
        "asi que", "por ejemplo", "vamos:", "quizas",
        "output debe ser", "i'll answer",
    ]
    lines = [l.strip() for l in text.replace("\r", "").split("\n") if l.strip()]
    for i in range(len(lines) - 1, -1, -1):
        line = lines[i]
        if not line:
            continue
        line_lower = line.lower()
        is_thinking = any(p in line_lower for p in thinking_phrases)
        if not is_thinking and len(line) > 3:
            return "\n".join(lines[i:])

    return text


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

            # ── Limpiar thinking del deepseek ────────────────────────
            clean = _strip_thinking(full_content) if full_content else ""

            # Si el thinking filtrado dio un resultado distinto, avisar al frontend
            if clean != full_content and clean:
                # Enviar version limpia como actualizacion
                await ws.send_json({
                    "type": "thinking_removed",
                    "content": clean,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })

            # Enviar finish señal con contenido limpio
            final_content = clean or full_content
            await ws.send_json({
                "type": "done",
                "content": final_content,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })

            # Guardar en historial (la version limpia)
            history.append({"role": "assistant", "content": final_content})

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
