"""Authentication helpers for Google ID tokens and optional NextAuth JWTs."""

from __future__ import annotations

from typing import Any

import httpx
import structlog
from fastapi import HTTPException, Request, status
from jose import jwt, jwk
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

from config.settings import get_settings

logger = structlog.get_logger(__name__)


def verify_google_id_token(token: str, *, client_id: str) -> dict[str, Any]:
    """Verify a Google-issued OIDC ID token using Google's JWKS.

    Args:
        token: Raw JWT string (without ``Bearer`` prefix).
        client_id: Expected Google OAuth audience.

    Returns:
        Decoded JWT claims.

    Raises:
        HTTPException: If verification fails.
    """
    try:
        headers = jwt.get_unverified_header(token)
        kid = str(headers.get("kid") or "")
        if not kid:
            raise ValueError("missing_kid")
        with httpx.Client(timeout=10.0) as client:
            response = client.get("https://www.googleapis.com/oauth2/v3/certs")
            response.raise_for_status()
            jwks = response.json()
    except Exception as exc:
        logger.exception("google_jwks_fetch_failed", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unable to verify identity provider keys",
        ) from exc
    keys = jwks.get("keys") or []
    key_data = next((k for k in keys if str(k.get("kid")) == kid), None)
    if key_data is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown signing key")
    try:
        public_key = jwk.construct(key_data)
        pem = public_key.to_pem()
        if isinstance(pem, bytes):
            pem_text = pem.decode("utf-8")
        else:
            pem_text = str(pem)
        claims = jwt.decode(
            token,
            pem_text,
            algorithms=["RS256"],
            audience=client_id,
            issuer="https://accounts.google.com",
        )
    except Exception as exc:
        logger.exception("google_jwt_verify_failed", error=str(exc))
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token") from exc
    return dict(claims)


def verify_nextauth_jwt(token: str, *, secret: str) -> dict[str, Any]:
    """Verify a NextAuth-style HS256 JWT.

    Args:
        token: Raw JWT string.
        secret: Shared HS256 secret.

    Returns:
        Decoded JWT claims.

    Raises:
        HTTPException: If verification fails.
    """
    try:
        claims = jwt.decode(token, secret, algorithms=["HS256"])
    except Exception as exc:
        logger.exception("nextauth_jwt_verify_failed", error=str(exc))
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session token") from exc
    return dict(claims)


def extract_bearer_token(request: Request) -> str | None:
    """Extract a Bearer token from the ``Authorization`` header.

    Args:
        request: Incoming HTTP request.

    Returns:
        Token string or ``None`` if missing.
    """
    header = request.headers.get("Authorization") or ""
    if not header.lower().startswith("bearer "):
        return None
    return header.split(" ", 1)[1].strip()


def verify_bearer_token(token: str) -> dict[str, Any]:
    """Verify a bearer token as either a Google ID token or a NextAuth JWT.

    Args:
        token: Raw JWT string.

    Returns:
        Decoded claims.

    Raises:
        HTTPException: If no verifier succeeds.
    """
    settings = get_settings()
    try:
        return verify_google_id_token(token, client_id=settings.google_client_id)
    except HTTPException:
        secret = settings.nextauth_secret.get_secret_value() if settings.nextauth_secret else ""
        if not secret:
            raise
        return verify_nextauth_jwt(token, secret=secret)


class JWTAuthMiddleware(BaseHTTPMiddleware):
    """Require a valid JWT for protected routes (everything except health/webhook)."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        """Validate JWT on protected paths.

        Args:
            request: Incoming request.
            call_next: Next middleware/handler.

        Returns:
            HTTP response.
        """
        settings = get_settings()
        path = request.url.path
        if request.method == "OPTIONS":
            return await call_next(request)
        # Dev-mode bypass — skip auth for all routes during local development
        if settings.environment == "development":
            return await call_next(request)
        if path.startswith("/health") or path.startswith("/webhook") or path in {"/docs", "/openapi.json", "/redoc"}:
            return await call_next(request)
        token = extract_bearer_token(request)
        if not token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
        verify_bearer_token(token)
        return await call_next(request)
