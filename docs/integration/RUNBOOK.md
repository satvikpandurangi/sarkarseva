# Development and deployment runbook

## Local development

Use Node 22+ and Python 3.12. The frontend's `package-lock.json` and backend's
`requirements*.lock` record the installed dependency versions. On Linux, substitute
`.venv/bin/python` for `.venv/Scripts/python.exe` in these commands.

Set these non-secret local backend values in `services/api/.env`:

```dotenv
APP_ENV=development
DATABASE_URL=sqlite+pysqlite:///./sarkarseva.sqlite3
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://127.0.0.1:3002
```

Use the README's install/download/bootstrap commands. `--create-tables` is restricted
to SQLite; production uses Alembic. Import validates the complete input before a
transaction and is idempotent: missing schemes are inserted and existing identities
are retained. A completed-import receipt records preserved slugs, so existing
curated/private overlaps do not force repeated downloads. Category metadata is
refreshed only for exact source-bound unpublished imports. Do not change the
dataset digest just to suppress a failed check.

Frontend `apps/web/.env.local`:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
NEXT_PUBLIC_API_MODE=live
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Empty Supabase values preserve guest access. Never place a service-role key in
frontend variables. `NEXT_PUBLIC_*` values are compiled into the browser bundle.
Restart/rebuild after changing them.

## Verification commands

Backend, from `services/api`:

```powershell
.venv/Scripts/python.exe -m pytest
.venv/Scripts/python.exe -m ruff check app tests
.venv/Scripts/python.exe -m mypy app
```

Frontend, from `apps/web`:

```powershell
npm test
npm run lint
npm run typecheck
npm run build
npx playwright install chromium
npx playwright test --workers=2
npx playwright test --config playwright.integration.config.ts
```

The inherited browser suite uses labelled synthetic fixtures on port 3001 and an
isolated `.next-mock` build directory. It must not reuse the live server on port 3000. The integration suite uses actual local API records and needs the backend
running. Screenshots are saved under `apps/web/artifacts/integration`.

Run browser suites sequentially. On Windows, if managed-server teardown hangs,
start the matching server in another terminal and set `EXTERNAL_MOCK_SERVER=1`
or `EXTERNAL_LIVE_SERVER=1` for that suite. The external mock server needs
`NEXT_PUBLIC_API_MODE=mock`, `NEXT_BUILD_DIR=.next-mock` and port 3001. The live
server uses port 3000, or `next start --port 3002` for production-build checks.
Do not set an external-server flag without starting the corresponding server.

To verify the production frontend build rather than the development server:

```powershell
$env:TEST_PRODUCTION='1'
$env:INTEGRATION_PORT='3002'
npx playwright test --config playwright.integration.config.ts
```

Allow `http://127.0.0.1:3002` in local backend CORS for that check. These tests use
SQLite. They do not prove hosted PostgreSQL, authentication, paid model/voice APIs
or email verification. Optional provider-specific tests are skipped without their
isolated configuration.

## Deployment sequence

1. Authenticate the intended GitHub account and publish this completed integration
   to a repository you control. Do not deploy the unchanged upstream `main` branch.
   This checkout is on `feat/sarkarseva-integration`; `render.yaml` currently names
   `main`, so either publish the completed code as your deployment repository's
   main branch or select the integration branch in Render before deploying.
2. Connect a PostgreSQL project (Supabase or Neon) with pgvector support. Create a
   fresh database/schema or snapshot an existing database before migrations.
   Use the server connection string with the `postgresql+psycopg://` driver and TLS
   required by the provider. The API's runtime must never use a browser-public key
   as a database password. For Supabase, use the documented server/pooler endpoint
   supported by Render's network rather than assuming direct IPv6 connectivity.
3. Connect Render to that repository and use `render.yaml`. Required secrets are
   `DATABASE_URL` and exact comma-separated `ALLOWED_ORIGINS`. Start runs migrations,
   the pinned dataset import if incomplete, then Uvicorn. `/ready` requires a
   connected, populated catalogue. `/health` only checks process liveness. The raw
   CSV is downloaded only when needed; records live in PostgreSQL. A failed digest,
   migration or import stops startup instead of serving fabricated data.
4. Connect Vercel to the same repository with root directory `apps/web` and framework
   Next.js. Set `NEXT_PUBLIC_API_BASE_URL` to the Render HTTPS origin and
   `NEXT_PUBLIC_API_MODE=live`. Set optional Supabase public values only if enabling
   account sign-in. Rebuild the frontend after changing public environment values.
5. Add the exact Vercel production origin to backend `ALLOWED_ORIGINS`. Do not use a
   wildcard or broadly allow all Vercel preview domains. Add preview origins only
   for previews you intend to expose to this API.
6. Verify `/ready`, query search, categories, a real detail record, saved records,
   checklist persistence, manual profile confirmation/matching, clear-session,
   translated navigation, keyboard/mobile behavior and error states over HTTPS.
   Confirm no frontend requests target localhost and no synthetic record is served.

## Optional services and operations

- Supabase Auth: configure the deployment URL and allowed redirect origins in its
  dashboard. Existing confirmed profile facts use authenticated account metadata;
  reference bookmarks/checklists remain browser-local. Test sign-in, restoration,
  sign-out and profile deletion with an isolated real test account before enabling
  account promises publicly.
- Gemini/Sarvam: optional extraction/voice only; keep keys server-side. Curator
  embedding/search routes require separate admin secrets. Apply provider quotas,
  gateway request limits and spend controls before enabling paid public routes.
  Never use model availability as a dependency for ordinary search/manual matching.
- Apps Script email verification is optional and requires all three configured
  secrets in `.env.example`; do not claim it works until tested with the user's
  actual email setup. No government application is submitted by this feature.
- Run the existing `python -m app.cli.sessions purge-expired` cleanup workflow on a schedule
  appropriate to the retention policy. Expiry blocks access but does not itself
  prove physical deletion of old rows.
- Monitor `/ready`, 5xx rates and response latency; configure database backups and
  restore testing in the chosen provider. Uvicorn access logs are disabled in the
  Render command to avoid recording search questions in application access logs.
  Unexpected API errors log type/request ID, not exception payloads or SQL facts.
- Rollback: select the previous frontend/backend release. Back up data before any
  destructive schema downgrade; do not automatically downgrade a live database.

## Current external prerequisites

GitHub CLI reports an expired login for `satvikpandurangi`. Vercel, Render and
Supabase connections have been requested but are not confirmed. No remote project,
database, secret or production URL has been created by this work. Deployment and
hosted verification must resume after the account connections are available.

Official hosting references: https://render.com/docs/deploy-fastapi and
https://vercel.com/docs/frameworks/full-stack/nextjs .
