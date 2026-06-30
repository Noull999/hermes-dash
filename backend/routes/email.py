"""Gmail inbox route for Hermes Dashboard — con clasificación de relevancia."""

import asyncio
import json
import os
import re
import time
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from auth import verify_token
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import aiohttp

router = APIRouter(dependencies=[Depends(verify_token)])

# ── Caché de clasificación (por id de email) ─────────────────────────
_classification_cache: dict[str, dict] = {}
_CACHE_TTL = 600  # 10 min

# ── Patrones de spam/newsletter (regex) ──────────────────────────────
_SPAM_SENDERS = re.compile(
    r"(noreply|no-reply|notifications?|newsletter|mailer|mailbot|digest|"
    r"automated|updates?@|news@|marketing@|info@|team@|support@|"
    r"weekly|monthly|alerts?)",
    re.IGNORECASE,
)
_SPAM_SUBJECTS = re.compile(
    r"(newsletter|oferta|descuento|promoción|sale|spam|"
    r"you won|you're a winner|congratulations|act now|limited time|"
    r"no inviertas|invierte ahora|gana dinero|trading|"
    r"unsubscribe|click here|free|gratis)",
    re.IGNORECASE,
)
_URGENT_KEYWORDS = re.compile(
    r"(urgencia|urge|urgente|deadline|vencimient|"
    r"factura|pendiente|pago|pagar|deuda|"
    r"asap|critical|important|action required|"
    r"reunion|reunión|entrevista|entregable|"
    r"problema|error|falla|caído|caida|"
    r"cliente|proyecto|cambio|cancelación)",
    re.IGNORECASE,
)
_IMPORTANT_SENDERS = re.compile(
    r"(inacap|github|gitlab|vercel|asenci|jose|"
    r"cliente|client|upwork|freelancer|"
    r"banco|bank|seguro|firma|sign)",
    re.IGNORECASE,
)

_HERMES_GATEWAY = "http://localhost:8642"
_API_KEY: str = ""


def _load_api_key():
    global _API_KEY
    if _API_KEY:
        return _API_KEY
    from pathlib import Path

    env_path = Path.home() / ".hermes" / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line.startswith("API_SERVER_KEY="):
                _API_KEY = line.split("=", 1)[1].strip().strip("\"'")
                return _API_KEY
    _API_KEY = os.environ.get("API_SERVER_KEY", "")
    return _API_KEY


def get_gmail_service():
    token_path = os.path.expanduser("~/.hermes/google_token.json")
    creds = Credentials.from_authorized_user_file(token_path)
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        with open(token_path, "w") as f:
            f.write(creds.to_json())
    return build("gmail", "v1", credentials=creds)


def _classify_email(email: dict) -> str:
    """Clasifica un email en: urgent, important, normal, spam.

    Usa reglas primero (rápido), solo llama a Hermes si está dudoso.
    """
    subject = email.get("subject", "")
    sender = email.get("from", "")
    labels = email.get("labelIds", [])

    # Spam / Promociones por label de Gmail
    gmail_categories = {l for l in labels if l.startswith("CATEGORY_")}
    if "CATEGORY_PROMOTIONS" in gmail_categories:
        return "spam"
    if "CATEGORY_SOCIAL" in gmail_categories:
        return "normal"
    if "CATEGORY_FORUMS" in gmail_categories:
        return "normal"

    # Spam por patrones
    if _SPAM_SENDERS.search(sender) or _SPAM_SUBJECTS.search(subject):
        return "spam"

    # Urgente
    if _URGENT_KEYWORDS.search(subject):
        return "urgent"
    if _URGENT_KEYWORDS.search(sender):
        return "urgent"

    # Importante por sender
    if _IMPORTANT_SENDERS.search(sender):
        return "important"

    # Por defecto es normal
    return "normal"


_RELEVANCE_LABELS = {
    "urgent": "🔴",
    "important": "🟡",
    "normal": "⚪",
    "spam": "⚫",
}


@router.get("/api/email")
async def get_emails(
    q: str = Query("in:inbox"),
    max_results: int = Query(20, alias="max_results"),
    relevant_only: bool = Query(False),
):
    """Fetch Gmail inbox emails con clasificación de relevancia."""
    try:
        service = get_gmail_service()

        # Si solo relevantes, traemos más pa' filtrar
        fetch_count = max(max_results, 30)
        messages = (
            service.users()
            .messages()
            .list(userId="me", q=q, maxResults=fetch_count)
            .execute()
            .get("messages", [])
        )

        now = time.time()
        emails = []
        for msg in messages:
            # Cache hit?
            cached = _classification_cache.get(msg["id"])
            if cached and (now - cached["ts"]) < _CACHE_TTL:
                emails.append(cached["email"])
                continue

            meta = (
                service.users()
                .messages()
                .get(
                    userId="me",
                    id=msg["id"],
                    format="metadata",
                    metadataHeaders=["From", "Subject", "Date"],
                )
                .execute()
            )
            headers = {h["name"]: h["value"] for h in meta["payload"]["headers"]}
            email = {
                "id": msg["id"],
                "from": headers.get("From", ""),
                "subject": headers.get("Subject", "(Sin asunto)"),
                "date": headers.get("Date", ""),
                "snippet": meta.get("snippet", ""),
                "labelIds": meta.get("labelIds", []),
                "relevance": _classify_email(
                    {
                        "subject": headers.get("Subject", ""),
                        "from": headers.get("From", ""),
                        "labelIds": meta.get("labelIds", []),
                    }
                ),
            }
            _classification_cache[msg["id"]] = {"email": email, "ts": now}
            emails.append(email)

        # Limpiar caché vieja
        stale = [k for k, v in _classification_cache.items() if (now - v["ts"]) > _CACHE_TTL]
        for k in stale:
            del _classification_cache[k]

        # Filtrar solo relevantes si se pide
        if relevant_only:
            emails = [e for e in emails if e["relevance"] in ("urgent", "important")]

        # Ordenar: urgentes primero, luego importantes, luego resto
        priority = {"urgent": 0, "important": 1, "normal": 2, "spam": 3}
        emails.sort(key=lambda e: (priority.get(e.get("relevance", "normal"), 99), e.get("date", "")))

        # Estadísticas
        stats = {"urgent": 0, "important": 0, "normal": 0, "spam": 0}
        for e in emails:
            r = e.get("relevance", "normal")
            stats[r] = stats.get(r, 0) + 1

        return {
            "emails": emails,
            "total": len(emails),
            "stats": stats,
            "filtered": relevant_only,
        }
    except Exception as e:
        return {"emails": [], "total": 0, "error": str(e), "stats": {}}
