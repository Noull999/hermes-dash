"""Push notification routes — envía notificaciones push al navegador vía Web Push API."""

import json
import os
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from auth import verify_token

from pywebpush import webpush, WebPushException

router = APIRouter(dependencies=[Depends(verify_token)])

SUBS_FILE = Path(os.path.expanduser("~/.hermes/push_subscriptions.json"))

# VAPID keys desde .hermes/.env
VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "")
VAPID_CLAIMS = os.environ.get("VAPID_CLAIMS", "mailto:joseestebanasencio@gmail.com")


class Subscription(BaseModel):
    endpoint: str
    keys: dict
    platform: str = "web"


class NotifyRequest(BaseModel):
    title: str = "Hermes"
    body: str = ""
    icon: str = "/icon-192.png"
    tag: str = "hermes"
    url: str = "/"


def _load_subs() -> list:
    if SUBS_FILE.exists():
        try:
            with open(SUBS_FILE) as f:
                return json.load(f)
        except Exception:
            return []
    return []


def _save_subs(subs: list):
    SUBS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(SUBS_FILE, "w") as f:
        json.dump(subs, f, indent=2)


def _send_push(sub: dict, payload: dict) -> bool:
    """Envía una notificación push a una suscripción. Retorna True si fue exitoso."""
    if not VAPID_PRIVATE_KEY or not VAPID_PUBLIC_KEY:
        return False
    try:
        webpush(
            subscription_info={
                "endpoint": sub["endpoint"],
                "keys": sub["keys"],
            },
            data=json.dumps(payload),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={"sub": VAPID_CLAIMS},
        )
        return True
    except WebPushException as e:
        # Si el endpoint ya no es válido (unsubscribed), lo eliminamos
        if e.response and e.response.status_code in (404, 410):
            subs = _load_subs()
            subs = [s for s in subs if s.get("endpoint") != sub["endpoint"]]
            _save_subs(subs)
        return False


@router.get("/api/push/vapid-key")
async def get_vapid_key():
    """Devuelve la clave pública VAPID para que el frontend se suscriba."""
    if not VAPID_PUBLIC_KEY:
        raise HTTPException(status_code=500, detail="VAPID not configured")
    return {"public_key": VAPID_PUBLIC_KEY}


@router.get("/api/push/subscriptions")
async def get_subscriptions():
    """List active push notification subscriptions."""
    subs = _load_subs()
    safe = [
        {"id": i, "platform": s.get("platform", "web"), "created": s.get("created", "")}
        for i, s in enumerate(subs)
    ]
    return {"subscriptions": safe, "total": len(safe)}


@router.post("/api/push/subscribe")
async def subscribe(sub: Subscription):
    """Register a new push notification subscription."""
    subs = _load_subs()
    existing = [s for s in subs if s.get("endpoint") == sub.endpoint]
    if existing:
        return {"status": "already_subscribed"}

    entry = sub.model_dump()
    entry["created"] = datetime.now(timezone.utc).isoformat()
    subs.append(entry)
    _save_subs(subs)
    return {"status": "subscribed", "total": len(subs)}


@router.delete("/api/push/subscribe")
async def unsubscribe(endpoint: str):
    """Remove a push notification subscription."""
    subs = _load_subs()
    before = len(subs)
    subs = [s for s in subs if s.get("endpoint") != endpoint]
    _save_subs(subs)
    removed = before - len(subs)
    return {"status": "unsubscribed" if removed > 0 else "not_found", "removed": removed}


@router.post("/api/push/test")
async def test_push():
    """Send a test notification to all subscribers."""
    subs = _load_subs()
    if not subs:
        return {"status": "no_subscribers", "message": "No hay suscriptores. Activa las notificaciones desde Settings."}

    payload = {
        "title": "🔔 Hermes",
        "body": "Notificación push funcionando ✅",
        "icon": "/icon-192.png",
        "tag": "hermes-test",
        "data": {"url": "/"},
    }

    success = 0
    failed = 0
    for sub in subs:
        if _send_push(sub, payload):
            success += 1
        else:
            failed += 1

    return {"status": "sent", "success": success, "failed": failed, "total": len(subs)}


@router.post("/api/push/notify")
async def send_notification(req: NotifyRequest):
    """Send a custom notification to all subscribers."""
    subs = _load_subs()
    if not subs:
        raise HTTPException(status_code=404, detail="No subscribers")

    payload = {
        "title": req.title,
        "body": req.body,
        "icon": req.icon,
        "tag": req.tag,
        "data": {"url": req.url},
    }

    success = 0
    for sub in subs:
        if _send_push(sub, payload):
            success += 1

    return {"status": "sent", "success": success, "total": len(subs)}
