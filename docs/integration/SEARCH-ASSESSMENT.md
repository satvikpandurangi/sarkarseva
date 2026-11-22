# Is RAG necessary for scheme discovery?

Assessed on 22 November 2026 using the actual downloaded Kaggle CSV and the locally running FastAPI catalogue endpoint. No Gemini API key, embeddings or external AI service was used.

## Measured data

3,400 CSV rows; 3 exact duplicate rows removed; 3,397 imported draft records; no rejected rows. Archive CSV SHA-256: `9a6c67185e1455e107630d40a8bcb34c394547adb042a7e580dab2e854734511`.

## Actual API results

GET `/api/v1/catalogue?q=<term>&limit=1` searches names and summaries with SQL, returning the filtered total independently of the page limit.

| Query                           | Matching records |
| ------------------------------- | ---------------: |
| scholarship                     |              322 |
| education                       |              743 |
| farmer                          |              364 |
| housing                         |               61 |
| women                           |              414 |
| pension                         |              256 |
| student scholarship             |                0 |
| financial help for college fees |                0 |

These counts measure lexical matches, not relevance quality, policy validity or eligibility. Current matching uses a contiguous phrase, explaining the multiword misses. This is a search implementation limitation, not evidence that generation is required.

## Recommendation

RAG is not necessary for the core product. Prefer deterministic full-text/keyword retrieval with tokenization, weighted scheme-name matches, a small tested synonym dictionary, filters, pagination and useful zero-result suggestions. Preserve original scheme details and transparent data provenance. Use the existing separate profile/rule matching engine for preliminary personalization; do not infer eligibility from search ranking.

Semantic retrieval can be evaluated later against a hand-labelled set of representative queries if ordinary search cannot cover users' wording. It can improve retrieval without any answer generation. RAG specifically adds generated answers grounded in retrieved context; it is justified only if a cited conversational explanation is a demonstrated need and its correctness, latency and operating cost are acceptable.

The current extractive assistant experiment is retrieval plus copied passages; it is not generative RAG and must not be labelled as such. Do not make public discovery depend on AI keys, model availability, vector indexing or this experiment.

Dataset source: https://www.kaggle.com/datasets/jainamgada45/indian-government-schemes . The repository's prior audit and current import have not independently verified every scheme against current official sources. More elaborate AI does not fix missing official sources or stale requirements.

## Current task boundary

The user's latest instruction requested this assessment only. Full frontend integration and production delivery are unfinished; the development branch contains an initial API/import foundation and intentionally unfulfilled UI acceptance tests. No deployment has occurred.
