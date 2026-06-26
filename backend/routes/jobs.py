"""Jobs/CI route for Hermes Dashboard — monitors cron and systemd jobs.

Exposes, for every scheduled job, not just *that* it is scheduled but
*what* it runs (command), *why* (description) and *when next* (next_run),
so the dashboard can explain each cron entry in plain language.
"""
from fastapi import APIRouter, Depends
from auth import verify_token
import subprocess, json, os
from pathlib import Path
from datetime import datetime

router = APIRouter(dependencies=[Depends(verify_token)])

HERMES_HOME = os.path.expanduser("~/.hermes")


def _next_run(schedule: str) -> str:
    """Best-effort next-run time for a cron expression. Empty if unknown."""
    if not schedule or schedule in ("always", "?"):
        return ""
    try:
        from croniter import croniter  # optional dependency
        if croniter.is_valid(schedule):
            return croniter(schedule, datetime.now()).get_next(datetime).isoformat()
    except Exception:
        pass
    return ""


@router.get("/api/jobs")
async def get_jobs():
    """List scheduled jobs (Hermes cron + systemd timers) and their status."""
    jobs = []

    # Hermes cron jobs from cron.json
    cron_path = Path(HERMES_HOME) / "cron.json"
    if cron_path.exists():
        try:
            with open(cron_path) as f:
                cron_data = json.load(f)
            for job in cron_data if isinstance(cron_data, list) else cron_data.get("jobs", []):
                schedule = job.get("schedule", job.get("interval", "?"))
                # The actual command can live under several common keys.
                command = (
                    job.get("command")
                    or job.get("cmd")
                    or job.get("task")
                    or job.get("script")
                    or job.get("prompt")
                    or ""
                )
                jobs.append({
                    "source": "hermes",
                    "id": job.get("id", "?"),
                    "name": job.get("name", job.get("id", "?")),
                    "schedule": schedule,
                    "status": "active" if job.get("enabled", True) else "paused",
                    "command": command,
                    "description": job.get("description", job.get("desc", "")),
                    "last_run": job.get("last_run", ""),
                    "next_run": _next_run(schedule) if job.get("enabled", True) else "",
                    "running": False,
                })
        except Exception as e:
            jobs.append({"source": "hermes", "id": "error", "name": f"Error reading cron: {e}", "status": "error"})

    # systemd services related to Hermes
    try:
        result = subprocess.run(
            ["systemctl", "list-units", "--type=service", "--no-pager", "--output=json"],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0:
            services = json.loads(result.stdout)
            for svc in services:
                name = svc.get("unit", "")
                if "hermes" in name.lower():
                    sub = svc.get("sub", "")
                    # Pull the ExecStart command + unit description for context.
                    command, description = "", svc.get("description", "")
                    try:
                        show = subprocess.run(
                            ["systemctl", "show", name,
                             "--property=ExecStart,Description", "--no-pager"],
                            capture_output=True, text=True, timeout=5
                        )
                        for line in show.stdout.splitlines():
                            if line.startswith("Description=") and not description:
                                description = line.split("=", 1)[1]
                            elif line.startswith("ExecStart=") and "argv[]=" in line:
                                # ExecStart={ path=... ; argv[]=cmd args ; ... }
                                seg = line.split("argv[]=", 1)[1]
                                command = seg.split(" ; ", 1)[0].strip()
                    except Exception:
                        pass
                    jobs.append({
                        "source": "systemd",
                        "id": name,
                        "name": name.replace(".service", ""),
                        "schedule": "always",
                        "status": "active" if svc.get("active") == "active" else "inactive",
                        "substatus": sub,
                        "command": command,
                        "description": description,
                        "running": sub == "running",
                    })
    except Exception:
        pass

    # Recent cron job runs
    runs = []
    cron_log = Path(HERMES_HOME) / "cron.log"
    if cron_log.exists():
        try:
            with open(cron_log) as f:
                lines = f.readlines()[-20:]
            for line in reversed(lines):
                parts = line.strip().split(" | ", 2)
                if len(parts) >= 2:
                    runs.append({"time": parts[0], "event": parts[1]})
        except Exception:
            pass

    return {"jobs": jobs, "recent_runs": runs}
