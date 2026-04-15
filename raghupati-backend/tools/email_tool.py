"""SendGrid HTML email delivery for incident reporting."""

from __future__ import annotations

import json
from typing import Any

import structlog
from crewai.tools import BaseTool
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from tenacity import retry, stop_after_attempt, wait_exponential

from config.settings import get_settings

logger = structlog.get_logger(__name__)


class SendGridEmailTool(BaseTool):
    """Send HTML email using SendGrid."""

    name: str = "sendgrid_email"
    description: str = (
        "Send an HTML email. Input JSON: "
        "{\"to\":\"ops@example.com\",\"subject\":\"...\",\"html\":\"<p>...</p>\"}."
    )

    def _run(self, query: str) -> str:
        """Send email via SendGrid v3 API.

        Args:
            query: JSON string with recipients and HTML body.

        Returns:
            JSON string with SendGrid response metadata.
        """
        settings = get_settings()
        try:
            payload = json.loads(query)
        except json.JSONDecodeError as exc:
            logger.exception("sendgrid_invalid_json", error=str(exc))
            return json.dumps({"ok": False, "error": "invalid_json"})
        to_email = str(payload.get("to") or settings.incident_email_to or "")
        subject = str(payload.get("subject", "RAGHUPATI security incident"))
        html = str(payload.get("html", "<p></p>"))
        if not to_email:
            return json.dumps({"ok": False, "error": "recipient_required"})
        message = Mail(
            from_email=(settings.sendgrid_from_email, settings.sendgrid_from_name),
            to_emails=to_email,
            subject=subject,
            html_content=html,
        )
        client = SendGridAPIClient(settings.sendgrid_api_key.get_secret_value())

        @retry(
            stop=stop_after_attempt(3),
            wait=wait_exponential(multiplier=0.5, min=0.5, max=8),
            reraise=True,
        )
        def _send() -> tuple[int, dict[str, Any]]:
            response = client.send(message)
            body: dict[str, Any] = {}
            try:
                body = response.body  # type: ignore[assignment]
            except Exception:
                body = {}
            return int(response.status_code), body

        try:
            status, _ = _send()
        except Exception as exc:
            logger.exception("sendgrid_send_failed", error=str(exc))
            return json.dumps({"ok": False, "error": "sendgrid_failed"})
        return json.dumps({"ok": True, "status_code": status})
