# RAGHUPATI

A pragmatic, composable security-ops & incident-response platform with a modern Next.js dashboard and a FastAPI-based backend for agents, memory stores, and integrations.

Why this repo matters
- Helps automate triage, evidence collection, and patch recommendations.
- Provides an interactive dashboard for incident review and operator workflows.
- Designed as a monorepo so front-end, back-end, and tools evolve together.

Repository layout (high level)
- `raghupati-frontend` — Next.js 15 / React 19 dashboard, UI components, auth, and end-to-end tests.
- `raghupati-backend` — FastAPI services, agent orchestrators, db adapters, and tools.
- `tools` — helper scripts / scanners used by agents and CI.

Quick wins (what I changed to help deployments)
- Added a root `package.json` that forwards `npm run build` to the frontend build (makes root builds deterministic).
- Added `vercel.json` to point Vercel at the frontend Next.js project and use Node 20.

Minimum prerequisites
- Node.js 20.x (matches Vercel Node 20 pin)
- npm (or pnpm/yarn) for frontend
- Python 3.11–3.13 for backend (some dependencies are not guaranteed to work on 3.14)

Local quickstart

1. Frontend

  - Install and run locally:

    npm install
    cd raghupati-frontend
    npm install
    npm run dev

  - Build for production (from repo root):

    npm run build

  - Helpful commands:

    - `npm run dev` — development server (hot reload)
    - `npm run build` — production build
    - `npm run start` — run the production server
    - `npm test` — run unit tests

2. Backend

  - Create and activate a virtual environment (Windows):

    python -m venv .venv
    .venv\Scripts\activate
    pip install -r raghupati-backend/requirements.txt

  - Run the API locally:

    uvicorn raghupati-backend.main:app --reload --port 8000

  - Tests (when running on a compatible Python version):

    pip install -r raghupati-backend/requirements.txt
    pytest -q

Environment variables
- Frontend common envs: `NEXTAUTH_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Backend common envs: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_KEY`, `OPENAI_API_KEY` (or other model keys), `SECRET_KEY`
- Add .env.local files in the respective folders for local dev. Do NOT commit secrets.

Deployment notes (Vercel)
- Node engine is pinned to 20.x via the root `package.json` to avoid automatic downgrades.
- `vercel.json` is present and configured to use the Next.js builder on `raghupati-frontend/package.json`.
- On Vercel, ensure project environment variables are set (Dashboard → Settings → Environment Variables).
- If builds fail on Vercel with memory or native module errors, enable build cache and increase build machine size if possible.

Roles & responsibilities (specific, actionable)

- Frontend Developer
  - Primary files: raghupati-frontend/app, raghupati-frontend/components, raghupati-frontend/lib
  - Responsibilities: UI features, accessibility, client-side data-fetching, auth flows, E2E tests.
  - Local tasks: run `npm run dev`, add unit tests under `raghupati-frontend/tests`, keep `eslint`/`prettier` passing.
  - Deployment checklist: verify `next build` locally, ensure `NEXT_PUBLIC_*` env vars exist in Vercel.

- Backend Developer
  - Primary files: raghupati-backend/main.py, raghupati-backend/agents, raghupati-backend/db
  - Responsibilities: API endpoints, agent orchestration, database models, reliability.
  - Local tasks: run `uvicorn` with reload, run `pytest` (on Python 3.11–3.13), validate pydantic models.
  - Notes: pin Python to supported versions in CI; avoid testing on 3.14 until dependencies support it.

- DevOps / Platform Engineer
  - Responsibilities: Vercel configuration, Node engine pinning, environment secret management, CI workflows, logs/monitoring.
  - Action items: confirm Vercel uses Node 20, add `vercel.json` (already added), create secrets in Vercel, enable build cache.

- QA / Tester
  - Responsibilities: unit, integration, and E2E tests; regression test release candidates; cross-browser checks for frontend.
  - Commands: `npm test`, `playwright test`, `pytest` for backend.

- Security Engineer
  - Responsibilities: dependency scanning, secret scanning, threat modeling, access controls, rotate keys.
  - Tools: `npm audit`, `snyk`/`dependabot` for JS, `pip-audit`/`safety` for Python.
  - Immediate recommendation: run `npm audit` and `pip-audit` in CI; secure SSO/OAuth configuration.

- Product / Project Owner
  - Responsibilities: define acceptance criteria for agent workflows, prioritize incidents, verify UAT on staging/Vercel preview.

Contribution & workflow guidance
- Branch from `main` or create feature branches (feature/<short-topic>).
- One pull request per feature; include screenshots and test results for UI changes.
- PR checklist (minimum): builds locally, tests pass, lint passes, env vars documented, no secrets.

Troubleshooting (common failure modes and fixes)
- Build fails on Vercel but works locally:
  - Node mismatch. Ensure Node 20 is configured in project settings or `package.json` `engines` is respected.
  - Project root detection. `vercel.json` and root `package.json` will force the frontend build — verify those files are pushed.
  - Missing env vars. Add preview/production envs in Vercel dashboard.

- Backend dependency errors on Python 3.14:
  - Use Python 3.11–3.13 locally or in CI. Consider pinning a supported Python runtime in your CI pipeline.

Recommended next steps
- Commit and push the new `README.md` and `LICENSE` to the repo root to allow Vercel to pick up `vercel.json`.
- If you want, I can create a small GitHub Action to run `npm run build` and `pytest` on push (ask me and I will add it).

Contacts & maintainers
- Primary maintainer: grharsha777 (GitHub)
- For urgent deploy issues: open an issue with full Vercel build logs, environment, and the commit SHA.

License
- This project is licensed under the MIT License — see the `LICENSE` file for details.

Thank you — if you want, I can commit these files and push them, or create the CI workflow next.
