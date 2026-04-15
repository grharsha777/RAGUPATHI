"""CrewAI hierarchical crew wiring for Vanar Sena."""

from __future__ import annotations

from crewai import Crew, Process, Task

from agents.analyst import build_jambavan_agent
from agents.commander import build_rama_agent
from agents.patch import build_nala_agent
from agents.qa import build_sugreeva_agent
from agents.security import build_angada_agent
from agents.watcher import build_hanuman_agent
from agents.comms import build_vibhishana_agent
from config.settings import get_settings


def build_raghupati_crew() -> Crew:
    """Construct the hierarchical RAGHUPATI crew with Rama as manager.

    Returns:
        Configured ``Crew`` instance (not yet executed).
    """
    settings = get_settings()
    rama = build_rama_agent()
    hanuman = build_hanuman_agent()
    angada = build_angada_agent()
    jambavan = build_jambavan_agent()
    nala = build_nala_agent()
    sugreeva = build_sugreeva_agent()
    vibhishana = build_vibhishana_agent()

    task_watch = Task(
        description=(
            "Interpret the operational context for repository "
            f"{settings.app_name}: summarize what changed, what manifests are implicated, "
            "and whether the pipeline should run."
        ),
        expected_output="A concise operational triage with a clear yes/no pipeline trigger rationale.",
        agent=hanuman,
    )
    task_scan = Task(
        description=(
            "Perform deep vulnerability discovery using NVD/OSV/npm signals and OWASP-oriented "
            "code heuristics. Produce a structured finding list with severity candidates."
        ),
        expected_output="A structured vulnerability report with evidence and dependency context.",
        agent=angada,
        context=[task_watch],
    )
    task_research = Task(
        description=(
            "Research likely root cause, known fixes, and community guidance. Provide a "
            "confidence score and explicit assumptions."
        ),
        expected_output="An analyst memo with citations and a calibrated confidence score.",
        agent=jambavan,
        context=[task_scan],
    )
    task_patch = Task(
        description=(
            "Generate a minimal patch plan for the most critical confirmed issue, including tests "
            "where feasible. Do not execute QA; preparation only."
        ),
        expected_output="A patch plan with exact file paths and test strategy.",
        agent=nala,
        context=[task_research],
    )
    task_qa = Task(
        description=(
            "Describe CI validation expectations and failure triage steps for Sugreeva. "
            "Summarize what must be true for a green merge."
        ),
        expected_output="A QA checklist aligned with GitHub Actions evidence collection.",
        agent=sugreeva,
        context=[task_patch],
    )
    task_comms = Task(
        description=(
            "Prepare stakeholder communications: PR narrative, Slack alert skeleton, and email "
            "HTML outline with severity badges."
        ),
        expected_output="Delivery-ready communications templates with clear severity and impact.",
        agent=vibhishana,
        context=[task_qa],
    )

    return Crew(
        agents=[hanuman, angada, jambavan, nala, sugreeva, vibhishana],
        tasks=[
            task_watch,
            task_scan,
            task_research,
            task_patch,
            task_qa,
            task_comms,
        ],
        process=Process.hierarchical,
        manager_agent=rama,
        verbose=True,
        memory=False,
    )
