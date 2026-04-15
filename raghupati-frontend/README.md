# RAGHUPATI Frontend

Enterprise-grade Next.js 15 (App Router) command center for the RAGHUPATI DevSecOps Guardian platform.

## Requirements

- Node.js 20+
- npm (or pnpm/yarn)

## Setup

1. Copy `.env.example` to `.env.local` and set:
   - `AUTH_SECRET` (required by Auth.js)
   - `AUTH_OPERATOR_PASSPHRASE` (for passphrase login)
   - `NEXT_PUBLIC_USE_MOCKS=1` for local UI development without the Python API
2. Install dependencies:

```bash
npm install
```

3. Run the dev server:

```bash
npm run dev
```

## Scripts

- `npm run dev` — Next.js dev server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run test` — Vitest unit tests
- `npm run e2e` — Playwright smoke tests

## Architecture notes

- **Design system**: `app/globals.css` defines semantic tokens (severity + operational states) and layered surfaces.
- **Data access**: `lib/api/adapters.ts` switches between mocks and real HTTP based on `NEXT_PUBLIC_USE_MOCKS`.
- **Auth**: Auth.js (`auth.ts`) supports optional GitHub/Google OAuth plus an operator passphrase provider.
