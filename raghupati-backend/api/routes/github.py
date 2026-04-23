"""GitHub monitor API — real branches, commits, PRs, CI state."""

from __future__ import annotations

import structlog
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from config.settings import get_settings

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/github", tags=["github"])


class BranchInfo(BaseModel):
    name: str
    is_default: bool
    protected: bool
    last_commit_sha: str | None = None
    last_commit_date: str | None = None


class CommitInfo(BaseModel):
    sha: str
    message: str
    author: str
    date: str
    url: str | None = None


class PRInfo(BaseModel):
    number: int
    title: str
    state: str
    head_branch: str
    base_branch: str
    html_url: str
    mergeable: bool | None = None
    created_at: str | None = None
    updated_at: str | None = None


class WorkflowRun(BaseModel):
    id: int
    name: str
    status: str
    conclusion: str | None = None
    html_url: str | None = None
    created_at: str | None = None
    updated_at: str | None = None


class GitHubMonitorData(BaseModel):
    repo: str
    branches: list[BranchInfo]
    recent_commits: list[CommitInfo]
    open_prs: list[PRInfo]
    workflow_runs: list[WorkflowRun]
    fetched_at: str


@router.get("/monitor/{owner}/{repo}", response_model=GitHubMonitorData)
async def github_monitor(
    owner: str,
    repo: str,
    token: str | None = Query(None, description="GitHub PAT override"),
) -> GitHubMonitorData:
    """Fetch real GitHub data for the monitor panel: branches, commits, PRs, CI."""
    settings = get_settings()
    github_token = token or settings.github_token.get_secret_value()
    repo_full = f"{owner}/{repo}"
    base = str(settings.github_api_base_url).rstrip("/")
    headers = {
        "Authorization": f"Bearer {github_token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }

    import httpx
    from datetime import datetime, timezone

    branches: list[BranchInfo] = []
    commits: list[CommitInfo] = []
    prs: list[PRInfo] = []
    workflows: list[WorkflowRun] = []

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            # Get repo info (default branch)
            repo_resp = await client.get(f"{base}/repos/{repo_full}", headers=headers)
            default_branch = "main"
            if repo_resp.status_code == 200:
                default_branch = repo_resp.json().get("default_branch", "main")

            # Branches
            branch_resp = await client.get(
                f"{base}/repos/{repo_full}/branches",
                headers=headers,
                params={"per_page": 20},
            )
            if branch_resp.status_code == 200:
                for b in branch_resp.json():
                    name = b.get("name", "")
                    protected = b.get("protected", False)
                    commit = b.get("commit", {})
                    branches.append(BranchInfo(
                        name=name,
                        is_default=name == default_branch,
                        protected=protected,
                        last_commit_sha=commit.get("sha", "")[:8] if commit else None,
                    ))

            # Recent commits
            commit_resp = await client.get(
                f"{base}/repos/{repo_full}/commits",
                headers=headers,
                params={"per_page": 10},
            )
            if commit_resp.status_code == 200:
                for c in commit_resp.json():
                    commit_data = c.get("commit", {})
                    author = commit_data.get("author", {})
                    commits.append(CommitInfo(
                        sha=c.get("sha", "")[:8],
                        message=commit_data.get("message", "")[:120],
                        author=author.get("name", ""),
                        date=author.get("date", ""),
                        url=c.get("html_url"),
                    ))

            # Open PRs
            pr_resp = await client.get(
                f"{base}/repos/{repo_full}/pulls",
                headers=headers,
                params={"state": "open", "per_page": 10, "sort": "updated"},
            )
            if pr_resp.status_code == 200:
                for p in pr_resp.json():
                    head = p.get("head", {})
                    base_ref = p.get("base", {})
                    prs.append(PRInfo(
                        number=p.get("number", 0),
                        title=p.get("title", ""),
                        state=p.get("state", ""),
                        head_branch=head.get("ref", ""),
                        base_branch=base_ref.get("ref", ""),
                        html_url=p.get("html_url", ""),
                        mergeable=p.get("mergeable"),
                        created_at=p.get("created_at"),
                        updated_at=p.get("updated_at"),
                    ))

            # Workflow runs
            wf_resp = await client.get(
                f"{base}/repos/{repo_full}/actions/runs",
                headers=headers,
                params={"per_page": 5},
            )
            if wf_resp.status_code == 200:
                for w in wf_resp.json().get("workflow_runs", []):
                    workflows.append(WorkflowRun(
                        id=w.get("id", 0),
                        name=w.get("name", ""),
                        status=w.get("status", ""),
                        conclusion=w.get("conclusion"),
                        html_url=w.get("html_url"),
                        created_at=w.get("created_at"),
                        updated_at=w.get("updated_at"),
                    ))

    except Exception as exc:
        logger.warning("github_monitor_partial_failure", repo=repo_full, error=str(exc))

    return GitHubMonitorData(
        repo=repo_full,
        branches=branches,
        recent_commits=commits,
        open_prs=prs,
        workflow_runs=workflows,
        fetched_at=datetime.now(timezone.utc).isoformat(),
    )
