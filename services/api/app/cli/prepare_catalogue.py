"""Idempotent deployment import; called explicitly after migrations, before serving."""

import os
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

from sqlalchemy import Engine, select

from app.cli.fetch_dataset import fetch_dataset
from app.db.draft_import import DraftImportResult, import_draft_candidates
from app.db.kaggle_import import CSV_SHA256, load_kaggle_csv, refresh_import_categories
from app.db.models import AdminAuditLog, Scheme
from app.db.session import create_database_engine, create_session_factory


def initialize_catalogue(engine: Engine, csv_path: Path) -> DraftImportResult | None:
    factory = create_session_factory(engine)
    receipt_id = uuid5(NAMESPACE_URL, f"sarkarseva:kaggle:categories-v2:{CSV_SHA256}")
    with factory() as session:
        receipt = session.get(AdminAuditLog, receipt_id)
        if receipt and receipt.action == "dataset_import_complete":
            return None
    fetch_dataset(csv_path)
    data = load_kaggle_csv(csv_path)
    with factory.begin() as session:
        existing = set(session.scalars(select(Scheme.slug)))
        result = import_draft_candidates(session, data.candidates)
        normalized = refresh_import_categories(session, data.candidates)
        session.add(
            AdminAuditLog(
                id=receipt_id,
                entity="dataset_import",
                entity_id=receipt_id,
                action="dataset_import_complete",
                actor_id="sarkarseva-dataset-bootstrap",
                details={
                    "source_sha256": data.sha256,
                    "csv_rows": data.rows,
                    "accepted": len(data.candidates),
                    "inserted": result.inserted,
                    "skipped": result.skipped,
                    "metadata_normalized": normalized,
                    "preserved_existing_slugs": sorted(
                        candidate.slug
                        for candidate in data.candidates
                        if candidate.slug in existing
                    ),
                },
            )
        )
        return result


def main() -> None:
    engine = create_database_engine()
    try:
        result = initialize_catalogue(
            engine, Path(os.environ.get("SCHEME_CSV_PATH", "data/updated_data.csv"))
        )
        if result is None:
            print("Pinned scheme dataset is already imported; existing records retained.")
        else:
            print(f"Imported {result.inserted} unverified records; retained {result.skipped}.")
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
