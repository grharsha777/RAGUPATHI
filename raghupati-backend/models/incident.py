"""Incident and agent lifecycle models."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class Severity(StrEnum):
    """Normalized vulnerability severity used across agents and APIs."""

    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AgentStatus(StrEnum):
    """High-level status for an autonomous agent in the Vanar Sena."""

    IDLE = "IDLE"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    ESCALATED = "ESCALATED"


class Incident(BaseModel):
    """Persisted security incident record."""

    id: UUID = Field(default_factory=uuid4, description="Primary key for the incident.")
    repo_full_name: str = Field(..., description="GitHub repository in owner/name form.")
    title: str = Field(..., max_length=512, description="Short human-readable title.")
    description: str = Field(..., description="Detailed narrative of the finding.")
    severity: Severity = Field(..., description="Commander-assigned severity.")
    status: AgentStatus = Field(default=AgentStatus.RUNNING, description="Workflow status.")
    payload: dict[str, Any] = Field(
        default_factory=dict,
        description="Opaque JSON for scanner output, graph metadata, and links.",
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="UTC creation time.",
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="UTC last update time.",
    )

    model_config = {"frozen": False}


class IncidentCreate(BaseModel):
    """Fields required to create a new incident."""

    repo_full_name: str = Field(..., min_length=3, description="GitHub repository owner/name.")
    title: str = Field(..., min_length=3, max_length=512)
    description: str = Field(..., min_length=1)
    severity: Severity
    payload: dict[str, Any] = Field(default_factory=dict)


class IncidentUpdate(BaseModel):
    """Partial update for incident records."""

    title: str | None = Field(default=None, max_length=512)
    description: str | None = None
    severity: Severity | None = None
    status: AgentStatus | None = None
    payload: dict[str, Any] | None = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
