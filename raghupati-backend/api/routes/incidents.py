"""Incident query API backed by Supabase repositories."""

from __future__ import annotations

from uuid import UUID

import structlog
from fastapi import APIRouter, HTTPException, status

from db.agent_log_repo import AgentLogRepository
from db.incident_repo import IncidentRepository
from db.supabase_client import get_supabase_client
from models.incident import Incident, IncidentCreate, IncidentUpdate

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/incidents", tags=["incidents"])


def _repo() -> IncidentRepository:
    """Build an incident repository bound to the shared Supabase client.

    Returns:
        ``IncidentRepository`` instance.
    """
    return IncidentRepository(get_supabase_client())


def _logs() -> AgentLogRepository:
    """Build an agent log repository bound to the shared Supabase client.

    Returns:
        ``AgentLogRepository`` instance.
    """
    return AgentLogRepository(get_supabase_client())


@router.get("", response_model=list[Incident])
async def list_incidents(limit: int = 50) -> list[Incident]:
    """List recent incidents.

    Args:
        limit: Maximum rows to return.

    Returns:
        Incident collection ordered by recency.
    """
    try:
        return _repo().list_recent(limit=limit)
    except Exception as exc:
        logger.exception("incidents_list_failed", error=str(exc))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="incident_query_failed") from exc


@router.get("/{incident_id}", response_model=Incident)
async def get_incident(incident_id: UUID) -> Incident:
    """Fetch a single incident by id.

    Args:
        incident_id: Incident primary key.

    Returns:
        Incident record.

    Raises:
        HTTPException: When not found or on database errors.
    """
    try:
        row = _repo().get_by_id(incident_id)
    except Exception as exc:
        logger.exception("incident_get_failed", incident_id=str(incident_id), error=str(exc))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="incident_query_failed") from exc
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="incident_not_found")
    return row


@router.post("", response_model=Incident, status_code=status.HTTP_201_CREATED)
async def create_incident(payload: IncidentCreate) -> Incident:
    """Create a new incident record.

    Args:
        payload: Creation body.

    Returns:
        Persisted incident.
    """
    try:
        return _repo().create(payload)
    except Exception as exc:
        logger.exception("incident_create_failed", error=str(exc))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="incident_create_failed") from exc


@router.patch("/{incident_id}", response_model=Incident)
async def patch_incident(incident_id: UUID, payload: IncidentUpdate) -> Incident:
    """Update an incident record.

    Args:
        incident_id: Incident primary key.
        payload: Partial update body.

    Returns:
        Updated incident.
    """
    try:
        return _repo().update(incident_id, payload)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="incident_not_found") from exc
    except Exception as exc:
        logger.exception("incident_update_failed", incident_id=str(incident_id), error=str(exc))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="incident_update_failed") from exc


@router.get("/{incident_id}/logs")
async def list_incident_logs(incident_id: UUID) -> list[dict[str, object]]:
    """Return structured agent logs for an incident.

    Args:
        incident_id: Incident primary key.

    Returns:
        Raw log rows.
    """
    try:
        return _logs().list_for_incident(incident_id)
    except Exception as exc:
        logger.exception("incident_logs_failed", incident_id=str(incident_id), error=str(exc))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="incident_logs_failed") from exc
