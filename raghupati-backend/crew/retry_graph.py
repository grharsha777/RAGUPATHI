"""LangGraph self-correction loop for patch → QA → retry → escalate."""

from __future__ import annotations

import json
from typing import Any, Literal, TypedDict

import httpx
import structlog
from langgraph.graph import END, START, StateGraph

from agents.qa import poll_latest_actions_run
from config.settings import get_settings
from tools.github_tool import GitHubReadFileTool
from tools.slack_tool import SlackWebhookTool

logger = structlog.get_logger(__name__)


class RaghupatiState(TypedDict, total=False):
    """Typed LangGraph state for autonomous remediation."""

    incident_id: str
    repo_full_name: str
    base_branch: str
    head_branch: str
    target_path: str
    vulnerability_summary: str
    original_content: str
    patched_content: str
    tests_added: str
    retry_count: int
    stage: Literal[
        "INIT",
        "PATCH_GENERATED",
        "QA_RUNNING",
        "QA_FAILED",
        "RETRY_PATCH",
        "MAX_RETRIES",
        "QA_PASSED",
    ]
    ci_conclusion: str | None
    ci_details: dict[str, Any]
    last_error: str


def _mistral_chat_completion(*, model: str, messages: list[dict[str, str]]) -> str:
    """Call Mistral chat completions over HTTPS.

    Args:
        model: Mistral model identifier (for example ``codestral-latest``).
        messages: OpenAI-compatible chat messages.

    Returns:
        Assistant message content text.

    Raises:
        RuntimeError: If the API response is invalid or the request fails.
    """
    settings = get_settings()
    url = "https://api.mistral.ai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.mistral_api_key.get_secret_value()}",
        "Content-Type": "application/json",
    }
    body = {"model": model, "messages": messages, "temperature": 0.1}
    try:
        with httpx.Client(timeout=settings.external_api_timeout_seconds) as client:
            response = client.post(url, headers=headers, json=body)
            response.raise_for_status()
            payload = response.json()
    except Exception as exc:
        logger.exception("mistral_chat_failed", error=str(exc))
        msg = "Mistral chat completion failed"
        raise RuntimeError(msg) from exc
    try:
        choices = payload["choices"]
        message = choices[0]["message"]
        content = str(message["content"])
    except (KeyError, IndexError) as exc:
        logger.exception("mistral_chat_malformed_response", payload=payload)
        msg = "Malformed Mistral response"
        raise RuntimeError(msg) from exc
    return content


def _node_fetch_original(state: RaghupatiState) -> RaghupatiState:
    """Load the target file contents from GitHub before patching.

    Args:
        state: Current graph state.

    Returns:
        Updated state including ``original_content``.
    """
    tool = GitHubReadFileTool()
    payload = {
        "repo": state.get("repo_full_name", ""),
        "path": state.get("target_path", ""),
        "ref": state.get("base_branch", "main"),
    }
    raw = tool._run(json.dumps(payload))
    parsed = json.loads(raw)
    if not parsed.get("ok"):
        err = f"Failed to read source file: {parsed}"
        logger.error("retry_graph_fetch_failed", error=err)
        return {
            **state,
            "stage": "QA_FAILED",
            "last_error": err,
            "ci_details": parsed,
            "original_content": "",
        }
    return {**state, "original_content": str(parsed.get("text", "")), "last_error": ""}


def _node_nala_generate_patch(state: RaghupatiState) -> RaghupatiState:
    """Generate a patch using Codestral with full vulnerability context.

    Args:
        state: Current graph state.

    Returns:
        Updated state with ``patched_content`` and ``PATCH_GENERATED`` stage marker.
    """
    settings = get_settings()
    prior_error = state.get("last_error", "")
    system = (
        "You are Nala, an elite security patch engineer. "
        "Return ONLY valid JSON with keys: patched_content (string), tests_added (string). "
        "The patch must be minimal and directly address the vulnerability."
    )
    user = (
        f"Repository file path: {state.get('target_path','')}\n"
        f"Vulnerability summary:\n{state.get('vulnerability_summary','')}\n\n"
        f"Original file contents:\n```\n{state.get('original_content','')}\n```\n"
        f"Prior CI/QC error context (may be empty):\n{prior_error}\n"
    )
    try:
        content = _mistral_chat_completion(
            model=settings.model_nala,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        )
        parsed = json.loads(content)
        patched = str(parsed.get("patched_content", ""))
        tests = str(parsed.get("tests_added", ""))
    except Exception as exc:
        logger.exception("nala_patch_generation_failed", error=str(exc))
        return {
            **state,
            "stage": "QA_FAILED",
            "last_error": f"patch_generation_failed: {exc}",
            "patched_content": state.get("original_content", ""),
            "tests_added": "",
        }
    return {
        **state,
        "patched_content": patched,
        "tests_added": tests,
        "stage": "PATCH_GENERATED",
        "last_error": "",
    }


def _node_sugreeva_qa(state: RaghupatiState) -> RaghupatiState:
    """Poll GitHub Actions for the head branch until completion.

    Args:
        state: Current graph state.

    Returns:
        Updated state with CI results and ``QA_PASSED`` or ``QA_FAILED`` stage.
    """
    settings = get_settings()
    repo = state.get("repo_full_name", "")
    branch = state.get("head_branch", "")
    if not repo or not branch:
        return {
            **state,
            "stage": "QA_FAILED",
            "last_error": "missing_repo_or_branch_for_ci",
            "ci_conclusion": None,
            "ci_details": {},
        }
    try:
        ci = poll_latest_actions_run(repo, branch, timeout_seconds=settings.external_api_timeout_seconds)
    except Exception as exc:
        logger.exception("ci_poll_failed", error=str(exc))
        return {
            **state,
            "stage": "QA_FAILED",
            "last_error": f"ci_poll_failed: {exc}",
            "ci_conclusion": None,
            "ci_details": {},
        }
    conclusion = (ci.conclusion or "").lower()
    details = {
        "workflow_run_id": ci.workflow_run_id,
        "html_url": ci.html_url,
        "failed_jobs": ci.failed_jobs,
        "logs_excerpt": ci.logs_excerpt,
    }
    if conclusion == "success":
        return {
            **state,
            "stage": "QA_PASSED",
            "ci_conclusion": ci.conclusion,
            "ci_details": details,
            "last_error": "",
        }
    return {
        **state,
        "stage": "QA_FAILED",
        "ci_conclusion": ci.conclusion,
        "ci_details": details,
        "last_error": json.dumps(details)[:15000],
    }


def _route_after_fetch(state: RaghupatiState) -> str:
    """Route after attempting to load the vulnerable file from GitHub.

    Args:
        state: Current graph state.

    Returns:
        Next node name.
    """
    if state.get("original_content"):
        return "patch"
    return "escalate"


def _route_after_qa(state: RaghupatiState) -> str:
    """Decide the next node after CI results are known.

    Args:
        state: Current graph state.

    Returns:
        Next node name for LangGraph routing.
    """
    if state.get("stage") == "QA_PASSED":
        return "vibhishana"
    settings = get_settings()
    retries = int(state.get("retry_count") or 0)
    if retries >= settings.max_patch_retries:
        return "escalate"
    return "retry"


def _node_retry(state: RaghupatiState) -> RaghupatiState:
    """Increment retry counter and mark the stage for another patch attempt.

    Args:
        state: Current graph state.

    Returns:
        Updated state with incremented ``retry_count`` and ``RETRY_PATCH`` marker.
    """
    retries = int(state.get("retry_count") or 0) + 1
    return {
        **state,
        "retry_count": retries,
        "stage": "RETRY_PATCH",
    }


def _node_escalate(state: RaghupatiState) -> RaghupatiState:
    """Send an urgent Slack alert for human intervention.

    Args:
        state: Current graph state.

    Returns:
        Updated state flagged as ``MAX_RETRIES``.
    """
    tool = SlackWebhookTool()
    text = (
        "URGENT: RAGHUPATI exhausted autonomous retries. "
        f"incident_id={state.get('incident_id','')}, repo={state.get('repo_full_name','')}, "
        f"errors={state.get('last_error','')[:1500]}"
    )
    payload = {"text": text, "severity": "CRITICAL", "username": "RAGHUPATI"}
    tool._run(json.dumps(payload))
    return {**state, "stage": "MAX_RETRIES"}


def _node_vibhishana(state: RaghupatiState) -> RaghupatiState:
    """Terminal success hook for downstream PR/email orchestration.

    Args:
        state: Current graph state.

    Returns:
        Unchanged state aside from normalization for logging.
    """
    logger.info("retry_graph_qa_passed_ready_for_delivery", incident_id=state.get("incident_id"))
    return state


def build_retry_graph():
    """Compile the LangGraph state machine for patch QA retries.

    Returns:
        Compiled graph ready for ``invoke`` / ``ainvoke``.
    """
    graph = StateGraph(RaghupatiState)
    graph.add_node("fetch_original", _node_fetch_original)
    graph.add_node("nala_patch", _node_nala_generate_patch)
    graph.add_node("sugreeva_qa", _node_sugreeva_qa)
    graph.add_node("retry", _node_retry)
    graph.add_node("escalate", _node_escalate)
    graph.add_node("vibhishana", _node_vibhishana)

    graph.add_edge(START, "fetch_original")
    graph.add_conditional_edges(
        "fetch_original",
        _route_after_fetch,
        {
            "patch": "nala_patch",
            "escalate": "escalate",
        },
    )
    graph.add_edge("nala_patch", "sugreeva_qa")
    graph.add_conditional_edges(
        "sugreeva_qa",
        _route_after_qa,
        {
            "vibhishana": "vibhishana",
            "retry": "retry",
            "escalate": "escalate",
        },
    )
    graph.add_edge("retry", "nala_patch")
    graph.add_edge("escalate", END)
    graph.add_edge("vibhishana", END)
    return graph.compile()
