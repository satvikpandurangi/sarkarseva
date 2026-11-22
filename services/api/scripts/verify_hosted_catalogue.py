"""Read-only comparison of the hosted catalogue with the complete pinned source.

Run with an explicit DATABASE_URL or --env-file; never prints connection strings.
"""

import argparse
import json
import os
from pathlib import Path

from dotenv import dotenv_values
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.db.kaggle_import import CSV_SHA256, load_kaggle_csv
from app.db.models import Scheme, SchemeVersion


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv", type=Path)
    parser.add_argument("--env-file", type=Path)
    args = parser.parse_args()
    values = dotenv_values(args.env_file) if args.env_file else {}
    url = os.environ.get("DATABASE_URL") or values.get("DATABASE_URL")
    if not url:
        parser.error("Supply DATABASE_URL or --env-file")
    source = load_kaggle_csv(args.csv)
    if source.sha256 != CSV_SHA256:
        raise ValueError("Source is not the pinned dataset")
    expected = {candidate.slug: candidate for candidate in source.candidates}
    engine = create_engine(url, connect_args={"connect_timeout": 15})
    mismatches: list[str] = []
    seen: set[str] = set()
    try:
        with Session(engine) as session:
            rows = session.execute(
                select(Scheme, SchemeVersion).join(
                    SchemeVersion, SchemeVersion.scheme_id == Scheme.id
                )
            )
            for scheme, version in rows:
                candidate = expected.get(scheme.slug)
                if candidate is None:
                    mismatches.append(scheme.slug)
                    continue
                actual = (
                    scheme.id,
                    version.id,
                    scheme.name,
                    scheme.government_level,
                    scheme.category,
                    version.summary,
                    version.benefit_text,
                    version.eligibility_json,
                    version.review_status.value,
                    version.published_at,
                    version.verified_at,
                )
                wanted = (
                    candidate.scheme_id,
                    candidate.version_id,
                    candidate.name,
                    candidate.government_level,
                    candidate.category,
                    candidate.summary,
                    candidate.benefit_text,
                    candidate.eligibility_json,
                    "draft",
                    None,
                    None,
                )
                if actual != wanted or scheme.slug in seen:
                    mismatches.append(scheme.slug)
                seen.add(scheme.slug)
    except Exception as exc:
        # Driver exceptions can include connection strings; report only their class.
        print(json.dumps({"passed": False, "error_type": type(exc).__name__}))
        raise SystemExit(1) from None
    finally:
        engine.dispose()
    missing = set(expected) - seen
    passed = not mismatches and not missing
    print(
        json.dumps(
            {
                "passed": passed,
                "source_sha256": source.sha256,
                "expected_records": len(expected),
                "checked_records": len(seen),
                "missing_records": len(missing),
                "mismatched_records": len(mismatches),
            }
        )
    )
    if not passed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
