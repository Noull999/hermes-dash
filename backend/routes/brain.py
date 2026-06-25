"""GET/POST/DELETE /api/brain — CRUD for notes, links, snippets."""

import os
from pathlib import Path
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import verify_token

router = APIRouter(tags=["brain"])

BRAIN_DIR = Path.home() / ".hermes" / "dashboard-brain"


def _ensure_brain_dir():
    """Create brain directory if it doesn't exist."""
    BRAIN_DIR.mkdir(parents=True, exist_ok=True)


def _safe_filename(title: str) -> str:
    """Convert a title to a safe filename."""
    safe = "".join(c if c.isalnum() or c in " _-." else "" for c in title)
    safe = safe.strip().replace(" ", "_")[:80]
    if not safe:
        safe = f"note_{int(datetime.utcnow().timestamp())}"
    return safe


class BrainCreateRequest(BaseModel):
    title: str
    content: str
    type: str = "note"  # note, link, snippet


class BrainDeleteRequest(BaseModel):
    id: str  # filename without .md


@router.get("/api/brain")
def list_brain(_token: str = Depends(verify_token)):
    """List all notes in the brain directory."""
    _ensure_brain_dir()
    notes = []

    try:
        for f in sorted(BRAIN_DIR.iterdir(), reverse=True):
            if f.suffix == ".md":
                try:
                    content = f.read_text(encoding="utf-8")
                    # Parse front matter from first line if present
                    note_type = "note"
                    title = f.stem.replace("_", " ").title()

                    lines = content.strip().split("\n")
                    if lines and lines[0].startswith("# "):
                        title = lines[0][2:].strip()

                    # Determine type from content markers or filename
                    if ".link." in f.name or "link:" in content[:100].lower():
                        note_type = "link"
                    elif ".snippet." in f.name or "```" in content:
                        note_type = "snippet"

                    notes.append({
                        "id": f.stem,
                        "title": title,
                        "content": content,
                        "type": note_type,
                        "created": datetime.fromtimestamp(f.stat().st_ctime).isoformat(),
                        "updated": datetime.fromtimestamp(f.stat().st_mtime).isoformat(),
                    })
                except Exception:
                    continue
    except Exception as e:
        return {"error": str(e), "notes": []}

    return notes


@router.post("/api/brain")
def create_brain(req: BrainCreateRequest, _token: str = Depends(verify_token)):
    """Create a new note."""
    _ensure_brain_dir()

    safe_name = _safe_filename(req.title)
    if req.type == "link":
        safe_name = f"link_{safe_name}"
    elif req.type == "snippet":
        safe_name = f"snippet_{safe_name}"

    filepath = BRAIN_DIR / f"{safe_name}.md"

    # Avoid overwriting
    counter = 1
    while filepath.exists():
        filepath = BRAIN_DIR / f"{safe_name}_{counter}.md"
        counter += 1

    # Build markdown content
    md = f"# {req.title}\n\n"
    md += f"Type: {req.type}\n\n"
    md += req.content

    try:
        filepath.write_text(md, encoding="utf-8")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write note: {e}")

    return {
        "success": True,
        "id": filepath.stem,
        "path": str(filepath),
    }


@router.delete("/api/brain")
def delete_brain(req: BrainDeleteRequest, _token: str = Depends(verify_token)):
    """Delete a note by filename stem."""
    _ensure_brain_dir()

    filepath = BRAIN_DIR / f"{req.id}.md"
    if not filepath.exists():
        # Try with type prefixes
        for prefix in ["", "link_", "snippet_"]:
            candidate = BRAIN_DIR / f"{prefix}{req.id}.md"
            if candidate.exists():
                filepath = candidate
                break
        else:
            raise HTTPException(status_code=404, detail=f"Note '{req.id}' not found")

    try:
        filepath.unlink()
        return {"success": True, "deleted": filepath.stem}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete note: {e}")
