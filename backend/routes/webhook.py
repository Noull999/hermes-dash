"""POST /api/webhook/deploy — Recibe notificación de GitHub Action y actualiza el backend."""

import hmac
import os
import subprocess
import sys
import time
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request

router = APIRouter(tags=["webhook"])

REPO_DIR = Path("/root/hermes-dash")
DEPLOY_KEY = os.environ.get("VPS_DEPLOY_KEY", "")


@router.post("/api/webhook/deploy")
async def webhook_deploy(request: Request):
    """Git pull + restart del backend. Llamado por GitHub Action al pushear a main."""
    if not DEPLOY_KEY:
        raise HTTPException(status_code=500, detail="VPS_DEPLOY_KEY not configured")

    auth = request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
    if not hmac.compare_digest(auth, DEPLOY_KEY):
        raise HTTPException(status_code=403, detail="Invalid deploy key")

    if not REPO_DIR.exists():
        raise HTTPException(status_code=500, detail="Repo directory not found")

    try:
        # Git pull
        pull = subprocess.run(
            ["git", "pull"],
            cwd=str(REPO_DIR),
            capture_output=True, text=True, timeout=30,
        )
        output = pull.stdout.strip() or pull.stderr.strip()

        # Si hubo cambios, reiniciar uvicorn con systemctl (safer than manual restart)
        if pull.returncode == 0 and "Already up to date" not in pull.stdout:
            try:
                # Try systemctl first (if running as service)
                systemctl = subprocess.run(
                    ["systemctl", "restart", "hermes-backend"],
                    capture_output=True, text=True, timeout=30,
                )
                if systemctl.returncode == 0:
                    output += "\n🔄 Backend reiniciado via systemctl"
                else:
                    # Fallback: send SIGHUP to uvicorn for graceful reload
                    pid_out = subprocess.run(
                        ["pgrep", "-f", "uvicorn main:app"],
                        capture_output=True, text=True, timeout=10,
                    )
                    if pid_out.stdout.strip():
                        old_pid = pid_out.stdout.strip().split("\n")[0]
                        subprocess.run(["kill", "-HUP", old_pid], capture_output=True, timeout=10)
                        output += "\n🔄 Backend recibió SIGHUP para reload"
                    else:
                        output += "\n⚠️ No se encontró proceso uvicorn"
            except Exception:
                output += "\n⚠️ No se pudo reiniciar backend automáticamente"

        return {"status": "ok", "output": output}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
