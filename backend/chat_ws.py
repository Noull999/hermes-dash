"""WebSocket /api/chat — Bidirectional chat usando el LLM via gateway Hermes.

Soporta calendario: detecta intents como "agenda X" y crea eventos en Google Calendar.
"""

import json
import asyncio
import os
import sys
import re
from datetime import datetime, timezone, timedelta
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

# ── Calendar support ───────────────────────────────────────────────────
try:
    from google.auth.transport.requests import Request as GoogleRequest
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build
    _HAS_CALENDAR = True
except ImportError:
    _HAS_CALENDAR = False


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
_API_KEY = _env.get("API_SERVER_KEY") or os.environ.get("API_SERVER_KEY", "")
_BASE_URL = "http://localhost:8642/v1"
_MODEL = _env.get("OPENER_MODEL") or "deepseek-v4-flash"
_SYSTEM_PROMPT = ""  # El gateway usa su propio system prompt del agente Hermes

# ── Calendar intent detection patterns ──────────────────────────────────
_CALENDAR_PATTERNS = [
    r"\bagenda\b",
    r"\bprograma\b",
    r"\bcalendariza\b",
    r"\bpon(?:e|me|le|)\b.*\b(?:reunion|evento|cita|recordatorio)\b",
    r"\bagrega\b.*\b(?:al|el)\s+calendario\b",
    r"\bcrea\b.*\b(?:evento|reunion|cita)\b",
    r"\brecord(?:ar|atorio|ame)\b",
    r"\breunion\b.*\b(?:manana|hoy|proximo|proxima|el\s+\d)",
    r"\bquiero\b.*\b(?:agendar|programar)\b",
    r"\breserva\b",
    r"\bschedule\b",
    r"\bset\b.*\b(?:meeting|appointment|event)\b",
]

# Compiled patterns
_CALENDAR_RE = [re.compile(p, re.IGNORECASE) for p in _CALENDAR_PATTERNS]

# ── Calendar extraction prompt ──────────────────────────────────────────
_CALENDAR_EXTRACT_PROMPT = """Eres un extractor de eventos de calendario. Del mensaje del usuario, extrae:
- title: título del evento (obligatorio)
- start: fecha/hora de inicio en ISO 8601 con timezone America/Santiago (obligatorio)
- end: fecha/hora de término en ISO 8601 con timezone America/Santiago (obligatorio, default 1 hora después)
- description: descripción opcional
- location: ubicación opcional

Si no se especifica hora, asume las 10:00 AM Chile. Si no se especifica fecha, asume hoy.
Si no hay suficiente información, completa con defaults razonables basados en el contexto.

Responde SOLO con un JSON válido, nada más.
"""


def _is_calendar_intent(text: str) -> bool:
    """Detecta si el mensaje es una solicitud de agendar algo."""
    if not text or len(text) < 5:
        return False
    return any(p.search(text) for p in _CALENDAR_RE)


async def _parse_event_with_llm(text: str) -> dict | None:
    """Usa el LLM para extraer datos del evento del mensaje."""
    client = AsyncOpenAI(api_key=_API_KEY, base_url=_BASE_URL)
    try:
        resp = await client.chat.completions.create(
            model=_MODEL,
            messages=[
                {"role": "system", "content": _CALENDAR_EXTRACT_PROMPT},
                {"role": "user", "content": text},
            ],
            temperature=0.1,
            max_tokens=500,
        )
        raw = resp.choices[0].message.content or ""
        content = raw.strip()
        # Limpiar posible markdown code block
        if content.startswith("```"):
            content = content.split("\n", 1)[-1]
            content = content.rsplit("```", 1)[0]
        return json.loads(content.strip())
    except Exception as e:
        print(f"[chat_ws] Error parsing calendar intent: {e}")
        return None


def _get_calendar_service():
    """Obtiene el servicio de Google Calendar."""
    token_path = os.path.expanduser("~/.hermes/google_token.json")
    if not os.path.exists(token_path):
        return None
    try:
        creds = Credentials.from_authorized_user_file(token_path)
        if creds.expired and creds.refresh_token:
            creds.refresh(GoogleRequest())
            with open(token_path, "w") as f:
                f.write(creds.to_json())
        return build("calendar", "v3", credentials=creds)
    except Exception as e:
        print(f"[chat_ws] Calendar auth error: {e}")
        return None


async def _create_calendar_event(event_data: dict) -> str:
    """Crea un evento en Google Calendar y devuelve un mensaje de resultado."""
    if not _HAS_CALENDAR:
        return "⚠️ Google Calendar no está configurado en el backend."

    service = _get_calendar_service()
    if not service:
        return "⚠️ No pude autenticar con Google Calendar. Revisa el token."

    try:
        body = {
            "summary": event_data.get("title", "Evento"),
            "description": event_data.get("description", "Creado desde Hermes Dashboard"),
            "start": {"dateTime": event_data["start"], "timeZone": "America/Santiago"},
            "end": {"dateTime": event_data["end"], "timeZone": "America/Santiago"},
            "reminders": {
                "useDefault": False,
                "overrides": [
                    {"method": "popup", "minutes": 30},
                ],
            },
        }
        if event_data.get("location"):
            body["location"] = event_data["location"]

        created = service.events().insert(calendarId="primary", body=body).execute()

        link = created.get("htmlLink", "")
        summary = created.get("summary", "Evento")
        start_str = created.get("start", {}).get("dateTime", "")

        msg = (
            f"✅ **{summary}** agendado en Google Calendar\n"
            f"📅 {start_str}\n"
        )
        if link:
            msg += f"🔗 {link}"
        return msg

    except Exception as e:
        return f"⚠️ Error al crear el evento: {str(e)}"


# ── Cliente OpenAI (compartido) ─────────────────────────────────────────
_client = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        if not _API_KEY:
            raise RuntimeError("API_SERVER_KEY no configurada en .hermes/.env")
        _client = AsyncOpenAI(api_key=_API_KEY, base_url=_BASE_URL)
    return _client


# ── Historial por conexión (en prod usar Redis) ─────────────────────────
_histories: dict[str, list[dict]] = {}  # ws id -> messages
_history_lock = asyncio.Lock()


async def _get_history(session_id: str) -> list[dict]:
    async with _history_lock:
        if session_id not in _histories:
            # El gateway usa su propio system prompt del agente Hermes
            _histories[session_id] = []
        return _histories[session_id]


async def _add_to_history(session_id: str, msg: dict) -> None:
    async with _history_lock:
        _histories.setdefault(session_id, []).append(msg)


# ── Filtro de thinking para deepseek ────────────────────────────────
def _strip_thinking(text: str) -> str:
    """Elimina el proceso de razonamiento de deepseek-v4-flash."""
    if not text or len(text) < 80:
        return text

    # Buscar el ultimo saludo/pregunta en espanol
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
                max_tokens=4096,
            )

            full_content = ""
            chunk = None
            async for chunk in stream:
                delta = chunk.choices[0].delta if chunk.choices else None
                if delta is None:
                    continue
                content = delta.content or getattr(delta, "reasoning_content", None) or ""
                if content:
                    full_content += content
                    await ws.send_json({
                        "type": "chunk",
                        "content": content,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    })

            # Limpiar thinking del deepseek
            clean = _strip_thinking(full_content) if full_content else ""

            if clean != full_content and clean:
                await ws.send_json({
                    "type": "thinking_removed",
                    "content": clean,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })

            final_content = clean or full_content
            await ws.send_json({
                "type": "done",
                "content": final_content,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })

            history.append({"role": "assistant", "content": final_content})

            # Token tracking
            if _HAS_TRACKER:
                try:
                    last_usage = getattr(chunk, "usage", None) if chunk else None
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
                async with _history_lock:
                    _histories[session_id] = []
                await ws.send_json({
                    "type": "cleared",
                    "content": "🧹 Historial limpiado",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
                continue

            if not content:
                continue

            # ── Detectar intent de calendario ──────────────────────────
            if _is_calendar_intent(content):
                # Avisar que estamos procesando
                await ws.send_json({
                    "type": "chunk",
                    "content": "📅 Procesando solicitud de calendario...",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })

                event_data = await _parse_event_with_llm(content)

                if event_data and "title" in event_data and "start" in event_data:
                    result_msg = await _create_calendar_event(event_data)

                    await ws.send_json({
                        "type": "done",
                        "content": result_msg,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    })

                    # Guardar en historial
                    async with _history_lock:
                        _histories.setdefault(session_id, []).append(
                            {"role": "user", "content": content}
                        )
                        _histories[session_id].append(
                            {"role": "assistant", "content": result_msg}
                        )
                else:
                    # No se pudo parsear, cae al LLM normal
                    await llm_stream(session_id, content)
            else:
                # Llamar al LLM con streaming normal
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
        async with _history_lock:
            _histories.pop(session_id, None)
