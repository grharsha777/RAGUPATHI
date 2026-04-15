"""Tests for Vanar Sena agent utilities."""

from __future__ import annotations

from agents.security import owasp_pattern_hits


def test_owasp_pattern_hits_detects_eval() -> None:
    """Dangerous eval patterns should be surfaced with line numbers."""
    src = "def f():\n    eval('1+1')\n"
    hits = owasp_pattern_hits(src)
    assert "dangerous_eval" in hits
    assert 2 in hits["dangerous_eval"]
