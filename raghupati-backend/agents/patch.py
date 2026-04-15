"""Nala — patch generation (Mistral Codestral)."""

from __future__ import annotations

import ast
import subprocess
import tempfile
from pathlib import Path

import structlog
from crewai import Agent

from agents.llm import mistral_llm_from_env
from config.settings import get_settings
from tools.github_tool import GitHubReadFileTool

logger = structlog.get_logger(__name__)


def validate_python_syntax(code: str) -> tuple[bool, str | None]:
    """Validate Python source using the ``ast`` module.

    Args:
        code: Candidate Python source text.

    Returns:
        Tuple of success flag and error message (if any).
    """
    try:
        ast.parse(code)
    except SyntaxError as exc:
        return False, f"{exc.msg} at line {exc.lineno}"
    return True, None


def run_ruff_check(path: Path) -> tuple[int, str]:
    """Run Ruff on a file and capture output.

    Args:
        path: Path to a source file.

    Returns:
        Process return code and combined output snippet.
    """
    try:
        completed = subprocess.run(
            ["ruff", "check", str(path)],
            check=False,
            capture_output=True,
            text=True,
            timeout=120,
        )
    except subprocess.SubprocessError as exc:
        logger.exception("ruff_subprocess_failed", error=str(exc))
        return 1, str(exc)
    out = (completed.stdout or "") + "\n" + (completed.stderr or "")
    return completed.returncode, out[:20000]


def build_nala_agent() -> Agent:
    """Construct Nala, the patch authoring agent.

    Returns:
        Configured CrewAI ``Agent`` with repository read access.
    """
    settings = get_settings()
    tools = [GitHubReadFileTool()]
    return Agent(
        role="Nala — Patch Engineer",
        goal=(
            "Generate minimal, correct fixes for confirmed vulnerabilities, add focused unit "
            "tests when feasible, and validate syntax and lint gates before handing off to QA."
        ),
        backstory=(
            "You ship like a staff engineer on-call: tight diffs, clear rationale, tests that "
            "prove the fix, and no speculative refactors that increase risk."
        ),
        tools=tools,
        llm=mistral_llm_from_env(settings.model_nala),
        verbose=True,
        allow_delegation=False,
    )


def lint_generated_python(code: str) -> dict[str, object]:
    """Write Python code to a temp file and run Ruff plus AST validation.

    Args:
        code: Generated Python source.

    Returns:
        JSON-serializable diagnostics dictionary.
    """
    ok, syn_err = validate_python_syntax(code)
    if not ok:
        return {"ok": False, "stage": "ast", "error": syn_err}
    with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False) as handle:
        handle.write(code)
        tmp_path = Path(handle.name)
    try:
        code_ruff, out = run_ruff_check(tmp_path)
    finally:
        tmp_path.unlink(missing_ok=True)
    return {"ok": code_ruff == 0, "stage": "ruff", "returncode": code_ruff, "output": out}
