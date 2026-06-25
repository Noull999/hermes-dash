"""GET /api/system — Gateway status, CPU, RAM, Disk."""

import time

import psutil
from fastapi import APIRouter, Depends

from auth import verify_token

router = APIRouter(tags=["system"])


def _is_gateway_online() -> str:
    """Check if hermes gateway process is running."""
    for proc in psutil.process_iter(["name", "cmdline"]):
        try:
            name = proc.info.get("name", "") or ""
            cmdline = " ".join(proc.info.get("cmdline", []) or [])
            if "hermes" in name.lower() or "hermes" in cmdline.lower():
                if "gateway" in name.lower() or "gateway" in cmdline.lower():
                    return "online"
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    return "offline"


@router.get("/api/system")
def get_system(_token: str = Depends(verify_token)):
    """Return system status: gateway, uptime, cpu, ram, disk."""
    try:
        return {
            "gateway": _is_gateway_online(),
            "uptime": time.time() - psutil.boot_time(),
            "cpu_pct": psutil.cpu_percent(interval=0.5),
            "ram_pct": psutil.virtual_memory().percent,
            "disk_pct": psutil.disk_usage("/").percent,
        }
    except Exception as e:
        return {"error": str(e)}
