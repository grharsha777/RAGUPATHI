"""GitHub webhook payload and header models."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class GitHubWebhookHeaders(BaseModel):
    """Subset of GitHub webhook headers used for verification and routing."""

    x_github_event: str = Field(..., alias="X-GitHub-Event")
    x_github_delivery: str = Field(..., alias="X-GitHub-Delivery")
    x_hub_signature_256: str | None = Field(default=None, alias="X-Hub-Signature-256")

    model_config = {"populate_by_name": True}


class GitHubWebhookPayload(BaseModel):
    """Loosely-typed GitHub webhook body; repository-specific fields vary by event."""

    action: str | None = Field(default=None, description="Action for events that use it.")
    zen: str | None = Field(default=None, description="Present on ping events.")
    hook_id: int | None = Field(default=None, description="Webhook id on ping events.")
    repository: dict[str, Any] | None = Field(default=None, description="Repository object.")
    sender: dict[str, Any] | None = Field(default=None, description="Actor that triggered event.")
    commits: list[dict[str, Any]] | None = Field(default=None, description="Push commit payloads.")
    pull_request: dict[str, Any] | None = Field(default=None, description="PR payload.")
    workflow_run: dict[str, Any] | None = Field(default=None, description="Actions workflow_run.")
    head_commit: dict[str, Any] | None = Field(default=None, description="Head commit on push.")

    model_config = {"extra": "allow"}


class WebhookProcessingResult(BaseModel):
    """Outcome of asynchronous webhook handling."""

    accepted: bool = Field(..., description="Whether the webhook was accepted for processing.")
    event: str = Field(..., description="GitHub event type.")
    delivery_id: str = Field(..., description="Unique delivery id from GitHub.")
    message: str = Field(..., description="Human-readable processing note.")
    pipeline_triggered: bool = Field(
        default=False,
        description="Whether the incident pipeline was started.",
    )
