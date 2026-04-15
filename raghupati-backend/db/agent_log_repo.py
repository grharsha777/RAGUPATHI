"""Repository for structured agent execution logs."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

import structlog
from supabase import Client

logger = structlog.get_logger(__name__)


class AgentLogRepository:
    """Append-only log storage for Vanar Sena agents."""

    def __init__(self, client: Client, table_name: str = "agent_logs") -> None:
        """Initialize the repository.

        Args:
            client: Supabase client instance.
            table_name: Physical table name (default ``agent_logs``).
        """
        self._client = client
        self._table = table_name

    def append(
        self,
        *,
        incident_id: UUID | None,
        agent_name: str,
        message: str,
        level: str = "INFO",
        payload: dict[str, Any] | None = None,
    ) -> UUID:
        """Insert a single agent log row.

        Args:
            incident_id: Related incident, if any.
            agent_name: Agent identifier (e.g. ``rama``).
            message: Human-readable log line.
            level: Log level string.
            payload: Structured JSON metadata.

        Returns:
            New log row id.

        Raises:
            RuntimeError: When Supabase insert fails.
        """
        log_id = uuid4()
        row: dict[str, Any] = {
            "id": str(log_id),
            "incident_id": str(incident_id) if incident_id else None,
            "agent_name": agent_name,
            "message": message,
            "level": level,
            "payload": payload or {},
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        try:
            self._client.table(self._table).insert(row).execute()
        except Exception as exc:
            logger.exception(
                "agent_log_insert_failed",
                agent_name=agent_name,
                incident_id=str(incident_id) if incident_id else None,
                error=str(exc),
            )
            msg = "Failed to persist agent log"
            raise RuntimeError(msg) from exc
        return log_id

    def list_for_incident(self, incident_id: UUID, limit: int = 200) -> list[dict[str, Any]]:
        """Return logs for a specific incident.

        Args:
            incident_id: Incident foreign key.
            limit: Maximum rows.

        Returns:
            Raw rows as dictionaries.

        Raises:
            RuntimeError: On query failure.
        """
        try:
            response = (
                self._client.table(self._table)
                .select("*")
                .eq("incident_id", str(incident_id))
                .order("created_at", desc=False)
                .limit(limit)
                .execute()
            )
        except Exception as exc:
            logger.exception("agent_log_list_failed", incident_id=str(incident_id), error=str(exc))
            msg = "Failed to list agent logs"
            raise RuntimeError(msg) from exc
        return list(response.data)
