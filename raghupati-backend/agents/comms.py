"""Vibhishana — communications and delivery (Groq Llama 3)."""

from __future__ import annotations

from crewai import Agent  # type: ignore

from agents.llm import groq_llm_from_env
from config.settings import get_settings
from tools.email_tool import ResendEmailTool
from tools.discord_tool import DiscordWebhookTool
from tools.github_tool import GitHubCreatePullRequestTool
from tools.slack_tool import SlackWebhookTool


def build_vibhishana_agent() -> Agent:
    """Construct Vibhishana, responsible for PR delivery and stakeholder notifications.

    Returns:
        Configured CrewAI ``Agent`` with GitHub/Slack/Discord/Resend tooling.
    """
    settings = get_settings()
    tools = [
        GitHubCreatePullRequestTool(),
        SlackWebhookTool(),
        DiscordWebhookTool(),
        ResendEmailTool(),
    ]
    return Agent(
        role="Vibhishana — Communications and Delivery",
        goal=(
            "Create high-signal GitHub pull requests with remediation narrative, post severitized "
            "Slack/Discord alerts, and send HTML incident reports via Resend with audit-friendly detail."
        ),
        backstory=(
            "You are a trusted bridge between automation and humans. Your writing is precise, "
            "your alerts are actionable, and you never bury the lede on severity or impact."
        ),
        tools=tools,
        llm=groq_llm_from_env(settings.model_vibhishana),
        verbose=True,
        allow_delegation=False,
    )
