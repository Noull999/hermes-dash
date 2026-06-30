"""GET /api/monitor — Service health monitor.

Checks external services this dashboard depends on:
  - VPS Backend (local health check)
  - Cloudflare Tunnel (dynamic trycloudflare URL)
  - Vercel Frontend deployment
  - GitHub API (rate limit / auth)
  - Google Calendar (token validity)
  - SSL certificate expiry for monitored domains
"""

import json
import os
import socket
import ssl
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path

import httpx
from fastapi import APIRouter, Depends
from auth import verify_token

router = APIRouter(tags=["monitor"])

_HERMES_ENV = Path.home() / ".hermes" / ".env"
_TUNNEL_STATE = Path("/run/hermes-tunnel.url")
_GOOGLE_TOKEN = Path.home() / ".hermes" / "google_token.json"
_HERMES_SCRIPTS = Path.home() / "hermes-dash" / "scripts"

# Actions configuration
_ACTIONS = {
    "restart_tunnel": {
        "label": "Reiniciar Tunnel",
        "cmd": ["systemctl", "restart", "cloudflared-hermes.service"],
        "description": "Reinicia cloudflared para refrescar el tunnel",
        "fire_and_forget": False,
    },
    "restart_backend": {
        "label": "Reiniciar Backend",
        "cmd": ["systemctl", "restart", "hermes-api.service"],
        "description": "Reinicia el backend FastAPI del dashboard",
        "fire_and_forget": True,
    },
    "redeploy_vercel": {
        "label": "Redeploy Vercel",
        "cmd": ["curl", "-s", "-X", "POST"],
        "description": "Dispara redeploy del frontend en Vercel",
        "needs_env": "DEPLOY_HOOK",
        "fire_and_forget": False,
    },
}


def _load_env() -> dict:
    """Lee variables de .hermes/.env."""
    env = {}
    if _HERMES_ENV.exists():
        for line in _HERMES_ENV.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            env[key.strip()] = val.strip().strip("\"'")
    return env


def _get_tunnel_url() -> str | None:
    """Lee la URL actual del tunnel Cloudflare desde el state file."""
    if _TUNNEL_STATE.exists():
        return _TUNNEL_STATE.read_text().strip()
    return None


async def _check_url(url: str, timeout: float = 8.0) -> dict:
    """Checkea una URL y devuelve status + latency."""
    start = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=timeout, verify=False) as client:
            resp = await client.get(url, headers={"User-Agent": "Hermes-Monitor/1.0"})
            elapsed = round((time.monotonic() - start) * 1000)
            return {
                "status": "up" if resp.status_code < 500 else "degraded",
                "http_status": resp.status_code,
                "latency_ms": elapsed,
                "error": None,
            }
    except httpx.TimeoutException:
        elapsed = round((time.monotonic() - start) * 1000)
        return {"status": "down", "http_status": None, "latency_ms": elapsed, "error": "timeout"}
    except Exception as e:
        elapsed = round((time.monotonic() - start) * 1000)
        return {"status": "down", "http_status": None, "latency_ms": elapsed, "error": str(e)[:80]}


def _check_ssl_expiry(hostname: str, port: int = 443) -> dict | None:
    """Obtiene la fecha de expiración del certificado SSL de un host."""
    try:
        ctx = ssl.create_default_context()
        with socket.create_connection((hostname, port), timeout=8) as sock:
            with ctx.wrap_socket(sock, server_hostname=hostname) as ssock:
                cert = ssock.getpeercert()
                if not cert:
                    return None
                not_after = cert.get("notAfter", "")
                if not not_after:
                    return None
                expiry = datetime.strptime(not_after, "%b %d %H:%M:%S %Y %Z")
                days_left = (expiry.astimezone(timezone.utc) - datetime.now(timezone.utc)).days
                issuer_raw = cert.get("issuer", [])
                # issuer es una lista de tuples [(key, value), ...] o una estructura anidada
                if isinstance(issuer_raw, list) and all(isinstance(x, tuple) and len(x) == 2 for x in issuer_raw):
                    issuer_org = dict(issuer_raw).get("organizationName", "unknown")
                elif isinstance(issuer_raw, tuple) and len(issuer_raw) == 2:
                    issuer_org = issuer_raw[1]
                else:
                    issuer_org = str(issuer_raw)[:40]
                return {
                    "hostname": hostname,
                    "expiry": expiry.isoformat(),
                    "days_left": days_left,
                    "issuer": issuer_org,
                }
    except Exception as e:
        return {"hostname": hostname, "expiry": None, "days_left": None, "issuer": None, "error": str(e)[:60]}


@router.get("/api/monitor")
async def get_monitor(_token: str = Depends(verify_token)):
    env = _load_env()
    github_token = env.get("GITHUB_TOKEN", "")
    tunnel_url = _get_tunnel_url()
    vercel_url = "https://hermes-dash.vercel.app"

    results: list[dict] = []

    # ── 1. VPS Backend ────────────────────────────────────────────────
    backend_check = await _check_url("http://localhost:8080/api/health", timeout=5)
    results.append({
        "name": "VPS Backend",
        "key": "vps_backend",
        "icon": "🖥️",
        **backend_check,
    })

    # ── 2. Cloudflare Tunnel ─────────────────────────────────────────
    if tunnel_url:
        tunnel_check = await _check_url(f"{tunnel_url}/api/health", timeout=8)
        results.append({
            "name": "Tunnel Cloudflare",
            "key": "cloudflare_tunnel",
            "icon": "🌐",
            "url": tunnel_url,
            **tunnel_check,
        })
    else:
        results.append({
            "name": "Tunnel Cloudflare",
            "key": "cloudflare_tunnel",
            "icon": "🌐",
            "status": "unknown",
            "http_status": None,
            "latency_ms": None,
            "error": "state file not found",
            "url": None,
        })

    # ── 3. Vercel Frontend ───────────────────────────────────────────
    frontend_check = await _check_url(vercel_url, timeout=10)
    results.append({
        "name": "Vercel Frontend",
        "key": "vercel_frontend",
        "icon": "▲",
        "url": vercel_url,
        **frontend_check,
    })

    # ── 4. GitHub API ────────────────────────────────────────────────
    headers = {"Accept": "application/vnd.github.v3+json"}
    if github_token:
        headers["Authorization"] = f"Bearer {github_token}"
    start = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.get("https://api.github.com/rate_limit", headers=headers)
            elapsed = round((time.monotonic() - start) * 1000)
            gh = resp.json() if resp.status_code == 200 else {}
            rate = gh.get("rate", {})
            remaining = rate.get("remaining", 0)
            limit = rate.get("limit", 0)
            reset_ts = rate.get("reset", 0)
            reset_time = datetime.fromtimestamp(reset_ts, tz=timezone.utc).isoformat() if reset_ts else None

            results.append({
                "name": "GitHub API",
                "key": "github_api",
                "icon": "🐙",
                "status": "up" if resp.status_code == 200 else "degraded",
                "http_status": resp.status_code,
                "latency_ms": elapsed,
                "error": None,
                "details": {
                    "remaining": remaining,
                    "limit": limit,
                    "reset": reset_time,
                },
            })
    except Exception as e:
        elapsed = round((time.monotonic() - start) * 1000)
        results.append({
            "name": "GitHub API",
            "key": "github_api",
            "icon": "🐙",
            "status": "down",
            "http_status": None,
            "latency_ms": elapsed,
            "error": str(e)[:60],
            "details": None,
        })

    # ── 5. Google Calendar ──────────────────────────────────────────
    google_ok = _GOOGLE_TOKEN.exists()
    google_status = "unknown"
    google_error = None
    google_details = {"token_exists": google_ok}

    if google_ok:
        # Use the official Hermes setup script to check
        setup_script = str(Path.home() / ".hermes" / "hermes-agent" / "skills" / "productivity" / "google-workspace" / "scripts" / "setup.py")
        if Path(setup_script).exists():
            result = subprocess.run(
                [setup_script, "--check"],
                capture_output=True, text=True, timeout=15
            )
            if result.returncode == 0:
                google_status = "up"
            else:
                google_status = "degraded"
                google_error = result.stdout.strip() or "Token revocado o expirado"
        else:
            google_status = "degraded"
            google_error = "Script setup.py no encontrado"
    else:
        google_status = "down"
        google_error = "Token file no encontrado"

    results.append({
        "name": "Google Calendar",
        "key": "google_calendar",
        "icon": "📅",
        "status": google_status,
        "http_status": None,
        "latency_ms": None,
        "error": google_error,
        "details": google_details,
    })

    # ── 6. SSL Expiry ────────────────────────────────────────────────
    ssl_targets = []
    if tunnel_url:
        host = tunnel_url.replace("https://", "").replace("http://", "").split("/")[0]
        ssl_targets.append(host)
    ssl_targets.append("hermes-dash.vercel.app")

    ssl_results = []
    for host in ssl_targets:
        info = _check_ssl_expiry(host)
        if info:
            ssl_results.append(info)

    results.append({
        "name": "SSL Certificados",
        "key": "ssl_certs",
        "icon": "🔒",
        "status": "up",
        "http_status": None,
        "latency_ms": None,
        "error": None,
        "details": {"certs": ssl_results},
    })

    # ── Overall status ──────────────────────────────────────────────
    all_up = all(r.get("status") == "up" for r in results if r.get("status") != "unknown")

    return {
        "services": results,
        "overall": "all_ok" if all_up else "issues_detected",
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "total": len(results),
    }


# ── Actions ────────────────────────────────────────────────────────────

@router.get("/api/monitor/actions")
async def list_actions(_token: str = Depends(verify_token)):
    """Lista las acciones disponibles con sus descripciones."""
    return {
        "actions": [
            {"id": k, "label": v["label"], "description": v["description"]}
            for k, v in _ACTIONS.items()
        ]
    }


@router.post("/api/monitor/action/{action_id}")
async def run_action(action_id: str, _token: str = Depends(verify_token)):
    """Ejecuta una accion (restart_tunnel, restart_backend, redeploy_vercel)."""
    if action_id not in _ACTIONS:
        return {"success": False, "error": f"Accion desconocida: {action_id}"}

    action = _ACTIONS[action_id]
    start = time.monotonic()

    try:
        cmd = list(action["cmd"])

        # If action needs an env var as argument
        if "needs_env" in action:
            env = _load_env()
            hook = env.get(action["needs_env"])
            if not hook:
                return {
                    "success": False,
                    "error": f"Variable {action['needs_env']} no configurada en .hermes/.env",
                }
            cmd.append(hook)

        # Fire-and-forget: actions that kill the current process (restart_backend)
        if action.get("fire_and_forget"):
            subprocess.Popen(cmd)
            return {
                "success": True,
                "action": action_id,
                "label": action["label"],
                "message": f"{action['label']} disparado — el monitor se actualizará en breve",
            }

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        elapsed = round((time.monotonic() - start) * 1000)

        if result.returncode == 0:
            return {
                "success": True,
                "action": action_id,
                "label": action["label"],
                "message": f"{action['label']} ejecutado en {elapsed}ms",
                "elapsed_ms": elapsed,
            }
        else:
            return {
                "success": False,
                "action": action_id,
                "error": result.stderr[:200] or f"Exit code {result.returncode}",
                "elapsed_ms": elapsed,
            }

    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "action": action_id,
            "error": "Comando timeout (30s)",
        }
    except Exception as e:
        return {
            "success": False,
            "action": action_id,
            "error": str(e)[:200],
        }
