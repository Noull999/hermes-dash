"""POST /api/webhook/deploy — Recibe notificación de GitHub Action y actualiza el backend."""

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
    auth = request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
    if DEPLOY_KEY and auth != DEPLOY_KEY:
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

        # Si hubo cambios, reiniciar uvicorn con un delay
        if pull.returncode == 0 and "Already up to date" not in pull.stdout:
            # Buscar PID de uvicorn
            try:
                pid_out = subprocess.run(
                    ["pgrep", "-f", "uvicorn main:app"],
                    capture_output=True, text=True, timeout=10,
                )
                if pid_out.stdout.strip():
                    old_pid = pid_out.stdout.strip().split("\n")[0]
                    # Lanzar nuevo proceso antes de matar el viejo
                    subprocess.Popen(
                        [
                            "nohup", sys.executable, "-m", "uvicorn", "main:app",
                            "--host", "0.0.0.0", "--port", "8080",
                        ],
                        cwd=str(REPO_DIR / "backend"),
                        stdout=open("/tmp/hermes-backend.log", "a"),
                        stderr=subprocess.STDOUT,
                    )
                    time.sleep(2)
                    subprocess.run(["kill", old_pid], capture_output=True, timeout=10)
                    output += "\n🔄 Backend reiniciado"
            except Exception:
                output += "\n⚠️ No se pudo reiniciar backend automáticamente"

        return {"status": "ok", "output": output}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
