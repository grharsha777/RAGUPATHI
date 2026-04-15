"""Tests for CrewAI tools and GitHub helpers."""

from __future__ import annotations

import hashlib
import hmac
import json

from tools.github_tool import GitHubReadFileTool, parse_github_webhook_payload, verify_github_signature


def test_parse_github_webhook_payload_ok() -> None:
    """Webhook JSON payloads should parse into dictionaries."""
    raw = b'{"foo": "bar"}'
    assert parse_github_webhook_payload(raw) == {"foo": "bar"}


def test_verify_github_signature_ok() -> None:
    """HMAC-SHA256 verification should accept valid GitHub signatures."""
    secret = "secret"
    body = b"payload"
    digest = hmac.new(secret.encode("utf-8"), msg=body, digestmod=hashlib.sha256).hexdigest()
    assert verify_github_signature(secret, body, f"sha256={digest}") is True


def test_github_read_file_tool_invalid_json() -> None:
    """Invalid JSON inputs should return structured errors without raising."""
    tool = GitHubReadFileTool()
    out = tool._run("not-json")
    data = json.loads(out)
    assert data["ok"] is False


def test_json_shape_for_read_tool() -> None:
    """Missing repo/path should return ok=false."""
    tool = GitHubReadFileTool()
    out = tool._run(json.dumps({}))
    data = json.loads(out)
    assert data["ok"] is False
