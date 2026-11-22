# Discover, service recovery and provider setup

## Problems reproduced

- Read requests failed after 20 seconds, which is shorter than a sleeping free
  Render service can take to restart. A delayed-response regression reproduced
  the same network-error path. This is a recovery fix, not a claim that every
  network failure is a cold start.
- Discover queried the reviewed publication endpoint. That endpoint correctly
  returned no reviewed schemes, despite 3,397 unverified catalogue records being
  available through the separate public catalogue.
- Voice controls were enabled without a configured speech provider. An in-flight
  transcription offered no cancel control. These states were reproduced in
  browser regressions before changing the UI.

## Changes

- Bounded 60-second request/body deadlines (120 seconds for voice); at most one retry for safe reads.
  Mutations and audio uploads are never automatically retried.
- Discover now searches the imported catalogue with working category shortcuts,
  government-level filtering, record counts and links. Unverified labels remain.
- Public capability booleans gate optional speech and profile extraction. No key,
  provider response or secret is returned by this endpoint.
- Microphone and read-aloud controls stay unavailable without configuration.
  Recording can be stopped; transcription can be cancelled without losing typed
  details or accepting a late result. Failed extraction retains manual entry.
- Groq extraction uses the server-only `GROQ_API_KEY` and configurable
  `GROQ_MODEL` (default `openai/gpt-oss-20b`). Bounded JSON output passes the same
  strict fact/evidence validation as existing providers. Model output remains a
  draft and never decides eligibility. Existing per-process request budgets apply.
- Sarvam STT/TTS stay server-side; updated the legacy Sarvam chat fallback's model
  identifier against current provider documentation.

## Verification

- Backend: 443 passed, two optional checks skipped; Ruff and mypy passed.
- Frontend: 52 unit tests passed, five optional checks skipped; type checking passed.
- Thirteen local browser checks passed, including catalogue discovery, unavailable
  voice, cancelling a synthetic stalled transcription, checklists, matching,
  session deletion, responsive layouts and accessibility.
- All thirteen hosted browser checks passed on 23 November 2026, including voice
  cancellation and catalogue discovery. A separate actual Groq browser journey
  passed extraction, editable review, confirmation, preliminary matching and
  deletion of the synthetic profile session (HTTP 204).
- Render deploy `dep-dc1hmbgs00ms738bfjcg` and Vercel production deploy
  `dpl_MwDowqmbvMiP1FJaf3F7BScUiGEi` serve code commit `c841229`.
- Fresh backend/frontend checks passed again before this release. Render error
  logs since backend rollout and Vercel error logs in the checked 30-minute
  release window returned no error records.

## Actual provider validation

The user supplied both keys through the ignored backend `.env.production`.
Actual Sarvam text-to-speech and speech-to-text passed using synthetic speech.
Actual Groq extraction returned validated draft facts for synthetic text.
Groq's model endpoint rejected Python's default User-Agent with HTTP 403 and
succeeded with the explicit application User-Agent; the application now sets that
header, covered by a regression. Do not place keys in chat, Git or `NEXT_PUBLIC_*`.

Only provider-specific server variables were merged into the existing Render
service. Hosted Groq extraction validated age 20/state KA from synthetic text;
hosted Sarvam generated a 230,444-byte WAV and returned a nonempty transcription
requiring review. Exact frontend CORS was verified on these responses. Public
capability flags report both services available; no frontend key is used.

## Remaining limits

Imported July 2025 records remain unverified. Matching is preliminary. Render's
free plan can sleep. Provider budgets are process-local, not distributed or
per-user quotas. Account restoration, email delivery, load testing and backup
restoration remain unverified. English synthetic speech was checked live; this
does not certify every supported language or device microphone. CodeRabbit is
installed but signed out. The user declined authentication; login was cancelled
and the review skipped. Its skill was read, but is not an offline review engine.
No CodeRabbit review is claimed.

References: [Groq compatibility](https://console.groq.com/docs/openai),
[Groq models](https://console.groq.com/docs/models),
[Sarvam STT](https://docs.sarvam.ai/api-reference/speech-to-text/transcribe),
[Sarvam TTS](https://docs.sarvam.ai/api-reference/text-to-speech/convert),
[Render idle behavior](https://render.com/docs/free#spinning-down-on-idle).
