"""GitHub operations: file reads, PR creation, and webhook payload parsing."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
from typing import Any

import structlog

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


def github_read_file(repo_name: str, path: str, ref: str | None = None) -> dict[str, Any]:
    """Read a file from a GitHub repository.

    Args:
        repo_name: Repository full name (owner/repo).
        path: File path within the repository.
        ref: Optional git ref (branch, tag, SHA).

    Returns:
        Dict with ok, path, sha, text on success, or ok=False with error.
    """
    try:
        from github import Auth, Github, GithubException
    except ImportError:
        return {"ok": False, "error": "PyGithub not installed"}

    settings = get_settings()
    if not repo_name or not path:
        return {"ok": False, "error": "repo_and_path_required"}
    try:
        auth = Auth.Token(settings.github_token.get_secret_value())
        g = Github(auth=auth, base_url=str(settings.github_api_base_url))
        repo = g.get_repo(repo_name)
        content_file = repo.get_contents(path, ref=ref)  # type: ignore[arg-type]
        if isinstance(content_file, list):
            return {"ok": False, "error": "path_is_directory"}
        data = content_file.content
        text = base64.b64decode(data).decode("utf-8", errors="replace")
        return {
            "ok": True,
            "path": content_file.path,
            "sha": content_file.sha,
            "text": text,
        }
    except GithubException as exc:
        logger.exception("github_read_failed", repo=repo_name, path=path, error=str(exc))
        return {"ok": False, "error": "github_exception", "status": exc.status}
    except Exception as exc:  # pragma: no cover - defensive
        logger.exception("github_read_unexpected", error=str(exc))
        return {"ok": False, "error": "unexpected"}


def github_create_pull_request(
    repo_name: str,
    base_branch: str = "main",
    head_branch: str = "raghupati/autofix",
    files: list[dict[str, str]] | None = None,
    title: str = "RAGHUPATI security fix",
    body: str = "",
) -> dict[str, Any]:
    """Create a branch, commit file changes, and open a pull request.

    Args:
        repo_name: Repository full name (owner/repo).
        base_branch: Target branch for the PR.
        head_branch: Source branch for the PR.
        files: List of {path, content} dicts to commit.
        title: PR title.
        body: PR body.

    Returns:
        Dict with ok, number, html_url on success, or ok=False with error.
    """
    try:
        from github import Auth, Github, GithubException
    except ImportError:
        return {"ok": False, "error": "PyGithub not installed"}

    settings = get_settings()
    files = files or []
    if not repo_name or not files:
        return {"ok": False, "error": "invalid_payload"}
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
                    return {"ok": False, "error": "path_is_directory", "path": path}
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
        return {
            "ok": True,
            "number": pr.number,
            "html_url": pr.html_url,
            "head_sha": head_branch_ref.commit.sha,
        }
    except GithubException as exc:
        logger.exception("github_pr_failed", repo=repo_name, error=str(exc))
        return {"ok": False, "error": "github_exception", "status": exc.status}
    except Exception as exc:  # pragma: no cover
        logger.exception("github_pr_unexpected", error=str(exc))
        return {"ok": False, "error": "unexpected"}
