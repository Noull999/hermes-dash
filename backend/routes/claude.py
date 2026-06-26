"""POST /api/claude — Execute Claude Code in a repo."""

import os
import subprocess
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import verify_token

router = APIRouter(tags=["claude"])

REPO_BASE = Path("/root")
TIMEOUT = 300  # 5 minutes


class ClaudeRequest(BaseModel):
    repo: str
    model: str = "claude-sonnet-4-20250514"
    prompt: str
    mode: str = "chat"
    allow_edits: bool = False


def _get_valid_repos() -> list[str]:
    """Return list of directory names that have .git."""
    repos = []
    try:
        for entry in REPO_BASE.iterdir():
            if entry.is_dir() and (entry / ".git").exists():
                repos.append(entry.name)
    except Exception:
        pass
    return repos


@router.post("/api/claude")
def run_claude(req: ClaudeRequest, _token: str = Depends(verify_token)):
    """Execute Claude Code in a repo and commit + push results."""
    valid_repos = _get_valid_repos()

    if req.repo not in valid_repos:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid repo '{req.repo}'. Valid repos: {', '.join(valid_repos)}",
        )

    repo_path = REPO_BASE / req.repo
    if not repo_path.is_dir():
        raise HTTPException(status_code=400, detail=f"Repo directory not found: {req.repo}")

    # Execute Claude Code
    cmd = [
        "claude",
        "-p", req.prompt,
        "--model", req.model,
        "--print",
    ]

    # Auto-allow edits in 'code' mode or when allow_edits is explicitly set
    if req.mode == "code" or req.allow_edits:
        cmd.append("--allowedTools")
        cmd.append("Bash,Edit,Write,Read")

    try:
        result = subprocess.run(
            cmd,
            cwd=str(repo_path),
            capture_output=True,
            text=True,
            timeout=TIMEOUT,
        )
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "response": f"Claude Code timed out after {TIMEOUT}s",
            "commit": None,
            "error": "timeout",
        }
    except FileNotFoundError:
        return {
            "success": False,
            "response": "",
            "commit": None,
            "error": "claude CLI not found on PATH",
        }

    stdout = result.stdout.strip()
    stderr = result.stderr.strip()

    if result.returncode != 0:
        return {
            "success": False,
            "response": stdout or stderr,
            "commit": None,
            "error": stderr or f"Exit code {result.returncode}",
        }

    # If successful, commit and push
    commit_hash = None
    try:
        # git add all
        subprocess.run(["git", "add", "-A"], cwd=str(repo_path), capture_output=True, text=True, timeout=30)

        # Summarize prompt for commit message
        prompt_summary = req.prompt[:80].strip()
        if len(req.prompt) > 80:
            prompt_summary += "…"

        # git commit
        commit_msg = f"🤖 Claude Code: {prompt_summary}"
        commit = subprocess.run(
            ["git", "commit", "-m", commit_msg],
            cwd=str(repo_path),
            capture_output=True, text=True, timeout=30,
        )

        if commit.returncode == 0:
            # Get commit hash
            rev = subprocess.run(
                ["git", "rev-parse", "--short", "HEAD"],
                cwd=str(repo_path),
                capture_output=True, text=True, timeout=10,
            )
            commit_hash = rev.stdout.strip()

            # git push
            subprocess.run(
                ["git", "push"],
                cwd=str(repo_path),
                capture_output=True, text=True, timeout=60,
            )
    except Exception as e:
        return {
            "success": True,
            "response": stdout,
            "commit": commit_hash,
            "error": f"Commit/push failed: {e}",
        }

    return {
        "success": True,
        "response": stdout,
        "commit": commit_hash,
        "error": None,
    }
