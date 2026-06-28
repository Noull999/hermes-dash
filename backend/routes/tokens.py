"""GET /api/tokens — Token usage stats from Hermes tracker."""

import os
import sys

sys.path.insert(0, os.path.expanduser("~/.hermes/scripts"))

from fastapi import APIRouter, Depends
from auth import verify_token

try:
    from token_tracker import get_session_usage, get_stats_by_category
    _HAS_TRACKER = True
except ImportError:
    _HAS_TRACKER = False
    get_session_usage = None
    get_stats_by_category = None

router = APIRouter(tags=["tokens"])


@router.get("/api/tokens")
def get_tokens(_token: str = Depends(verify_token)):
    """Return current session usage and per-category breakdown."""
    if not _HAS_TRACKER:
        return {
            "session": {"error": "token_tracker not installed"},
            "categories": {"error": "token_tracker not installed"},
        }

    try:
        session = get_session_usage()
    except Exception as e:
        session = {"error": str(e)}

    try:
        categories = get_stats_by_category()
    except Exception as e:
        categories = {"error": str(e)}

    return {"session": session, "categories": categories}
