"""Push notification subscriptions route for Hermes Dashboard."""
from fastapi import APIRouter, Depends, HTTPException
from auth import verify_token
from pydantic import BaseModel
import json, os
from pathlib import Path

router = APIRouter(dependencies=[Depends(verify_token)])

SUBS_FILE = Path(os.path.expanduser("~/.hermes/push_subscriptions.json"))


class Subscription(BaseModel):
    endpoint: str
    keys: dict
    platform: str = "web"


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


@router.get("/api/push/subscriptions")
async def get_subscriptions():
    """List active push notification subscriptions."""
    subs = _load_subs()
    # Don't expose endpoint keys in full
    safe = [{"id": i, "platform": s.get("platform", "web"), "created": s.get("created", "")}
            for i, s in enumerate(subs)]
    return {"subscriptions": safe, "total": len(safe)}


@router.post("/api/push/subscribe")
async def subscribe(sub: Subscription):
    """Register a new push notification subscription."""
    subs = _load_subs()
    # Avoid duplicates
    existing = [s for s in subs if s.get("endpoint") == sub.endpoint]
    if existing:
        return {"status": "already_subscribed"}

    import datetime
    entry = sub.model_dump()
    entry["created"] = datetime.datetime.utcnow().isoformat()
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
    """Send a test notification to all subscribers (stub — real push needs VAPID keys)."""
    subs = _load_subs()
    return {
        "status": "simulated",
        "message": "Push real requires VAPID keys configured on the server",
        "subscribers": len(subs),
    }
