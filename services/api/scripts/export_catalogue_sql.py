"""Export pinned public reference data as bounded, idempotent Postgres insert batches.

This client-side bridge is for a new Supabase database accessed through its MCP
SQL tools. It reads no server files and does not export credentials or profiles.
"""

import argparse
import json
from pathlib import Path

from app.db.kaggle_import import CSV_SHA256, load_kaggle_csv


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    data = load_kaggle_csv(args.csv)
    if data.sha256 != CSV_SHA256:
        raise ValueError("Only the pinned Kaggle version may be exported")
    records = [
        {
            "scheme_id": str(c.scheme_id),
            "version_id": str(c.version_id),
            "slug": c.slug,
            "name": c.name,
            "government_level": c.government_level.value,
            "category": c.category,
            "summary": c.summary,
            "benefit_text": c.benefit_text,
            "eligibility_json": c.eligibility_json,
        }
        for c in data.candidates
    ]
    batches: list[list[dict[str, object]]] = []
    current: list[dict[str, object]] = []
    size = 0
    for record in records:
        length = len(json.dumps(record, ensure_ascii=False).encode("utf-8"))
        if current and size + length > 80000:
            batches.append(current)
            current, size = [], 0
        current.append(record)
        size += length
    if current:
        batches.append(current)
    args.output.mkdir(parents=True, exist_ok=True)
    for index, batch in enumerate(batches):
        payload = json.dumps(batch, ensure_ascii=False, separators=(",", ":"))
        delimiter = "$sarkarseva_import$"
        while delimiter in payload:
            delimiter = delimiter[:-1] + "_x$"
        source = f"""jsonb_to_recordset({delimiter}{payload}{delimiter}::jsonb) AS r(
            scheme_id uuid, version_id uuid, slug text, name text, government_level text,
            category text, summary text, benefit_text text, eligibility_json jsonb)"""
        sql = f"""BEGIN;
        INSERT INTO public.schemes
            (id, slug, name, government_level, state_code, category, status,
             created_at, updated_at)
        SELECT scheme_id, slug, name, government_level, NULL, category, 'unknown', now(), now()
        FROM {source} ON CONFLICT DO NOTHING;
        INSERT INTO public.scheme_versions
            (id, scheme_id, version, summary, benefit_text, eligibility_json,
             review_status, created_at)
        SELECT version_id, scheme_id, 1, summary, benefit_text, eligibility_json, 'draft', now()
        FROM {source} ON CONFLICT DO NOTHING;
        COMMIT;
        """
        if len(sql.encode("utf-8")) >= 1900000:
            raise ValueError("Batch exceeds SQL tool size limit")
        (args.output / f"batch-{index:03}.sql").write_text(sql, encoding="utf-8")
    (args.output / "manifest.json").write_text(
        json.dumps(
            {
                "records": len(records),
                "batches": len(batches),
                "sha256": data.sha256,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(json.dumps({"records": len(records), "batches": len(batches)}))


if __name__ == "__main__":
    main()
