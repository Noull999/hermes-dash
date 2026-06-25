"""GET/POST/DELETE /api/reminders — Reminder CRUD."""

import json
from pathlib import Path
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import verify_token

router = APIRouter(tags=["reminders"])

REMINDERS_FILE = Path.home() / ".hermes" / "reminders.json"


def _load_reminders() -> list[dict]:
    """Load reminders from JSON file."""
    if not REMINDERS_FILE.exists():
        return []
    try:
        data = json.loads(REMINDERS_FILE.read_text(encoding="utf-8"))
        if isinstance(data, list):
            return data
        return []
    except (json.JSONDecodeError, Exception):
        return []


def _save_reminders(reminders: list[dict]) -> None:
    """Save reminders to JSON file."""
    REMINDERS_FILE.parent.mkdir(parents=True, exist_ok=True)
    REMINDERS_FILE.write_text(json.dumps(reminders, indent=2, ensure_ascii=False), encoding="utf-8")


class ReminderCreateRequest(BaseModel):
    text: str
    datetime: str  # ISO format datetime string
    project: str | None = None


class ReminderDeleteRequest(BaseModel):
    id: str | int


@router.get("/api/reminders")
def list_reminders(_token: str = Depends(verify_token)):
    """List all reminders."""
    reminders = _load_reminders()
    # Enrich with status
    now = datetime.utcnow().isoformat()
    for r in reminders:
        if "completed" not in r:
            r["completed"] = False
        if r.get("datetime", "") < now and not r["completed"]:
            r["overdue"] = True
        else:
            r["overdue"] = False
    return reminders


@router.post("/api/reminders")
def create_reminder(req: ReminderCreateRequest, _token: str = Depends(verify_token)):
    """Create a new reminder."""
    reminders = _load_reminders()

    new_id = 1
    if reminders:
        new_id = max(r.get("id", 0) for r in reminders) + 1

    reminder = {
        "id": new_id,
        "text": req.text,
        "datetime": req.datetime,
        "project": req.project or "general",
        "completed": False,
        "created": datetime.utcnow().isoformat(),
    }

    reminders.append(reminder)
    _save_reminders(reminders)

    return {"success": True, "reminder": reminder}


@router.delete("/api/reminders")
def delete_reminder(req: ReminderDeleteRequest, _token: str = Depends(verify_token)):
    """Delete a reminder by id."""
    reminders = _load_reminders()

    # Try string or int id
    raw_id = req.id
    if isinstance(raw_id, str):
        try:
            raw_id = int(raw_id)
        except ValueError:
            pass

    found = None
    for i, r in enumerate(reminders):
        if r.get("id") == raw_id:
            found = i
            break

    if found is None:
        raise HTTPException(status_code=404, detail=f"Reminder with id '{req.id}' not found")

    deleted = reminders.pop(found)
    _save_reminders(reminders)

    return {"success": True, "deleted": deleted}
