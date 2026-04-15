"""Shared CrewAI LLM factory helpers for Vanar Sena agents."""

from __future__ import annotations

from crewai import LLM

from config.settings import Settings, get_settings


def groq_llm(settings: Settings, model: str) -> LLM:
    """Build a Groq-backed LLM for CrewAI agents.

    Args:
        settings: Application settings containing the Groq API key.
        model: Groq model identifier without the ``groq/`` prefix.

    Returns:
        Configured ``LLM`` instance.
    """
    return LLM(
        model=f"groq/{model}",
        api_key=settings.groq_api_key.get_secret_value(),
    )


def mistral_llm(settings: Settings, model: str) -> LLM:
    """Build a Mistral-backed LLM for CrewAI agents.

    Args:
        settings: Application settings containing the Mistral API key.
        model: Mistral model identifier without the ``mistral/`` prefix.

    Returns:
        Configured ``LLM`` instance.
    """
    return LLM(
        model=f"mistral/{model}",
        api_key=settings.mistral_api_key.get_secret_value(),
    )


def mistral_llm_from_env(model: str) -> LLM:
    """Convenience wrapper using current global settings.

    Args:
        model: Mistral model identifier without the ``mistral/`` prefix.

    Returns:
        Configured ``LLM`` instance.
    """
    return mistral_llm(get_settings(), model)


def groq_llm_from_env(model: str) -> LLM:
    """Convenience wrapper using current global settings.

    Args:
        model: Groq model identifier without the ``groq/`` prefix.

    Returns:
        Configured ``LLM`` instance.
    """
    return groq_llm(get_settings(), model)
