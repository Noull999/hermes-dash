"""Gamification / achievements route for Hermes Dashboard."""
from fastapi import APIRouter, Depends
from auth import verify_token
import json, os, math
from datetime import datetime, date
from pathlib import Path

router = APIRouter(dependencies=[Depends(verify_token)])

ACHIEVEMENTS_FILE = Path(os.path.expanduser("~/.hermes/achievements.json"))


# Define all possible achievements
ACHIEVEMENT_DEFS = [
    {"id": "first_login", "name": "Primer Ingreso", "icon": "👋", "desc": "Ingresaste al dashboard por primera vez"},
    {"id": "week_streak", "name": "Semana Completa", "icon": "🔥", "desc": "Usaste el dashboard 7 días seguidos"},
    {"id": "month_star", "name": "Estrella Mensual", "icon": "⭐", "desc": "30 días de uso activo"},
    {"id": "token_master", "name": "Token Master", "icon": "💎", "desc": "Acumulaste 100K tokens en llamadas"},
    {"id": "chatty", "name": "Charlatán", "icon": "💬", "desc": "Enviaste 100 mensajes en el chat"},
    {"id": "repo_whisperer", "name": "Repo Whisperer", "icon": "🦊", "desc": "Ejecutaste Claude Code en 5 repos"},
    {"id": "organizer", "name": "Organizador", "icon": "📋", "desc": "Creaste 10 recordatorios"},
    {"id": "brainiac", "name": "Cerebrito", "icon": "🧠", "desc": "Guardaste 20 notas en el segundo cerebro"},
    {"id": "night_owl", "name": "Búho Nocturno", "icon": "🦉", "desc": "Usaste el dashboard después de medianoche"},
    {"id": "emails_read", "name": "Lector de Correos", "icon": "📧", "desc": "Revisaste 50 emails desde el dashboard"},
    {"id": "calendar_watcher", "name": "Calendario al Día", "icon": "📅", "desc": "Revisaste el calendario 20 veces"},
    {"id": "level_5", "name": "Nivel 5", "icon": "🏆", "desc": "Alcanzaste el nivel 5"},
    {"id": "level_10", "name": "Nivel 10", "icon": "👑", "desc": "Alcanzaste el nivel 10 — leyenda"},
]


def _load_progress() -> dict:
    if ACHIEVEMENTS_FILE.exists():
        try:
            with open(ACHIEVEMENTS_FILE) as f:
                return json.load(f)
        except Exception:
            pass
    return {"xp": 0, "unlocked": [], "login_dates": [], "chat_count": 0, "repo_runs": 0,
            "reminders_created": 0, "notes_created": 0, "emails_read": 0, "calendar_views": 0,
            "level": 1}


def _save_progress(p: dict):
    ACHIEVEMENTS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(ACHIEVEMENTS_FILE, "w") as f:
        json.dump(p, f, indent=2)


def _calc_level(xp: int) -> int:
    return min(10, 1 + int(math.log(max(1, xp)) / math.log(2.5)))


def _check_achievements(p: dict) -> list:
    today = date.today().isoformat()
    newly_unlocked = []
    unlocked = set(p.get("unlocked", []))

    for ach in ACHIEVEMENT_DEFS:
        aid = ach["id"]
        if aid in unlocked:
            continue

        unlocked_now = False
        if aid == "first_login" and len(p.get("login_dates", [])) >= 1:
            unlocked_now = True
        elif aid == "week_streak":
            dates = sorted(set(p.get("login_dates", [])))
            if len(dates) >= 7:
                unlocked_now = True
        elif aid == "month_star" and len(p.get("login_dates", [])) >= 30:
            unlocked_now = True
        elif aid == "token_master" and p.get("xp", 0) >= 100000:
            unlocked_now = True
        elif aid == "chatty" and p.get("chat_count", 0) >= 100:
            unlocked_now = True
        elif aid == "repo_whisperer" and p.get("repo_runs", 0) >= 5:
            unlocked_now = True
        elif aid == "organizer" and p.get("reminders_created", 0) >= 10:
            unlocked_now = True
        elif aid == "brainiac" and p.get("notes_created", 0) >= 20:
            unlocked_now = True
        elif aid == "emails_read" and p.get("emails_read", 0) >= 50:
            unlocked_now = True
        elif aid == "calendar_watcher" and p.get("calendar_views", 0) >= 20:
            unlocked_now = True
        elif aid == "level_5" and p.get("level", 1) >= 5:
            unlocked_now = True
        elif aid == "level_10" and p.get("level", 1) >= 10:
            unlocked_now = True

        if unlocked_now:
            unlocked.add(aid)
            newly_unlocked.append(ach)

    if newly_unlocked:
        p["unlocked"] = list(unlocked)
        _save_progress(p)

    return newly_unlocked


@router.get("/api/gamification")
async def get_gamification():
    """Get current gamification state (level, XP, achievements)."""
    p = _load_progress()
    p["level"] = _calc_level(p.get("xp", 0))
    # Check for newly unlocked each request
    new_achs = _check_achievements(p)
    p["level"] = _calc_level(p.get("xp", 0))

    return {
        "level": p["level"],
        "xp": p["xp"],
        "xp_next": int(2.5 ** p["level"]) * 100,
        "unlocked": [a for a in ACHIEVEMENT_DEFS if a["id"] in p.get("unlocked", [])],
        "locked": [a for a in ACHIEVEMENT_DEFS if a["id"] not in p.get("unlocked", [])],
        "new_achievements": new_achs,
        "stats": {k: v for k, v in p.items() if k in ("chat_count", "repo_runs", "reminders_created", "notes_created", "emails_read", "calendar_views")},
    }


@router.post("/api/gamification/track")
async def track_action(payload: dict):  # Accept JSON body {"action": "...", "value": 1}
    """Track a user action (chat message, repo run, etc.) for XP."""
    action = payload.get("action", "")
    value = payload.get("value", 1)
    p = _load_progress()
    today = date.today().isoformat()

    # Track login
    if today not in p.get("login_dates", []):
        p.setdefault("login_dates", []).append(today)
        p["xp"] = p.get("xp", 0) + 10

    # Action-based XP
    xp_map = {
        "chat": 5, "repo_run": 25, "reminder": 15,
        "note": 10, "email_read": 2, "calendar_view": 3,
    }
    if action in xp_map:
        gain = xp_map[action] * value
        p["xp"] = p.get("xp", 0) + gain

    # Track counters
    counter_key = {
        "chat": "chat_count", "repo_run": "repo_runs",
        "reminder": "reminders_created", "note": "notes_created",
        "email_read": "emails_read", "calendar_view": "calendar_views",
    }.get(action)
    if counter_key:
        p[counter_key] = p.get(counter_key, 0) + value

    p["level"] = _calc_level(p.get("xp", 0))
    new_achs = _check_achievements(p)
    _save_progress(p)

    return {
        "xp": p["xp"],
        "level": p["level"],
        "xp_gained": gain if action in xp_map else 0,
        "new_achievements": new_achs,
        "total_achievements": len(p.get("unlocked", [])),
    }
