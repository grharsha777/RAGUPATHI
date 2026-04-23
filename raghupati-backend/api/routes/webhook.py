import asyncio
import time
import uuid
from collections import defaultdict, deque
from typing import Deque

import structlog
from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, Request, status

from config.settings import get_settings
from core.pipeline import run_pipeline
from models.webhook import WebhookProcessingResult
from tools.github_tool import parse_github_webhook_payload, verify_github_signature

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/webhook", tags=["webhook"])

_RATE_BUCKETS: dict[str, Deque[float]] = defaultdict(deque)


def _rate_limited(client_ip: str) -> bool:
    """Return True when the client should be throttled.

    Args:
        client_ip: Remote IP string.

    Returns:
        ``True`` if the caller exceeded the configured per-minute quota.
    """
    settings = get_settings()
    now = time.monotonic()
    window = 60.0
    bucket = _RATE_BUCKETS[client_ip]
    while bucket and now - bucket[0] > window:
        bucket.popleft()
    if len(bucket) >= settings.github_webhook_rate_limit_per_minute:
        return True
    bucket.append(now)
    return False


async def _handle_github_event(event: str, delivery_id: str, payload: dict[str, object]) -> None:
    """Trigger the Vanar Sena pipeline for qualifying GitHub events.

    Args:
        event: GitHub ``X-GitHub-Event`` value.
        delivery_id: Unique delivery identifier.
        payload: Parsed webhook JSON body.
    """
    settings = get_settings()
    repo_obj = payload.get("repository") or {}
    repo_full_name = str(repo_obj.get("full_name") or "unknown/unknown")
    run_id = str(uuid.uuid4())
    try:
        result = await run_pipeline(
            run_id=run_id,
            repo_full_name=repo_full_name,
            github_token=settings.github_token.get_secret_value(),
        )
        logger.info("webhook_pipeline_completed", run_id=run_id, result=str(result)[:2000])
    except Exception as exc:
        logger.exception("webhook_pipeline_failed", run_id=run_id, error=str(exc))


@router.post("/github", response_model=WebhookProcessingResult)
async def github_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_github_event: str = Header(..., alias="X-GitHub-Event"),
    x_github_delivery: str = Header(..., alias="X-GitHub-Delivery"),
    x_hub_signature_256: str | None = Header(default=None, alias="X-Hub-Signature-256"),
) -> WebhookProcessingResult:
    """Verify and enqueue processing for GitHub webhook deliveries.

    Args:
        request: Raw ASGI request (body bytes for HMAC verification).
        background_tasks: FastAPI background task queue.
        x_github_event: GitHub event type header.
        x_github_delivery: Delivery id header.
        x_hub_signature_256: HMAC signature header.

    Returns:
        Structured acceptance response.

    Raises:
        HTTPException: On verification failures or malformed payloads.
    """
    settings = get_settings()
    client_ip = str(request.client.host if request.client else "unknown")
    if _rate_limited(client_ip):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="rate_limited")
    raw_body = await request.body()
    secret = settings.github_webhook_secret.get_secret_value()
    if not verify_github_signature(secret, raw_body, x_hub_signature_256):
        logger.error("github_webhook_signature_invalid", delivery_id=x_github_delivery)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_signature")
    try:
        payload = parse_github_webhook_payload(raw_body)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_json") from exc

    should_run = x_github_event in {"push", "pull_request", "workflow_run", "ping"}
    if should_run:
        background_tasks.add_task(_handle_github_event, x_github_event, x_github_delivery, payload)
    return WebhookProcessingResult(
        accepted=True,
        event=x_github_event,
        delivery_id=x_github_delivery,
        message="queued" if should_run else "ignored_event",
        pipeline_triggered=should_run,
    )
