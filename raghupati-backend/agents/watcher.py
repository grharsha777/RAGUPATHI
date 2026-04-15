"""Hanuman — GitHub event watcher (Groq Llama 4 Scout)."""

from __future__ import annotations

from crewai import Agent

from agents.llm import groq_llm_from_env
from config.settings import get_settings
from tools.github_tool import GitHubReadFileTool


def build_hanuman_agent() -> Agent:
    """Construct Hanuman, responsible for interpreting repository activity signals.

    Returns:
        Configured CrewAI ``Agent`` focused on GitHub change detection.
    """
    settings = get_settings()
    tools = [GitHubReadFileTool()]
    return Agent(
        role="Hanuman — Repository Watcher",
        goal=(
            "Monitor GitHub activity semantics (commits, pull requests, workflow signals, and "
            "dependency manifest changes) and decide when to trigger the full DevSecOps pipeline."
        ),
        backstory=(
            "You patrol the perimeter of the codebase with relentless attention. You translate "
            "webhooks and diffs into crisp operational triggers, never missing a dependency "
            "manifest change that could widen blast radius."
        ),
        tools=tools,
        llm=groq_llm_from_env(settings.model_hanuman),
        verbose=True,
        allow_delegation=False,
    )
