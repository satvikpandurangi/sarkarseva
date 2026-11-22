# SarkarSeva integration

Build a web application combining SarkarSeva's existing visual design with Yojana Saathi's Python API, profile matching, source boundaries and scheme dataset workflow.

## User journeys

- Search and browse the imported scheme catalogue, filter by category and government level, open the original requirements and application text.
- Ask a question and receive retrieved passages with links to the records used. The no-key fallback is extractive retrieval, explicitly labelled; it must not pretend to be generative AI.
- Describe or manually enter a profile, confirm facts, and view conservative preliminary matches using the existing matching engine. Imported policy is not verified eligibility.
- Prepare a document checklist and follow official application links when independently reviewed. Never simulate submission or government application status.
- Keep existing English, Hindi and Kannada flows and accessible mobile navigation.

## Design contract

SarkarSeva: cream #faf9f5, white surfaces, navy #1a1a2e, saffron #ff6b00 accents, Fraunces serif headings, DM Sans body; centred hero and pill search, navy square chakra-inspired mark. Use darker saffron #a04100 for readable small text and filled action contrast. Preserve this visual language throughout existing pages. Remove false government/NIC affiliation claims from copied UI.

## Data and hosting

The Kaggle Indian Government Schemes CSV is imported as unverified draft records with provenance, measured counts and deduplication reporting. Unknown rules stay unknown. Existing private curation and publication routes remain protected. No scraped instructions are executed. No real credentials or dataset archives in Git. Use local SQLite for reproducible development and PostgreSQL/pgvector on Render for production; Vercel hosts Next.js. Authentication and voice require their providers and remain explicitly unavailable when not configured.

## Acceptance

Fresh backend and frontend tests, lint/type checks, production build, browser checks for the merged flows at mobile/desktop sizes, and clear documentation of account/dataset/review prerequisites. Production requires authorized hosting accounts and runtime secrets; local checks cannot certify hosted integration or government policy accuracy.
