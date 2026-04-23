# Bugfix Requirements Document

## Introduction

The RAGHUPATI platform is a 7-agent LLM-powered DevSecOps pipeline that autonomously detects vulnerabilities, generates patches, and creates GitHub PRs. Despite having a real pipeline (`core/pipeline.py`), real Supabase persistence, and real GitHub/NVD/Tavily integrations, several subsystems still render fabricated data or are disconnected from the live execution state. This creates a critical trust gap: the dashboard presents metrics and statuses that do not reflect what the system has actually done.

The bug condition is: **the platform renders fake/mock data and has broken integrations instead of real execution state**, causing the system to misrepresent its actual capabilities to users across the dashboard, settings, webhook handler, and repository listing surfaces.

Specifically:
- The dashboard's "Live Agent Stream" queries a nonexistent `agent_events` table instead of the real `agent_runs` table, so it never shows live pipeline activity.
- The system health panel in `useSystemHealth.ts` calls the backend directly from the browser, bypassing the Next.js proxy and failing in dev due to CORS/auth; the `/api/health` proxy route exists but is not used by the hook.
- The settings page saves the GitHub PAT and notification config to `localStorage` only — these values are never available server-side or to the backend pipeline.
- The repositories page computes `riskScore` with `Math.random()` and hardcodes `webhookStatus: "active"`, `ciHealth: "passing"`, and `branchProtection: true` for every repo regardless of actual state.
- The webhook handler (`webhook.py`) calls `verify_github_signature` with an empty secret when `GITHUB_WEBHOOK_SECRET` is not set, causing all webhook deliveries to fail HMAC verification and return 401.
- The GitHub PR creation function (`_push_patches_and_create_pr`) exists in `pipeline.py` but is never called — the pipeline completes without opening a PR even when patches are generated.
- The `scan.py` route sets `user_id: run_id` (a UUID collision) instead of a real authenticated user ID, which will violate foreign-key constraints in production Supabase schemas.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the dashboard loads and the `useAgentEvents` hook initializes THEN the system queries the `agent_runs` table correctly for the initial fetch but the Realtime subscription channel is named `agent_runs_realtime` and subscribes to `agent_runs` — this part is already correct; however the dashboard previously queried a nonexistent `agent_events` table (now partially fixed in the hook file but the channel subscription still needs verification against the live schema).

1.2 WHEN `useSystemHealth.ts` fetches provider health THEN the system calls `http://localhost:8000/health` directly from the browser instead of routing through the Next.js `/api/health` proxy, causing the request to fail with a network error or CORS rejection when the backend is not accessible from the browser's origin.

1.3 WHEN a user saves their GitHub PAT or notification config in the Settings page THEN the system writes the values only to `localStorage`, making them unavailable to server-side Next.js API routes, the backend pipeline, and any other browser session or device.

1.4 WHEN the repositories page loads and `fetchRepositories` runs THEN the system assigns `riskScore: Math.floor(Math.random() * 40)` to every repository, producing a different random number on every render, and hardcodes `webhookStatus: "active"`, `ciHealth: "passing"`, and `branchProtection: true` regardless of the repository's actual state.

1.5 WHEN a GitHub webhook delivery arrives at `POST /webhook/github` and `GITHUB_WEBHOOK_SECRET` is not set in the environment THEN the system calls `verify_github_signature("", raw_body, signature)` which returns `False` for any real signature, causing the handler to return HTTP 401 and reject all webhook deliveries.

1.6 WHEN the pipeline completes the Nala (patch generation) stage and patches are available THEN the system does not call `_push_patches_and_create_pr()`, so no branch is created, no commit is pushed, and no PR is opened on GitHub — the `pr_url` field in `scan_runs` remains `null`.

1.7 WHEN `trigger_scan` in `scan.py` creates a `scan_runs` record THEN the system sets `user_id` to the value of `run_id` (a freshly generated UUID that has no corresponding user row), which is a UUID collision that will cause a foreign-key violation in any Supabase schema that enforces referential integrity on `user_id`.

1.8 WHEN the `/api/health` Next.js proxy route proxies to the backend THEN the system calls `${apiBase}/health` (the basic health endpoint) instead of `${apiBase}/health/full`, so the response omits the per-provider connectivity details that the dashboard's System Health panel expects in the `agents` key.

---

### Expected Behavior (Correct)

2.1 WHEN the dashboard loads and the `useAgentEvents` hook initializes THEN the system SHALL query the `agent_runs` table for the initial fetch and subscribe to Realtime changes on `agent_runs`, displaying live agent status updates as the pipeline progresses through each of the 7 agents.

2.2 WHEN `useSystemHealth.ts` fetches provider health THEN the system SHALL call the Next.js proxy route `/api/health` (relative URL) instead of the backend directly, so the request is routed server-side and is not subject to browser CORS restrictions or dev-mode auth blocking.

2.3 WHEN a user saves their GitHub PAT or notification config in the Settings page THEN the system SHALL persist the values to a Supabase `user_tokens` table (or equivalent server-side store) via a Next.js API route, so the values are available across sessions, devices, and to server-side pipeline invocations.

2.4 WHEN the repositories page loads and `fetchRepositories` runs THEN the system SHALL derive `riskScore` from real data (e.g., open issues count, archived status, or a stored scan result) and SHALL reflect actual `webhookStatus`, `ciHealth`, and `branchProtection` values fetched from GitHub or stored scan metadata — not hardcoded or random values.

2.5 WHEN a GitHub webhook delivery arrives at `POST /webhook/github` and `GITHUB_WEBHOOK_SECRET` is not set in the environment THEN the system SHALL skip HMAC verification (treating the secret as optional in development) and SHALL accept the delivery, allowing the pipeline to be triggered without a configured webhook secret.

2.6 WHEN the pipeline completes the Nala (patch generation) stage and at least one patch is available THEN the system SHALL call `_push_patches_and_create_pr()`, create a branch named `raghupati/fix-{run_id[:8]}`, commit the patches, open a PR against the default branch, and store the resulting `pr_url` in the `scan_runs` record.

2.7 WHEN `trigger_scan` in `scan.py` creates a `scan_runs` record THEN the system SHALL set `user_id` to a valid authenticated user UUID (from the JWT claims in the request context) or SHALL omit `user_id` and rely on a Supabase RLS policy or default, rather than reusing `run_id` as a surrogate user identifier.

2.8 WHEN the `/api/health` Next.js proxy route proxies to the backend THEN the system SHALL call `${apiBase}/health` and the backend `/health` endpoint SHALL return the full provider connectivity report (including the `agents` key with per-provider `ok` flags) so the dashboard System Health panel renders accurate provider statuses.

---

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a manual scan is triggered via `POST /scan` with a valid `repo_full_name` THEN the system SHALL CONTINUE TO create a `scan_runs` record, initialize 7 `agent_runs` rows as `pending` in Supabase, and execute the full Hanuman → Rama → Angada → Jambavan → Nala → Sugreeva → Vibhishana pipeline in a background task.

3.2 WHEN the pipeline executes each agent THEN the system SHALL CONTINUE TO write per-agent status transitions (`pending` → `running` → `complete`/`failed`) to the `agent_runs` table, triggering Supabase Realtime events that the frontend can subscribe to.

3.3 WHEN Angada completes vulnerability discovery THEN the system SHALL CONTINUE TO persist findings as rows in the `incidents` table via `_persist_incidents()` and return the list of incident IDs for downstream agents.

3.4 WHEN Nala completes patch generation THEN the system SHALL CONTINUE TO persist patches as rows in the `patches` table via `_persist_patches()` linked to the corresponding incident IDs.

3.5 WHEN Vibhishana completes the communications stage THEN the system SHALL CONTINUE TO update the `scan_runs` record to `status: complete` with `vulnerabilities_found` and `patches_generated` counts via `_finalize_scan_run()`.

3.6 WHEN the backend runs with `ENVIRONMENT=development` THEN the system SHALL CONTINUE TO bypass JWT authentication for all routes via the `JWTAuthMiddleware` dev-mode bypass, allowing the frontend to call the backend without a bearer token during local development.

3.7 WHEN the `/health` endpoint is called THEN the system SHALL CONTINUE TO return the `service`, `environment`, `config`, and `status` fields alongside the `agents` provider map, maintaining backward compatibility with any existing health consumers.

3.8 WHEN `fetchRepositories` is called and no GitHub PAT is available in the token store THEN the system SHALL CONTINUE TO return an empty array rather than throwing an unhandled error, preserving the graceful empty-state behavior in the repositories UI.

3.9 WHEN the GitHub webhook handler receives a `ping` event THEN the system SHALL CONTINUE TO accept the delivery, return `accepted: true`, and not trigger the pipeline (as `ping` is in the `should_run` set but the pipeline handles it gracefully).

3.10 WHEN the LangGraph retry graph (`retry_graph.py`) is invoked for patch QA THEN the system SHALL CONTINUE TO execute the patch → QA → retry → escalate cycle independently of the PR creation step, so retry logic is not disrupted by the addition of PR creation at pipeline end.

---

## Bug Condition Pseudocode

**Bug Condition Function** — identifies inputs that trigger the mock/broken behavior:

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type PlatformRequest
  OUTPUT: boolean

  RETURN (
    X.surface = "dashboard_agent_stream" AND X.table_queried = "agent_events"
  ) OR (
    X.surface = "system_health_hook" AND X.fetch_target = "direct_backend_url"
  ) OR (
    X.surface = "settings_save" AND X.storage_backend = "localStorage"
  ) OR (
    X.surface = "repositories_list" AND X.risk_score_source = "Math.random()"
  ) OR (
    X.surface = "webhook_handler" AND X.webhook_secret = "" AND X.signature_present = true
  ) OR (
    X.surface = "pipeline_completion" AND X.patches_available = true AND X.pr_created = false
  ) OR (
    X.surface = "scan_create" AND X.user_id_value = X.run_id_value
  )
END FUNCTION
```

**Property: Fix Checking**
```pascal
FOR ALL X WHERE isBugCondition(X) DO
  result ← handleRequest'(X)
  ASSERT result.data_source = "real" AND result.mock_data = false
END FOR
```

**Property: Preservation Checking**
```pascal
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT handleRequest(X) = handleRequest'(X)
END FOR
```
