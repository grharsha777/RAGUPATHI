"""Pytest fixtures and environment bootstrap for RAGHUPATI tests."""

from __future__ import annotations

import os

import pytest

from config.settings import get_settings

_DEFAULT_ENV = {
    "MISTRAL_API_KEY": "test-mistral",
    "GROQ_API_KEY": "test-groq",
    "GITHUB_TOKEN": "test-github",
    "GITHUB_WEBHOOK_SECRET": "test-webhook-secret",
    "TAVILY_API_KEY": "test-tavily",
    "NVD_API_KEY": "test-nvd",
    "SUPABASE_URL": "https://example.supabase.co",
    "SUPABASE_KEY": "test-supabase",
    "SLACK_WEBHOOK_URL": "https://hooks.slack.com/services/test",
    "SENDGRID_API_KEY": "test-sendgrid",
    "GOOGLE_CLIENT_ID": "test-google-client.apps.googleusercontent.com",
}


def _bootstrap_environment() -> None:
    """Apply default environment variables required by ``Settings``."""
    for key, value in _DEFAULT_ENV.items():
        os.environ.setdefault(key, value)
    get_settings.cache_clear()


_bootstrap_environment()


@pytest.fixture()
def reset_settings_cache() -> None:
    """Clear the cached Settings object between tests when needed."""
    get_settings.cache_clear()
