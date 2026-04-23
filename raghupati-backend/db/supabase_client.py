"""Supabase client factory and singleton accessor."""

from __future__ import annotations

from functools import lru_cache
from typing import Any

import structlog
from supabase import Client, create_client

from config.settings import Settings, get_settings

logger = structlog.get_logger(__name__)


class SupabaseClientFactory:
    """Creates and validates Supabase clients."""

    @staticmethod
    def create(settings: Settings) -> Client:
        """Build a Supabase client using typed settings.

        Args:
            settings: Application settings containing URL and service key.

        Returns:
            Configured ``Client`` instance.

        Raises:
            RuntimeError: If client creation fails.
        """
        try:
            url = str(settings.supabase_url).rstrip("/")
            key = settings.admin_key.get_secret_value()
            client = create_client(url, key)
        except Exception as exc:  # pragma: no cover - defensive
            logger.exception("supabase_client_create_failed", error=str(exc))
            msg = "Failed to initialize Supabase client"
            raise RuntimeError(msg) from exc
        return client


@lru_cache
def get_supabase_client() -> Client:
    """Return a process-wide Supabase client singleton.

    Returns:
        Shared ``Client`` for repository operations.
    """
    settings = get_settings()
    return SupabaseClientFactory.create(settings)


def reset_supabase_client_cache() -> None:
    """Clear the cached client (used by tests)."""
    get_supabase_client.cache_clear()
