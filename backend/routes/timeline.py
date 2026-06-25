"""GET /api/timeline — Last Hermes actions from agent.log."""

import json
import os
import re
from pathlib import Path

from fastapi import APIRouter, Depends

from auth import verify_token

router = APIRouter(tags=["timeline"])

LOG_FILE = Path.home() / ".hermes" / "logs" / "agent.log"
TOKEN_FILE = Path.home() / ".hermes" / "token_usage.json"

# Example fallback data
EXAMPLE_FEED = [
    {"timestamp": "2026-06-25T12:00:00", "type": "action", "message": "Code review completado en hermes-dash", "project": "hermes-dash"},
    {"timestamp": "2026-06-25T11:30:00", "type": "info", "message": "Token usage: 12,500 nuevos tokens (OpenCode Go)", "project": "hermes"},
    {"timestamp": "2026-06-25T11:00:00", "type": "success", "message": "Deploy backend a VPS completado", "project": "hermes-dash"},
    {"timestamp": "2026-06-25T10:00:00", "type": "error", "message": "GitHub API rate limit excedido", "project": "hermes"},
    {"timestamp": "2026-06-25T09:00:00", "type": "action", "message": "Claude Code: refactor routes/tokens.py", "project": "hermes-dash"},
]


def _parse_timeline_entry(line: str) -> dict | None:
    """Parse a single log line into a timeline entry."""
    # Format: "2026-06-18 16:00:04,591 INFO hermes_cli.plugins: message"
    pattern = r"^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})[,\.]\d+\s+(DEBUG|INFO|WARNING|ERROR|CRITICAL)\s+(\S+):\s+(.+)$"
    m = re.match(pattern, line)
    if not m:
        return None

    timestamp = m.group(1).replace(" ", "T")
    level = m.group(2)
    logger = m.group(3)
    message = m.group(4)

    # Map log level to timeline type
    type_map = {
        "ERROR": "error",
        "CRITICAL": "error",
        "WARNING": "info",
        "INFO": "info",
        "DEBUG": "info",
    }
    type_ = type_map.get(level, "info")

    # Try to extract project from logger name
    project = logger.split(".")[0] if "." in logger else logger

    # Check for action-like messages
    action_keywords = ["deploy", "review", "commit", "push", "pull", "build",
                       "install", "update", "upgrade", "refactor", "fix",
                       "merge", "release", "test", "pr", "run", "exec"]
    msg_lower = message.lower()
    if any(kw in msg_lower for kw in action_keywords):
        type_ = "action"

    return {
        "timestamp": timestamp,
        "type": type_,
        "message": message[:200],
        "project": project,
    }


def _parse_token_usage() -> list[dict]:
    """Parse token_usage.json into timeline entries."""
    entries = []
    if not TOKEN_FILE.exists():
        return entries

    try:
        data = json.loads(TOKEN_FILE.read_text())
        for call in data.get("calls", [])[-20:]:
            ts = call.get("timestamp", "").replace(" ", "T")
            model = call.get("model", "unknown")
            new_tokens = call.get("new_tokens", call.get("total_tokens", 0))
            project = call.get("project", "unknown")
            entries.append({
                "timestamp": ts,
                "type": "info",
                "message": f"Token usage: {model} — {new_tokens:,} tokens",
                "project": project,
            })
    except Exception:
        pass

    return entries


@router.get("/api/timeline")
def get_timeline(_token: str = Depends(verify_token)):
    """Return last actions from Hermes logs or token usage."""
    entries = []

    # Try agent.log first
    if LOG_FILE.exists():
        try:
            with open(LOG_FILE) as f:
                # Read last 500 lines
                lines = f.readlines()[-500:]
            for line in lines:
                entry = _parse_timeline_entry(line.strip())
                if entry:
                    entries.append(entry)
        except Exception:
            pass

    # Fall back to token_usage.json
    if not entries:
        entries = _parse_token_usage()

    # Sort by timestamp descending, limit to 50
    if entries:
        entries.sort(key=lambda e: e.get("timestamp", ""), reverse=True)
        return entries[:50]

    # Ultimate fallback: example data
    return EXAMPLE_FEED
