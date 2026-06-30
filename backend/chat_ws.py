"""WebSocket /api/chat — Conecta al agente Hermes via gateway API.

En vez de llamar al LLM directo (sin tools), usa el endpoint
POST /api/sessions/{session_id}/chat/stream del gateway Hermes,
que ejecuta el agente completo con tools, memoria y habilidades.
"""

import json
import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
import aiohttp

# ── Session persistence (dashboard) ──────────────────────────────
from routes.sessions import append_message, auto_title_session, _get_db

# ── Config ───────────────────────────────────────────────────────
_HERMES_ENV = Path.home() / ".hermes" / ".env"

def _load_env() -> dict:
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
_GATEWAY_URL = "http://localhost:8642"  # Hermes gateway API base

router = APIRouter(tags=["chat"])

# ── Hermes session mapping ───────────────────────────────────────
# Maps dashboard session_id -> hermes gateway session_id
_hermes_sessions: dict[str, str] = {}
_session_lock = asyncio.Lock()

async def _get_or_create_hermes_session(dashboard_session_id: str) -> str:
    """Get existing Hermes session or create a new one for this dashboard session."""
    async with _session_lock:
        cached = _hermes_sessions.get(dashboard_session_id)
        if cached:
            return cached

        headers = {"Authorization": f"Bearer {_API_KEY}"}
        async with aiohttp.ClientSession(headers=headers) as session:
            # Create a new Hermes session
            import uuid
            session_title = f"Dash {dashboard_session_id[:8]} {uuid.uuid4().hex[:6]}"
            async with session.post(
                f"{_GATEWAY_URL}/api/sessions",
                json={"title": session_title}
            ) as resp:
                if resp.status not in (200, 201):
                    text = await resp.text()
                    raise RuntimeError(f"Error creating Hermes session: {resp.status} {text}")
                data = await resp.json()
                hermes_session_id = data.get("id", "")
                if not hermes_session_id:
                    raise RuntimeError("No session id in Hermes response")
                _hermes_sessions[dashboard_session_id] = hermes_session_id
                return hermes_session_id

async def _delete_hermes_session(dashboard_session_id: str) -> None:
    """Clean up Hermes session when dashboard session is deleted."""
    async with _session_lock:
        hermes_id = _hermes_sessions.pop(dashboard_session_id, None)
    if hermes_id:
        headers = {"Authorization": f"Bearer {_API_KEY}"}
        try:
            async with aiohttp.ClientSession(headers=headers) as session:
                await session.delete(f"{_GATEWAY_URL}/api/sessions/{hermes_id}")
        except Exception:
            pass  # Best effort cleanup

# ── Push notification helper ─────────────────────────────────────
async def _send_chat_push(session_id: str, preview: str):
    try:
        from routes.push import _load_subs, _send_push
        subs = _load_subs()
        if not subs:
            return
        title = "💬 Hermes respondió"
        body = (preview or "")[:120]
        if len(preview or "") > 120:
            body += "…"
        for sub in subs:
            await asyncio.to_thread(
                _send_push, sub,
                {"title": title, "body": body, "icon": "/icon-192.png",
                 "tag": f"hermes-chat-{session_id}", "data": {"url": "/"}}
            )
    except Exception:
        pass

# ── Token tracker ────────────────────────────────────────────────
_SCRIPTS_DIR = Path.home() / ".hermes" / "scripts"
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))
try:
    from token_tracker import log_usage as _log_usage
    _HAS_TRACKER = True
except ImportError:
    _HAS_TRACKER = False

# ── WebSocket endpoint ───────────────────────────────────────────

@router.websocket("/api/chat")
async def chat_websocket(ws: WebSocket, session_id: str = Query("")):
    await ws.accept()

    # ── Session resolution ──────────────────────────────────────
    created_new_session = False
    if not session_id:
        now = datetime.now(timezone.utc).isoformat()
        session_id = str(uuid.uuid4())
        created_new_session = True
        db = _get_db()
        try:
            db.execute(
                "INSERT INTO sessions (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
                (session_id, "Nueva conversación", now, now),
            )
            db.commit()
        finally:
            db.close()
    else:
        db = _get_db()
        try:
            exists = db.execute("SELECT 1 FROM sessions WHERE id = ?", (session_id,)).fetchone()
            if not exists:
                now = datetime.now(timezone.utc).isoformat()
                db.execute(
                    "INSERT INTO sessions (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
                    (session_id, "Nueva conversación", now, now),
                )
                db.commit()
        finally:
            db.close()

    # Get or create Hermes gateway session
    try:
        hermes_session_id = await _get_or_create_hermes_session(session_id)
    except Exception as e:
        await ws.send_json({
            "type": "error",
            "content": f"⚠️ Error conectando al agente Hermes: {str(e)}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        await ws.close()
        return

    # Notify client of session_id
    if created_new_session:
        await ws.send_json({
            "type": "session_created",
            "session_id": session_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    hb_task: asyncio.Task | None = None

    async def heartbeat():
        while True:
            await asyncio.sleep(30)
            try:
                await ws.send_json({
                    "type": "heartbeat",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })
            except Exception:
                break

    async def stream_to_hermes(user_msg: str, history: list[dict]):
        """Send user message to Hermes gateway session chat and stream response back."""
        headers = {"Authorization": f"Bearer {_API_KEY}"}
        body = {"message": user_msg}

        try:
            async with aiohttp.ClientSession(headers=headers) as http_session:
                async with http_session.post(
                    f"{_GATEWAY_URL}/api/sessions/{hermes_session_id}/chat/stream",
                    json=body,
                ) as resp:
                    if resp.status != 200:
                        error_text = await resp.text()
                        await ws.send_json({
                            "type": "error",
                            "content": f"⚠️ Error del gateway: HTTP {resp.status}",
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                        })
                        return

                    full_content = ""
                    tool_active = False

                    # Process SSE stream
                    async for line in resp.content:
                        decoded = line.decode("utf-8", errors="replace").strip()
                        if not decoded:
                            continue
                        if decoded.startswith(":"):
                            continue  # comment/keepalive

                        if decoded.startswith("event: "):
                            event_type = decoded[7:].strip()
                            # Next line should be data:
                            continue

                        if decoded.startswith("data: "):
                            data_str = decoded[6:].strip()
                            try:
                                data = json.loads(data_str)
                            except json.JSONDecodeError:
                                continue

                            event_type_local = getattr(line, "_event_type", None)

                            # We need the event name from the previous line
                            # Re-parse since SSE lines come as separate reads
                            continue

                    # Can't easily parse SSE with async for line because
                    # event and data are on separate lines.
                    # Let me use a different approach.
        except Exception as e:
            await ws.send_json({
                "type": "error",
                "content": f"⚠️ Error de conexión con el gateway: {str(e)}",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })

    # ── Start heartbeat ──
    hb_task = asyncio.create_task(heartbeat())

    # ── Message loop ──
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
                # Clear dashboard session history
                db = _get_db()
                try:
                    db.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
                    db.commit()
                finally:
                    db.close()
                await ws.send_json({
                    "type": "cleared",
                    "content": "🧹 Historial limpiado",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
                continue

            if not content:
                continue

            # Save user message to dashboard DB
            append_message(session_id, "user", content)

            # Auto-title on first user message
            db = _get_db()
            try:
                count = db.execute(
                    "SELECT COUNT(*) as c FROM messages WHERE session_id = ? AND role = 'user'",
                    (session_id,)
                ).fetchone()["c"]
            finally:
                db.close()
            if count == 1:
                try:
                    auto_title_session(session_id)
                except Exception:
                    pass

            # Auto-title on first user message (using dashboard history)
            try:
                db2 = _get_db()
                msg_count = db2.execute(
                    "SELECT COUNT(*) as c FROM messages WHERE session_id = ? AND role = 'user'",
                    (session_id,)
                ).fetchone()["c"]
                db2.close()
                if msg_count == 1:
                    auto_title_session(session_id)
            except Exception:
                pass

            # Call Hermes gateway and stream response
            await _stream_hermes_chat(ws, hermes_session_id, content, session_id)

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


async def _stream_hermes_chat(
    ws: WebSocket,
    hermes_session_id: str,
    user_message: str,
    dashboard_session_id: str,
) -> None:
    """Send message to Hermes gateway session chat stream and forward SSE events to WebSocket."""
    headers = {"Authorization": f"Bearer {_API_KEY}"}
    body = {"message": user_message}

    try:
        async with aiohttp.ClientSession(headers=headers) as http_session:
            async with http_session.post(
                f"{_GATEWAY_URL}/api/sessions/{hermes_session_id}/chat/stream",
                json=body,
            ) as resp:
                if resp.status != 200:
                    try:
                        error_text = await resp.text()
                    except Exception:
                        error_text = ""
                    await ws.send_json({
                        "type": "error",
                        "content": f"⚠️ Error del gateway: HTTP {resp.status} {error_text[:200]}",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    })
                    return

                full_content = ""
                buf = ""

                # Read SSE stream byte by byte / line by line
                # Each SSE event looks like:
                # event: assistant.delta\n
                # data: {...}\n\n
                async for raw_line in resp.content:
                    line = raw_line.decode("utf-8", errors="replace").strip()
                    if not line:
                        continue
                    if line.startswith(":"):
                        continue  # comment / keepalive

                    if line.startswith("event: "):
                        # Store event type for the next data line
                        buf = line[7:].strip()
                        continue

                    if line.startswith("data: "):
                        data_str = line[6:].strip()
                        event_type = buf
                        buf = ""

                        try:
                            data = json.loads(data_str)
                        except json.JSONDecodeError:
                            continue

                        now_ts = datetime.now(timezone.utc).isoformat()

                        if event_type == "assistant.delta":
                            delta = data.get("delta", "")
                            if delta:
                                full_content += delta
                                await ws.send_json({
                                    "type": "chunk",
                                    "content": delta,
                                    "timestamp": now_ts,
                                })

                        elif event_type == "tool.progress":
                            preview = data.get("delta", data.get("preview", ""))
                            if preview:
                                await ws.send_json({
                                    "type": "chunk",
                                    "content": preview,
                                    "timestamp": now_ts,
                                })

                        elif event_type == "tool.started":
                            tool_name = data.get("tool_name", "")
                            preview = data.get("preview", "")
                            msg = f"🔧 Usando {tool_name}..."
                            if preview:
                                msg += f" ({preview})"
                            await ws.send_json({
                                "type": "chunk",
                                "content": msg,
                                "timestamp": now_ts,
                            })

                        elif event_type == "tool.completed":
                            tool_name = data.get("tool_name", "")
                            preview = data.get("preview", "")
                            msg = f"✅ {tool_name} completado"
                            if preview:
                                msg += f" — {preview}"
                            await ws.send_json({
                                "type": "chunk",
                                "content": msg,
                                "timestamp": now_ts,
                            })

                        elif event_type == "tool.failed":
                            tool_name = data.get("tool_name", "")
                            error_msg = data.get("error", "")
                            msg = f"❌ {tool_name} falló: {error_msg}"
                            await ws.send_json({
                                "type": "chunk",
                                "content": msg,
                                "timestamp": now_ts,
                            })

                        elif event_type == "assistant.completed":
                            final = data.get("content", full_content)
                            if final and final != full_content:
                                # Send any remaining delta
                                remaining = final[len(full_content):]
                                if remaining:
                                    await ws.send_json({
                                        "type": "chunk",
                                        "content": remaining,
                                        "timestamp": now_ts,
                                    })
                                    full_content = final
                            await ws.send_json({
                                "type": "done",
                                "content": final or full_content,
                                "timestamp": now_ts,
                            })

                        elif event_type == "run.completed":
                            # Save assistant message to dashboard DB + send push
                            final_msg = full_content
                            if final_msg:
                                try:
                                    append_message(dashboard_session_id, "assistant", final_msg)
                                except Exception:
                                    pass
                                await _send_chat_push(dashboard_session_id, final_msg)

                            # Track tokens if available
                            usage = data.get("usage")
                            if usage and _HAS_TRACKER:
                                try:
                                    _log_usage(
                                        model="hermes-agent",
                                        prompt_tokens=usage.get("prompt_tokens", 0),
                                        completion_tokens=usage.get("completion_tokens", 0),
                                        total_tokens=usage.get("total_tokens", 0),
                                        cached_tokens=usage.get("cached_tokens", 0),
                                        project="hermes-dash",
                                        category="chat-ws",
                                    )
                                except Exception:
                                    pass

                        elif event_type == "error":
                            error_msg = data.get("message", "Error desconocido del gateway")
                            await ws.send_json({
                                "type": "error",
                                "content": f"⚠️ {error_msg}",
                                "timestamp": now_ts,
                            })

                        # Ignore: run.started, message.started, done

    except aiohttp.ClientError as e:
        await ws.send_json({
            "type": "error",
            "content": f"⚠️ No se pudo conectar con el agente Hermes: {str(e)}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
    except Exception as e:
        await ws.send_json({
            "type": "error",
            "content": f"⚠️ Error inesperado: {str(e)}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
