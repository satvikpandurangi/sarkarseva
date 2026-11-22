# Hosted database handoff

Verified on 22 November 2026. Public frontend/backend hosting remains pending.

## Project and data

- Supabase project: `alsqodvrsefjlinstzth`, SarkarSeva, Mumbai (`ap-south-1`).
- Schema head: `20261122_0006`.
- Catalogue: 3,397 schemes and versions from the pinned July 2025 Kaggle dataset.
- Source SHA-256: `9a6c67185e1455e107630d40a8bcb34c394547adb042a7e580dab2e854734511`.
- Full record comparison: 3,397 checked, zero missing, zero mismatches. This checks faithful import, not current government-policy accuracy.
- Every imported version remains an unpublished, unverified draft. Source curation remains required before verified eligibility claims.
- Import receipt: `02c1fcd1-fba1-5f34-b926-5b1eba90305f`. Startup recognizes it and performs no import writes.

## Backend access

The backend uses the dedicated `sarkarseva_api` login through the TLS session pooler at `aws-1-ap-south-1.pooler.supabase.com:5432`. The password and full connection string are stored only in the ignored backend `.env.production`; never publish or copy that file into frontend configuration.

| Resource | Runtime permission |
| --- | --- |
| Schemes and versions | Read only; verified published versions or exact pinned import provenance |
| Source-backed rules, documents and steps | Read only for verified published versions |
| Temporary profiles, facts, matching runs/results and saved schemes | Select, insert, update, delete through the backend |
| Audit log | Read completed dataset-import receipts only |
| Alembic version | Read only |
| Staging and schema creation | No access |

The role has no superuser, database creation, role creation or RLS bypass permission. Anonymous clients see no catalogue/profile rows and cannot read migration metadata. Backend session authorization remains enforced by application code; this database login is server-only.

New schema migrations and dataset updates must be applied administratively before deployment. Do not grant the backend schema ownership or scheme write permissions to make a future migration pass.

## Verification and repeatable commands

From `services/api`, with the local virtual environment activated:

```powershell
python -m scripts.verify_hosted_catalogue ../../data/schemes/updated_data.csv --env-file .env.production
```

This read-only command compares scheme identities, names, categories, benefits, summaries, complete provenance JSON and unpublished state against the pinned source. It reports counts without printing connection strings.

The SQL export helper creates bounded idempotent inserts for an administrative import:

```powershell
python -m scripts.export_catalogue_sql ../../data/schemes/updated_data.csv data/supabase-import
```

Keep file reads bounded when transferring generated SQL through tools. The first timestamp omission was corrected before import; failed transactions rolled back. The final full comparison checks all content, including records imported before the transfer size was reduced.

Verified against hosted PostgreSQL using the restricted login: Alembic startup, import receipt, catalogue/readiness counts, 833 education members, scheme detail, unrelated-question abstention, and synthetic session CRUD inside a rolled-back transaction. Backend tests, Ruff and mypy also passed. A Starlette test-client deprecation warning remains; it did not fail checks.

## Remaining release work

Publish the prepared code to the separate deployment repository, review the Render plan, configure its server-only connection string and frontend CORS origin, link/deploy the Vercel frontend, then verify the public HTTPS journey. No public deployment has been created yet. Optional provider-backed authentication, voice and AI integrations remain disabled until configured and separately verified.
