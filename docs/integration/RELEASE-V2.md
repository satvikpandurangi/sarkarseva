# SarkarSeva v2

Release branch: `sarkarseva-v2` in [satvikpandurangi/sarkarseva](https://github.com/satvikpandurangi/sarkarseva).

The updated version combines SarkarSeva's design with Yojana Saathi's backend
and source-labelled scheme discovery. Existing SarkarSeva history and its `main`
version are retained; no force push is needed. The repository layout for v2 is
`apps/web` for the Next.js frontend and `services/api` for the FastAPI backend.

## Included

- Search, filters and details for 3,397 government-scheme reference records.
- Extractive search by need without a required AI model, embedding pipeline or paid key.
- Browser bookmarks and editable document-preparation checklists.
- Confirmed-profile matching, multilingual navigation and privacy controls.
- Dedicated Supabase PostgreSQL with a restricted backend login; complete import
  comparison passed with zero missing or mismatched records.
- Locked dependencies, automated tests, production build configuration and
  deployment/readiness documentation.

## Hosting plan

- Vercel: a distinct `sarkarseva-v2` project, repository root `apps/web`.
- Render: one new free Python web service, `sarkarseva-v2-api`, Singapore,
  source branch `sarkarseva-v2`, root `services/api`, health check `/ready`.
- Database: use the existing dedicated SarkarSeva Supabase project; no additional
  database or paid provider is needed for the core product.
- Server secrets remain outside Git. Configure `DATABASE_URL` only in the backend,
  and the actual HTTPS frontend origin in `ALLOWED_ORIGINS`.
- Initial Blueprint application requires approval of Render's reviewed plan.
  Automatic backend deploys are disabled for the first release.

The user approved the reviewed Render plan, and `sarkarseva-v2-api-s7ad` is live.
The production frontend is [sarkarseva-v2.vercel.app](https://sarkarseva-v2.vercel.app).
All ten hosted browser checks passed. The backend reports 3,397 records, permits
the exact production frontend origin and rejects unrelated browser origins.

Before public promotion, the release patched Next.js to 16.4.6, Zod to 4.6.7 and
affected lint dependencies. The resulting dependency audit reports zero findings.
Frontend lint, type checking and all 48 active unit tests passed; five optional
provider checks remain skipped. A temporary staged-verification token was revoked.

## Release limits

The imported July 2025 records are unverified reference material. They are not
current official eligibility decisions. Optional AI, voice, account restoration
and email-provider integrations require separate configuration and verification.
The core public HTTPS journeys passed end-to-end checks; this does not certify
optional providers, current policy accuracy or unlimited availability. CodeRabbit
review is additionally requested and awaits its plugin/authentication setup.
