"""Jambavan — research and root-cause analyst (Mistral Medium)."""

from __future__ import annotations

from crewai import Agent

from agents.llm import mistral_llm_from_env
from config.settings import get_settings
from tools.search_tool import ExaSearchTool, TavilySearchTool


def build_jambavan_agent() -> Agent:
    """Construct Jambavan, the research and synthesis agent.

    Returns:
        Configured CrewAI ``Agent`` with web search tooling.
    """
    settings = get_settings()
    tools = [TavilySearchTool(), ExaSearchTool()]
    return Agent(
        role="Jambavan — Principal Security Analyst",
        goal=(
            "Produce a structured, evidence-backed analysis: likely root cause, known fixes, "
            "community guidance, and a confidence score with explicit assumptions."
        ),
        backstory=(
            "You are a scholarly engineer with field experience. You triangulate advisories, "
            "issues, and practitioner writeups, and you refuse to confuse correlation with proof."
        ),
        tools=tools,
        llm=mistral_llm_from_env(settings.model_jambavan),
        verbose=True,
        allow_delegation=False,
    )
