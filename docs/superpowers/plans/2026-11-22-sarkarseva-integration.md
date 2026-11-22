# SarkarSeva Integration Implementation Plan

> **For agentic workers:** Use executing-plans to implement this plan task-by-task with test-first behavior and a final independent review.

**Goal:** Deliver a testable merged web app using SarkarSeva's design and Yojana Saathi's data/API foundation.
**Architecture:** Retain Next.js and FastAPI; adapt design at shared tokens/components. Add a provenance-labelled draft catalogue and extractive assistant using the same imported records as preliminary matching. Preserve curated publication boundaries.
**Tech Stack:** Next.js 16, React 19, TypeScript, FastAPI, SQLAlchemy, SQLite locally, PostgreSQL/pgvector in production.
**Spec:** `docs/integration/SPEC.md`

## Global Constraints

- Preserve SarkarSeva's cream/navy/saffron, Fraunces and DM Sans design.
- No real credentials or dataset archives in Git.
- Unknown rules stay unknown; imported data remains unverified.
- No simulated government submission or application status.

## Review Focus

- Duplicate/blank CSV rows: report exclusions rather than silently overwriting identity.
- Missing sources or stale policy: never claim official verification or approval.
- Empty/no-match/injection-like questions: bounded retrieval with honest abstention.
- Missing database/model/auth configuration: useful errors and manual/extractive fallbacks.
- Mobile/translated views: readable, keyboard accessible and no horizontal overflow.

### Task 1: Import and catalogue API

Files: `app/db/kaggle_import.py`, `app/api/v1/catalogue.py`, `app/services/catalogue.py`, `app/cli/bootstrap.py`, tests under `services/api/tests/`.
Interfaces: validated CSV -> `DraftCandidate`; GET `/api/v1/catalogue` paginated summaries, GET `/api/v1/catalogue/{slug}` full draft; POST `/api/v1/assistant` cited excerpts.

- [x] Test malformed, duplicate, blank rows, idempotent import, retrieval/abstention and draft isolation; watch failure.
- [x] Implement import/report/bootstrap and bounded catalogue retrieval.
- [x] Run backend suite; regenerate OpenAPI and resolve reproducible baseline failures.

### Task 2: Shared design and connected screens

Files: shared brand, tokens, CSS/layout, home hero; new catalogue/assistant features and routes; Playwright integration tests.
Interfaces: typed catalogue/assistant API client consumes Task 1; hero search -> catalogue query; existing matching uses imported draft rows.

- [x] Add browser tests for search/detail/assistant navigation and responsive layout; watch failure.
- [x] Apply SarkarSeva's fonts, palette and hero, and connect catalogue/detail/assistant screens.
- [x] Run unit tests, lint, typecheck, build and browser flows; fix regressions.

### Task 3: Reproducible startup and production handoff

Files: env examples, deployment guide, Render/Vercel configuration, integration verification report.

- [x] Test actual locally running frontend/backend together, including profile/matching and error states.
- [x] Document dataset provenance, measured coverage, commands and exact hosting prerequisites.
- [x] Run independent final review, fix important findings and rerun affected checks.

### External release gates

- [ ] Connect/authenticate the user's GitHub, Vercel, Render and database accounts.
- [ ] Publish the integration, migrate the real hosted PostgreSQL database and deploy both services.
- [ ] Repeat integration/security checks over the actual HTTPS production origins.
- [ ] Complete source-policy review for any advertised verified scheme coverage; imported records are currently labelled reference drafts.
