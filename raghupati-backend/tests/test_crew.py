"""Tests for orchestration wiring."""

from __future__ import annotations

from crew.raghupati_crew import build_raghupati_crew
from crew.retry_graph import build_retry_graph


def test_build_retry_graph_compiles() -> None:
    """LangGraph compilation should succeed for the retry graph."""
    graph = build_retry_graph()
    assert graph is not None


def test_build_raghupati_crew() -> None:
    """Crew construction should succeed without executing external calls."""
    crew = build_raghupati_crew()
    assert crew.process is not None
