"""Sugreeva — CI gatekeeper (Groq Llama 4 Scout)."""

from __future__ import annotations

import time
from typing import Any

import httpx
import structlog
from crewai import Agent

from agents.llm import groq_llm_from_env
from config.settings import get_settings
from models.patch import CIResult
from tools.slack_tool import SlackWebhookTool

logger = structlog.get_logger(__name__)


def poll_latest_actions_run(
    repo_full_name: str,
    branch: str,
    *,
    workflow_name_contains: str | None = None,
    timeout_seconds: float = 900.0,
    poll_interval_seconds: float = 10.0,
) -> CIResult:
    """Poll GitHub Actions until the latest run on a branch completes or times out.

    Args:
        repo_full_name: Repository in ``owner/name`` form.
        branch: Branch name to filter workflow runs.
        workflow_name_contains: Optional substring filter for workflow names.
        timeout_seconds: Maximum time to wait for completion.
        poll_interval_seconds: Sleep between polls.

    Returns:
        Parsed ``CIResult`` with conclusion and diagnostic excerpts.

    Raises:
        RuntimeError: If the GitHub API cannot be queried successfully.
    """
    settings = get_settings()
    token = settings.github_token.get_secret_value()
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    base = str(settings.github_api_base_url).rstrip("/")
    url = f"{base}/repos/{repo_full_name}/actions/runs"
    deadline = time.monotonic() + timeout_seconds
    last: dict[str, Any] | None = None
    while time.monotonic() < deadline:
        try:
            with httpx.Client(timeout=settings.external_api_timeout_seconds) as client:
                response = client.get(
                    url,
                    headers=headers,
                    params={"branch": branch, "per_page": 10},
                )
                response.raise_for_status()
                payload = response.json()
        except Exception as exc:
            logger.exception("github_actions_list_failed", repo=repo_full_name, error=str(exc))
            msg = "Failed to list GitHub Actions runs"
            raise RuntimeError(msg) from exc
        runs = payload.get("workflow_runs") or []
        if not runs:
            time.sleep(poll_interval_seconds)
            continue
        selected: dict[str, Any] | None = None
        if workflow_name_contains:
            needle = workflow_name_contains.lower()
            for run in runs:
                name = str(run.get("name") or "")
                if needle in name.lower():
                    selected = run
                    break
            if selected is None:
                selected = runs[0]
        else:
            selected = runs[0]
        status = str(selected.get("status") or "")
        conclusion = selected.get("conclusion")
        last = selected
        if status == "completed":
            failed_jobs: list[str] = []
            logs_excerpt = ""
            if conclusion != "success":
                run_id = int(selected.get("id") or 0)
                if run_id:
                    jobs_url = f"{base}/repos/{repo_full_name}/actions/runs/{run_id}/jobs"
                    try:
                        with httpx.Client(timeout=settings.external_api_timeout_seconds) as client:
                            jr = client.get(jobs_url, headers=headers)
                            jr.raise_for_status()
                            jobs_payload = jr.json()
                        for job in jobs_payload.get("jobs") or []:
                            if str(job.get("conclusion") or "") == "failure":
                                failed_jobs.append(str(job.get("name") or "unknown"))
                    except Exception as exc:
                        logger.warning("github_actions_jobs_fetch_failed", error=str(exc))
            return CIResult(
                workflow_run_id=int(selected.get("id") or 0),
                conclusion=str(conclusion) if conclusion is not None else None,
                html_url=str(selected.get("html_url") or ""),
                failed_jobs=failed_jobs,
                logs_excerpt=logs_excerpt,
                raw=selected,
            )
        time.sleep(poll_interval_seconds)
    return CIResult(
        workflow_run_id=int((last or {}).get("id") or 0) if last else None,
        conclusion=None,
        html_url=str((last or {}).get("html_url") or "") if last else None,
        failed_jobs=[],
        logs_excerpt="timeout waiting for workflow completion",
        raw=last or {},
    )


def build_sugreeva_agent() -> Agent:
    """Construct Sugreeva, the CI validation and gatekeeper agent.

    Returns:
        Configured CrewAI ``Agent`` with Slack signaling for failures.
    """
    settings = get_settings()
    tools = [SlackWebhookTool()]
    return Agent(
        role="Sugreeva — QA and CI Gatekeeper",
        goal=(
            "Validate patches by monitoring GitHub Actions outcomes, extracting actionable failure "
            "context, and returning structured results to the commander for retry decisions."
        ),
        backstory=(
            "You treat CI as a contract: green means shippable, red means diagnose precisely. "
            "You never blame users; you package evidence that engineers can act on immediately."
        ),
        tools=tools,
        llm=groq_llm_from_env(settings.model_sugreeva),
        verbose=True,
        allow_delegation=False,
    )
