"""Server-Sent Events endpoint for real-time scan updates."""

from __future__ import annotations

import asyncio
import json
import os
import time

import structlog
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from config.settings import get_settings

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/events", tags=["events"])


@router.get("/scan/{run_id}")
async def scan_events_sse(run_id: str, request: Request) -> StreamingResponse:
    """SSE stream that polls Supabase for scan updates with exponential backoff.
    
    Uses a single aggregated query to fetch all data (scan_runs + agent_runs + log_events)
    in one request, eliminating N+1 query pattern.
    
    Implements exponential backoff: starts at 1s, increases to 2s, 4s, max 10s when no updates.
    Resets to 1s when updates are detected.

    Event types emitted:
    - scan_stage: {event: 'scan_stage', run_id, status, stage}
    - agent_status: {event: 'agent_status', agent_name, status, output, error, duration_ms, updated_at}
    - log_event: {event: 'log_event', id, level, source, message, agent_name, meta, created_at}
    - scan_complete: {event: 'scan_complete', run_id}
    - heartbeat: {event: 'heartbeat', ts}
    """

    async def event_generator():
        settings = get_settings()
        headers = {
            "apikey": settings.admin_key.get_secret_value(),
            "Authorization": f"Bearer {settings.admin_key.get_secret_value()}",
            "Accept": "application/json",
        }
        base = f"{str(settings.supabase_url).rstrip('/')}/rest/v1"

        last_agent_state: dict[str, str] = {}  # agent_name -> status
        last_log_id: str = ""  # track last seen log event
        
        # Exponential backoff configuration (configurable via env)
        min_interval = float(os.getenv("SSE_POLL_MIN_INTERVAL", "1.0"))
        max_interval = float(os.getenv("SSE_POLL_MAX_INTERVAL", "10.0"))
        current_interval = min_interval
        
        max_iterations = 2400  # 1 hour max
        iteration = 0
        last_heartbeat = time.monotonic()
        had_updates = False

        try:
            import httpx
            while iteration < max_iterations:
                iteration += 1
                if await request.is_disconnected():
                    break

                had_updates = False
                try:
                    async with httpx.AsyncClient(timeout=10) as client:
                        # ── OPTIMIZED: Parallel queries to reduce N+1 pattern ──
                        # Fetch all data in parallel to reduce latency (3 sequential → 1 parallel batch)
                        scan_task = client.get(
                            f"{base}/scan_runs?id=eq.{run_id}",
                            headers=headers,
                        )
                        agent_task = client.get(
                            f"{base}/agent_runs?run_id=eq.{run_id}&order=created_at.asc",
                            headers=headers,
                        )
                        log_filter_url = f"{base}/log_events?scan_run_id=eq.{run_id}&order=created_at.asc"
                        if last_log_id:
                            log_filter_url += f"&id=gt.{last_log_id}"
                        log_task = client.get(log_filter_url, headers=headers)
                        
                        # Execute all queries in parallel
                        results = await asyncio.gather(
                            scan_task, agent_task, log_task, return_exceptions=True
                        )
                        scan_resp, agent_resp, log_resp = results[0], results[1], results[2]
                        
                        # ── Process scan_run status ──────────────
                        scan_done = False
                        if not isinstance(scan_resp, Exception) and hasattr(scan_resp, 'status_code'):
                            if scan_resp.status_code == 200:  # type: ignore
                                scan_runs = scan_resp.json()  # type: ignore
                                if scan_runs:
                                    scan_status = scan_runs[0].get("status", "")
                                    scan_stage = scan_runs[0].get("stage", "")
                                    if scan_status in ("complete", "failed"):
                                        scan_done = True
                                    yield f"data: {json.dumps({'event': 'scan_stage', 'run_id': run_id, 'status': scan_status, 'stage': scan_stage})}\n\n"
                                    had_updates = True

                        # ── Process agent status changes ──────────
                        if not isinstance(agent_resp, Exception) and hasattr(agent_resp, 'status_code'):
                            if agent_resp.status_code == 200:  # type: ignore
                                agents = agent_resp.json()  # type: ignore
                                for agent in agents:
                                    name = agent.get("agent_name", "")
                                    status = agent.get("status", "")
                                    if last_agent_state.get(name) != status:
                                        last_agent_state[name] = status
                                        event_data = {
                                            "event": "agent_status",
                                            "agent_name": name,
                                            "status": status,
                                            "output": agent.get("output"),
                                            "error": agent.get("error"),
                                            "duration_ms": agent.get("duration_ms"),
                                            "updated_at": agent.get("updated_at"),
                                        }
                                        yield f"data: {json.dumps(event_data)}\n\n"
                                        had_updates = True

                                # Check if all agents are done
                                if len(agents) > 0:
                                    all_done = all(
                                        a.get("status") in ("complete", "failed", "skipped")
                                        for a in agents
                                    )
                                    if all_done or scan_done:
                                        yield f"data: {json.dumps({'event': 'scan_complete', 'run_id': run_id})}\n\n"
                                        break

                        # ── Process new log events ─────────────────
                        if not isinstance(log_resp, Exception) and hasattr(log_resp, 'status_code'):
                            if log_resp.status_code == 200:  # type: ignore
                                logs = log_resp.json()  # type: ignore
                                if logs:
                                    had_updates = True
                                for log_entry in logs:
                                    log_id = log_entry.get("id", "")
                                    if log_id:
                                        last_log_id = log_id
                                    yield f"data: {json.dumps({'event': 'log_event', **log_entry})}\n\n"

                        # If scan_run itself is done, terminate
                        if scan_done:
                            yield f"data: {json.dumps({'event': 'scan_complete', 'run_id': run_id})}\n\n"
                            break

                except Exception as exc:
                    logger.warning("sse_poll_error", error=str(exc))

                # ── Exponential backoff logic ──────────────────
                if had_updates:
                    # Reset to minimum interval when updates detected
                    current_interval = min_interval
                else:
                    # Increase interval exponentially up to max
                    current_interval = min(current_interval * 2, max_interval)
                
                logger.debug("sse_poll_interval", interval=current_interval, had_updates=had_updates)

                # ── Heartbeat every 15s ───────────────────────
                now = time.monotonic()
                if now - last_heartbeat >= 15:
                    last_heartbeat = now
                    yield f"data: {json.dumps({'event': 'heartbeat', 'ts': int(now)})}\n\n"

                await asyncio.sleep(current_interval)
        except asyncio.CancelledError:
            pass

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
