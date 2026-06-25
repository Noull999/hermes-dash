"""Google Calendar route for Hermes Dashboard."""
from fastapi import APIRouter, Depends, Query
from auth import verify_token
import os
from datetime import datetime, timedelta, timezone
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

router = APIRouter(dependencies=[Depends(verify_token)])

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
            result.append({
                "id": ev.get("id", ""),
                "title": ev.get("summary", "(Sin título)"),
                "description": ev.get("description", ""),
                "start": start.get("dateTime", start.get("date", "")),
                "end": ev.get("end", {}).get("dateTime", ev.get("end", {}).get("date", "")),
                "allDay": "date" in start and "dateTime" not in start,
                "location": ev.get("location", ""),
            })

        return {"events": result, "total": len(result)}
    except Exception as e:
        return {"events": [], "total": 0, "error": str(e)}
