"""Ollama local multimodal / text generation helper."""

from __future__ import annotations

import base64
import json
from typing import Any

import httpx
import structlog
from crewai.tools import BaseTool
from tenacity import retry, stop_after_attempt, wait_exponential

from config.settings import get_settings

logger = structlog.get_logger(__name__)


class OllamaMultimodalTool(BaseTool):
    """Call Ollama for text or image+text prompts (Gemma3 / LLaVA)."""

    name: str = "ollama_multimodal"
    description: str = (
        "Call a local Ollama model. Input JSON: "
        "{\"model\":\"gemma3:latest\",\"prompt\":\"Describe the image\","
        "\"image_base64\":\"...optional...\"}."
    )

    def _run(self, query: str) -> str:
        """POST to Ollama ``/api/generate`` with optional base64 image input.

        Args:
            query: JSON string with model name, prompt, and optional image bytes.

        Returns:
            JSON string with model output or error details.
        """
        settings = get_settings()
        try:
            payload = json.loads(query)
        except json.JSONDecodeError as exc:
            logger.exception("ollama_invalid_json", error=str(exc))
            return json.dumps({"ok": False, "error": "invalid_json"})
        model = str(payload.get("model", "gemma3:latest"))
        prompt = str(payload.get("prompt", ""))
        image_b64 = payload.get("image_base64")
        if not prompt:
            return json.dumps({"ok": False, "error": "prompt_required"})
        request_body: dict[str, Any] = {"model": model, "prompt": prompt, "stream": False}
        if image_b64:
            request_body["images"] = [str(image_b64)]

        base = str(settings.ollama_base_url).rstrip("/")
        url = f"{base}/api/generate"

        @retry(
            stop=stop_after_attempt(2),
            wait=wait_exponential(multiplier=0.5, min=0.5, max=4),
            reraise=True,
        )
        def _post() -> httpx.Response:
            with httpx.Client(timeout=settings.external_api_timeout_seconds) as client:
                return client.post(url, json=request_body)

        try:
            response = _post()
            response.raise_for_status()
            data = response.json()
        except Exception as exc:
            logger.exception("ollama_request_failed", error=str(exc))
            return json.dumps({"ok": False, "error": "ollama_failed"})
        return json.dumps({"ok": True, "data": data})


def image_file_to_base64(path: str) -> str:
    """Read a binary image file and return base64 text.

    Args:
        path: Filesystem path to an image file.

    Returns:
        Base64-encoded file contents without data URL prefix.

    Raises:
        OSError: If the file cannot be read.
    """
    with open(path, "rb") as handle:
        return base64.b64encode(handle.read()).decode("ascii")
