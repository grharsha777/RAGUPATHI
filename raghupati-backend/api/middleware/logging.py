"""Structured request/response logging middleware."""

from __future__ import annotations

import time
import uuid

import structlog
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

logger = structlog.get_logger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Emit structured JSON logs for each HTTP request."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        """Log request metadata, timing, and response status.

        Args:
            request: Incoming request.
            call_next: Next middleware/handler.

        Returns:
            HTTP response.
        """
        request_id = str(uuid.uuid4())
        start = time.perf_counter()
        structlog.contextvars.bind_contextvars(request_id=request_id)
        logger.info(
            "http_request_started",
            method=request.method,
            path=str(request.url.path),
            client=str(request.client.host if request.client else ""),
        )
        try:
            response = await call_next(request)
        except Exception:
            duration_ms = (time.perf_counter() - start) * 1000.0
            logger.exception("http_request_failed", duration_ms=duration_ms)
            raise
        duration_ms = (time.perf_counter() - start) * 1000.0
        logger.info(
            "http_request_completed",
            status_code=response.status_code,
            duration_ms=round(duration_ms, 3),
        )
        structlog.contextvars.clear_contextvars()
        return response
