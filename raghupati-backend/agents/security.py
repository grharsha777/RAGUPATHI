"""Angada — deep vulnerability scanner (Groq Mixtral)."""

from __future__ import annotations

import re

from crewai import Agent

from agents.llm import groq_llm_from_env
from config.settings import get_settings
from tools.cve_tool import NvdCveLookupTool, OsvQueryTool
from tools.npm_audit_tool import NpmAuditTool


def owasp_pattern_hits(source: str) -> dict[str, list[int]]:
    """Scan source text for common OWASP-style risky patterns (heuristic, not exhaustive).

    Args:
        source: Source code or logs to scan.

    Returns:
        Mapping of pattern label to list of 1-based line numbers with hits.
    """
    patterns: dict[str, str] = {
        "hardcoded_secret": r"(?i)(api[_-]?key|secret|password|token)\s*=\s*['\"][^'\"]{8,}['\"]",
        "sql_string_concat": r"(?i)SELECT\s+.*\+\s*",
        "dangerous_eval": r"(?i)\beval\s*\(",
        "pickle_load": r"(?i)pickle\.loads?\(",
    }
    lines = source.splitlines()
    hits: dict[str, list[int]] = {}
    for label, pattern in patterns.items():
        rx = re.compile(pattern)
        line_hits: list[int] = []
        for idx, line in enumerate(lines, start=1):
            if rx.search(line):
                line_hits.append(idx)
        if line_hits:
            hits[label] = line_hits
    return hits


def build_angada_agent() -> Agent:
    """Construct Angada, the deep vulnerability intelligence agent.

    Returns:
        Configured CrewAI ``Agent`` with NVD/OSV/npm tooling.
    """
    settings = get_settings()
    tools = [NvdCveLookupTool(), OsvQueryTool(), NpmAuditTool()]
    return Agent(
        role="Angada — Deep Vulnerability Scanner",
        goal=(
            "Build a defensible vulnerability graph: query NVD and OSV, run npm audit where "
            "applicable, and correlate findings against OWASP-oriented code patterns."
        ),
        backstory=(
            "You are a forensic vulnerability hunter. You distrust shallow alerts: you chain "
            "ecosystem metadata with code reality, and you document why a finding matters."
        ),
        tools=tools,
        llm=groq_llm_from_env(settings.model_angada),
        verbose=True,
        allow_delegation=False,
    )
