"""REST API for chat sessions — CRUD for sessions and messages backed by SQLite.

Uses a thread-local connection via sqlite3 (FastAPI's default threading is fine
for a single-user dashboard; no aiosqlite needed).
"""

import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from auth import verify_token

DB_DIR = Path(__file__).resolve().parent.parent / "data"
DB_PATH = DB_DIR / "sessions.db"


# ── Schema & helpers ────────────────────────────────────────────────────

_SQL_SCHEMA = """
CREATE TABLE IF NOT EXISTS sessions (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL DEFAULT 'Nueva conversación',
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role        TEXT NOT NULL CHECK(role IN ('user','assistant','system')),
    content     TEXT NOT NULL,
    timestamp   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, id);

-- Speed up session listing order
CREATE INDEX IF NOT EXISTS idx_sessions_updated ON sessions(updated_at DESC);
"""


def _get_db() -> sqlite3.Connection:
    """Get a thread-local connection (one per thread, autoclosable)."""
    DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db() -> None:
    """Create tables if they don't exist. Called once at import time."""
    conn = _get_db()
    try:
        conn.executescript(_SQL_SCHEMA)
        conn.commit()
    finally:
        conn.close()


# Run schema creation on import
init_db()


# ── Pydantic models ─────────────────────────────────────────────────────

class SessionOut(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str
    preview: str = ""
    message_count: int = 0


class MessageOut(BaseModel):
    id: int
    session_id: str
    role: str
    content: str
    timestamp: str


class CreateSessionRequest(BaseModel):
    title: str = "Nueva conversación"


class RenameSessionRequest(BaseModel):
    title: str


# ── Router ──────────────────────────────────────────────────────────────

router = APIRouter(tags=["sessions"])


# -- Listing --------------------------------------------------------------

@router.get("/api/sessions")
def list_sessions(
    limit: int = Query(50, ge=1, le=200),
    _token: str = Depends(verify_token),
) -> list[SessionOut]:
    """List all sessions, newest first, with a preview of the last message."""
    conn = _get_db()
    try:
        rows = conn.execute("""
            SELECT
                s.id,
                s.title,
                s.created_at,
                s.updated_at,
                (SELECT content FROM messages
                 WHERE session_id = s.id
                 ORDER BY id DESC LIMIT 1) AS preview,
                (SELECT COUNT(*) FROM messages WHERE session_id = s.id) AS msg_count
            FROM sessions s
            ORDER BY s.updated_at DESC
            LIMIT ?
        """, (limit,)).fetchall()

        result = []
        for r in rows:
            preview = (r["preview"] or "")[:120]
            # Strip very long previews
            if len(preview) >= 120:
                preview = preview[:117] + "..."
            result.append(SessionOut(
                id=r["id"],
                title=r["title"],
                created_at=r["created_at"],
                updated_at=r["updated_at"],
                preview=preview,
                message_count=r["msg_count"],
            ))
        return result
    finally:
        conn.close()


# -- Create ---------------------------------------------------------------

@router.post("/api/sessions")
def create_session(
    req: CreateSessionRequest = CreateSessionRequest(),
    _token: str = Depends(verify_token),
) -> SessionOut:
    """Create a new session and return it."""
    now = datetime.now(timezone.utc).isoformat()
    session_id = str(uuid.uuid4())

    conn = _get_db()
    try:
        conn.execute(
            "INSERT INTO sessions (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
            (session_id, req.title, now, now),
        )
        conn.commit()
        return SessionOut(
            id=session_id,
            title=req.title,
            created_at=now,
            updated_at=now,
            preview="",
            message_count=0,
        )
    finally:
        conn.close()


# -- Rename ---------------------------------------------------------------

@router.put("/api/sessions/{session_id}")
def rename_session(
    session_id: str,
    req: RenameSessionRequest,
    _token: str = Depends(verify_token),
):
    """Rename a session."""
    conn = _get_db()
    try:
        cur = conn.execute(
            "UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?",
            (req.title, datetime.now(timezone.utc).isoformat(), session_id),
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Session not found")
        conn.commit()
        return {"success": True}
    finally:
        conn.close()


# -- Delete ---------------------------------------------------------------

@router.delete("/api/sessions/{session_id}")
def delete_session(
    session_id: str,
    _token: str = Depends(verify_token),
):
    """Delete a session and all its messages (CASCADE)."""
    conn = _get_db()
    try:
        cur = conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Session not found")
        conn.commit()
        return {"success": True}
    finally:
        conn.close()


# -- Messages -------------------------------------------------------------

@router.get("/api/sessions/{session_id}/messages")
def list_messages(
    session_id: str,
    _token: str = Depends(verify_token),
) -> list[MessageOut]:
    """Get all messages for a session, ordered chronologically."""
    conn = _get_db()
    try:
        # Verify session exists
        s = conn.execute("SELECT 1 FROM sessions WHERE id = ?", (session_id,)).fetchone()
        if not s:
            raise HTTPException(status_code=404, detail="Session not found")

        rows = conn.execute("""
            SELECT id, session_id, role, content, timestamp
            FROM messages
            WHERE session_id = ?
            ORDER BY id ASC
        """, (session_id,)).fetchall()

        return [
            MessageOut(
                id=r["id"],
                session_id=r["session_id"],
                role=r["role"],
                content=r["content"],
                timestamp=r["timestamp"],
            )
            for r in rows
        ]
    finally:
        conn.close()


# -- Search ---------------------------------------------------------------

@router.get("/api/sessions/search")
def search_sessions(
    q: str = Query(..., min_length=1, max_length=200),
    limit: int = Query(20, ge=1, le=100),
    _token: str = Depends(verify_token),
) -> list[dict]:
    """Search messages across all sessions via LIKE query."""
    conn = _get_db()
    try:
        rows = conn.execute("""
            SELECT
                s.id AS session_id,
                s.title AS session_title,
                m.content,
                m.role,
                m.timestamp
            FROM messages m
            JOIN sessions s ON s.id = m.session_id
            WHERE m.content LIKE '%' || ? || '%'
            ORDER BY m.timestamp DESC
            LIMIT ?
        """, (q, limit)).fetchall()

        results = []
        for r in rows:
            content: str = r["content"]
            # Extract a snippet of ~120 chars around the match
            idx = content.lower().find(q.lower())
            if idx == -1:
                snippet = content[:120]
            else:
                start = max(0, idx - 40)
                end = min(len(content), idx + len(q) + 80)
                snippet = content[start:end]
                if start > 0:
                    snippet = "..." + snippet
                if end < len(content):
                    snippet = snippet + "..."

            results.append({
                "session_id": r["session_id"],
                "session_title": r["session_title"],
                "snippet": snippet,
                "role": r["role"],
                "timestamp": r["timestamp"],
            })
        return results
    finally:
        conn.close()


# -- Auto-title (called from chat_ws) ------------------------------------

def auto_title_session(session_id: str) -> str:
    """Auto-generate a title from the first user message content.
    Called after the first user message arrives in a new session.
    Returns the new title.
    """
    conn = _get_db()
    try:
        row = conn.execute("""
            SELECT content FROM messages
            WHERE session_id = ? AND role = 'user'
            ORDER BY id ASC LIMIT 1
        """, (session_id,)).fetchone()
        if not row:
            return "Nueva conversación"

        content = row["content"].strip()[:60]
        if len(row["content"]) > 60:
            content += "…"
        title = content or "Nueva conversación"

        now = datetime.now(timezone.utc).isoformat()
        conn.execute(
            "UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?",
            (title, now, session_id),
        )
        conn.commit()
        return title
    finally:
        conn.close()


# -- Append message helpers (used by chat_ws) -----------------------------

def append_message(session_id: str, role: str, content: str) -> int:
    """Insert a message into a session. Returns the message id."""
    timestamp = datetime.now(timezone.utc).isoformat()
    conn = _get_db()
    try:
        cur = conn.execute(
            "INSERT INTO messages (session_id, role, content, timestamp) VALUES (?, ?, ?, ?)",
            (session_id, role, content, timestamp),
        )
        # Update session's updated_at
        conn.execute(
            "UPDATE sessions SET updated_at = ? WHERE id = ?",
            (timestamp, session_id),
        )
        conn.commit()
        return cur.lastrowid
    finally:
        conn.close()
