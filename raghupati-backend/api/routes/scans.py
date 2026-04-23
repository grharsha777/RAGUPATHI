"""Scan history and run management API routes."""

from __future__ import annotations

from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config.settings import get_settings

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/scans", tags=["scans"])


class ScanRunSummary(BaseModel):
    id: str
    repo_full_name: str
    trigger_type: str
    status: str
    stage: str | None = None
    started_at: str | None = None
    completed_at: str | None = None
    vulnerabilities_found: int = 0
    patches_generated: int = 0
    pr_url: str | None = None
    error_message: str | None = None


@router.get("", response_model=list[ScanRunSummary])
async def list_scan_runs(
    repo: str | None = None,
    limit: int = 20,
    offset: int = 0,
) -> list[ScanRunSummary]:
    """List scan run history, optionally filtered by repo."""
    settings = get_settings()
    # Use admin key (service role) for Supabase REST API calls
    api_key = settings.admin_key.get_secret_value()
    headers = {
        "apikey": api_key,
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
    }
    base = f"{str(settings.supabase_url).rstrip('/')}/rest/v1"

    query_params: dict[str, str] = {
        "order": "created_at.desc",
        "limit": str(min(limit, 100)),
        "offset": str(offset),
    }
    if repo:
        query_params["repo_full_name"] = f"eq.{repo}"

    try:
        import httpx
        url = f"{base}/scan_runs"
        with httpx.Client(timeout=15) as client:
            resp = client.get(url, headers=headers, params=query_params)
            if resp.status_code == 401:
                logger.error("supabase_auth_failed", status=resp.status_code)
                return []
            resp.raise_for_status()
            runs = resp.json()

        return [
            ScanRunSummary(
                id=r.get("id", ""),
                repo_full_name=r.get("repo_full_name", ""),
                trigger_type=r.get("trigger_type", "manual"),
                status=r.get("status", "pending"),
                stage=r.get("stage"),
                started_at=r.get("started_at"),
                completed_at=r.get("completed_at"),
                vulnerabilities_found=r.get("vulnerabilities_found", 0),
                patches_generated=r.get("patches_generated", 0),
                pr_url=r.get("pr_url"),
                error_message=r.get("error_message"),
            )
            for r in runs
        ]
    except Exception as exc:
        logger.exception("scan_runs_list_failed", error=str(exc))
        raise HTTPException(status_code=500, detail="Failed to fetch scan runs")


@router.get("/{run_id}", response_model=dict)
async def get_scan_run_detail(run_id: str) -> dict:
    """Get full scan run detail including all agent outputs."""
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
            scan_resp = client.get(
                f"{base}/scan_runs?id=eq.{run_id}",
                headers=headers,
            )
            if scan_resp.status_code == 401:
                raise HTTPException(status_code=502, detail="Supabase authentication failed — check SUPABASE_KEY env var")
            scan_resp.raise_for_status()
            runs = scan_resp.json()
            if not runs:
                raise HTTPException(status_code=404, detail="Scan run not found")
            scan_run = runs[0]

            # Get agent runs
            agent_resp = client.get(
                f"{base}/agent_runs?run_id=eq.{run_id}&order=created_at.asc",
                headers=headers,
            )
            agent_resp.raise_for_status()
            agents = agent_resp.json()

            # Get incidents
            incident_resp = client.get(
                f"{base}/incidents?scan_run_id=eq.{run_id}&order=created_at.desc",
                headers=headers,
            )
            incident_resp.raise_for_status()
            incidents = incident_resp.json()

            # Get patches
            patch_resp = client.get(
                f"{base}/patches?scan_run_id=eq.{run_id}",
                headers=headers,
            )
            patch_resp.raise_for_status()
            patches = patch_resp.json()

        return {
            "scan_run": scan_run,
            "agents": agents,
            "incidents": incidents,
            "patches": patches,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("scan_run_detail_failed", error=str(exc))
        raise HTTPException(status_code=500, detail=f"Failed to fetch scan run detail: {exc}")


@router.get("/{run_id}/patches", response_model=list[dict])
async def get_scan_patches(run_id: str) -> list[dict]:
    """Get all patches for a scan run with full diff content."""
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
            resp = client.get(
                f"{base}/patches?scan_run_id=eq.{run_id}&order=created_at.asc",
                headers=headers,
            )
            resp.raise_for_status()
            patches = resp.json()

        return patches
    except Exception as exc:
        logger.exception("scan_patches_failed", error=str(exc))
        raise HTTPException(status_code=500, detail=f"Failed to fetch patches: {exc}")


@router.get("/{run_id}/logs", response_model=list[dict])
async def get_scan_logs(run_id: str, limit: int = 200) -> list[dict]:
    """Get log events for a scan run."""
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
            resp = client.get(
                f"{base}/log_events?scan_run_id=eq.{run_id}&order=created_at.asc&limit={min(limit, 500)}",
                headers=headers,
            )
            resp.raise_for_status()
            logs = resp.json()

        return logs
    except Exception as exc:
        logger.exception("scan_logs_failed", error=str(exc))
        raise HTTPException(status_code=500, detail=f"Failed to fetch logs: {exc}")
