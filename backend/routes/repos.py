"""GET /api/repos — All GitHub repos + local git status for repos on this VPS."""

import os
import subprocess

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request

from auth import verify_token

router = APIRouter(tags=["repos"])

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
GITHUB_USER = "Noull999"
REPO_BASE = "/root"


def _run_git(cmd: list[str], cwd: str) -> str:
    try:
        r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=15)
        return r.stdout.strip()
    except Exception:
        return ""


def _github_headers() -> dict:
    headers = {"Accept": "application/vnd.github.v3+json"}
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    return headers


def _fetch_github_repos() -> list[dict]:
    """Fetch all repos for the user from the GitHub API."""
    repos = []
    page = 1
    client = httpx.Client(timeout=15)

    try:
        while True:
            url = f"https://api.github.com/users/{GITHUB_USER}/repos?per_page=100&page={page}&sort=updated"
            resp = client.get(url, headers=_github_headers())
            if resp.is_error:
                break
            batch = resp.json()
            if not batch:
                break
            for r in batch:
                repos.append({
                    "name": r["name"],
                    "github_url": r["html_url"],
                    "description": r.get("description") or "",
                    "language": r.get("language") or "",
                    "updated_at": r.get("updated_at", ""),
                    "private": r.get("private", False),
                    "fork": r.get("fork", False),
                })
            page += 1
    except Exception:
        pass
    finally:
        client.close()

    return repos


def _get_local_status(repo_dir: str, branch: str) -> dict:
    """Compare local commit with GitHub remote (via API)."""
    local_commit = _run_git(["git", "rev-parse", "--short", "HEAD"], repo_dir)
    local_full = _run_git(["git", "rev-parse", "HEAD"], repo_dir)
    vps_message = _run_git(["git", "log", "-1", "--pretty=%B"], repo_dir)
    status_out = _run_git(["git", "status", "--porcelain"], repo_dir)
    dirty = bool(status_out)

    result = {
        "branch": branch,
        "vps_commit": local_commit,
        "vps_message": vps_message.split("\n")[0] if vps_message else "",
        "dirty": dirty,
        "status": "unknown",
        "behind": 0,
        "ahead": 0,
    }

    if not local_full:
        return result

    # Fetch from origin (timeout 10s)
    try:
        subprocess.run(
            ["git", "fetch", "origin", branch, "--quiet"],
            cwd=repo_dir, capture_output=True, text=True, timeout=10
        )
    except Exception:
        pass

    # Check if origin/branch exists locally
    remote_ref = f"origin/{branch}"
    check_remote = _run_git(["git", "rev-parse", "--verify", remote_ref], repo_dir)

    if check_remote:
        # Remote branch exists, use rev-list to count ahead/behind
        ahead_str = _run_git(["git", "rev-list", "--count", f"{remote_ref}..HEAD"], repo_dir)
        behind_str = _run_git(["git", "rev-list", "--count", f"HEAD..{remote_ref}"], repo_dir)
        ahead = int(ahead_str) if ahead_str.isdigit() else 0
        behind = int(behind_str) if behind_str.isdigit() else 0
    else:
        # Remote branch doesn't exist (never pushed), count all commits not on any remote
        ahead_str = _run_git(["git", "rev-list", "--count", "HEAD", "--not", "--remotes"], repo_dir)
        ahead = int(ahead_str) if ahead_str.isdigit() else 0
        behind = 0

    if behind > 0 and ahead > 0:
        status = "diverged"
    elif behind > 0:
        status = "behind"
    elif ahead > 0:
        status = "ahead"
    else:
        status = "synced"

    result.update({"status": status, "behind": behind, "ahead": ahead})

    return result


def _scan_local_repos() -> dict[str, dict]:
    """Scan /root/ for git repos and return their local status keyed by name."""
    local = {}
    try:
        for entry in os.listdir(REPO_BASE):
            repo_dir = os.path.join(REPO_BASE, entry)
            git_dir = os.path.join(repo_dir, ".git")
            if not os.path.isdir(git_dir) and not os.path.exists(git_dir):
                continue

            branch = _run_git(["git", "rev-parse", "--abbrev-ref", "HEAD"], repo_dir)
            if not branch:
                continue

            local[entry] = _get_local_status(repo_dir, branch)
    except Exception:
        pass
    return local


@router.get("/api/repos")
def get_repos(_token: str = Depends(verify_token)):
    """List ALL GitHub repos + local status for repos cloned on this VPS."""
    github_repos = _fetch_github_repos()
    local_repos = _scan_local_repos()

    merged = []
    for gh in github_repos:
        name = gh["name"]
        entry = {
            "name": name,
            "github_url": gh["github_url"],
            "description": gh["description"],
            "language": gh["language"],
            "updated_at": gh["updated_at"],
            "private": gh["private"],
            "fork": gh["fork"],
            "on_vps": name in local_repos,
        }

        # Merge local git status if cloned on this VPS
        if name in local_repos:
            entry.update(local_repos[name])
        else:
            entry.update({
                "branch": "",
                "vps_commit": "",
                "vps_message": "",
                "dirty": False,
                "status": "not-cloned",
                "behind": 0,
                "ahead": 0,
            })

        merged.append(entry)

    merged.sort(key=lambda r: r.get("updated_at", ""), reverse=True)
    return merged


@router.post("/api/repos/clone")
async def clone_repo(request: Request, _token: str = Depends(verify_token)):
    """Clonar un repositorio de GitHub al VPS."""
    body = await request.json()
    repo_name = body.get("repo", "")
    repo_url = body.get("url", "")
    if not repo_name or not repo_url:
        raise HTTPException(status_code=400, detail="repo name and url required")

    target = os.path.join(REPO_BASE, repo_name)
    if os.path.isdir(target):
        raise HTTPException(status_code=400, detail=f"Repo '{repo_name}' already exists on VPS")

    try:
        clone = subprocess.run(
            ["git", "clone", repo_url, target],
            capture_output=True, text=True, timeout=120,
        )
        return {
            "success": clone.returncode == 0,
            "output": clone.stdout.strip() or clone.stderr.strip(),
        }
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="git clone timed out")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/repos/pull")
async def pull_repo(request: Request, _token: str = Depends(verify_token)):
    """Git pull en un repo del VPS."""
    body = await request.json()
    repo_name = body.get("repo", "")
    if not repo_name:
        raise HTTPException(status_code=400, detail="repo name required")

    repo_dir = os.path.join(REPO_BASE, repo_name)
    if not os.path.isdir(repo_dir) or not os.path.isdir(os.path.join(repo_dir, ".git")):
        raise HTTPException(status_code=400, detail=f"Repo '{repo_name}' not found on VPS")

    try:
        # git fetch + git pull
        fetch = subprocess.run(
            ["git", "fetch", "--all"],
            cwd=repo_dir, capture_output=True, text=True, timeout=30,
        )
        pull = subprocess.run(
            ["git", "pull"],
            cwd=repo_dir, capture_output=True, text=True, timeout=30,
        )
        return {
            "success": pull.returncode == 0,
            "output": pull.stdout.strip() or pull.stderr.strip(),
            "fetch": fetch.stdout.strip() or fetch.stderr.strip(),
        }
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="git pull timed out")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/repos/commit")
async def commit_repo(request: Request, _token: str = Depends(verify_token)):
    """Git add -A, commit y push en un repo del VPS."""
    body = await request.json()
    repo_name = body.get("repo", "")
    message = body.get("message", "").strip()
    if not repo_name:
        raise HTTPException(status_code=400, detail="repo name required")
    if not message:
        raise HTTPException(status_code=400, detail="commit message required")

    repo_dir = os.path.join(REPO_BASE, repo_name)
    if not os.path.isdir(repo_dir) or not os.path.isdir(os.path.join(repo_dir, ".git")):
        raise HTTPException(status_code=400, detail=f"Repo '{repo_name}' not found on VPS")

    try:
        add = subprocess.run(
            ["git", "add", "-A"],
            cwd=repo_dir, capture_output=True, text=True, timeout=30,
        )
        commit = subprocess.run(
            ["git", "commit", "-m", message],
            cwd=repo_dir, capture_output=True, text=True, timeout=30,
        )

        if commit.returncode != 0 and "nothing to commit" not in commit.stderr:
            return {
                "success": False,
                "output": (commit.stdout or commit.stderr).strip(),
                "pushed": False,
            }

        push = subprocess.run(
            ["git", "push"],
            cwd=repo_dir, capture_output=True, text=True, timeout=60,
        )

        return {
            "success": push.returncode == 0,
            "output": (push.stdout or push.stderr).strip(),
            "pushed": push.returncode == 0,
        }
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="git operation timed out")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
