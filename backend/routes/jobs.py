"""Jobs/CI route for Hermes Dashboard — monitors cron and systemd jobs."""
from fastapi import APIRouter, Depends
from auth import verify_token
import subprocess, json, os
from pathlib import Path

router = APIRouter(dependencies=[Depends(verify_token)])

HERMES_HOME = os.path.expanduser("~/.hermes")


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
                jobs.append({
                    "source": "hermes",
                    "id": job.get("id", "?"),
                    "name": job.get("name", job.get("id", "?")),
                    "schedule": job.get("schedule", job.get("interval", "?")),
                    "status": "active" if job.get("enabled", True) else "paused",
                    "last_run": job.get("last_run", ""),
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
                    jobs.append({
                        "source": "systemd",
                        "id": name,
                        "name": name.replace(".service", ""),
                        "schedule": "always",
                        "status": "active" if svc.get("active") == "active" else "inactive",
                        "substatus": svc.get("sub", ""),
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
