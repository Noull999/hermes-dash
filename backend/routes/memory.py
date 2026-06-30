"""GET /api/memory — Active Hermes memory context.

Reads /tmp/hermes_memory_summary.json if Hermes writes it,
otherwise returns a fallback with recent session/project data.
"""

import json
import os
from pathlib import Path
from datetime import datetime

from fastapi import APIRouter, Depends
from auth import verify_token

router = APIRouter(tags=["memory"])

MEMORY_FILE = Path("/tmp/hermes_memory_summary.json")


def _build_fallback() -> dict:
    """Build a memory summary from available system data."""
    now = datetime.utcnow().isoformat()

    # Scan ~/.hermes/projects for active project names
    projects_dir = Path.home() / ".hermes" / "projects"
    active_projects = []
    if projects_dir.is_dir():
        try:
            for p in projects_dir.iterdir():
                if p.is_dir():
                    active_projects.append(p.name)
        except Exception:
            pass

    # Check recent cron outputs for task hints
    cron_dir = Path.home() / ".hermes" / "cron" / "output"
    pending_tasks = []
    if cron_dir.is_dir():
        try:
            files = sorted(cron_dir.iterdir(), key=lambda f: f.stat().st_mtime, reverse=True)[:5]
            for f in files:
                pending_tasks.append(f.name)
        except Exception:
            pass

    return {
        "updated_at": now,
        "active_projects": active_projects or ["hermes-dash", "hermes-gateway"],
        "recent_decisions": [],
        "user_preferences": [
            "Prefiere respuestas cortas y directas",
            "Estilo chileno, tono cercano",
            "Codigo en ingles, comentarios en español",
            "Dark theme, UI tipo HUD/JARVIS",
        ],
        "pending_tasks": pending_tasks or [],
    }


@router.get("/api/memory")
def get_memory(_token: str = Depends(verify_token)) -> dict:
    """Return the active Hermes memory context summary."""
    if MEMORY_FILE.exists():
        try:
            raw = MEMORY_FILE.read_text(encoding="utf-8")
            data = json.loads(raw)
            data["_source"] = "file"
            return data
        except (json.JSONDecodeError, OSError):
            pass

    fallback = _build_fallback()
    fallback["_source"] = "fallback"
    return fallback
