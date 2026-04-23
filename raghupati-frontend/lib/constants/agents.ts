export type AgentDefinition = {
  id: string;
  displayName: string;
  role: string;
  description: string;
  model: string;
  provider: "mistral" | "groq";
  icon: string;
  color: string;
  tier: "supervisor" | "commander" | "operative" | "support";
  goals: string[];
  permissions: string[];
};

export const AGENT_DEFINITIONS: AgentDefinition[] = [
  {
    id: "hanuman",
    displayName: "Hanuman",
    role: "Supreme Supervisor & Recovery Controller",
    description: "The guardian failsafe orchestrator. Monitors all other agents, detects failure, drift, hallucination, bad commits, broken builds, weak diffs, incomplete tasks. Reassigns work, rolls back bad attempts, restarts subflows, triggers corrective execution, ensures final output quality. Acts as supreme supervisor and recovery controller.",
    model: "mistral-large-latest",
    provider: "mistral",
    icon: "ShieldCheck",
    color: "#F59E0B",
    tier: "supervisor",
    goals: ["Monitor all agent health", "Detect failures and drift", "Trigger corrective actions", "Roll back bad commits", "Ensure output quality", "Supervise autonomous execution"],
    permissions: ["rollback", "restart_agent", "cancel_scan", "override_commit", "escalate", "force_retry"],
  },
  {
    id: "rama",
    displayName: "Rama",
    role: "Commander & Architecture Planner",
    description: "Orchestrates the entire scan flow. Classifies severity, assigns tasks to sub-agents, manages sequencing, retry logic, and escalation decisions. Plans architecture and task decomposition.",
    model: "mistral-large-latest",
    provider: "mistral",
    icon: "Crown",
    color: "#EAB308",
    tier: "commander",
    goals: ["Classify severity", "Plan orchestration", "Assign tasks", "Manage retries", "Escalate decisions", "Architecture planning"],
    permissions: ["assign_tasks", "escalate", "approve_patch", "set_priority", "delegate"],
  },
  {
    id: "lakshmana",
    displayName: "Lakshmana",
    role: "Codebase Mapper & Requirements Interpreter",
    description: "Rama's most loyal companion. Maps the entire codebase structure, interprets requirements, identifies entry points, traces data flows, and builds the project knowledge graph that other agents rely on.",
    model: "mistral-medium-latest",
    provider: "mistral",
    icon: "Map",
    color: "#3B82F6",
    tier: "operative",
    goals: ["Map project structure", "Trace data flows", "Identify entry points", "Build knowledge graph", "Interpret requirements"],
    permissions: ["read_repo", "read_files", "index_codebase"],
  },
  {
    id: "sita",
    displayName: "Sita",
    role: "Security Analyst & Vulnerability Detector",
    description: "The heart of the security analysis. Performs deep code analysis, dependency scanning, CI checks, and secrets detection. Queries NVD and OSV for known CVEs. Produces normalized findings with severity and evidence. Renamed from Angada with expanded scope.",
    model: "mixtral-8x7b-32768",
    provider: "groq",
    icon: "ShieldAlert",
    color: "#EF4444",
    tier: "operative",
    goals: ["Find vulnerabilities", "Query CVE databases", "Analyze dependencies", "Detect secrets", "Score severity"],
    permissions: ["read_repo", "query_nvd", "query_osv", "read_files"],
  },
  {
    id: "jambavan",
    displayName: "Jambavan",
    role: "Research Analyst & Remediation Strategist",
    description: "The wise bear who enriches findings with safer fix approaches, migration guidance, and web research via Tavily. Produces confidence-scored remediation strategies.",
    model: "mistral-medium-latest",
    provider: "mistral",
    icon: "Search",
    color: "#8B5CF6",
    tier: "operative",
    goals: ["Research fixes", "Score confidence", "Find migration paths", "Web research", "Remediation strategy"],
    permissions: ["search_web", "read_advisories", "query_nvd"],
  },
  {
    id: "nala",
    displayName: "Nala",
    role: "Patch Engineer & File Editor",
    description: "The divine builder. Writes code and config changes to fix vulnerabilities. Generates minimal diffs, prepares commit/PR operations. Supports autonomous and manual review modes.",
    model: "codestral-latest",
    provider: "mistral",
    icon: "Code2",
    color: "#6366F1",
    tier: "operative",
    goals: ["Generate patches", "Write code fixes", "Create diffs", "Prepare commits", "Edit files"],
    permissions: ["write_files", "create_branch", "commit", "push", "create_pr"],
  },
  {
    id: "sugreeva",
    displayName: "Sugreeva",
    role: "QA Engineer & Test Writer",
    description: "The monkey king who validates. Runs tests, build checks, lint, and CI validation via GitHub Actions. Writes test cases for patches. Reports failures precisely with logs and job names for retry loops.",
    model: "llama-4-scout-17b-16e-instruct",
    provider: "groq",
    icon: "FlaskConical",
    color: "#10B981",
    tier: "operative",
    goals: ["Validate patches", "Run CI checks", "Write tests", "Report failures", "Retry loops"],
    permissions: ["run_ci", "read_checks", "read_logs"],
  },
  {
    id: "bharata",
    displayName: "Bharata",
    role: "Refactor Agent & Code Quality Guardian",
    description: "Rama's brother who rules in his stead. Refactors code for quality, removes dead code, improves structure, enforces patterns, and ensures codebase health beyond security fixes.",
    model: "mistral-medium-latest",
    provider: "mistral",
    icon: "Wrench",
    color: "#06B6D4",
    tier: "operative",
    goals: ["Refactor code", "Improve structure", "Remove dead code", "Enforce patterns", "Code quality"],
    permissions: ["write_files", "read_files", "create_branch"],
  },
  {
    id: "shatrughna",
    displayName: "Shatrughna",
    role: "Deployment Readiness Agent",
    description: "Bharata's twin and the destroyer of enemies. Validates deployment readiness, checks environment configs, verifies build artifacts, ensures Docker/deploy compatibility, and gates production releases.",
    model: "llama-4-scout-17b-16e-instruct",
    provider: "groq",
    icon: "Rocket",
    color: "#EC4899",
    tier: "support",
    goals: ["Validate deployment", "Check environments", "Verify builds", "Gate releases", "Docker compatibility"],
    permissions: ["read_repo", "read_ci", "read_checks"],
  },
  {
    id: "vibhishana",
    displayName: "Vibhishana",
    role: "Comms & PR Review Agent",
    description: "The righteous one who left Lanka. Writes PR bodies, summaries, audit trails, and mission reports. Reviews pull requests, sends notifications via Slack, Discord, and email. Ensures full traceability.",
    model: "llama3-8b-8192",
    provider: "groq",
    icon: "MessageSquare",
    color: "#F97316",
    tier: "support",
    goals: ["Write PR bodies", "Review PRs", "Send notifications", "Audit trails", "Mission reports"],
    permissions: ["create_pr", "review_pr", "comment_pr", "send_notifications"],
  },
  {
    id: "dasharatha",
    displayName: "Dasharatha",
    role: "GitHub Sync & Commit Manager",
    description: "The father king who governs the realm. Manages GitHub synchronization, commit creation, branch management, push operations, and ensures all Git interactions follow proper protocols and branch protection rules.",
    model: "llama-4-scout-17b-16e-instruct",
    provider: "groq",
    icon: "GitMerge",
    color: "#A855F7",
    tier: "support",
    goals: ["Sync GitHub state", "Manage commits", "Branch operations", "Push changes", "Branch protection"],
    permissions: ["create_branch", "commit", "push", "merge", "read_repo"],
  },
];

export const AGENT_ORDER = [
  "hanuman", "rama", "lakshmana", "sita", "jambavan", "nala",
  "sugreeva", "bharata", "shatrughna", "vibhishana", "dasharatha",
] as const;

export const AGENT_EDGES: [string, string][] = [
  ["hanuman", "rama"],
  ["rama", "lakshmana"],
  ["rama", "sita"],
  ["rama", "jambavan"],
  ["lakshmana", "sita"],
  ["sita", "nala"],
  ["jambavan", "nala"],
  ["nala", "sugreeva"],
  ["nala", "bharata"],
  ["sugreeva", "shatrughna"],
  ["sugreeva", "vibhishana"],
  ["bharata", "dasharatha"],
  ["shatrughna", "vibhishana"],
  ["dasharatha", "vibhishana"],
  ["hanuman", "sugreeva"],
  ["hanuman", "nala"],
];

export const SCAN_STAGES = [
  { id: "idle", label: "Idle", description: "Ready to scan" },
  { id: "validating", label: "Validating", description: "Verifying repository access" },
  { id: "indexing", label: "Indexing", description: "Mapping codebase structure" },
  { id: "analyzing", label: "Analyzing", description: "Running security analysis" },
  { id: "planning", label: "Planning", description: "Creating remediation strategy" },
  { id: "agent_allocation", label: "Agent Allocation", description: "Assigning agents to tasks" },
  { id: "execution", label: "Execution", description: "Agents executing tasks" },
  { id: "review", label: "Review", description: "QA validation and review" },
  { id: "push_pr", label: "Push & PR", description: "Creating commits and pull requests" },
  { id: "completed", label: "Completed", description: "Scan finished successfully" },
] as const;

export type ScanStage = (typeof SCAN_STAGES)[number]["id"];

export function getAgentDef(id: string): AgentDefinition | undefined {
  return AGENT_DEFINITIONS.find((a) => a.id === id);
}
