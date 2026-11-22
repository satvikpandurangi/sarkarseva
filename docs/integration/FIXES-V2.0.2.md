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

- Bounded 60-second request/body deadlines; at most one retry for safe reads.
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
- Frontend: 51 unit tests passed, five optional checks skipped; type checking passed.
- Thirteen local browser checks passed, including catalogue discovery, unavailable
  voice, cancelling a synthetic stalled transcription, checklists, matching,
  session deletion, responsive layouts and accessibility.
- Hosted deployment verification is recorded separately in `deployment-state.json`.

## Provider account dependency

Groq and Sarvam dashboards require sign-in and acceptance of their displayed
service terms. Neither key was present in the backend configuration during local
verification. The user must finish those account steps and provide the keys in
the ignored backend `.env.production` or the dedicated Render service's
environment settings. Do not place keys in chat, Git, or `NEXT_PUBLIC_*` values.

Once actual keys are available, merge only the relevant server variables into
the existing Render service, redeploy it, and test actual extraction and a short
synthetic TTS/STT round trip. Public capability flags then update at runtime; no
frontend key or rebuild is required. Provider-call success is not certified by
the mocked transport tests.

References: [Groq compatibility](https://console.groq.com/docs/openai),
[Groq models](https://console.groq.com/docs/models),
[Sarvam STT](https://docs.sarvam.ai/api-reference/speech-to-text/transcribe),
[Sarvam TTS](https://docs.sarvam.ai/api-reference/text-to-speech/convert),
[Render idle behavior](https://render.com/docs/free#spinning-down-on-idle).
