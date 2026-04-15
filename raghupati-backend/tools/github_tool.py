"""GitHub operations: file reads, PR creation, and webhook payload parsing."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
from typing import Any

import structlog
from crewai.tools import BaseTool
from github import Auth, Github, GithubException

from config.settings import get_settings

logger = structlog.get_logger(__name__)


def parse_github_webhook_payload(raw_body: bytes) -> dict[str, Any]:
    """Parse a GitHub webhook JSON body into a dictionary.

    Args:
        raw_body: Raw HTTP body bytes.

    Returns:
        Parsed JSON object.

    Raises:
        ValueError: If JSON decoding fails.
    """
    try:
        return json.loads(raw_body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        logger.exception("github_webhook_json_decode_failed", error=str(exc))
        msg = "Invalid GitHub webhook JSON payload"
        raise ValueError(msg) from exc


def verify_github_signature(secret: str, payload: bytes, signature_header: str | None) -> bool:
    """Verify the ``X-Hub-Signature-256`` HMAC for a webhook delivery.

    Args:
        secret: Shared webhook secret.
        payload: Raw request body bytes.
        signature_header: Value of ``X-Hub-Signature-256`` (``sha256=...``).

    Returns:
        ``True`` if the signature matches, otherwise ``False``.
    """
    if not signature_header or not signature_header.startswith("sha256="):
        return False
    expected = signature_header.split("=", 1)[1]
    mac = hmac.new(secret.encode("utf-8"), msg=payload, digestmod=hashlib.sha256)
    digest = mac.hexdigest()
    return hmac.compare_digest(digest, expected)


class GitHubReadFileTool(BaseTool):
    """Read repository file contents at a given path and ref."""

    name: str = "github_read_file"
    description: str = (
        "Read a file from a GitHub repository. "
        "Input must be JSON: {\"repo\":\"owner/name\",\"path\":\"src/x.ts\",\"ref\":\"main\"}."
    )

    def _run(self, query: str) -> str:  # noqa: ARG002
        """Fetch file contents from GitHub.

        Args:
            query: JSON string with repo, path, and optional ref.

        Returns:
            JSON string containing metadata and base64-decoded text when applicable.
        """
        settings = get_settings()
        try:
            payload = json.loads(query)
        except json.JSONDecodeError as exc:
            logger.exception("github_read_invalid_json", error=str(exc))
            return json.dumps({"ok": False, "error": "invalid_json"})
        repo_name = str(payload.get("repo", ""))
        path = str(payload.get("path", ""))
        ref = payload.get("ref")
        if not repo_name or not path:
            return json.dumps({"ok": False, "error": "repo_and_path_required"})
        try:
            auth = Auth.Token(settings.github_token.get_secret_value())
            g = Github(auth=auth, base_url=str(settings.github_api_base_url))
            repo = g.get_repo(repo_name)
            content_file = repo.get_contents(path, ref=ref)  # type: ignore[arg-type]
            if isinstance(content_file, list):
                return json.dumps({"ok": False, "error": "path_is_directory"})
            data = content_file.content
            text = base64.b64decode(data).decode("utf-8", errors="replace")
            return json.dumps(
                {
                    "ok": True,
                    "path": content_file.path,
                    "sha": content_file.sha,
                    "text": text,
                }
            )
        except GithubException as exc:
            logger.exception("github_read_failed", repo=repo_name, path=path, error=str(exc))
            return json.dumps({"ok": False, "error": "github_exception", "status": exc.status})
        except Exception as exc:  # pragma: no cover - defensive
            logger.exception("github_read_unexpected", error=str(exc))
            return json.dumps({"ok": False, "error": "unexpected"})


class GitHubCreatePullRequestTool(BaseTool):
    """Create a branch, commit file changes, and open a pull request."""

    name: str = "github_create_pull_request"
    description: str = (
        "Create a GitHub PR with one or more file updates. "
        "Input JSON: {\"repo\":\"owner/name\",\"base_branch\":\"main\","
        "\"head_branch\":\"security/raghupati-fix\","
        "\"files\":[{\"path\":\"...\",\"content\":\"...\"}],"
        "\"title\":\"...\",\"body\":\"...\"}"
    )

    def _run(self, query: str) -> str:
        """Create commits and a pull request via the GitHub REST API.

        Args:
            query: JSON string describing repository, branches, files, and PR metadata.

        Returns:
            JSON string describing the created PR or an error object.
        """
        settings = get_settings()
        try:
            payload = json.loads(query)
        except json.JSONDecodeError as exc:
            logger.exception("github_pr_invalid_json", error=str(exc))
            return json.dumps({"ok": False, "error": "invalid_json"})
        repo_name = str(payload.get("repo", ""))
        base_branch = str(payload.get("base_branch", "main"))
        head_branch = str(payload.get("head_branch", "raghupati/autofix"))
        files = payload.get("files") or []
        title = str(payload.get("title", "RAGHUPATI security fix"))
        body = str(payload.get("body", ""))
        if not repo_name or not isinstance(files, list) or not files:
            return json.dumps({"ok": False, "error": "invalid_payload"})
        try:
            auth = Auth.Token(settings.github_token.get_secret_value())
            g = Github(auth=auth, base_url=str(settings.github_api_base_url))
            repo = g.get_repo(repo_name)
            base_ref = repo.get_branch(base_branch)
            try:
                repo.create_git_ref(ref=f"refs/heads/{head_branch}", sha=base_ref.commit.sha)
            except GithubException:
                head_ref = repo.get_git_ref(f"heads/{head_branch}")
                head_ref.edit(sha=base_ref.commit.sha, force=True)

            commit_message = "fix(security): RAGHUPATI automated remediation"
            for item in files:
                path = str(item.get("path"))
                content = str(item.get("content", ""))
                try:
                    existing = repo.get_contents(path, ref=head_branch)
                    if isinstance(existing, list):
                        return json.dumps({"ok": False, "error": "path_is_directory", "path": path})
                    repo.update_file(
                        path,
                        commit_message,
                        content,
                        existing.sha,
                        branch=head_branch,
                    )
                except GithubException as exc:
                    if getattr(exc, "status", None) == 404:
                        repo.create_file(path, commit_message, content, branch=head_branch)
                    else:
                        raise

            head_branch_ref = repo.get_branch(head_branch)
            pr = repo.create_pull(title=title, body=body, head=head_branch, base=base_branch)
            return json.dumps(
                {
                    "ok": True,
                    "number": pr.number,
                    "html_url": pr.html_url,
                    "head_sha": head_branch_ref.commit.sha,
                }
            )
        except GithubException as exc:
            logger.exception("github_pr_failed", repo=repo_name, error=str(exc))
            return json.dumps({"ok": False, "error": "github_exception", "status": exc.status})
        except Exception as exc:  # pragma: no cover
            logger.exception("github_pr_unexpected", error=str(exc))
            return json.dumps({"ok": False, "error": "unexpected"})
