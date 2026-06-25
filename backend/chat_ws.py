"""WebSocket /api/chat — Bidirectional chat (echo placeholder)."""

import json
import asyncio
from datetime import datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["chat"])


@router.websocket("/api/chat")
async def chat_websocket(ws: WebSocket):
    """WebSocket endpoint for bidirectional chat with heartbeat."""
    await ws.accept()

    async def heartbeat():
        """Send a ping every 30 seconds."""
        while True:
            await asyncio.sleep(30)
            try:
                await ws.send_json({"type": "heartbeat", "timestamp": datetime.utcnow().isoformat()})
            except Exception:
                break

    # Start heartbeat task
    hb_task = asyncio.create_task(heartbeat())

    try:
        while True:
            data = await ws.receive_text()

            try:
                msg = json.loads(data)
            except json.JSONDecodeError:
                msg = {"content": data, "type": "message"}

            content = msg.get("content", "")
            msg_type = msg.get("type", "message")

            # Echo response (placeholder for Hermes gateway integration)
            response = {
                "type": "message",
                "content": f"🤖 Echo: {content}",
                "original_type": msg_type,
                "timestamp": datetime.utcnow().isoformat(),
            }

            await ws.send_json(response)

    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        hb_task.cancel()
        try:
            await hb_task
        except asyncio.CancelledError:
            pass
