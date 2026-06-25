"""GET /api/repos — Git repos in /root/ with remote status."""

import os
import subprocess

import httpx
from fastapi import APIRouter, Depends, HTTPException

from auth import verify_token

router = APIRouter(tags=["repos"])

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN")
REPO_BASE = "/root"


def _run_git(cmd: list[str], cwd: str) -> str:
    """Run a git command and return stdout stripped."""
    try:
        r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=15)
        return r.stdout.strip()
    except Exception:
        return ""


def _get_github_status(repo_dir: str, branch: str) -> dict:
    """Compare local commit with GitHub remote (via API)."""
    if not GITHUB_TOKEN:
        return {"status": "unknown", "behind": 0, "ahead": 0}

    # Infer owner/name from remote origin URL
    remote = _run_git(["git", "remote", "get-url", "origin"], repo_dir)
    if not remote:
        return {"status": "unknown", "behind": 0, "ahead": 0}

    # Parse: git@github.com:user/repo.git or https://github.com/user/repo.git
    remote = remote.strip()
    if "github.com" not in remote:
        return {"status": "unknown", "behind": 0, "ahead": 0}

    parts = remote.replace("git@github.com:", "").replace("https://github.com/", "").replace(".git", "").split("/")
    if len(parts) < 2:
        return {"status": "unknown", "behind": 0, "ahead": 0}
    owner, repo_name = parts[0], parts[1]

    local_commit = _run_git(["git", "rev-parse", "HEAD"], repo_dir)
    if not local_commit:
        return {"status": "unknown", "behind": 0, "ahead": 0}

    try:
        headers = {"Authorization": f"Bearer {GITHUB_TOKEN}", "Accept": "application/vnd.github.v3+json"}
        url = f"https://api.github.com/repos/{owner}/{repo_name}/commits/{branch}"
        resp = httpx.get(url, headers=headers, timeout=10)
        if resp.is_error:
            return {"status": "unknown", "behind": 0, "ahead": 0}

        remote_sha = resp.json().get("sha", "")
        if not remote_sha:
            return {"status": "unknown", "behind": 0, "ahead": 0}

        # Compare
        compare_url = f"https://api.github.com/repos/{owner}/{repo_name}/compare/{local_commit}...{remote_sha}"
        comp = httpx.get(compare_url, headers=headers, timeout=10)
        if comp.is_error:
            return {"status": "unknown", "behind": 0, "ahead": 0}

        comp_data = comp.json()
        behind = comp_data.get("behind_by", 0)
        ahead = comp_data.get("ahead_by", 0)

        if behind > 0 and ahead > 0:
            status = "diverged"
        elif behind > 0:
            status = "behind"
        elif ahead > 0:
            status = "ahead"
        else:
            status = "synced"

        return {"status": status, "behind": behind, "ahead": ahead}
    except Exception:
        return {"status": "unknown", "behind": 0, "ahead": 0}


@router.get("/api/repos")
def get_repos(_token: str = Depends(verify_token)):
    """List all git repos in /root/ with branch, commit, and remote status."""
    repos = []

    try:
        for entry in os.listdir(REPO_BASE):
            repo_dir = os.path.join(REPO_BASE, entry)
            git_dir = os.path.join(repo_dir, ".git")
            if not os.path.isdir(git_dir):
                # Could be a bare repo with .git file
                if not os.path.exists(git_dir):
                    continue

            branch = _run_git(["git", "rev-parse", "--abbrev-ref", "HEAD"], repo_dir)
            if not branch:
                continue

            vps_commit = _run_git(["git", "rev-parse", "--short", "HEAD"], repo_dir)
            vps_message = _run_git(["git", "log", "-1", "--pretty=%B"], repo_dir)

            # Check dirty status
            status_out = _run_git(["git", "status", "--porcelain"], repo_dir)
            dirty = bool(status_out)

            # Remote status
            remote_info = _get_github_status(repo_dir, branch)

            repos.append({
                "name": entry,
                "branch": branch,
                "vps_commit": vps_commit,
                "vps_message": vps_message,
                "dirty": dirty,
                **remote_info,
            })

    except Exception as e:
        return {"error": str(e), "repos": repos}

    repos.sort(key=lambda r: r["name"])
    return repos
