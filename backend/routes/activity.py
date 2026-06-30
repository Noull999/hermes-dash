"""GET /api/activity/stream — Server-Sent Events for real-time activity feed.

Emits events when:
- A cron job starts/finishes
- A repo syncs
- The gateway restarts
- Errors occur

Uses asyncio.Queue + sse-starlette EventSourceResponse.
"""

import asyncio
import json
import random
import time
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Request
from sse_starlette.sse import EventSourceResponse

router = APIRouter(tags=["activity"])

# ── Global event queue ──────────────────────────────────────────────────
_activity_queue: asyncio.Queue[dict] = asyncio.Queue(maxsize=200)
_event_id = 0


def push_event(event_type: str, message: str, project: Optional[str] = None) -> None:
    """Push an event into the global queue (call from anywhere)."""
    global _event_id
    _event_id += 1
    event = {
        "id": f"evt_{_event_id}",
        "type": event_type,
        "message": message,
        "project": project or "system",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    try:
        _activity_queue.put_nowait(event)
    except asyncio.QueueFull:
        # Drop oldest event if queue is full
        try:
            _activity_queue.get_nowait()
            _activity_queue.put_nowait(event)
        except asyncio.QueueFull:
            pass


# ── Simulated activity (for demo purposes) ──────────────────────────────
async def _simulate_activity():
    """Generate fake activity events every 30-90s for demo."""
    activities = [
        ("job", "Cron job completado: token-panel-compact", "hermes"),
        ("repo", "Repositorio sincronizado: hermes-dash", "hermes-dash"),
        ("job", "Backup diario ejecutado", "system"),
        ("info", "Gateway health check: OK", "hermes"),
        ("repo", "Pull completado: multi-agentes", "multi-agentes"),
    ]
    while True:
        await asyncio.sleep(random.randint(30, 90))
        event_type, message, project = random.choice(activities)
        push_event(event_type, message, project)


# Start simulator on module load
_sim_task: Optional[asyncio.Task] = None


def _start_simulator():
    global _sim_task
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            _sim_task = asyncio.create_task(_simulate_activity())
    except RuntimeError:
        pass


# ── SSE endpoint ────────────────────────────────────────────────────────
@router.get("/api/activity/stream")
async def activity_stream(request: Request):
    """SSE endpoint that streams activity events in real time."""

    async def event_generator():
        while True:
            # Check if client disconnected
            if await request.is_disconnected():
                break

            try:
                # Wait for next event with 30s timeout (heartbeat)
                event = await asyncio.wait_for(_activity_queue.get(), timeout=30)
                yield {"data": json.dumps(event)}
            except asyncio.TimeoutError:
                # Send heartbeat to keep connection alive
                yield {
                    "event": "heartbeat",
                    "data": json.dumps({"type": "heartbeat", "timestamp": datetime.now(timezone.utc).isoformat()}),
                }

    # Push initial event
    push_event("info", "Activity feed connected", "system")

    return EventSourceResponse(event_generator())


# Start simulator
_start_simulator()
