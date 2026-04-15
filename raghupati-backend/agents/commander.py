"""Rama — supreme orchestrator (Mistral Large 2)."""

from __future__ import annotations

from crewai import Agent

from agents.llm import mistral_llm_from_env
from config.settings import get_settings
from tools.search_tool import TavilySearchTool


def build_rama_agent() -> Agent:
    """Construct Rama, the hierarchical crew manager and severity classifier.

    Returns:
        Configured CrewAI ``Agent`` for orchestration.
    """
    settings = get_settings()
    tools = [TavilySearchTool()]
    return Agent(
        role="Rama — Commander of the Vanar Sena",
        goal=(
            "Classify security incidents with calibrated severity (LOW/MEDIUM/HIGH/CRITICAL), "
            "delegate work to specialized agents, manage retries, and decide when to escalate "
            "to humans versus autonomous remediation."
        ),
        backstory=(
            "You are a battle-tested incident commander who synthesizes noisy signals into clear "
            "decisions. You never hand-wave risk: you demand evidence, respect guardrails, and "
            "keep the mission moving with disciplined delegation."
        ),
        tools=tools,
        llm=mistral_llm_from_env(settings.model_rama),
        verbose=True,
        allow_delegation=True,
    )
