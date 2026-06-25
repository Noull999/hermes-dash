"""Gmail inbox route for Hermes Dashboard."""
from fastapi import APIRouter, Depends
from auth import verify_token
import os, json
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

router = APIRouter(dependencies=[Depends(verify_token)])

def get_gmail_service():
    token_path = os.path.expanduser("~/.hermes/google_token.json")
    creds = Credentials.from_authorized_user_file(token_path)
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        with open(token_path, "w") as f:
            f.write(creds.to_json())
    return build("gmail", "v1", credentials=creds)


@router.get("/api/email")
async def get_emails(q: str = "in:inbox", max_results: int = 10):
    """Fetch recent emails from Gmail inbox."""
    try:
        service = get_gmail_service()
        messages = service.users().messages().list(
            userId="me", q=q, maxResults=max_results
        ).execute().get("messages", [])

        emails = []
        for msg in messages:
            meta = service.users().messages().get(
                userId="me", id=msg["id"], format="metadata",
                metadataHeaders=["From", "Subject", "Date"]
            ).execute()
            headers = {h["name"]: h["value"] for h in meta["payload"]["headers"]}
            emails.append({
                "id": msg["id"],
                "from": headers.get("From", ""),
                "subject": headers.get("Subject", "(Sin asunto)"),
                "date": headers.get("Date", ""),
                "snippet": meta.get("snippet", ""),
                "labelIds": meta.get("labelIds", []),
            })

        return {"emails": emails, "total": len(emails)}
    except Exception as e:
        return {"emails": [], "total": 0, "error": str(e)}
