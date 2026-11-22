# Source and data provenance

## Application sources

- Frontend design: https://github.com/satvikpandurangi/sarkarseva , commit `1e6d603375aec3242b8ac1c8d363bbfd3d9c3c57`. Retains its cream/navy/saffron palette, DM Sans/Fraunces typography, chakra-inspired mark, centred hero and pill search. Government/NIC affiliation claims and sample application statuses were not carried into the merged app.
- API/application foundation: https://github.com/aryanbudke/Yojana-Saathi , commit `ce58380298988efbd8c13a8e3d01c5c1a110ce91`. Retains profile confirmation, matching, source-linked publication guards, account/voice integrations and tests. Original authorship is retained; this integration does not grant a new licence to upstream code.
- All work is separate from Project-App and the abandoned Everyday FollowUp archive.

## Dataset

- Publisher: Jainam Gada45 on Kaggle.
- Dataset: https://www.kaggle.com/datasets/jainamgada45/indian-government-schemes .
- Kaggle's public metadata reports version 1, published 13 July 2025, and `CC0: Public Domain`; metadata checked 22 November 2026. This records the publisher's metadata, not a claim that all underlying policy/source material has the same licence.
- Version-pinned download: `https://www.kaggle.com/api/v1/datasets/download/jainamgada45/indian-government-schemes?datasetVersionNumber=1`.
- CSV file: `updated_data.csv`, SHA-256 `9a6c67185e1455e107630d40a8bcb34c394547adb042a7e580dab2e854734511`.
- Measured import: 3,400 rows, 3,397 unique accepted records. Exact duplicates at CSV rows 901, 902 and 3273 were reported and excluded. No rejected rows. Conflicting duplicates fail import rather than overwrite policy.
- The report is in `dataset-import.json`; local raw data and SQLite files are ignored by Git. The startup downloader checks the pinned CSV digest, size and exact archive member before writing it. It refuses to overwrite a different local CSV.

## Accuracy boundaries

All 3,397 imported records remain **unverified drafts**. Zero were promoted to verified publication by this integration. The original CSV does not establish current scheme status, deadlines, source dates or independently checked official application links. State schemes are labelled as state-level; no state-code filter is invented from unreliable geography.

The public reference catalogue is separate from the existing reviewed-policy API. Search ranking reflects text relevance, not eligibility. Preliminary profile matches are manual-checking leads. Only source-reviewed typed rules can produce the existing checked-condition results; government departments decide actual eligibility and approval.

The app links to myScheme's official search directory for independent confirmation; it does not manufacture a scheme-specific official URL from a dataset slug. It renders dataset text as text, without executing HTML, scripts, URLs or embedded instructions.

## Release policy

An informational reference pilot can be evaluated with visible limitations. Do not market this dataset as current, fully verified or authoritative. A release claiming verified policy coverage requires the existing source-audit, independent-review and publication workflow for the advertised records. Retain the dataset version and publication date when doing that review.
