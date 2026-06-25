"""GET /api/tokens — Token usage stats from Hermes tracker."""

import os
import sys

sys.path.insert(0, os.path.expanduser("~/.hermes/scripts"))

from fastapi import APIRouter, Depends
from auth import verify_token

from token_tracker import get_session_usage, get_stats_by_category

router = APIRouter(tags=["tokens"])


@router.get("/api/tokens")
def get_tokens(_token: str = Depends(verify_token)):
    """Return current session usage and per-category breakdown."""
    try:
        session = get_session_usage()
    except Exception as e:
        session = {"error": str(e)}

    try:
        categories = get_stats_by_category()
    except Exception as e:
        categories = {"error": str(e)}

    return {"session": session, "categories": categories}
