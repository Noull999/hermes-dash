"""Google Calendar route for Hermes Dashboard."""
from fastapi import APIRouter, Depends, Query
from auth import verify_token
import os
from datetime import datetime, timedelta, timezone
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from pydantic import BaseModel
from typing import Optional

router = APIRouter(dependencies=[Depends(verify_token)])

CHILE_TZ = "America/Santiago"


class CreateEventRequest(BaseModel):
    summary: str
    description: Optional[str] = ""
    start: str  # ISO 8601
    end: str    # ISO 8601
    location: Optional[str] = ""


def get_calendar_service():
    token_path = os.path.expanduser("~/.hermes/google_token.json")
    creds = Credentials.from_authorized_user_file(token_path)
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        with open(token_path, "w") as f:
            f.write(creds.to_json())
    return build("calendar", "v3", credentials=creds)


@router.get("/api/calendar")
async def get_events(days: int = Query(7, ge=1, le=30)):
    """Fetch upcoming calendar events."""
    try:
        service = get_calendar_service()
        now = datetime.now(timezone.utc)
        end = (now + timedelta(days=days)).isoformat()

        events = service.events().list(
            calendarId="primary",
            timeMin=now.isoformat(),
            timeMax=end,
            singleEvents=True,
            orderBy="startTime",
        ).execute().get("items", [])

        result = []
        for ev in events:
            start = ev.get("start", {})
            is_all_day = "date" in start and "dateTime" not in start
            if is_all_day:
                # AllDay events come as "2026-06-27" — JS parses as UTC midnight
                # Force Chile timezone so frontend shows correct day
                raw_date = start.get("date", "")
                if raw_date:
                    start_str = raw_date + "T00:00:00-04:00"
                else:
                    start_str = ""
                end_raw = ev.get("end", {}).get("date", "")
                end_str = end_raw + "T23:59:59-04:00" if end_raw else ""
            else:
                start_str = start.get("dateTime", "")
                end_raw = ev.get("end", {}).get("dateTime", "")
                end_str = end_raw or ""

            reminders_raw = ev.get("reminders", {})
            overrides = reminders_raw.get("overrides", [])
            reminders = [
                {"method": r.get("method", ""), "minutes": r.get("minutes", 0)}
                for r in overrides
            ]
            result.append({
                "id": ev.get("id", ""),
                "title": ev.get("summary", "(Sin título)"),
                "description": ev.get("description", ""),
                "start": start_str,
                "end": end_str,
                "allDay": is_all_day,
                "location": ev.get("location", ""),
                "reminders": {
                    "useDefault": reminders_raw.get("useDefault", True),
                    "overrides": reminders,
                },
            })

        return {"events": result, "total": len(result)}
    except Exception as e:
        return {"events": [], "total": 0, "error": str(e)}


@router.post("/api/calendar")
async def create_event(req: CreateEventRequest):
    """Create a new calendar event."""
    try:
        service = get_calendar_service()
        event = {
            "summary": req.summary,
            "description": req.description or "",
            "start": {"dateTime": req.start, "timeZone": CHILE_TZ},
            "end": {"dateTime": req.end, "timeZone": CHILE_TZ},
            "reminders": {
                "useDefault": False,
                "overrides": [
                    {"method": "popup", "minutes": 30},
                    {"method": "email", "minutes": 60},
                ],
            },
        }
        if req.location:
            event["location"] = req.location

        created = service.events().insert(calendarId="primary", body=event).execute()

        return {
            "success": True,
            "event": {
                "id": created.get("id", ""),
                "title": created.get("summary", ""),
                "start": created.get("start", {}).get("dateTime", ""),
                "end": created.get("end", {}).get("dateTime", ""),
                "htmlLink": created.get("htmlLink", ""),
            },
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
