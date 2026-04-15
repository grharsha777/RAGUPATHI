"""Run npm audit in a repository working tree."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Any

import structlog
from crewai.tools import BaseTool

from config.settings import get_settings

logger = structlog.get_logger(__name__)


class NpmAuditTool(BaseTool):
    """Execute ``npm audit --json`` for a Node project directory."""

    name: str = "npm_audit"
    description: str = (
        "Run npm audit --json in a local repository path. "
        "Input JSON: {\"repo_path\":\"C:/path/to/repo\"}."
    )

    def _run(self, query: str) -> str:
        """Invoke npm audit as a subprocess and capture JSON output.

        Args:
            query: JSON string containing ``repo_path``.

        Returns:
            JSON string describing audit outcome or an error object.
        """
        settings = get_settings()
        try:
            payload = json.loads(query)
        except json.JSONDecodeError as exc:
            logger.exception("npm_audit_invalid_json", error=str(exc))
            return json.dumps({"ok": False, "error": "invalid_json"})
        repo_path = Path(str(payload.get("repo_path", ""))).expanduser()
        if not repo_path.is_dir():
            return json.dumps({"ok": False, "error": "invalid_repo_path"})
        cmd = ["npm", "audit", "--json"]
        try:
            completed = subprocess.run(
                cmd,
                cwd=str(repo_path),
                check=False,
                capture_output=True,
                text=True,
                timeout=settings.external_api_timeout_seconds,
            )
        except subprocess.SubprocessError as exc:
            logger.exception("npm_audit_subprocess_failed", error=str(exc))
            return json.dumps({"ok": False, "error": "subprocess_failed"})
        stdout = completed.stdout or ""
        stderr = completed.stderr or ""
        parsed: dict[str, Any] | None = None
        if stdout.strip():
            try:
                parsed = json.loads(stdout)
            except json.JSONDecodeError:
                parsed = None
        return json.dumps(
            {
                "ok": completed.returncode == 0,
                "returncode": completed.returncode,
                "stdout_json": parsed,
                "stdout_raw": stdout[:20000],
                "stderr": stderr[:20000],
            }
        )
