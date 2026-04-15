"""Slack incoming webhook notifications for Vibhishana."""

from __future__ import annotations

import json
from typing import Any

import httpx
import structlog
from crewai.tools import BaseTool
from tenacity import retry, stop_after_attempt, wait_exponential

from config.settings import get_settings

logger = structlog.get_logger(__name__)


class SlackWebhookTool(BaseTool):
    """Post structured messages to Slack via incoming webhooks."""

    name: str = "slack_webhook"
    description: str = (
        "Send a Slack message. Input JSON: "
        "{\"text\":\"...\",\"severity\":\"HIGH\",\"username\":\"RAGHUPATI\"}."
    )

    def _run(self, query: str) -> str:
        """Deliver a JSON payload to the configured Slack webhook URL.

        Args:
            query: JSON string describing message text and optional metadata.

        Returns:
            JSON string describing delivery status.
        """
        settings = get_settings()
        try:
            payload = json.loads(query)
        except json.JSONDecodeError as exc:
            logger.exception("slack_invalid_json", error=str(exc))
            return json.dumps({"ok": False, "error": "invalid_json"})
        text = str(payload.get("text", ""))
        severity = str(payload.get("severity", "INFO")).upper()
        username = str(payload.get("username", "RAGHUPATI"))
        if not text:
            return json.dumps({"ok": False, "error": "text_required"})
        emoji = ":shield:"
        if severity == "CRITICAL":
            emoji = ":rotating_light:"
        elif severity == "HIGH":
            emoji = ":warning:"
        body: dict[str, Any] = {
            "username": username,
            "icon_emoji": emoji,
            "text": f"[{severity}] {text}",
        }

        @retry(
            stop=stop_after_attempt(3),
            wait=wait_exponential(multiplier=0.5, min=0.5, max=8),
            reraise=True,
        )
        def _post() -> httpx.Response:
            with httpx.Client(timeout=settings.external_api_timeout_seconds) as client:
                return client.post(
                    settings.slack_webhook_url.get_secret_value(),
                    json=body,
                    headers={"Content-Type": "application/json"},
                )

        try:
            response = _post()
            response.raise_for_status()
        except Exception as exc:
            logger.exception("slack_post_failed", error=str(exc))
            return json.dumps({"ok": False, "error": "slack_post_failed"})
        return json.dumps({"ok": True, "status_code": response.status_code})
