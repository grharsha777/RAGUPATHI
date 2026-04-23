"""Resend email delivery for incident reporting (replaces SendGrid)."""

from __future__ import annotations

import json
from typing import Any

import httpx
import structlog
from crewai.tools import BaseTool
from tenacity import retry, stop_after_attempt, wait_exponential

from config.settings import get_settings

logger = structlog.get_logger(__name__)


class ResendEmailTool(BaseTool):
    """Send HTML email using the Resend API."""

    name: str = "resend_email"
    description: str = (
        "Send an HTML email via Resend. Input JSON: "
        '{"to":"ops@example.com","subject":"...","html":"<p>...</p>"}.'
    )

    def _run(self, query: str) -> str:
        """Send email via Resend REST API.

        Args:
            query: JSON string with recipients and HTML body.

        Returns:
            JSON string with Resend response metadata.
        """
        settings = get_settings()
        try:
            payload = json.loads(query)
        except json.JSONDecodeError as exc:
            logger.exception("resend_invalid_json", error=str(exc))
            return json.dumps({"ok": False, "error": "invalid_json"})

        resend_key = settings.resend_api_key
        if not resend_key:
            return json.dumps({"ok": False, "error": "RESEND_API_KEY not configured"})

        to_email = str(payload.get("to") or settings.incident_email_to or "")
        subject = str(payload.get("subject", "RAGHUPATHI security incident"))
        html = str(payload.get("html", "<p></p>"))

        if not to_email:
            return json.dumps({"ok": False, "error": "recipient_required"})

        body = {
            "from": f"{settings.resend_from_name} <{settings.resend_from_email}>",
            "to": [to_email],
            "subject": subject,
            "html": html,
        }

        @retry(
            stop=stop_after_attempt(3),
            wait=wait_exponential(multiplier=0.5, min=0.5, max=8),
            reraise=True,
        )
        def _send() -> httpx.Response:
            with httpx.Client(timeout=30) as client:
                return client.post(
                    "https://api.resend.com/emails",
                    headers={
                        "Authorization": f"Bearer {resend_key.get_secret_value()}",
                        "Content-Type": "application/json",
                    },
                    json=body,
                )

        try:
            response = _send()
            response.raise_for_status()
            data = response.json()
        except Exception as exc:
            logger.exception("resend_send_failed", error=str(exc))
            return json.dumps({"ok": False, "error": "resend_failed"})

        return json.dumps({"ok": True, "id": data.get("id"), "status_code": response.status_code})
