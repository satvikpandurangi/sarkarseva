"""Explicit, idempotent local/import bootstrap; never runs on ordinary API requests."""

import argparse
import json
from dataclasses import asdict
from pathlib import Path

from app.core.config import Settings
from app.db.base import Base
from app.db.draft_import import import_draft_candidates
from app.db.kaggle_import import DATASET_URL, load_kaggle_csv
from app.db.session import create_database_engine, create_session_factory


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv", type=Path)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--create-tables", action="store_true", help="Local SQLite only")
    args = parser.parse_args()
    data = load_kaggle_csv(args.csv)
    settings = Settings()
    engine = create_database_engine(settings)
    try:
        if args.create_tables:
            if engine.dialect.name != "sqlite":
                parser.error("Use Alembic migrations for PostgreSQL, not --create-tables")
            Base.metadata.create_all(engine)
        with create_session_factory(engine).begin() as session:
            result = import_draft_candidates(session, data.candidates)
        report = {
            "dataset_url": DATASET_URL,
            "source_sha256": data.sha256,
            "csv_rows": data.rows,
            "accepted_records": len(data.candidates),
            "duplicate_rows": data.duplicate_rows,
            "rejected_rows": data.rejected_rows,
            "database_import": asdict(result),
            "verification_status": "unverified",
            "published_records": 0,
        }
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(report, indent=2))
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
