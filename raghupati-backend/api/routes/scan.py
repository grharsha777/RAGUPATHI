"""Scan API routes — trigger manual scans and get agent status."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

from config.settings import get_settings
from core.pipeline import run_pipeline, _push_patches_and_create_pr, _emit_log, _update_scan_run_status, _fail_scan_run

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/scan", tags=["scan"])


class ScanRequest(BaseModel):
    """Request body for triggering a manual scan."""
    repo_full_name: str
    github_token: str | None = None
    nala_mode: str = "manual"  # "autonomous" | "manual"
    branch: str | None = None
    scan_profile: str = "full"  # "full" | "quick" | "deps-only"


class ScanResponse(BaseModel):
    """Response after accepting a scan request."""
    run_id: str
    repo_full_name: str
    status: str
    message: str


@router.post("", response_model=ScanResponse)
async def trigger_scan(
    request: ScanRequest,
    background_tasks: BackgroundTasks,
) -> ScanResponse:
    """Trigger a manual security scan for a repository.

    Creates a new run_id, initializes all 7 agent records as PENDING in Supabase,
    and kicks off the pipeline in a background task.
    """
    settings = get_settings()
    run_id = str(uuid.uuid4())
    token = request.github_token or settings.github_token.get_secret_value()

    if not request.repo_full_name or "/" not in request.repo_full_name:
        raise HTTPException(status_code=400, detail="repo_full_name must be in 'owner/repo' format")

    # Create scan_run record in Supabase
    try:
        import httpx
        headers = {
            "apikey": settings.admin_key.get_secret_value(),
            "Authorization": f"Bearer {settings.admin_key.get_secret_value()}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }
        base = f"{str(settings.supabase_url).rstrip('/')}/rest/v1"
        scan_record = {
            "id": run_id,
            "user_id": run_id,  # Will be overridden by auth middleware in production
            "repo_full_name": request.repo_full_name,
            "trigger_type": "manual",
            "status": "pending",
            "started_at": datetime.now(timezone.utc).isoformat(),
        }
        with httpx.Client(timeout=15) as client:
            resp = client.post(f"{base}/scan_runs", headers=headers, json=scan_record)
            if resp.status_code >= 400:
                logger.warning("scan_run_record_failed", status=resp.status_code, body=resp.text[:300])
    except Exception as exc:
        logger.warning("scan_run_record_error", error=str(exc))

    # Launch pipeline in background
    background_tasks.add_task(
        _run_pipeline_safe, run_id, request.repo_full_name, token,
        nala_mode=request.nala_mode, branch=request.branch, scan_profile=request.scan_profile,
    )

    return ScanResponse(
        run_id=run_id,
        repo_full_name=request.repo_full_name,
        status="accepted",
        message="Pipeline started. Subscribe to Supabase Realtime on agent_runs table for live updates.",
    )


async def _run_pipeline_safe(
    run_id: str, repo: str, token: str,
    nala_mode: str = "manual", branch: str | None = None, scan_profile: str = "full",
) -> None:
    """Wrapper that catches all exceptions so the background task never crashes silently."""
    try:
        result = await run_pipeline(
            run_id, repo, token,
            nala_mode=nala_mode, branch=branch, scan_profile=scan_profile,
        )
        logger.info("pipeline_complete", run_id=run_id, result=str(result)[:500])
    except Exception as exc:
        logger.exception("pipeline_crashed", run_id=run_id, error=str(exc))
        # Ensure scan_run is marked failed even if pipeline crashes unhandled
        try:
            await _fail_scan_run(run_id, f"Unhandled pipeline crash: {exc}", stage="unknown")
        except Exception as e:
            logger.error("fail_scan_run_error", run_id=run_id, error=str(e))


@router.get("/status/{run_id}")
async def get_scan_status(run_id: str) -> dict:
    """Get real-time status of all 7 agents for a given scan run.

    Returns the current status from Supabase agent_runs table.
    """
    settings = get_settings()
    try:
        import httpx
        headers = {
            "apikey": settings.admin_key.get_secret_value(),
            "Authorization": f"Bearer {settings.admin_key.get_secret_value()}",
            "Accept": "application/json",
        }
        base = f"{str(settings.supabase_url).rstrip('/')}/rest/v1"
        url = f"{base}/agent_runs?run_id=eq.{run_id}&order=created_at.asc"
        with httpx.Client(timeout=15) as client:
            resp = client.get(url, headers=headers)
            resp.raise_for_status()
            agents = resp.json()
    except Exception as exc:
        logger.exception("scan_status_fetch_failed", error=str(exc))
        raise HTTPException(status_code=500, detail="Failed to fetch agent status")

    return {
        "run_id": run_id,
        "agents": agents,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


class ApprovalRequest(BaseModel):
    """Request body for approving a push/PR in manual mode."""
    action: str  # "push" | "pr" | "push_and_pr"


@router.post("/{run_id}/approve")
async def approve_action(run_id: str, request: ApprovalRequest) -> dict:
    """Approve a pending push or PR action in manual mode.

    This endpoint is called when the user clicks "Approve" in the UI
    after reviewing patches in manual mode. It reads the patches from
    Supabase and performs the actual GitHub operations.
    """
    settings = get_settings()
    api_key = settings.admin_key.get_secret_value()
    headers = {
        "apikey": api_key,
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
    }
    base = f"{str(settings.supabase_url).rstrip('/')}/rest/v1"

    try:
        import httpx
        with httpx.Client(timeout=15) as client:
            # Get scan run
            scan_resp = client.get(f"{base}/scan_runs?id=eq.{run_id}", headers=headers)
            scan_resp.raise_for_status()
            runs = scan_resp.json()
            if not runs:
                raise HTTPException(status_code=404, detail="Scan run not found")
            scan_run = runs[0]
            repo = scan_run.get("repo_full_name", "")

            # Get patches
            patch_resp = client.get(f"{base}/patches?scan_run_id=eq.{run_id}", headers=headers)
            patch_resp.raise_for_status()
            patches_raw = patch_resp.json()

            # Convert patches to format expected by _push_patches_and_create_pr
            patches = []
            for p in patches_raw:
                patches.append({
                    "file_path": p.get("file_path", ""),
                    "patched": p.get("patched_content", ""),
                    "original": p.get("original_content", ""),
                    "diff": p.get("diff_text", ""),
                })

        if not patches:
            raise HTTPException(status_code=400, detail="No patches to approve")

        token = settings.github_token.get_secret_value()
        await _emit_log(run_id, "info", "system", f"Manual approval received for {request.action}")

        result: dict = {"approved": True, "action": request.action}

        if request.action in ("push", "push_and_pr"):
            pr_title = f"fix(security): {repo} — {len(patches)} security patches"
            pr_body = f"Security patches approved manually via RAGHUPATI.\n\nPatches: {len(patches)}\nMode: manual (approved)"
            pr_result = await _push_patches_and_create_pr(
                repo, token, run_id, patches, pr_title, pr_body,
            )
            result["push_result"] = pr_result
            if pr_result.get("ok"):
                await _emit_log(run_id, "success", "github", f"Push approved: {pr_result.get('number', '')} commits pushed, PR created")
                # Update scan_run with PR URL
                await _update_scan_run_status(run_id, scan_run.get("status", "complete"),
                    pr_url=pr_result.get("html_url"))
            else:
                await _emit_log(run_id, "error", "github", f"Push failed: {pr_result.get('error', 'unknown')}")

        return result

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("approval_failed", run_id=run_id, error=str(exc))
        await _emit_log(run_id, "error", "system", f"Approval action failed: {exc}")
        raise HTTPException(status_code=500, detail=f"Approval failed: {exc}")
