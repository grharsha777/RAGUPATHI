"""Real agent orchestration pipeline for RAGHUPATHI.

This module replaces the opaque CrewAI crew.kickoff() with a direct pipeline
that writes per-agent status to Supabase agent_runs table at every state change.
Frontend subscribes via Supabase Realtime — no polling, no faking.
"""

from __future__ import annotations

import asyncio
import json
import time
import traceback
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx
import structlog

from config.settings import get_settings  # type: ignore

logger = structlog.get_logger(__name__)


class AgentResult:
    """Result from a single agent execution."""

    def __init__(
        self,
        agent_name: str,
        success: bool,
        output: dict[str, Any] | None = None,
        error: str | None = None,
        duration_ms: int = 0,
        tokens_used: int = 0,
    ):
        self.agent_name = agent_name
        self.success = success
        self.output = output or {}
        self.error = error
        self.duration_ms = duration_ms
        self.tokens_used = tokens_used


class SupabaseAgentTracker:
    """Writes agent status to Supabase agent_runs table for Realtime updates."""

    def __init__(self, run_id: str):
        self.run_id = run_id
        self.settings = get_settings()
        self._headers = {
            "apikey": self.settings.admin_key.get_secret_value(),
            "Authorization": f"Bearer {self.settings.admin_key.get_secret_value()}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }
        self._base = f"{str(self.settings.supabase_url).rstrip('/')}/rest/v1"

    async def init_agents(self, agent_names: list[str]) -> None:
        """Create PENDING records for all agents at scan start."""
        rows = [
            {
                "id": str(uuid.uuid4()),
                "run_id": self.run_id,
                "agent_name": name,
                "status": "pending",
                "output": json.dumps({}),
                "model_used": self._get_model(name),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            for name in agent_names
        ]
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self._base}/agent_runs",
                headers=self._headers,
                json=rows,
            )
            if resp.status_code >= 400:
                logger.error("agent_tracker_init_failed", status=resp.status_code, body=resp.text[:500])

    async def update_status(
        self,
        agent_name: str,
        status: str,
        output: dict[str, Any] | None = None,
        error: str | None = None,
        duration_ms: int | None = None,
    ) -> None:
        """Update agent status in Supabase with optimistic locking to prevent race conditions.
        
        Uses version field for optimistic locking with retry logic to handle concurrent updates.
        """
        now = datetime.now(timezone.utc).isoformat()
        body: dict[str, Any] = {
            "status": status,
            "updated_at": now,
        }
        if status == "running":
            body["started_at"] = now
        if status in ("complete", "failed"):
            body["completed_at"] = now
        if output is not None:
            body["output"] = json.dumps(output)
        if error is not None:
            body["error"] = error
        if duration_ms is not None:
            body["duration_ms"] = duration_ms

        # Optimistic locking with retry logic (max 3 attempts)
        max_retries = 3
        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient(timeout=30) as client:
                    # First, fetch current version
                    get_url = f"{self._base}/agent_runs?run_id=eq.{self.run_id}&agent_name=eq.{agent_name}&select=version"
                    get_resp = await client.get(get_url, headers=self._headers)
                    
                    if get_resp.status_code != 200:
                        logger.error("agent_tracker_fetch_failed", agent=agent_name, status=get_resp.status_code)
                        return
                    
                    records = get_resp.json()
                    if not records:
                        logger.error("agent_tracker_not_found", agent=agent_name)
                        return
                    
                    current_version = records[0].get("version", 0)
                    new_version = current_version + 1
                    body["version"] = new_version
                    
                    # Atomic update with version check
                    update_url = f"{self._base}/agent_runs?run_id=eq.{self.run_id}&agent_name=eq.{agent_name}&version=eq.{current_version}"
                    resp = await client.patch(
                        update_url,
                        headers={**self._headers, "Prefer": "return=minimal"},
                        json=body
                    )
                    
                    if resp.status_code == 200 or resp.status_code == 204:
                        # Success
                        return
                    elif resp.status_code == 406:  # No rows matched (version conflict)
                        if attempt < max_retries - 1:
                            # Exponential backoff: 50ms, 100ms, 200ms
                            await asyncio.sleep(0.05 * (2 ** attempt))
                            logger.warning("agent_tracker_version_conflict_retry", agent=agent_name, attempt=attempt + 1)
                            continue
                        else:
                            logger.error("agent_tracker_version_conflict_max_retries", agent=agent_name)
                            return
                    else:
                        logger.error("agent_tracker_update_failed", agent=agent_name, status=resp.status_code)
                        return
                        
            except Exception as e:
                logger.error("agent_tracker_update_exception", agent=agent_name, error=str(e))
                if attempt < max_retries - 1:
                    await asyncio.sleep(0.05 * (2 ** attempt))
                    continue
                return

    def _get_model(self, agent_name: str) -> str:
        models = {
            "hanuman": self.settings.model_hanuman,
            "rama": self.settings.model_rama,
            "angada": self.settings.model_angada,
            "lakshmana": getattr(self.settings, "model_lakshmana", self.settings.model_rama),
            "sita": getattr(self.settings, "model_sita", self.settings.model_angada),
            "jambavan": self.settings.model_jambavan,
            "nala": self.settings.model_nala,
            "sugreeva": self.settings.model_sugreeva,
            "bharata": getattr(self.settings, "model_bharata", self.settings.model_jambavan),
            "shatrughna": getattr(self.settings, "model_shatrughna", self.settings.model_sugreeva),
            "vibhishana": self.settings.model_vibhishana,
            "dasharatha": getattr(self.settings, "model_dasharatha", self.settings.model_sugreeva),
        }
        return models.get(agent_name, "unknown")


async def _call_llm(provider: str, model: str, system_prompt: str, user_prompt: str) -> dict[str, Any]:
    """Call an LLM via its provider API. Returns parsed JSON or raw text.

    Args:
        provider: 'mistral' or 'groq'
        model: Model identifier
        system_prompt: System message
        user_prompt: User message

    Returns:
        Dict with 'content' (str) and 'tokens_used' (int)
    """
    settings = get_settings()

    if provider == "mistral":
        url = "https://api.mistral.ai/v1/chat/completions"
        api_key = settings.mistral_api_key.get_secret_value()
    elif provider == "groq":
        url = "https://api.groq.com/openai/v1/chat/completions"
        api_key = settings.groq_api_key.get_secret_value()
    else:
        raise ValueError(f"Unknown LLM provider: {provider}")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    body = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.1,
        "max_tokens": 4096,
    }

    async with httpx.AsyncClient(timeout=settings.external_api_timeout_seconds) as client:
        resp = await client.post(url, headers=headers, json=body)
        resp.raise_for_status()
        data = resp.json()

    content = data["choices"][0]["message"]["content"]
    tokens = data.get("usage", {}).get("total_tokens", 0)
    return {"content": content, "tokens_used": tokens}


async def _query_nvd(keyword: str) -> dict[str, Any]:
    """Query the NVD CVE 2.0 API for vulnerability data."""
    settings = get_settings()
    url = "https://services.nvd.nist.gov/rest/json/cves/2.0"
    params: dict[str, Any] = {}
    if keyword.startswith("CVE-"):
        params["cveId"] = keyword
    else:
        params["keywordSearch"] = keyword
    headers = {"apiKey": settings.nvd_api_key.get_secret_value()}

    async with httpx.AsyncClient(timeout=settings.external_api_timeout_seconds) as client:
        resp = await client.get(url, headers=headers, params=params)
        resp.raise_for_status()
        return resp.json()


async def _search_tavily(query: str) -> dict[str, Any]:
    """Search the web via Tavily API."""
    settings = get_settings()
    url = "https://api.tavily.com/search"
    body = {
        "api_key": settings.tavily_api_key.get_secret_value(),
        "query": query,
        "search_depth": "advanced",
        "max_results": 5,
    }
    async with httpx.AsyncClient(timeout=settings.external_api_timeout_seconds) as client:
        resp = await client.post(url, json=body)
        resp.raise_for_status()
        return resp.json()


async def _fetch_github_diff(repo: str, token: str, commit_sha: str | None = None) -> dict[str, Any]:
    """Fetch recent commits/diff from a GitHub repository."""
    settings = get_settings()
    base = str(settings.github_api_base_url).rstrip("/")
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    async with httpx.AsyncClient(timeout=30) as client:
        # Get recent commits
        url = f"{base}/repos/{repo}/commits"
        params = {"per_page": 5}
        resp = await client.get(url, headers=headers, params=params)
        resp.raise_for_status()
        commits = resp.json()

        # Get the diff of the latest commit
        if commits:
            sha = commit_sha or commits[0]["sha"]
            diff_url = f"{base}/repos/{repo}/commits/{sha}"
            diff_resp = await client.get(diff_url, headers={**headers, "Accept": "application/vnd.github.diff"})
            diff_text = diff_resp.text if diff_resp.status_code == 200 else ""
        else:
            sha = ""
            diff_text = ""

    return {
        "commits": [
            {
                "sha": c.get("sha", "")[:8],
                "message": c.get("commit", {}).get("message", ""),
                "author": c.get("commit", {}).get("author", {}).get("name", ""),
                "date": c.get("commit", {}).get("author", {}).get("date", ""),
            }
            for c in commits[:5]
        ],
        "latest_sha": sha,
        "diff_preview": diff_text[:5000],
    }


async def _get_repo_dependencies(repo: str, token: str) -> list[dict[str, str]]:
    """Try to fetch package.json / requirements.txt from the repo."""
    settings = get_settings()
    base = str(settings.github_api_base_url).rstrip("/")
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
    }
    deps: list[dict[str, str]] = []
    manifest_files = ["package.json", "requirements.txt", "Pipfile", "go.mod", "pom.xml", "Cargo.toml"]

    async with httpx.AsyncClient(timeout=20) as client:
        for path in manifest_files:
            url = f"{base}/repos/{repo}/contents/{path}"
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                import base64
                content = base64.b64decode(data.get("content", "")).decode("utf-8", errors="replace")
                deps.append({"file": path, "content": content[:3000]})
    return deps


async def _query_osv(package_name: str, ecosystem: str = "npm") -> list[dict[str, Any]]:
    """Query OSV.dev for known vulnerabilities in a package."""
    settings = get_settings()
    url = f"{str(settings.osv_base_url).rstrip('/')}/v1/query"
    body = {"package": {"name": package_name, "ecosystem": ecosystem}}
    vulns: list[dict[str, Any]] = []
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(url, json=body)
            if resp.status_code == 200:
                data = resp.json()
                for v in (data.get("vulns") or [])[:10]:
                    severity = "MEDIUM"
                    score = 0.0
                    for s in (v.get("severity") or []):
                        if s.get("type") == "CVSS_V3":
                            score_str = s.get("score", "")
                            try:
                                score = float(score_str) if score_str else 0.0
                            except ValueError:
                                pass
                    if score >= 9.0:
                        severity = "CRITICAL"
                    elif score >= 7.0:
                        severity = "HIGH"
                    elif score >= 4.0:
                        severity = "MEDIUM"
                    else:
                        severity = "LOW"
                    vulns.append({
                        "cve_id": (v.get("aliases") or [""])[0] if v.get("aliases") else v.get("id", ""),
                        "description": (v.get("summary") or v.get("details", ""))[:300],
                        "cvss_score": score,
                        "severity": severity,
                        "package": package_name,
                        "source": "osv",
                    })
    except Exception as e:
        logger.warning("osv_query_failed", package=package_name, error=str(e))
    return vulns


def _cvss_to_severity(score: float) -> str:
    """Map CVSS score to severity enum value for DB."""
    if score >= 9.0:
        return "critical"
    if score >= 7.0:
        return "high"
    if score >= 4.0:
        return "medium"
    if score > 0:
        return "low"
    return "info"


async def _persist_incidents(
    run_id: str, repo: str, vulns: list[dict[str, Any]], tracker: SupabaseAgentTracker
) -> list[str]:
    """Write Angada findings to incidents table. Returns list of incident IDs."""
    if not vulns:
        return []
    settings = get_settings()
    headers = {
        "apikey": settings.admin_key.get_secret_value(),
        "Authorization": f"Bearer {settings.admin_key.get_secret_value()}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    base = f"{str(settings.supabase_url).rstrip('/')}/rest/v1"
    rows = []
    for v in vulns[:20]:
        incident_id = str(uuid.uuid4())
        rows.append({
            "id": incident_id,
            "repo_full_name": repo,
            "scan_run_id": run_id,
            "severity": _cvss_to_severity(v.get("cvss_score", 0)),
            "status": "open",
            "title": f"{v.get('cve_id', 'Unknown')} in {v.get('package', 'unknown')}",
            "description": v.get("description", ""),
            "cve_id": v.get("cve_id"),
            "cvss_score": v.get("cvss_score", 0),
            "package_name": v.get("package"),
            "agent_assigned": "angada",
            "payload": json.dumps(v),
        })
    ids = []
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(f"{base}/incidents", headers=headers, json=rows)
            if resp.status_code < 400:
                created = resp.json()
                ids = [r["id"] for r in created] if isinstance(created, list) else []
                logger.info("incidents_persisted", count=len(ids), run_id=run_id)
            else:
                logger.warning("incidents_persist_failed", status=resp.status_code, body=resp.text[:300])
    except Exception as e:
        logger.warning("incidents_persist_error", error=str(e))
    return ids


async def _persist_patches(
    run_id: str, incident_ids: list[str], patches: list[dict[str, Any]]
) -> None:
    """Write Nala patches to patches table."""
    if not patches:
        return
    settings = get_settings()
    headers = {
        "apikey": settings.admin_key.get_secret_value(),
        "Authorization": f"Bearer {settings.admin_key.get_secret_value()}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    base = f"{str(settings.supabase_url).rstrip('/')}/rest/v1"
    rows = []
    for i, p in enumerate(patches[:20]):
        rows.append({
            "id": str(uuid.uuid4()),
            "incident_id": incident_ids[i] if i < len(incident_ids) else None,
            "scan_run_id": run_id,
            "file_path": p.get("file_path", "unknown"),
            "diff_text": p.get("diff", ""),
            "original_content": p.get("original", ""),
            "patched_content": p.get("patched", ""),
        })
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(f"{base}/patches", headers=headers, json=rows)
            if resp.status_code >= 400:
                logger.warning("patches_persist_failed", status=resp.status_code)
    except Exception as e:
        logger.warning("patches_persist_error", error=str(e))


async def _update_scan_run_status(run_id: str, status: str, stage: str | None = None, **extra: Any) -> None:
    """Update scan_run status and stage in Supabase."""
    settings = get_settings()
    headers = {
        "apikey": settings.admin_key.get_secret_value(),
        "Authorization": f"Bearer {settings.admin_key.get_secret_value()}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    base = f"{str(settings.supabase_url).rstrip('/')}/rest/v1"
    body: dict[str, Any] = {
        "status": status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if stage:
        body["stage"] = stage
    if status == "running" and "started_at" not in extra:
        body["started_at"] = datetime.now(timezone.utc).isoformat()
    if status in ("complete", "failed"):
        body["completed_at"] = datetime.now(timezone.utc).isoformat()
    body.update(extra)
    try:
        url = f"{base}/scan_runs?id=eq.{run_id}"
        async with httpx.AsyncClient(timeout=15) as client:
            await client.patch(url, headers=headers, json=body)
    except Exception as e:
        logger.warning("scan_run_status_update_error", error=str(e))


async def _finalize_scan_run(run_id: str, vuln_count: int, patch_count: int, pr_url: str | None = None) -> None:
    """Mark scan_run complete with counts."""
    await _update_scan_run_status(
        run_id, "complete", stage="completed",
        vulnerabilities_found=vuln_count,
        patches_generated=patch_count,
        pr_url=pr_url,
    )


async def _fail_scan_run(run_id: str, error: str, stage: str | None = None) -> None:
    """Mark scan_run as failed with error details."""
    await _update_scan_run_status(
        run_id, "failed", stage=stage,
        error_message=error[:500],
    )


async def _emit_log(
    run_id: str,
    level: str,
    source: str,
    message: str,
    agent_name: str | None = None,
    meta: dict[str, Any] | None = None,
) -> None:
    """Persist a log event to Supabase log_events table.

    These are real execution logs that the SSE endpoint will stream to the frontend.
    """
    settings = get_settings()
    headers = {
        "apikey": settings.admin_key.get_secret_value(),
        "Authorization": f"Bearer {settings.admin_key.get_secret_value()}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    base = f"{str(settings.supabase_url).rstrip('/')}/rest/v1"
    row = {
        "id": str(uuid.uuid4()),
        "scan_run_id": run_id,
        "level": level,
        "source": source,
        "message": message[:2000],
        "meta": json.dumps(meta or {}),
    }
    if agent_name:
        row["agent_name"] = agent_name
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(f"{base}/log_events", headers=headers, json=row)
    except Exception as e:
        logger.warning("log_emit_failed", error=str(e))


async def _push_patches_and_create_pr(
    repo: str, token: str, run_id: str,
    patches: list[dict[str, Any]], pr_title: str, pr_body: str
) -> dict[str, Any]:
    """Create a pull request for an existing branch with patches.
    
    This function assumes the branch and commits already exist (created by dasharatha).
    It only creates the PR, not the branch or commits.
    
    Args:
        repo: Repository full name (owner/repo)
        token: GitHub token
        run_id: Scan run ID
        patches: List of patch dicts (used for metadata only)
        pr_title: PR title
        pr_body: PR description
        
    Returns:
        Dict with ok, number, html_url on success, or ok=False with error
    """
    settings = get_settings()
    base = str(settings.github_api_base_url).rstrip("/")
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    branch_name = f"raghupati/fix-{run_id[:8]}"
    result: dict[str, Any] = {"ok": False}

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            # Get default branch
            repo_resp = await client.get(f"{base}/repos/{repo}", headers=headers)
            repo_resp.raise_for_status()
            default_branch = repo_resp.json().get("default_branch", "main")
            
            # Verify branch exists
            branch_resp = await client.get(f"{base}/repos/{repo}/git/ref/heads/{branch_name}", headers=headers)
            if branch_resp.status_code != 200:
                logger.error("pr_branch_not_found", branch=branch_name, status=branch_resp.status_code)
                return {"ok": False, "error": f"Branch {branch_name} not found. Ensure dasharatha pushed commits first."}

            # Create PR
            pr_resp = await client.post(
                f"{base}/repos/{repo}/pulls",
                headers=headers,
                json={"title": pr_title, "body": pr_body, "head": branch_name, "base": default_branch},
            )
            if pr_resp.status_code < 400:
                pr_data = pr_resp.json()
                result = {"ok": True, "number": pr_data.get("number"), "html_url": pr_data.get("html_url")}
                logger.info("pr_created", pr_number=pr_data.get("number"), url=pr_data.get("html_url"))
            elif pr_resp.status_code == 422:
                # PR might already exist
                error_msg = pr_resp.json().get("errors", [{}])[0].get("message", "")
                if "pull request already exists" in error_msg.lower():
                    logger.warning("pr_already_exists", branch=branch_name)
                    result = {"ok": False, "error": "PR already exists for this branch"}
                else:
                    result = {"ok": False, "error": pr_resp.text[:300]}
            else:
                result = {"ok": False, "error": pr_resp.text[:300]}
    except httpx.HTTPStatusError as e:
        error_msg = f"HTTP {e.response.status_code}: {e.response.text[:200]}"
        result = {"ok": False, "error": error_msg}
        logger.error("pr_creation_http_error", error=error_msg)
    except httpx.RequestError as e:
        error_msg = f"Network error: {str(e)}"
        result = {"ok": False, "error": error_msg}
        logger.error("pr_creation_network_error", error=error_msg)
    except Exception as e:
        error_msg = f"{type(e).__name__}: {str(e)}"
        result = {"ok": False, "error": error_msg}
        logger.exception("pr_creation_failed", error=error_msg)

    return result


# ── Agent Execution Functions ─────────────────────────────────

async def execute_hanuman(context: dict[str, Any], tracker: SupabaseAgentTracker) -> AgentResult:
    """Hanuman (Watcher): Analyze GitHub webhook/commit data."""
    start = time.monotonic()
    await tracker.update_status("hanuman", "running")

    try:
        repo = context.get("repo_full_name", "")
        token = context.get("github_token", "")

        if not token:
            token = get_settings().github_token.get_secret_value()

        diff_data = await _fetch_github_diff(repo, token)
        deps = await _get_repo_dependencies(repo, token)

        output = {
            "commits": diff_data["commits"],
            "diff_preview": diff_data["diff_preview"][:2000],
            "dependency_files": [d["file"] for d in deps],
            "files_changed": len(diff_data["diff_preview"].split("diff --git")) - 1,
            "trigger_pipeline": True,
            "summary": f"Analyzed {len(diff_data['commits'])} recent commits, found {len(deps)} dependency manifests.",
        }

        duration = int((time.monotonic() - start) * 1000)
        await tracker.update_status("hanuman", "complete", output=output, duration_ms=duration)
        return AgentResult("hanuman", True, output=output, duration_ms=duration)

    except Exception as exc:
        duration = int((time.monotonic() - start) * 1000)
        error = f"{type(exc).__name__}: {exc}"
        await tracker.update_status("hanuman", "failed", error=error, duration_ms=duration)
        return AgentResult("hanuman", False, error=error, duration_ms=duration)


async def execute_rama(context: dict[str, Any], tracker: SupabaseAgentTracker) -> AgentResult:
    """Rama (Commander): Classify severity and plan orchestration."""
    start = time.monotonic()
    await tracker.update_status("rama", "running")

    try:
        settings = get_settings()
        hanuman_output = context.get("hanuman_output", {})

        system = (
            "You are Rama, the commander of the Vanar Sena security team. "
            "Analyze the repository activity and classify the security risk level. "
            "Return JSON with keys: severity (CRITICAL/HIGH/MEDIUM/LOW), "
            "risk_summary (string), should_scan (boolean), priority_packages (list of strings)."
        )
        user = (
            f"Repository: {context.get('repo_full_name', '')}\n"
            f"Watcher report:\n{json.dumps(hanuman_output, indent=2)[:3000]}\n"
            f"Dependency files found: {hanuman_output.get('dependency_files', [])}"
        )

        result = await _call_llm("mistral", settings.model_rama, system, user)
        try:
            output = json.loads(result["content"])
        except json.JSONDecodeError:
            output = {"severity": "MEDIUM", "risk_summary": result["content"][:500], "should_scan": True, "priority_packages": []}

        duration = int((time.monotonic() - start) * 1000)
        await tracker.update_status("rama", "complete", output=output, duration_ms=duration)
        return AgentResult("rama", True, output=output, duration_ms=duration, tokens_used=result["tokens_used"])

    except Exception as exc:
        duration = int((time.monotonic() - start) * 1000)
        error = f"{type(exc).__name__}: {exc}"
        await tracker.update_status("rama", "failed", error=error, duration_ms=duration)
        return AgentResult("rama", False, error=error, duration_ms=duration)


async def execute_angada(context: dict[str, Any], tracker: SupabaseAgentTracker) -> AgentResult:
    """Angada (Security): Query NVD/OSV for vulnerabilities."""
    start = time.monotonic()
    await tracker.update_status("angada", "running")

    try:
        settings = get_settings()
        rama_output = context.get("rama_output", {})
        hanuman_output = context.get("hanuman_output", {})
        priority_packages = rama_output.get("priority_packages", [])
        dep_files = hanuman_output.get("dependency_files", [])

        # Query NVD for the repo's package ecosystem
        vulnerabilities: list[dict[str, Any]] = []
        repo = context.get("repo_full_name", "")

        # Search NVD for known CVEs related to the repo's dependencies
        search_terms = priority_packages if priority_packages else [repo.split("/")[-1]]

        for term in search_terms[:5]:  # Limit to 5 searches
            try:
                nvd_data = await _query_nvd(term)
                total = nvd_data.get("totalResults", 0)
                for vuln in (nvd_data.get("vulnerabilities") or [])[:10]:
                    cve = vuln.get("cve", {})
                    cve_id = cve.get("id", "")
                    descriptions = cve.get("descriptions", [])
                    desc = next((d["value"] for d in descriptions if d.get("lang") == "en"), "")
                    metrics = cve.get("metrics", {})
                    cvss_data = {}
                    for key in ["cvssMetricV31", "cvssMetricV30", "cvssMetricV2"]:
                        if key in metrics and metrics[key]:
                            cvss_data = metrics[key][0].get("cvssData", {})
                            break
                    score = cvss_data.get("baseScore", 0)
                    severity = cvss_data.get("baseSeverity", "UNKNOWN")

                    vulnerabilities.append({
                        "cve_id": cve_id,
                        "description": desc[:300],
                        "cvss_score": score,
                        "severity": severity,
                        "package": term,
                    })
            except Exception as e:
                logger.warning("nvd_query_partial_failure", term=term, error=str(e))

        # Also query OSV for each package
        seen_cves = {v["cve_id"] for v in vulnerabilities}
        for term in search_terms[:5]:
            try:
                osv_vulns = await _query_osv(term)
                for ov in osv_vulns:
                    if ov["cve_id"] not in seen_cves:
                        vulnerabilities.append(ov)
                        seen_cves.add(ov["cve_id"])
            except Exception as e:
                logger.warning("osv_query_partial_failure", term=term, error=str(e))

        output = {
            "vulnerabilities_found": len(vulnerabilities),
            "vulnerabilities": vulnerabilities[:20],
            "packages_scanned": search_terms,
            "sources": ["nvd", "osv"],
            "summary": f"Found {len(vulnerabilities)} vulnerabilities across {len(search_terms)} packages (NVD+OSV).",
        }

        duration = int((time.monotonic() - start) * 1000)
        await tracker.update_status("angada", "complete", output=output, duration_ms=duration)
        return AgentResult("angada", True, output=output, duration_ms=duration)

    except Exception as exc:
        duration = int((time.monotonic() - start) * 1000)
        error = f"{type(exc).__name__}: {exc}"
        await tracker.update_status("angada", "failed", error=error, duration_ms=duration)
        return AgentResult("angada", False, error=error, duration_ms=duration)


async def execute_jambavan(context: dict[str, Any], tracker: SupabaseAgentTracker) -> AgentResult:
    """Jambavan (Analyst): Web research for fix strategies."""
    start = time.monotonic()
    await tracker.update_status("jambavan", "running")

    try:
        settings = get_settings()
        sita_output = context.get("sita_output", context.get("angada_output", {}))
        vulns = sita_output.get("vulnerabilities", [])

        research_results: list[dict[str, Any]] = []

        # Research the top vulnerabilities
        for vuln in vulns[:3]:
            cve_id = vuln.get("cve_id", "")
            package = vuln.get("package", "")
            query = f"{cve_id} fix remediation {package}" if cve_id else f"{package} security vulnerability fix"

            try:
                tavily_data = await _search_tavily(query)
                results = tavily_data.get("results", [])
                research_results.append({
                    "cve_id": cve_id,
                    "package": package,
                    "sources": [
                        {
                            "title": r.get("title", ""),
                            "url": r.get("url", ""),
                            "snippet": r.get("content", "")[:200],
                        }
                        for r in results[:3]
                    ],
                })
            except Exception as e:
                logger.warning("tavily_search_partial_failure", query=query, error=str(e))

        # Synthesize fix strategy via LLM
        system = (
            "You are Jambavan, a security research analyst. Based on the vulnerability data and web research, "
            "produce a structured fix strategy. Return JSON with keys: fix_strategy (string), "
            "confidence_percentage (int 0-100), recommended_version (string or null), "
            "breaking_changes (boolean), sources (list of URLs)."
        )
        user = (
            f"Vulnerabilities:\n{json.dumps(vulns[:5], indent=2)}\n\n"
            f"Web research:\n{json.dumps(research_results, indent=2)[:3000]}"
        )
        llm_result = await _call_llm("mistral", settings.model_jambavan, system, user)
        try:
            analysis = json.loads(llm_result["content"])
        except json.JSONDecodeError:
            analysis = {"fix_strategy": llm_result["content"][:500], "confidence_percentage": 50}

        output = {
            "research": research_results,
            "analysis": analysis,
            "summary": f"Researched {len(research_results)} vulnerabilities, confidence: {analysis.get('confidence_percentage', 'N/A')}%",
        }

        duration = int((time.monotonic() - start) * 1000)
        await tracker.update_status("jambavan", "complete", output=output, duration_ms=duration)
        return AgentResult("jambavan", True, output=output, duration_ms=duration, tokens_used=llm_result["tokens_used"])

    except Exception as exc:
        duration = int((time.monotonic() - start) * 1000)
        error = f"{type(exc).__name__}: {exc}"
        await tracker.update_status("jambavan", "failed", error=error, duration_ms=duration)
        return AgentResult("jambavan", False, error=error, duration_ms=duration)


async def execute_nala(context: dict[str, Any], tracker: SupabaseAgentTracker) -> AgentResult:
    """Nala (Patch): Generate codebase-specific patches."""
    start = time.monotonic()
    await tracker.update_status("nala", "running")

    try:
        settings = get_settings()
        # Support both old (angada) and new (sita) pipeline contexts
        sita_output = context.get("sita_output", context.get("angada_output", {}))
        jambavan_output = context.get("jambavan_output", {})
        hanuman_output = context.get("hanuman_output", {})

        vulns = sita_output.get("vulnerabilities", [])
        analysis = jambavan_output.get("analysis", {})

        if not vulns:
            output = {"patches": [], "summary": "No vulnerabilities to patch — clean scan."}
            duration = int((time.monotonic() - start) * 1000)
            await tracker.update_status("nala", "complete", output=output, duration_ms=duration)
            return AgentResult("nala", True, output=output, duration_ms=duration)

        system = (
            "You are Nala, an elite security patch engineer. You produce REAL, COMPLETE, PRODUCTION-GRADE code — never descriptions, never pseudocode, never placeholders.\n\n"

            "═══ ABSOLUTE RULES (VIOLATION = FAILURE) ═══\n"
            "1. EVERY patch must contain the FULL modified file content in 'patched' — no ellipsis (...), no '# rest of file unchanged', no 'TODO', no 'existing code here'.\n"
            "2. EVERY patch must contain the FULL original file content in 'original'.\n"
            "3. The 'diff' field must be a valid unified diff that can be applied with `patch -p1`.\n"
            "4. NEVER invent imports, functions, classes, or variables that do not exist in the target codebase.\n"
            "5. NEVER assume package versions or APIs — use ONLY the versions and APIs specified in the vulnerability data.\n"
            "6. NEVER generate code that would break existing tests, type checking, or linting.\n"
            "7. NEVER modify unrelated code. Minimal surgical changes ONLY.\n"
            "8. If you are NOT 100% certain the patch is correct, set confidence_percentage below 80 and explain why.\n"
            "9. NEVER hallucinate CVE details, CVSS scores, or affected versions — use ONLY the data provided.\n"
            "10. NEVER output markdown, explanations, or commentary outside the JSON structure.\n\n"

            "═══ PATCH QUALITY GATES ═══\n"
            "- The patched code MUST compile/run in the target language.\n"
            "- The patched code MUST preserve all existing functionality.\n"
            "- The patched code MUST actually fix the vulnerability (not just suppress warnings).\n"
            "- The patched code MUST follow the existing code style and conventions of the file.\n"
            "- If the vulnerability is a dependency issue, upgrade to the EXACT fixed version specified.\n"
            "- If you cannot determine the correct fix with high confidence, emit an empty patches array and explain in summary.\n\n"

            "═══ OUTPUT FORMAT ═══\n"
            "Return strict JSON:\n"
            "{\n"
            '  "patches": [\n'
            '    {\n'
            '      "file_path": "exact/relative/path/to/file.ext",\n'
            '      "description": "One-line description of what was changed and why",\n'
            '      "original": "COMPLETE original file content as a single string",\n'
            '      "patched": "COMPLETE patched file content as a single string",\n'
            '      "diff": "valid unified diff between original and patched",\n'
            '      "content": "COMPLETE patched file content (same as patched)"\n'
            '    }\n'
            '  ],\n'
            '  "tests_added": [{"file_path": "...", "description": "..."}],\n'
            '  "summary": "Concise summary of all patches",\n'
            '  "confidence_percentage": 85,\n'
            '  "blast_radius": "Description of scope and risk of changes",\n'
            '  "uncertainties": ["List any assumptions or uncertainties"]\n'
            "}\n\n"

            "═══ RETRY CONTEXT ═══\n"
            "If this is a retry after CI failure, you will receive 'ci_failure_log' and 'previous_patch_errors'.\n"
            "You MUST address EVERY error in the failure log. Do NOT repeat the same mistakes.\n"
            "If the previous patch was rejected, understand WHY and fix it completely.\n"
        )
        user = (
            f"Repository: {context.get('repo_full_name', '')}\n"
            f"Vulnerabilities:\n{json.dumps(vulns[:5], indent=2)}\n\n"
            f"Fix strategy:\n{json.dumps(analysis, indent=2)[:2000]}\n\n"
            f"Recent diff context:\n{hanuman_output.get('diff_preview', '')[:1500]}\n\n"
        )

        # Add codebase structure from Lakshmana for accurate file references
        lakshmana_output = context.get("lakshmana_output", {})
        if lakshmana_output and lakshmana_output.get("file_tree"):
            user += f"Codebase file tree (for accurate file_path references):\n{json.dumps(lakshmana_output.get('file_tree', []), indent=2)[:3000]}\n\n"
        if lakshmana_output and lakshmana_output.get("data_flows"):
            user += f"Data flow analysis:\n{json.dumps(lakshmana_output.get('data_flows', []), indent=2)[:2000]}\n\n"

        # Add retry context if this is a re-invocation after CI failure
        ci_failure_log = context.get("ci_failure_log")
        if ci_failure_log:
            user += f"═══ RETRY: CI FAILURE LOG (fix these errors) ═══\n{ci_failure_log[:3000]}\n\n"
        previous_patch_errors = context.get("previous_patch_errors")
        if previous_patch_errors:
            user += f"═══ RETRY: PREVIOUS PATCH ERRORS (do NOT repeat) ═══\n{json.dumps(previous_patch_errors, indent=2)[:2000]}\n\n"
        retry_attempt = context.get("nala_retry_attempt", 0)
        if retry_attempt > 0:
            user += f"═══ This is retry attempt #{retry_attempt}. Previous patches failed. Generate COMPLETELY DIFFERENT patches. ═══\n"

        llm_result = await _call_llm("mistral", settings.model_nala, system, user)
        try:
            output = json.loads(llm_result["content"])
        except json.JSONDecodeError:
            output = {"patches": [], "summary": llm_result["content"][:500]}

        duration = int((time.monotonic() - start) * 1000)
        output["nala_mode"] = context.get("nala_mode", "manual")
        await tracker.update_status("nala", "complete", output=output, duration_ms=duration)
        return AgentResult("nala", True, output=output, duration_ms=duration, tokens_used=llm_result["tokens_used"])

    except Exception as exc:
        duration = int((time.monotonic() - start) * 1000)
        error = f"{type(exc).__name__}: {exc}"
        await tracker.update_status("nala", "failed", error=error, duration_ms=duration)
        return AgentResult("nala", False, error=error, duration_ms=duration)


async def execute_sugreeva(context: dict[str, Any], tracker: SupabaseAgentTracker, attempt: int = 1) -> AgentResult:
    """Sugreeva (QA): Monitor GitHub Actions CI runs."""
    start = time.monotonic()
    await tracker.update_status("sugreeva", "running")

    try:
        settings = get_settings()
        repo = context.get("repo_full_name", "")
        token = context.get("github_token", "") or settings.github_token.get_secret_value()
        nala_output = context.get("nala_output", {})

        patches = nala_output.get("patches", [])
        if not patches:
            output = {"ci_status": "skipped", "reason": "No patches to validate", "attempt": attempt}
            duration = int((time.monotonic() - start) * 1000)
            await tracker.update_status("sugreeva", "complete", output=output, duration_ms=duration)
            return AgentResult("sugreeva", True, output=output, duration_ms=duration)

        # Check latest CI run status
        base = str(settings.github_api_base_url).rstrip("/")
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
        }
        async with httpx.AsyncClient(timeout=30) as client:
            url = f"{base}/repos/{repo}/actions/runs"
            resp = await client.get(url, headers=headers, params={"per_page": 5})
            if resp.status_code == 200:
                runs = resp.json().get("workflow_runs", [])
                latest = runs[0] if runs else None
            else:
                latest = None

        if latest:
            ci_output = {
                "workflow_run_id": latest.get("id"),
                "status": latest.get("status"),
                "conclusion": latest.get("conclusion"),
                "html_url": latest.get("html_url"),
                "attempt": attempt,
            }
        else:
            ci_output = {"ci_status": "no_runs_found", "attempt": attempt}

        output = {
            **ci_output,
            "patches_to_validate": len(patches),
            "summary": f"CI check attempt {attempt}: {ci_output.get('conclusion', 'pending')}",
        }

        duration = int((time.monotonic() - start) * 1000)
        await tracker.update_status("sugreeva", "complete", output=output, duration_ms=duration)
        return AgentResult("sugreeva", True, output=output, duration_ms=duration)

    except Exception as exc:
        duration = int((time.monotonic() - start) * 1000)
        error = f"{type(exc).__name__}: {exc}"
        await tracker.update_status("sugreeva", "failed", error=error, duration_ms=duration)
        return AgentResult("sugreeva", False, error=error, duration_ms=duration)


async def execute_vibhishana(context: dict[str, Any], tracker: SupabaseAgentTracker) -> AgentResult:
    """Vibhishana (Comms): Create PR, send Slack/Discord/email notifications."""
    start = time.monotonic()
    await tracker.update_status("vibhishana", "running")

    try:
        settings = get_settings()
        nala_output = context.get("nala_output", {})
        sita_output = context.get("sita_output", context.get("angada_output", {}))
        sugreeva_output = context.get("sugreeva_output", {})

        notifications_sent: list[dict[str, Any]] = []

        # Send Discord notification if configured
        discord_url = getattr(settings, "discord_webhook_url", None)
        if discord_url:
            try:
                discord_secret = discord_url.get_secret_value() if hasattr(discord_url, "get_secret_value") else str(discord_url)
                if discord_secret:
                    vulns = sita_output.get("vulnerabilities_found", 0)
                    repo = context.get("repo_full_name", "")
                    embed = {
                        "content": f"🛡️ **RAGHUPATHI Security Scan Complete** — `{repo}`",
                        "embeds": [{
                            "title": f"Scan Results: {vulns} vulnerabilities found",
                            "color": 0xFF0000 if vulns > 0 else 0x00FF00,
                            "fields": [
                                {"name": "Repository", "value": repo, "inline": True},
                                {"name": "Vulnerabilities", "value": str(vulns), "inline": True},
                                {"name": "Patches", "value": str(len(nala_output.get("patches", []))), "inline": True},
                            ],
                        }],
                    }
                    async with httpx.AsyncClient(timeout=15) as client:
                        resp = await client.post(discord_secret, json=embed)
                        notifications_sent.append({"channel": "discord", "status": resp.status_code})
            except Exception as e:
                notifications_sent.append({"channel": "discord", "error": str(e)})

        # Send Slack notification if configured
        slack_url = settings.slack_webhook_url
        if slack_url:
            try:
                slack_secret = slack_url.get_secret_value()
                if slack_secret:
                    vulns = sita_output.get("vulnerabilities_found", 0)
                    repo = context.get("repo_full_name", "")
                    body = {
                        "text": f"🛡️ RAGHUPATHI Scan Complete — {repo}: {vulns} vulnerabilities found, "
                                f"{len(nala_output.get('patches', []))} patches generated.",
                        "username": "RAGHUPATHI",
                        "icon_emoji": ":shield:",
                    }
                    async with httpx.AsyncClient(timeout=15) as client:
                        resp = await client.post(slack_secret, json=body)
                        notifications_sent.append({"channel": "slack", "status": resp.status_code})
            except Exception as e:
                notifications_sent.append({"channel": "slack", "error": str(e)})

        # Send email via Resend if configured
        resend_key = getattr(settings, "resend_api_key", None)
        if resend_key:
            try:
                key_val = resend_key.get_secret_value() if hasattr(resend_key, "get_secret_value") else str(resend_key)
                if key_val and settings.incident_email_to:
                    vulns = sita_output.get("vulnerabilities_found", 0)
                    repo = context.get("repo_full_name", "")
                    email_body = {
                        "from": f"{settings.resend_from_name} <{settings.resend_from_email}>",
                        "to": [settings.incident_email_to],
                        "subject": f"[RAGHUPATHI] Security Scan: {repo} — {vulns} vulnerabilities",
                        "html": (
                            f"<h2>Security Scan Complete</h2>"
                            f"<p><strong>Repository:</strong> {repo}</p>"
                            f"<p><strong>Vulnerabilities found:</strong> {vulns}</p>"
                            f"<p><strong>Patches generated:</strong> {len(nala_output.get('patches', []))}</p>"
                        ),
                    }
                    async with httpx.AsyncClient(timeout=15) as client:
                        resp = await client.post(
                            "https://api.resend.com/emails",
                            headers={"Authorization": f"Bearer {key_val}", "Content-Type": "application/json"},
                            json=email_body,
                        )
                        notifications_sent.append({"channel": "email", "status": resp.status_code})
            except Exception as e:
                notifications_sent.append({"channel": "email", "error": str(e)})

        output = {
            "notifications": notifications_sent,
            "pr_url": sugreeva_output.get("html_url"),
            "summary": f"Sent {len(notifications_sent)} notifications.",
        }

        duration = int((time.monotonic() - start) * 1000)
        await tracker.update_status("vibhishana", "complete", output=output, duration_ms=duration)
        return AgentResult("vibhishana", True, output=output, duration_ms=duration)

    except Exception as exc:
        duration = int((time.monotonic() - start) * 1000)
        error = f"{type(exc).__name__}: {exc}"
        await tracker.update_status("vibhishana", "failed", error=error, duration_ms=duration)
        return AgentResult("vibhishana", False, error=error, duration_ms=duration)


async def execute_lakshmana(context: dict[str, Any], tracker: SupabaseAgentTracker) -> AgentResult:
    """Lakshmana (Codebase Mapper): Map project structure, trace data flows, build knowledge graph."""
    start = time.monotonic()
    await tracker.update_status("lakshmana", "running")

    try:
        settings = get_settings()
        repo = context.get("repo_full_name", "")
        token = context.get("github_token", "") or settings.github_token.get_secret_value()
        hanuman_output = context.get("hanuman_output", {})

        # Fetch repo tree structure
        base = str(settings.github_api_base_url).rstrip("/")
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }

        tree_entries: list[dict[str, Any]] = []
        async with httpx.AsyncClient(timeout=30) as client:
            # Get repo default branch
            repo_resp = await client.get(f"{base}/repos/{repo}", headers=headers)
            default_branch = "main"
            if repo_resp.status_code == 200:
                default_branch = repo_resp.json().get("default_branch", "main")

            # Get tree recursively
            tree_resp = await client.get(
                f"{base}/repos/{repo}/git/trees/{default_branch}",
                headers=headers,
                params={"recursive": "1"},
            )
            if tree_resp.status_code == 200:
                tree_data = tree_resp.json()
                for entry in (tree_data.get("tree") or [])[:200]:
                    tree_entries.append({
                        "path": entry.get("path", ""),
                        "type": entry.get("type", ""),
                        "size": entry.get("size", 0),
                    })

        # Use LLM to analyze structure and identify entry points
        system = (
            "You are Lakshmana, a codebase mapping specialist. Analyze the repository tree structure "
            "and identify: entry_points (main files), data_flow_paths (how data moves through the app), "
            "config_files, test_directories, dependency_manifests, and risk_areas (files most likely to have vulnerabilities).\n\n"
            "═══ ANTI-HALLUCINATION RULES ═══\n"
            "1. ONLY reference file paths that actually appear in the provided repository tree. NEVER invent paths.\n"
            "2. Data flow paths MUST be inferred from actual file names and structure, not imagined.\n"
            "3. Risk areas MUST be based on observable patterns (e.g., 'auth/', 'api/', 'config/') — not guesses.\n"
            "4. If the tree is empty or incomplete, state what you CAN determine and mark uncertainties.\n"
            "5. NEVER output markdown or commentary outside the JSON structure.\n\n"
            "Return JSON with those keys."
        )
        user = (
            f"Repository: {repo}\n"
            f"Tree structure ({len(tree_entries)} entries):\n"
            f"{json.dumps(tree_entries[:100], indent=2)[:3000]}\n"
            f"Dependency files from watcher: {hanuman_output.get('dependency_files', [])}"
        )

        result = await _call_llm("mistral", getattr(settings, "model_lakshmana", settings.model_rama), system, user)
        try:
            output = json.loads(result["content"])
        except json.JSONDecodeError:
            output = {
                "entry_points": [],
                "data_flow_paths": [],
                "risk_areas": [],
                "raw_analysis": result["content"][:500],
            }

        output["tree_size"] = len(tree_entries)
        output["summary"] = f"Mapped {len(tree_entries)} files. Found {len(output.get('entry_points', []))} entry points, {len(output.get('risk_areas', []))} risk areas."

        duration = int((time.monotonic() - start) * 1000)
        await tracker.update_status("lakshmana", "complete", output=output, duration_ms=duration)
        return AgentResult("lakshmana", True, output=output, duration_ms=duration, tokens_used=result["tokens_used"])

    except Exception as exc:
        duration = int((time.monotonic() - start) * 1000)
        error = f"{type(exc).__name__}: {exc}"
        await tracker.update_status("lakshmana", "failed", error=error, duration_ms=duration)
        return AgentResult("lakshmana", False, error=error, duration_ms=duration)


async def execute_sita(context: dict[str, Any], tracker: SupabaseAgentTracker) -> AgentResult:
    """Sita (Security Analyst): Deep vulnerability scanning combining Angada's NVD/OSV with code analysis."""
    start = time.monotonic()
    await tracker.update_status("sita", "running")

    try:
        settings = get_settings()
        rama_output = context.get("rama_output", {})
        hanuman_output = context.get("hanuman_output", {})
        lakshmana_output = context.get("lakshmana_output", {})
        priority_packages = rama_output.get("priority_packages", [])
        dep_files = hanuman_output.get("dependency_files", [])
        risk_areas = lakshmana_output.get("risk_areas", [])

        repo = context.get("repo_full_name", "")

        # Query NVD and OSV (same as Angada but with Lakshmana's risk areas)
        vulnerabilities: list[dict[str, Any]] = []
        search_terms = priority_packages if priority_packages else [repo.split("/")[-1]]

        for term in search_terms[:5]:
            try:
                nvd_data = await _query_nvd(term)
                for vuln in (nvd_data.get("vulnerabilities") or [])[:10]:
                    cve = vuln.get("cve", {})
                    cve_id = cve.get("id", "")
                    descriptions = cve.get("descriptions", [])
                    desc = next((d["value"] for d in descriptions if d.get("lang") == "en"), "")
                    metrics = cve.get("metrics", {})
                    cvss_data = {}
                    for key in ["cvssMetricV31", "cvssMetricV30", "cvssMetricV2"]:
                        if key in metrics and metrics[key]:
                            cvss_data = metrics[key][0].get("cvssData", {})
                            break
                    score = cvss_data.get("baseScore", 0)
                    severity = cvss_data.get("baseSeverity", "UNKNOWN")
                    vulnerabilities.append({
                        "cve_id": cve_id, "description": desc[:300],
                        "cvss_score": score, "severity": severity, "package": term,
                    })
            except Exception as e:
                logger.warning("sita_nvd_partial_failure", term=term, error=str(e))

        seen_cves = {v["cve_id"] for v in vulnerabilities}
        for term in search_terms[:5]:
            try:
                osv_vulns = await _query_osv(term)
                for ov in osv_vulns:
                    if ov["cve_id"] not in seen_cves:
                        vulnerabilities.append(ov)
                        seen_cves.add(ov["cve_id"])
            except Exception as e:
                logger.warning("sita_osv_partial_failure", term=term, error=str(e))

        # Use LLM for deeper code-level analysis using risk areas
        system = (
            "You are Sita, a security analyst. Based on the vulnerability data and codebase risk areas, "
            "produce a detailed security assessment.\n\n"
            "═══ ANTI-HALLUCINATION RULES ═══\n"
            "1. ONLY report CVEs that appear in the provided NVD/OSV data. NEVER invent CVE IDs.\n"
            "2. ONLY reference file paths that exist in the provided codebase risk areas. NEVER fabricate paths.\n"
            "3. CVSS scores and severity levels MUST come from the NVD data, not your estimation.\n"
            "4. If you are uncertain about a finding, mark it with confidence='low' rather than stating it as fact.\n"
            "5. NEVER claim a vulnerability exists in a specific file unless you have direct evidence.\n"
            "6. The 'evidence' field in each finding MUST contain the actual data that supports the claim.\n"
            "7. NEVER output markdown or commentary outside the JSON structure.\n\n"
            "Return JSON with keys: "
            "findings (array of {cve_id, severity, file_path, line_range, description, evidence, confidence}), "
            "secrets_detected (boolean), misconfigurations (array), overall_risk_score (0-100), "
            "summary (string)."
        )
        user = (
            f"Repository: {repo}\n"
            f"Vulnerabilities from NVD/OSV: {json.dumps(vulnerabilities[:10], indent=2)[:2000]}\n"
            f"Risk areas from codebase mapper: {json.dumps(risk_areas[:10], indent=2)[:1000]}\n"
            f"Dependency files: {dep_files}"
        )

        llm_result = await _call_llm("groq", getattr(settings, "model_sita", settings.model_angada), system, user)
        try:
            analysis = json.loads(llm_result["content"])
        except json.JSONDecodeError:
            analysis = {"findings": vulnerabilities[:10], "overall_risk_score": 50, "summary": llm_result["content"][:500]}

        # Merge NVD/OSV results with LLM analysis
        output = {
            "vulnerabilities_found": len(vulnerabilities),
            "vulnerabilities": vulnerabilities[:20],
            "code_analysis": analysis,
            "packages_scanned": search_terms,
            "sources": ["nvd", "osv", "code_analysis"],
            "summary": f"Found {len(vulnerabilities)} CVEs + {len(analysis.get('findings', []))} code findings. Risk score: {analysis.get('overall_risk_score', 'N/A')}",
        }

        duration = int((time.monotonic() - start) * 1000)
        await tracker.update_status("sita", "complete", output=output, duration_ms=duration)
        return AgentResult("sita", True, output=output, duration_ms=duration, tokens_used=llm_result["tokens_used"])

    except Exception as exc:
        duration = int((time.monotonic() - start) * 1000)
        error = f"{type(exc).__name__}: {exc}"
        await tracker.update_status("sita", "failed", error=error, duration_ms=duration)
        return AgentResult("sita", False, error=error, duration_ms=duration)


async def execute_bharata(context: dict[str, Any], tracker: SupabaseAgentTracker) -> AgentResult:
    """Bharata (Refactor Agent): Code quality improvements alongside security patches."""
    start = time.monotonic()
    await tracker.update_status("bharata", "running")

    try:
        settings = get_settings()
        nala_output = context.get("nala_output", {})
        lakshmana_output = context.get("lakshmana_output", {})
        patches = nala_output.get("patches", [])

        if not patches:
            output = {"refactors": [], "summary": "No patches to refactor around — clean."}
            duration = int((time.monotonic() - start) * 1000)
            await tracker.update_status("bharata", "complete", output=output, duration_ms=duration)
            return AgentResult("bharata", True, output=output, duration_ms=duration)

        system = (
            "You are Bharata, a code quality guardian. Review the security patches and the codebase structure. "
            "Suggest refactoring improvements that complement the security fixes — remove dead code, "
            "improve naming, extract utilities, fix patterns.\n\n"
            "═══ ANTI-HALLUCINATION RULES ═══\n"
            "1. ONLY suggest refactoring for file paths that appear in the provided patches or codebase structure.\n"
            "2. NEVER invent code smells or issues that are not evident from the provided data.\n"
            "3. Each refactor suggestion MUST be actionable and specific — no vague advice.\n"
            "4. The quality_score MUST reflect the actual state of the code, not a guessed average.\n"
            "5. NEVER output markdown or commentary outside the JSON structure.\n\n"
            "Return JSON with keys: "
            "refactors (array of {file_path, description, change_type, priority}), "
            "quality_score (int 0-100), summary (string)."
        )
        user = (
            f"Repository: {context.get('repo_full_name', '')}\n"
            f"Security patches applied:\n{json.dumps(patches[:5], indent=2)[:2000]}\n"
            f"Codebase risk areas: {json.dumps(lakshmana_output.get('risk_areas', [])[:5], indent=2)[:1000]}"
        )

        llm_result = await _call_llm("mistral", getattr(settings, "model_bharata", settings.model_jambavan), system, user)
        try:
            output = json.loads(llm_result["content"])
        except json.JSONDecodeError:
            output = {"refactors": [], "quality_score": 70, "summary": llm_result["content"][:500]}

        output["summary"] = output.get("summary", f"Suggested {len(output.get('refactors', []))} refactoring improvements. Quality score: {output.get('quality_score', 'N/A')}")

        duration = int((time.monotonic() - start) * 1000)
        await tracker.update_status("bharata", "complete", output=output, duration_ms=duration)
        return AgentResult("bharata", True, output=output, duration_ms=duration, tokens_used=llm_result["tokens_used"])

    except Exception as exc:
        duration = int((time.monotonic() - start) * 1000)
        error = f"{type(exc).__name__}: {exc}"
        await tracker.update_status("bharata", "failed", error=error, duration_ms=duration)
        return AgentResult("bharata", False, error=error, duration_ms=duration)


async def execute_shatrughna(context: dict[str, Any], tracker: SupabaseAgentTracker) -> AgentResult:
    """Shatrughna (Deployment Readiness): Validate deployment compatibility after patches."""
    start = time.monotonic()
    await tracker.update_status("shatrughna", "running")

    try:
        settings = get_settings()
        repo = context.get("repo_full_name", "")
        token = context.get("github_token", "") or settings.github_token.get_secret_value()
        nala_output = context.get("nala_output", {})
        bharata_output = context.get("bharata_output", {})
        patches = nala_output.get("patches", [])

        if not patches:
            output = {"deployment_ready": True, "checks": [], "summary": "No patches — deployment unchanged."}
            duration = int((time.monotonic() - start) * 1000)
            await tracker.update_status("shatrughna", "complete", output=output, duration_ms=duration)
            return AgentResult("shatrughna", True, output=output, duration_ms=duration)

        # Check for Dockerfile, CI config, deployment files
        base = str(settings.github_api_base_url).rstrip("/")
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
        }
        deploy_files = ["Dockerfile", "docker-compose.yml", ".github/workflows", "vercel.json", "netlify.toml", "Procfile"]
        found_deploy: list[str] = []
        async with httpx.AsyncClient(timeout=20) as client:
            for f in deploy_files:
                resp = await client.get(f"{base}/repos/{repo}/contents/{f}", headers=headers)
                if resp.status_code == 200:
                    found_deploy.append(f)

        system = (
            "You are Shatrughna, a deployment readiness validator. Assess whether the security patches "
            "could break deployment, Docker builds, or CI pipelines. Return JSON with keys: "
            "deployment_ready (boolean), risks (array of {description, severity, mitigation}), "
            "required_checks (array of strings), summary (string)."
        )
        user = (
            f"Repository: {repo}\n"
            f"Patches applied: {len(patches)} files changed\n"
            f"Patch files: {[p.get('file_path', '') for p in patches[:10]]}\n"
            f"Deployment configs found: {found_deploy}\n"
            f"Refactoring changes: {json.dumps(bharata_output.get('refactors', [])[:3], indent=2)[:500]}"
        )

        llm_result = await _call_llm("groq", getattr(settings, "model_shatrughna", settings.model_sugreeva), system, user)
        try:
            output = json.loads(llm_result["content"])
        except json.JSONDecodeError:
            output = {"deployment_ready": True, "risks": [], "summary": llm_result["content"][:500]}

        output["deploy_configs_found"] = found_deploy
        output["summary"] = output.get("summary", f"Deployment readiness: {'READY' if output.get('deployment_ready', True) else 'BLOCKED'}. {len(output.get('risks', []))} risks identified.")

        duration = int((time.monotonic() - start) * 1000)
        await tracker.update_status("shatrughna", "complete", output=output, duration_ms=duration)
        return AgentResult("shatrughna", True, output=output, duration_ms=duration, tokens_used=llm_result["tokens_used"])

    except Exception as exc:
        duration = int((time.monotonic() - start) * 1000)
        error = f"{type(exc).__name__}: {exc}"
        await tracker.update_status("shatrughna", "failed", error=error, duration_ms=duration)
        return AgentResult("shatrughna", False, error=error, duration_ms=duration)


async def execute_dasharatha(context: dict[str, Any], tracker: SupabaseAgentTracker) -> AgentResult:
    """Dasharatha (GitHub Sync): Manage branch, commits, and push operations with real GitHub API calls."""
    start = time.monotonic()
    await tracker.update_status("dasharatha", "running")

    try:
        settings = get_settings()
        repo = context.get("repo_full_name", "")
        token = context.get("github_token", "") or settings.github_token.get_secret_value()
        nala_output = context.get("nala_output", {})
        patches = nala_output.get("patches", [])
        nala_mode = context.get("nala_mode", "manual")
        run_id = context.get("run_id", "")

        commits_created: list[dict[str, Any]] = []
        branch_name = f"raghupati/fix-{run_id[:8]}" if run_id else "raghupati/fix-latest"
        push_result: dict[str, Any] = {"pushed": False}

        if not patches:
            output = {"commits": [], "push_result": push_result, "branch": branch_name, "summary": "No patches to push."}
            duration = int((time.monotonic() - start) * 1000)
            await tracker.update_status("dasharatha", "complete", output=output, duration_ms=duration)
            return AgentResult("dasharatha", True, output=output, duration_ms=duration)

        base = str(settings.github_api_base_url).rstrip("/")
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }

        # In manual mode, only prepare but don't push
        if nala_mode == "manual":
            output = {
                "commits_prepared": [{"file_path": p.get("file_path", ""), "description": p.get("description", "")} for p in patches[:10]],
                "push_result": {"pushed": False, "reason": "manual_mode_requires_approval"},
                "branch": branch_name,
                "patches_ready": len(patches),
                "summary": f"Prepared {len(patches)} patches for manual review. Awaiting approval to push.",
            }
            duration = int((time.monotonic() - start) * 1000)
            await tracker.update_status("dasharatha", "complete", output=output, duration_ms=duration)
            return AgentResult("dasharatha", True, output=output, duration_ms=duration)

        # In autonomous/dry-run mode, actually push
        import base64 as b64
        async with httpx.AsyncClient(timeout=30) as client:
            # Get default branch SHA
            repo_resp = await client.get(f"{base}/repos/{repo}", headers=headers)
            repo_resp.raise_for_status()
            default_branch = repo_resp.json().get("default_branch", "main")
            ref_resp = await client.get(f"{base}/repos/{repo}/git/ref/heads/{default_branch}", headers=headers)
            ref_resp.raise_for_status()
            base_sha = ref_resp.json()["object"]["sha"]

            # Create branch
            create_ref = await client.post(
                f"{base}/repos/{repo}/git/refs",
                headers=headers,
                json={"ref": f"refs/heads/{branch_name}", "sha": base_sha},
            )
            if create_ref.status_code >= 400 and create_ref.status_code != 422:
                logger.warning("dasharatha_branch_failed", status=create_ref.status_code)

            # Commit each patch file
            for p in patches[:10]:
                file_path = p.get("file_path", "")
                content = p.get("patched", p.get("content", ""))
                if not file_path or not content:
                    continue
                encoded = b64.b64encode(content.encode()).decode()
                check = await client.get(f"{base}/repos/{repo}/contents/{file_path}?ref={branch_name}", headers=headers)
                commit_data: dict[str, Any] = {"message": f"fix(security): patch {file_path}", "content": encoded, "branch": branch_name}
                if check.status_code == 200:
                    commit_data["sha"] = check.json().get("sha", "")
                resp = await client.put(f"{base}/repos/{repo}/contents/{file_path}", headers=headers, json=commit_data)
                if resp.status_code < 400:
                    commits_created.append({
                        "file_path": file_path,
                        "sha": resp.json().get("commit", {}).get("sha", "")[:8],
                        "message": f"fix(security): patch {file_path}",
                    })

        push_result = {
            "pushed": len(commits_created) > 0,
            "branch": branch_name,
            "commits_count": len(commits_created),
        }

        output = {
            "commits": commits_created,
            "push_result": push_result,
            "branch": branch_name,
            "summary": f"Pushed {len(commits_created)} commits to branch {branch_name}.",
        }

        duration = int((time.monotonic() - start) * 1000)
        await tracker.update_status("dasharatha", "complete", output=output, duration_ms=duration)
        return AgentResult("dasharatha", True, output=output, duration_ms=duration)

    except Exception as exc:
        duration = int((time.monotonic() - start) * 1000)
        error = f"{type(exc).__name__}: {exc}"
        await tracker.update_status("dasharatha", "failed", error=error, duration_ms=duration)
        return AgentResult("dasharatha", False, error=error, duration_ms=duration)


async def run_pipeline(
    run_id: str, repo_full_name: str, github_token: str = "",
    nala_mode: str = "manual", branch: str | None = None, scan_profile: str = "full",
) -> dict[str, Any]:
    """Execute the full Vanar Sena pipeline with real-time status tracking.

    Execution order (11 agents):
    1. Hanuman (Watcher / Supervisor)
    2. Rama (Commander / Planner)
    3. Lakshmana (Codebase Mapper) — new
    4. Sita (Security Analyst) + Jambavan (Research) — parallel, new
    5. Nala (Patch Engineer)
    6. Sugreeva (QA) — retries up to 3x
    7. Bharata (Refactor) + Shatrughna (Deploy Readiness) — parallel, new
    8. Dasharatha (GitHub Sync / Push) — new, replaces inline PR creation
    9. Vibhishana (Comms / Notifications)

    Each agent writes PENDING → RUNNING → COMPLETE/FAILED to Supabase.
    """
    settings = get_settings()
    tracker = SupabaseAgentTracker(run_id)

    # Initialize ALL 11 agents in Supabase so frontend sees them
    agent_names = [
        "hanuman", "rama", "lakshmana", "sita", "jambavan",
        "nala", "sugreeva", "bharata", "shatrughna",
        "vibhishana", "dasharatha",
    ]
    await tracker.init_agents(agent_names)
    await _emit_log(run_id, "info", "system", f"Pipeline initialized with {len(agent_names)} agents for {repo_full_name}")
    await _emit_log(run_id, "info", "system", f"Execution mode: {nala_mode}")

    context: dict[str, Any] = {
        "repo_full_name": repo_full_name,
        "github_token": github_token or settings.github_token.get_secret_value(),
        "run_id": run_id,
        "nala_mode": nala_mode,
        "branch": branch,
        "scan_profile": scan_profile,
    }

    # ── Step 1: Hanuman (Watcher) ──────────────────────────────
    await _update_scan_run_status(run_id, "running", stage="hanuman")
    await _emit_log(run_id, "info", "pipeline", "Step 1: Hanuman — Fetching repository activity and dependencies", agent_name="hanuman")
    hanuman_result = await execute_hanuman(context, tracker)
    context["hanuman_output"] = hanuman_result.output

    if not hanuman_result.success:
        logger.error("pipeline_hanuman_failed", run_id=run_id)
        await _emit_log(run_id, "error", "pipeline", f"Hanuman failed: {hanuman_result.error}", agent_name="hanuman")
        await _fail_scan_run(run_id, hanuman_result.error or "Hanuman agent failed", stage="hanuman")
        return {"status": "failed", "stage": "hanuman", "error": hanuman_result.error}
    await _emit_log(run_id, "success", "pipeline", f"Hanuman complete: {hanuman_result.output.get('summary', 'OK')}", agent_name="hanuman")

    # ── Step 2: Rama (Commander) ────────────────────────────────
    await _update_scan_run_status(run_id, "running", stage="rama")
    await _emit_log(run_id, "info", "pipeline", "Step 2: Rama — Classifying severity and planning orchestration", agent_name="rama")
    rama_result = await execute_rama(context, tracker)
    context["rama_output"] = rama_result.output

    if not rama_result.success:
        logger.error("pipeline_rama_failed", run_id=run_id)
        await _emit_log(run_id, "error", "pipeline", f"Rama failed: {rama_result.error}", agent_name="rama")
        await _fail_scan_run(run_id, rama_result.error or "Rama agent failed", stage="rama")
        return {"status": "failed", "stage": "rama", "error": rama_result.error}
    await _emit_log(run_id, "success", "pipeline", f"Rama complete: severity={rama_result.output.get('severity', 'N/A')}", agent_name="rama")

    # ── Step 3: Lakshmana (Codebase Mapper) ─────────────────────
    await _update_scan_run_status(run_id, "running", stage="lakshmana")
    await _emit_log(run_id, "info", "pipeline", "Step 3: Lakshmana — Mapping codebase structure and data flows", agent_name="lakshmana")
    lakshmana_result = await execute_lakshmana(context, tracker)
    context["lakshmana_output"] = lakshmana_result.output
    if lakshmana_result.success:
        await _emit_log(run_id, "success", "pipeline", f"Lakshmana complete: {lakshmana_result.output.get('summary', 'OK')}", agent_name="lakshmana")
    else:
        await _emit_log(run_id, "warn", "pipeline", f"Lakshmana failed (non-fatal): {lakshmana_result.error}", agent_name="lakshmana")

    # ── Step 4: Sita (Security) + Jambavan (Research) in parallel ─
    await _update_scan_run_status(run_id, "running", stage="sita")
    await _emit_log(run_id, "info", "pipeline", "Step 4: Sita + Jambavan — Vulnerability scanning and fix research (parallel)")
    sita_task = execute_sita(context, tracker)
    jambavan_task = execute_jambavan(context, tracker)
    sita_result, jambavan_result = await asyncio.gather(sita_task, jambavan_task)
    context["sita_output"] = sita_result.output
    context["jambavan_output"] = jambavan_result.output
    await _emit_log(run_id, "success", "pipeline", f"Sita complete: {sita_result.output.get('summary', 'OK')}", agent_name="sita")
    await _emit_log(run_id, "success", "pipeline", f"Jambavan complete: {jambavan_result.output.get('summary', 'OK')}", agent_name="jambavan")

    # Persist incidents from Sita findings (replaces Angada)
    vulns = sita_result.output.get("vulnerabilities", [])
    incident_ids = await _persist_incidents(run_id, repo_full_name, vulns, tracker)
    context["incident_ids"] = incident_ids
    await _emit_log(run_id, "info", "pipeline", f"Persisted {len(incident_ids)} incidents to database")

    # ── Step 5: Nala (Patch Engineer) ───────────────────────────
    await _update_scan_run_status(run_id, "running", stage="nala")
    await _emit_log(run_id, "info", "pipeline", "Step 5: Nala — Generating security patches", agent_name="nala")
    nala_result = await execute_nala(context, tracker)
    context["nala_output"] = nala_result.output

    # Persist patches from Nala
    patches = nala_result.output.get("patches", [])
    await _persist_patches(run_id, incident_ids, patches)
    await _emit_log(run_id, "success", "pipeline", f"Nala complete: {len(patches)} patches generated", agent_name="nala", meta={"patch_count": len(patches), "files": [p.get("file_path", "") for p in patches[:5]]})

    # ── Step 6: Sugreeva (QA) + Hanuman Recheck Loop ────────────
    # After Sugreeva validates CI, if it fails, Hanuman rechecks the repo,
    # re-invokes Nala with the CI failure context, and re-runs Sugreeva.
    # This loop continues until CI passes or max retries are exhausted.
    await _update_scan_run_status(run_id, "running", stage="sugreeva")
    await _emit_log(run_id, "info", "pipeline", "Step 6: Sugreeva — QA validation and CI checks", agent_name="sugreeva")
    sugreeva_result = None
    nala_retry_cycle = 0

    for attempt in range(1, settings.max_patch_retries + 1):
        sugreeva_result = await execute_sugreeva(context, tracker, attempt=attempt)
        context["sugreeva_output"] = sugreeva_result.output

        ci_conclusion = sugreeva_result.output.get("conclusion")
        ci_status = sugreeva_result.output.get("ci_status")
        if ci_conclusion == "success" or ci_status in ("skipped", "no_runs_found"):
            break

        # ── CI FAILED: Hanuman recheck + Nala re-invocation ──────
        nala_retry_cycle += 1
        await _emit_log(
            run_id, "warn", "pipeline",
            f"CI attempt {attempt} failed (conclusion={ci_conclusion}). Hanuman rechecking and re-invoking Nala with failure context (cycle #{nala_retry_cycle})",
            agent_name="hanuman",
        )

        # Hanuman re-examines the repo for new issues caused by the patch
        await tracker.update_status("hanuman", "running", output={"action": "recheck", "reason": f"CI failed attempt {attempt}"})
        hanuman_recheck = await execute_hanuman(context, tracker)
        await _emit_log(run_id, "info", "pipeline", f"Hanuman recheck complete: {hanuman_recheck.output.get('summary', 'OK')}", agent_name="hanuman")

        # Collect CI failure details for Nala retry context
        ci_failure_log = sugreeva_result.output.get("failure_log", "") or sugreeva_result.output.get("summary", "CI failed")
        previous_patch_errors = []
        for p in patches:
            previous_patch_errors.append({
                "file_path": p.get("file_path", ""),
                "error": f"Patch caused CI failure: {ci_failure_log[:500]}",
            })

        # Re-invoke Nala with failure context
        context["ci_failure_log"] = ci_failure_log
        context["previous_patch_errors"] = previous_patch_errors
        context["nala_retry_attempt"] = nala_retry_cycle
        await _emit_log(run_id, "info", "pipeline", f"Re-invoking Nala with CI failure context (cycle #{nala_retry_cycle})", agent_name="nala")
        nala_result = await execute_nala(context, tracker)
        context["nala_output"] = nala_result.output

        # Persist new patches
        patches = nala_result.output.get("patches", [])
        await _persist_patches(run_id, incident_ids, patches)
        await _emit_log(run_id, "info", "pipeline", f"Nala retry #{nala_retry_cycle}: {len(patches)} new patches generated", agent_name="nala")

        if attempt < settings.max_patch_retries:
            await asyncio.sleep(5)

    if sugreeva_result:
        await _emit_log(run_id, "success" if sugreeva_result.success else "error", "pipeline", f"Sugreeva complete: {sugreeva_result.output.get('summary', 'OK')}", agent_name="sugreeva")

    # If Sugreeva still failed after all retries, Hanuman escalates
    if sugreeva_result and not sugreeva_result.success and sugreeva_result.output.get("attempt", 0) >= settings.max_patch_retries:
        await tracker.update_status("hanuman", "running", output={"action": "escalating", "reason": f"CI failed {settings.max_patch_retries}x after {nala_retry_cycle} Nala re-invocations"})
        logger.critical("pipeline_escalation", run_id=run_id, repo=repo_full_name)
        await _emit_log(run_id, "error", "pipeline", f"All retries exhausted. CI failed {settings.max_patch_retries}x. Manual review required.", agent_name="hanuman")
        await tracker.update_status("hanuman", "complete", output={"action": "escalation_logged", "reason": "CI failed, manual review required"})

    # ── Step 7: Bharata (Refactor) + Shatrughna (Deploy) in parallel ─
    await _update_scan_run_status(run_id, "running", stage="bharata")
    await _emit_log(run_id, "info", "pipeline", "Step 7: Bharata + Shatrughna — Code quality review and deployment readiness (parallel)")
    bharata_task = execute_bharata(context, tracker)
    shatrughna_task = execute_shatrughna(context, tracker)
    bharata_result, shatrughna_result = await asyncio.gather(bharata_task, shatrughna_task)
    context["bharata_output"] = bharata_result.output
    context["shatrughna_output"] = shatrughna_result.output
    await _emit_log(run_id, "success", "pipeline", f"Bharata complete: {bharata_result.output.get('summary', 'OK')}", agent_name="bharata")
    await _emit_log(run_id, "success", "pipeline", f"Shatrughna complete: {shatrughna_result.output.get('summary', 'OK')}", agent_name="shatrughna")

    # ── Step 8: Dasharatha (GitHub Sync / Push) ─────────────────
    await _update_scan_run_status(run_id, "running", stage="dasharatha")
    await _emit_log(run_id, "info", "pipeline", f"Step 8: Dasharatha — GitHub sync and push (mode={nala_mode})", agent_name="dasharatha")
    dasharatha_result = await execute_dasharatha(context, tracker)
    context["dasharatha_output"] = dasharatha_result.output
    
    # Handle manual vs autonomous mode
    pr_url = None
    if dasharatha_result.success:
        push_result = dasharatha_result.output.get("push_result", {})
        
        if nala_mode == "manual" and not push_result.get("pushed"):
            # Manual mode: patches prepared but awaiting approval
            await _emit_log(run_id, "info", "github", f"Dasharatha: {dasharatha_result.output.get('patches_ready', 0)} patches prepared for manual review", agent_name="dasharatha")
            await _update_scan_run_status(run_id, "awaiting_approval", stage="dasharatha")
            await _emit_log(run_id, "info", "system", "Scan paused: awaiting manual approval to push patches")
        elif push_result.get("pushed"):
            # Autonomous mode: patches pushed, create PR
            await _emit_log(run_id, "success", "github", f"Dasharatha pushed {push_result.get('commits_count', 0)} commits to {dasharatha_result.output.get('branch', 'unknown')}", agent_name="dasharatha")
            
            pr_title = f"fix(security): {repo_full_name} — {len(patches)} security patches"
            pr_body = f"Automated security patch by RAGHUPATI.\n\nVulnerabilities: {sita_result.output.get('vulnerabilities_found', 0)}\nPatches: {len(patches)}\nMode: {nala_mode}\nNala retries: {nala_retry_cycle}"
            pr_result = await _push_patches_and_create_pr(
                repo_full_name, context["github_token"], run_id, patches, pr_title, pr_body,
            )
            if pr_result.get("ok"):
                pr_url = pr_result.get("html_url")
                context["pr_url"] = pr_url
                context["pr_number"] = pr_result.get("number")
                await _emit_log(run_id, "success", "github", f"PR created: {pr_url}", agent_name="dasharatha")
            else:
                await _emit_log(run_id, "error", "github", f"PR creation failed: {pr_result.get('error', 'unknown')}", agent_name="dasharatha")
        else:
            await _emit_log(run_id, "info", "github", f"Dasharatha: patches prepared but not pushed ({push_result.get('reason', 'unknown reason')})", agent_name="dasharatha")
    else:
        await _emit_log(run_id, "error", "pipeline", f"Dasharatha failed: {dasharatha_result.error}", agent_name="dasharatha")

    # ── Step 9: Vibhishana (Comms / Notifications) ──────────────
    await _update_scan_run_status(run_id, "running", stage="vibhishana")
    await _emit_log(run_id, "info", "pipeline", "Step 9: Vibhishana — Sending notifications and creating PR", agent_name="vibhishana")
    vibhishana_result = await execute_vibhishana(context, tracker)

    # Finalize scan_run with counts
    if not pr_url:
        pr_url = vibhishana_result.output.get("pr_url")
    vuln_count = sita_result.output.get("vulnerabilities_found", 0)
    patch_count = len(patches)
    await _finalize_scan_run(run_id, vuln_count, patch_count, pr_url)
    await _emit_log(run_id, "success", "pipeline", f"Scan complete: {vuln_count} vulnerabilities, {patch_count} patches, PR: {pr_url or 'none'}, Nala retries: {nala_retry_cycle}")

    return {
        "status": "complete",
        "run_id": run_id,
        "repo": repo_full_name,
        "vulnerabilities_found": vuln_count,
        "patches_generated": patch_count,
        "incidents_created": len(incident_ids),
        "pr_url": pr_url,
        "notifications_sent": len(vibhishana_result.output.get("notifications", [])),
        "nala_retry_cycles": nala_retry_cycle,
    }
