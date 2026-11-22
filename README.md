# SarkarSeva v2

An independent government-scheme reference and preparation app: SarkarSeva's
cream/navy/saffron design with Yojana Saathi's profile, matching and curation API.
Search 3,397 imported scheme records without an AI key or account; read original
requirements, save records and prepare document checklists. English, Hindi and
Kannada navigation is available; original dataset records remain in English.

**Live website:** [sarkarseva-v2.vercel.app](https://sarkarseva-v2.vercel.app).
The v2.0.2 public HTTPS release passed all thirteen hosted browser checks and an
additional real Groq extraction-to-matching journey. See
[deployment status](docs/integration/deployment-state.json) for the deployed commits.

**Imported records are unverified, from a July 2025 dataset.** They are discovery
leads, not current official policy or eligibility decisions. There is no government
affiliation, application submission, approval prediction or simulated tracking.
See [data provenance](docs/integration/DATA_PROVENANCE.md).

## Local startup (Windows PowerShell)

```powershell
cd services/api
uv venv .venv --python 3.12
uv pip install --python .venv/Scripts/python.exe -r requirements-dev.lock
uv pip install --python .venv/Scripts/python.exe --no-deps -e .
# Create .env from .env.example and choose the local SQLite URL in the runbook.
.venv/Scripts/python.exe -m app.cli.fetch_dataset --output ../../data/schemes/updated_data.csv
.venv/Scripts/python.exe -m app.cli.bootstrap ../../data/schemes/updated_data.csv --create-tables --report ../../docs/integration/dataset-import.json
.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

In another terminal:

```powershell
cd apps/web
npm ci
# Copy .env.example to .env.local; keep mode=live and optional Supabase values empty.
npm run dev -- --port 3000
```

Open http://127.0.0.1:3000 . `/health` is process liveness; `/ready` checks the
database and populated reference catalogue. Full setup, tests and deployment:
[runbook](docs/integration/RUNBOOK.md).

## Main routes

- `/catalogue`: weighted keyword/synonym search, category and government-level filters.
- `/catalogue/[slug]`: original benefits, conditions and application text, browser-saved preparation checklist.
- `/assistant`: retrieved passages with record links; extractive search, not generative RAG.
- `/discover`, `/profile`, `/recommendations`, `/dashboard`: confirmed facts and conservative preliminary matching.
- `/saved`: browser-saved reference records and the existing reviewed-scheme workflow.
- `/privacy`, `/disclaimer`, `/help`, `/guide`: data handling and application preparation.

## Optional providers

Core catalogue/search, manual profile entry, matching and checklists need no AI
provider or authentication. Supabase Auth adds account profile restoration.
Groq extraction and Sarvam speech are connected and verified on the hosted API
using synthetic English text and audio. Gemini remains an alternative extractor.
Configure secrets only on the API,
never in browser variables or committed files. Curator RAG stays protected; it is
not a dependency of citizen search. Provider calls have per-process budgets
(20 extraction and 30 speech requests per minute), not per-user quotas or a
distributed limiter. Add shared abuse controls before scaling beyond one worker.
Supabase account restoration and email delivery have not been verified live.

## Source projects and deployment status

Built from the user-provided [SarkarSeva](https://github.com/satvikpandurangi/sarkarseva)
and [Yojana Saathi](https://github.com/aryanbudke/Yojana-Saathi) repositories.
See [provenance and attribution](docs/integration/DATA_PROVENANCE.md) and
[integration progress](docs/integration/PROGRESS.md).

Deployment targets are Vercel (root `apps/web`) and Render (root `services/api`),
with PostgreSQL/pgvector. The dedicated Supabase database contains all 3,397
records, checked against the complete pinned source. Restricted-role API checks
passed. The Vercel frontend and Render backend are live; hosted browser checks
cover search, saved checklists, manual matching, session deletion, mobile layouts
and accessibility. The dependency audit reports zero findings after the release
patches to Next.js 16.4.6 and Zod 4.6.7.

The updated version is maintained on `sarkarseva-v2` in the original SarkarSeva
repository. Its existing `main` version remains available. See the
[v2 release notes](docs/integration/RELEASE-V2.md) and
[hosted database handoff](docs/integration/HOSTED-DATABASE.md).
