"""Repository for incident records stored in Supabase."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

import structlog
from supabase import Client

from models.incident import AgentStatus, Incident, IncidentCreate, IncidentUpdate, Severity

logger = structlog.get_logger(__name__)


class IncidentRepository:
    """CRUD operations for the ``incidents`` table."""

    def __init__(self, client: Client, table_name: str = "incidents") -> None:
        """Initialize the repository.

        Args:
            client: Supabase client instance.
            table_name: Physical table name (default ``incidents``).
        """
        self._client = client
        self._table = table_name

    def create(self, data: IncidentCreate) -> Incident:
        """Insert a new incident row.

        Args:
            data: Creation payload.

        Returns:
            Persisted ``Incident`` model.

        Raises:
            RuntimeError: If Supabase returns an error.
        """
        payload: dict[str, Any] = {
            "repo_full_name": data.repo_full_name,
            "title": data.title,
            "description": data.description,
            "severity": data.severity.value,
            "status": AgentStatus.RUNNING.value,
            "payload": data.payload,
        }
        try:
            response = self._client.table(self._table).insert(payload).execute()
        except Exception as exc:
            logger.exception("incident_insert_failed", error=str(exc))
            msg = "Failed to create incident"
            raise RuntimeError(msg) from exc
        row = response.data[0]
        return self._row_to_model(row)

    def get_by_id(self, incident_id: UUID) -> Incident | None:
        """Fetch a single incident by id.

        Args:
            incident_id: Primary key.

        Returns:
            Incident when found, otherwise ``None``.
        """
        try:
            response = (
                self._client.table(self._table)
                .select("*")
                .eq("id", str(incident_id))
                .limit(1)
                .execute()
            )
        except Exception as exc:
            logger.exception("incident_select_failed", incident_id=str(incident_id), error=str(exc))
            msg = "Failed to fetch incident"
            raise RuntimeError(msg) from exc
        if not response.data:
            return None
        return self._row_to_model(response.data[0])

    def list_recent(self, limit: int = 50) -> list[Incident]:
        """Return recent incidents ordered by creation time descending.

        Args:
            limit: Maximum rows to return (1-500).

        Returns:
            List of incidents.
        """
        try:
            response = (
                self._client.table(self._table)
                .select("*")
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
        except Exception as exc:
            logger.exception("incident_list_failed", error=str(exc))
            msg = "Failed to list incidents"
            raise RuntimeError(msg) from exc
        return [self._row_to_model(row) for row in response.data]

    def update(self, incident_id: UUID, data: IncidentUpdate) -> Incident:
        """Apply a partial update to an incident.

        Args:
            incident_id: Target incident id.
            data: Fields to update.

        Returns:
            Updated incident model.

        Raises:
            RuntimeError: On database errors or when the row is missing.
        """
        patch: dict[str, Any] = {"updated_at": data.updated_at.isoformat()}
        if data.title is not None:
            patch["title"] = data.title
        if data.description is not None:
            patch["description"] = data.description
        if data.severity is not None:
            patch["severity"] = data.severity.value
        if data.status is not None:
            patch["status"] = data.status.value
        if data.payload is not None:
            patch["payload"] = data.payload
        try:
            response = (
                self._client.table(self._table)
                .update(patch)
                .eq("id", str(incident_id))
                .execute()
            )
        except Exception as exc:
            logger.exception("incident_update_failed", incident_id=str(incident_id), error=str(exc))
            msg = "Failed to update incident"
            raise RuntimeError(msg) from exc
        if not response.data:
            msg = "Incident not found for update"
            raise RuntimeError(msg)
        return self._row_to_model(response.data[0])

    def _row_to_model(self, row: dict[str, Any]) -> Incident:
        """Map a Supabase row dict to an ``Incident`` model.

        Args:
            row: Raw row dictionary.

        Returns:
            Validated ``Incident`` instance.
        """
        return Incident(
            id=UUID(str(row["id"])),
            repo_full_name=str(row["repo_full_name"]),
            title=str(row["title"]),
            description=str(row["description"]),
            severity=Severity(str(row["severity"])),
            status=AgentStatus(str(row["status"])),
            payload=dict(row.get("payload") or {}),
            created_at=_parse_timestamp(row["created_at"]),
            updated_at=_parse_timestamp(row["updated_at"]),
        )


def _parse_timestamp(value: Any) -> datetime:
    """Parse Supabase timestamp values into timezone-aware UTC datetimes.

    Args:
        value: Raw value from the database driver.

    Returns:
        Parsed ``datetime`` instance.

    Raises:
        TypeError: If the value cannot be parsed.
    """
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        normalized = value.replace("Z", "+00:00")
        return datetime.fromisoformat(normalized)
    msg = "Unsupported timestamp type from database"
    raise TypeError(msg)
