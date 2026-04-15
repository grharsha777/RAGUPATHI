"""Patch, QA, and PR result models."""

from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class QAStatus(StrEnum):
    """Quality gate status for Sugreeva."""

    PENDING = "PENDING"
    RUNNING = "RUNNING"
    PASSED = "PASSED"
    FAILED = "FAILED"


class PatchArtifact(BaseModel):
    """Generated code change produced by Nala."""

    file_path: str = Field(..., description="Repository-relative file path.")
    original_content: str = Field(..., description="File content before patch.")
    patched_content: str = Field(..., description="File content after patch.")
    rationale: str = Field(..., description="Why this patch addresses the vulnerability.")
    tests_added: str = Field(default="", description="New or updated unit test source.")
    language: str = Field(default="typescript", description="Primary language for linting.")


class CIResult(BaseModel):
    """Parsed CI outcome from GitHub Actions."""

    workflow_run_id: int | None = Field(default=None, description="GitHub Actions run id.")
    conclusion: str | None = Field(default=None, description="success, failure, cancelled, etc.")
    html_url: str | None = Field(default=None, description="Link to workflow run.")
    failed_jobs: list[str] = Field(default_factory=list, description="Job names that failed.")
    logs_excerpt: str = Field(default="", description="Truncated logs for retry context.")
    raw: dict[str, Any] = Field(default_factory=dict, description="Raw API fragments.")


class PRResult(BaseModel):
    """Result of creating or updating a GitHub pull request."""

    number: int = Field(..., description="Pull request number.")
    html_url: str = Field(..., description="Public PR URL.")
    title: str = Field(..., description="PR title.")
    head_sha: str | None = Field(default=None, description="HEAD commit SHA if known.")
