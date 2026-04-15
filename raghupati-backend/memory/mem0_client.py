"""Mem0 client for cross-run agent memory."""

from __future__ import annotations

from typing import Any

import structlog
from mem0 import Memory

from config.settings import Settings, get_settings

logger = structlog.get_logger(__name__)


class Mem0MemoryClient:
    """Thin wrapper around Mem0 with structured logging and error handling."""

    def __init__(self, settings: Settings) -> None:
        """Create the Mem0 memory interface.

        Args:
            settings: Application settings (API keys and optional config).
        """
        self._settings = settings
        self._memory: Memory | None = None

    def _ensure_memory(self) -> Memory:
        """Lazily construct the Mem0 ``Memory`` instance (self-hosted OSS).

        Returns:
            Initialized ``Memory`` object.

        Raises:
            RuntimeError: If initialization fails.
        """
        if self._memory is not None:
            return self._memory
        config: dict[str, Any] = {
            "vector_store": {
                "provider": "chroma",
                "config": {
                    "collection_name": "raghupati_mem0",
                    "path": self._settings.chroma_persist_directory,
                },
            },
        }
        try:
            self._memory = Memory.from_config(config)
        except Exception as exc:
            logger.exception("mem0_init_failed", error=str(exc))
            msg = "Failed to initialize Mem0 memory"
            raise RuntimeError(msg) from exc
        return self._memory

    def add(self, text: str, *, user_id: str, metadata: dict[str, Any] | None = None) -> str:
        """Persist a memory item scoped to a logical user/session.

        Args:
            text: Free-form memory content.
            user_id: Namespace identifier (repository or operator id).
            metadata: Optional structured metadata.

        Returns:
            Mem0 operation result serialized as a string.

        Raises:
            RuntimeError: On Mem0 failures.
        """
        try:
            memory = self._ensure_memory()
            result = memory.add(text, user_id=user_id, metadata=metadata or {})
        except Exception as exc:
            logger.exception("mem0_add_failed", user_id=user_id, error=str(exc))
            msg = "Failed to add Mem0 memory"
            raise RuntimeError(msg) from exc
        return str(result)

    def search(self, query: str, *, user_id: str, limit: int = 8) -> list[dict[str, Any]]:
        """Search prior memories relevant to a query.

        Args:
            query: Natural language query.
            user_id: Namespace identifier.
            limit: Maximum memories to return.

        Returns:
            List of memory dictionaries from Mem0.

        Raises:
            RuntimeError: On Mem0 failures.
        """
        try:
            memory = self._ensure_memory()
            results = memory.search(query, user_id=user_id, limit=limit)
        except Exception as exc:
            logger.exception("mem0_search_failed", user_id=user_id, error=str(exc))
            msg = "Failed to search Mem0 memory"
            raise RuntimeError(msg) from exc
        return list(results or [])


def get_mem0_client() -> Mem0MemoryClient:
    """Factory for a process-wide Mem0 client wrapper.

    Returns:
        Configured ``Mem0MemoryClient`` instance.
    """
    return Mem0MemoryClient(get_settings())
