"""POST /api/upload — File upload for chat attachments.

Accepts multipart/form-data files. Handles images (→ base64 for vision API),
text/code (→ raw content), and PDFs (→ text extraction via pdfplumber).
Files are temporarily stored in /tmp/hermes_uploads/ and cleaned hourly.
"""

import os
import shutil
import base64
import time
import re
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from auth import verify_token

router = APIRouter(tags=["upload"])

UPLOAD_DIR = Path("/tmp/hermes_uploads")
MAX_SIZE = 10 * 1024 * 1024  # 10 MB

ALLOWED_EXTENSIONS = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".txt": "text/plain",
    ".md": "text/markdown",
    ".py": "text/x-python",
    ".js": "text/javascript",
    ".ts": "text/typescript",
    ".json": "application/json",
    ".pdf": "application/pdf",
}

TEXT_EXTENSIONS = {".txt", ".md", ".py", ".js", ".ts", ".json"}
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}


def _cleanup_old_files() -> None:
    """Remove files older than 1 hour."""
    now = time.time()
    if not UPLOAD_DIR.exists():
        return
    for f in UPLOAD_DIR.iterdir():
        if f.is_file() and (now - f.stat().st_mtime) > 3600:
            try:
                f.unlink()
            except OSError:
                pass


@router.post("/api/upload")
async def upload_file(
    file: UploadFile = File(...),
    _token: str = Depends(verify_token),
) -> dict:
    """Upload a file and return its processed content."""
    # Validate extension
    original_name = file.filename or "unknown"
    ext = Path(original_name).suffix.lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de archivo '{ext}' no permitido. Permitidos: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # Read content
    raw = await file.read()
    if len(raw) > MAX_SIZE:
        raise HTTPException(status_code=400, detail=f"Archivo muy grande (máx {MAX_SIZE // 1024 // 1024}MB)")

    # Save to temp
    _cleanup_old_files()
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    temp_path = UPLOAD_DIR / f"{int(time.time())}_{original_name}"
    try:
        temp_path.write_bytes(raw)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al guardar archivo: {e}")

    result: dict = {
        "filename": original_name,
        "size": len(raw),
        "mime": ALLOWED_EXTENSIONS[ext],
    }

    # Process by type
    if ext in IMAGE_EXTENSIONS:
        b64 = base64.b64encode(raw).decode("utf-8")
        result["type"] = "image"
        result["base64"] = b64
        result["mime"] = ALLOWED_EXTENSIONS[ext]

    elif ext == ".pdf":
        try:
            import pdfplumber
            with pdfplumber.open(temp_path) as pdf:
                pages = []
                for page in pdf.pages:
                    text = page.extract_text() or ""
                    pages.append(text)
                content = "\n\n".join(pages).strip()
            result["type"] = "text"
            result["content"] = content or "[PDF vacío o sin texto extraíble]"
        except Exception as e:
            result["type"] = "text"
            result["content"] = f"[Error al extraer PDF: {e}]"

    elif ext in TEXT_EXTENSIONS:
        try:
            content = raw.decode("utf-8")
        except UnicodeDecodeError:
            content = raw.decode("latin-1")
        result["type"] = "text"
        result["content"] = content

    else:
        # Binary format — just note the filename
        result["type"] = "binary"
        result["content"] = f"[Archivo adjunto: {original_name}]"

    return result
