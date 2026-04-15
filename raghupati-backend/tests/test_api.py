"""Tests for FastAPI routes (no external network calls)."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture()
def client() -> TestClient:
    """Provide a synchronous FastAPI test client.

    Returns:
        ``TestClient`` bound to the ASGI app.
    """
    return TestClient(app)


def test_health_endpoint_returns_payload(client: TestClient) -> None:
    """Health endpoint should return JSON with a status field."""
    with patch(
        "api.routes.health.collect_full_health_report",
        new=AsyncMock(return_value={"status": "ok", "agents": {}}),
    ):
        response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert "status" in body


def test_webhook_rejects_bad_signature(client: TestClient) -> None:
    """GitHub webhooks must be rejected when signature verification fails."""
    response = client.post(
        "/webhook/github",
        data=b"{}",
        headers={
            "X-GitHub-Event": "ping",
            "X-GitHub-Delivery": "123",
            "X-Hub-Signature-256": "sha256=deadbeef",
        },
    )
    assert response.status_code == 401
