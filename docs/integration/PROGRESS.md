# Integration progress — plan: docs/superpowers/plans/2026-11-22-sarkarseva-integration.md

Updated 22 November 2026. Local implementation and production-build checks are complete. Hosted deployment remains pending account access; no production URL has been created.

## Completed

- Isolated checkout `F:\Harshit's Proj\government-services`, branch `feat/sarkarseva-integration`. Project-App and the abandoned Everyday FollowUp archive are untouched.
- Applied SarkarSeva's cream/navy/saffron design, Fraunces/DM Sans fonts, mark and centred search hero across the existing application.
- Imported 3,397 unique source records from 3,400 CSV rows, reporting three exact duplicates and no rejected rows.
- Connected weighted keyword/synonym search, all-category membership filters, pagination, scheme details, source directory links, browser bookmarks and independently editable preparation checklists.
- Connected extractive search-by-need and retained manual confirmed-profile matching. No required RAG/model key.
- Preserved English, Hindi and Kannada navigation, explicit English source-text notices, source/version limitations and privacy controls.
- Added pinned dataset download, idempotent import receipt, metadata normalization, readiness checks, locked backend dependencies and Vercel/Render configuration.

## Verification

- Backend: 438 passed, 2 optional checks skipped; Ruff and mypy pass.
- Frontend unit suite: 48 passed, 5 live/provider checks skipped.
- Inherited browser suite: 44 passed, 1 isolated account-restoration check skipped.
- Live integration suite: all 10 passed against the real imported SQLite dataset.
- Optimized production frontend: build passed; all 10 integration checks passed against `next start`.
- Accessibility and overflow checks include new public pages at 320px and 1280px, and inherited full journeys across 320–1440px.
- PostgreSQL migration SQL was generated successfully; a real hosted PostgreSQL migration was not run.
- Pinned version-1 Kaggle download was independently fetched and its original CSV digest validated.
- Live `/ready` reported 3,397 records. Education filter returned all 833 primary/secondary members. A natural unrelated question returned no passages.
- One observed local search request returned 24 records in 0.391 seconds; this is a smoke measurement, not a load test or service-level promise.

## Independent review and fix pass

One fresh read-only reviewer identified one critical and five important findings. All were addressed with regressions:

- Unexpected exceptions are caught inside request middleware before Starlette/Uvicorn can re-log private payloads; normal exception-propagating TestClient verifies this.
- Public reads require exact schema, dataset source, pinned digest, unverified flag and unpublished state. Private/spoof/wrong-version records and their category names are excluded.
- Checklists retain original text and support independent browser-local items; undelimited prose is not one giant document.
- Canonical compound categories and secondary membership are preserved across SQLite/PostgreSQL-compatible queries.
- Search-by-need requires meaningful conjunctive evidence, abstains on unrelated questions and centres long excerpts on matching text.
- A completed dataset import receipt records preserved identities and prevents repeated cold-start fetches.
- Browser outputs are separated into mock/live/production directories. Explicit external-server options avoid Windows managed-server teardown problems.
  The review's minor finding (this stale progress document) is resolved. No deferred code-review minors remain.

## Decisions and remaining limits

- Ruling: retain the existing checkout on a feature branch; a further worktree would add no isolation to this fresh, separate workspace.
- Ruling: ordinary search and manual matching are the default; optional paid AI/voice features require provider configuration, quotas and hosted verification.
- Ruling: imported July 2025 policy remains explicitly unverified. It is reference material, not authoritative current eligibility guidance. Source curation and independent publication review remain necessary before claiming verified coverage.
- Hosted PostgreSQL, Vercel and Render are unverified because their accounts are not connected. GitHub CLI reports an expired login for satvikpandurangi. No original remote repository has been modified.
- Live authentication, model/voice and Apps Script email integration are not certified by fixture tests; leave these optional services disabled until configured and separately checked.
- The fix pass was verified by the implementing agent; no second independent review was requested, following the execution skill's single-review workflow.
