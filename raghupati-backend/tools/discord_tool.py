"""Discord webhook notifications."""

from __future__ import annotations

import json
from typing import Any

import httpx
import structlog
from crewai.tools import BaseTool  # type: ignore
from tenacity import retry, stop_after_attempt, wait_exponential

from config.settings import get_settings

logger = structlog.get_logger(__name__)


class DiscordWebhookTool(BaseTool):
    """Post structured messages to Discord via webhooks."""

    name: str = "discord_webhook"
    description: str = (
        "Send a Discord message. Input JSON: "
        '{"text":"...","severity":"HIGH","username":"RAGHUPATHI"}.'
    )

    def _run(self, query: str) -> str:
        """Deliver a JSON payload to the configured Discord webhook URL.

        Args:
            query: JSON string describing message text and optional metadata.

        Returns:
            JSON string describing delivery status.
        """
        settings = get_settings()
        try:
            payload = json.loads(query)
        except json.JSONDecodeError as exc:
            logger.exception("discord_invalid_json", error=str(exc))
            return json.dumps({"ok": False, "error": "invalid_json"})

        text = str(payload.get("text", ""))
        severity = str(payload.get("severity", "INFO")).upper()
        username = str(payload.get("username", "RAGHUPATHI"))

        if not text:
            return json.dumps({"ok": False, "error": "text_required"})

        discord_url = settings.discord_webhook_url
        if not discord_url:
            return json.dumps({"ok": False, "error": "DISCORD_WEBHOOK_URL not configured"})

        color_map = {
            "CRITICAL": 0xFF0000,
            "HIGH": 0xFF6600,
            "MEDIUM": 0xFFCC00,
            "LOW": 0x00CC00,
            "INFO": 0x0066FF,
        }

        body: dict[str, Any] = {
            "username": username,
            "embeds": [{
                "title": f"[{severity}] Security Alert",
                "description": text,
                "color": color_map.get(severity, 0x0066FF),
            }],
        }

        @retry(
            stop=stop_after_attempt(3),
            wait=wait_exponential(multiplier=0.5, min=0.5, max=8),
            reraise=True,
        )
        def _post() -> httpx.Response:
            with httpx.Client(timeout=30) as client:
                return client.post(
                    discord_url.get_secret_value(),
                    json=body,
                    headers={"Content-Type": "application/json"},
                )

        try:
            response = _post()
            # Discord returns 204 on success
            if response.status_code not in (200, 204):
                response.raise_for_status()
        except Exception as exc:
            logger.exception("discord_post_failed", error=str(exc))
            return json.dumps({"ok": False, "error": "discord_post_failed"})

        return json.dumps({"ok": True, "status_code": response.status_code})
