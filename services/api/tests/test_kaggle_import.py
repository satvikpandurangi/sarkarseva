"""Raw Kaggle imports retain provenance and never publish unchecked policy."""

import csv
from pathlib import Path

import pytest
from sqlalchemy import create_engine, select

from app.cli.prepare_catalogue import initialize_catalogue
from app.db.base import Base
from app.db.draft_import import import_draft_candidates
from app.db.kaggle_import import load_kaggle_csv
from app.db.models import Scheme
from app.db.session import create_session_factory


def write_csv(path: Path, rows: list[dict[str, str]]) -> None:
    fields = [
        "scheme_name",
        "slug",
        "details",
        "benefits",
        "eligibility",
        "application",
        "documents",
        "level",
        "schemeCategory",
        "tags",
    ]
    with path.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def row(**changes: str) -> dict[str, str]:
    return {
        "scheme_name": "Student support",
        "slug": "student-support",
        "details": "Study aid",
        "benefits": "Tuition support",
        "eligibility": "Students may apply",
        "application": "Contact the department",
        "documents": "Identity proof",
        "level": "Central",
        "schemeCategory": "Education & Learning",
        "tags": "Student",
        **changes,
    }


def test_duplicate_rows_are_reported_and_drafts_keep_provenance(tmp_path: Path) -> None:
    path = tmp_path / "raw.csv"
    write_csv(path, [row(), row(), row(slug="", scheme_name="Incomplete")])
    result = load_kaggle_csv(path)
    assert result.rows == 3
    assert len(result.candidates) == 1
    assert result.duplicate_rows == [3]
    assert result.rejected_rows[0]["row"] == 4
    candidate = result.candidates[0]
    assert candidate.eligibility_json["unverified"] is True
    assert candidate.eligibility_json["source_dataset"] == (
        "https://www.kaggle.com/datasets/jainamgada45/indian-government-schemes"
    )
    assert candidate.eligibility_json["source_sha256"] == result.sha256


def test_conflicting_duplicate_is_rejected_not_overwritten(tmp_path: Path) -> None:
    path = tmp_path / "raw.csv"
    write_csv(path, [row(), row(benefits="Conflicting benefit")])
    with pytest.raises(ValueError, match="conflicting duplicate"):
        load_kaggle_csv(path)


def test_missing_column_fails_before_any_import(tmp_path: Path) -> None:
    path = tmp_path / "raw.csv"
    path.write_text("scheme_name,slug\nStudent support,student-support\n", encoding="utf-8")
    with pytest.raises(ValueError, match="missing columns"):
        load_kaggle_csv(path)


def test_compound_and_multiple_categories_are_preserved(tmp_path: Path) -> None:
    path = tmp_path / "raw.csv"
    write_csv(
        path,
        [
            row(
                schemeCategory=("Agriculture,Rural & Environment, Education & Learning, "
                                "Science, IT & Communications")
            )
        ],
    )
    candidate = load_kaggle_csv(path).candidates[0]
    assert candidate.category == "Agriculture, Rural & Environment"
    assert candidate.eligibility_json["raw_categories"] == [
        "Agriculture, Rural & Environment",
        "Education & Learning",
        "Science, IT & Communications",
    ]


def test_deployment_import_fills_a_partial_database_without_overwriting(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    path = tmp_path / "raw.csv"
    write_csv(path, [row(), row(slug="second", scheme_name="Second scheme")])
    engine = create_engine(f"sqlite+pysqlite:///{tmp_path / 'local.sqlite3'}")
    Base.metadata.create_all(engine)
    factory = create_session_factory(engine)
    first = load_kaggle_csv(path).candidates[0]
    first.eligibility_json["source_dataset"] = "SarkarSeva_Project"
    with factory.begin() as session:
        import_draft_candidates(session, [first])
    # The remote download is the external boundary; import and SQL are real.
    monkeypatch.setattr("app.cli.prepare_catalogue.fetch_dataset", lambda _: None)
    result = initialize_catalogue(engine, path)
    assert result is not None
    assert (result.inserted, result.skipped) == (1, 1)
    with factory() as session:
        assert sorted(session.scalars(select(Scheme.slug))) == ["second", "student-support"]
        from app.db.models import SchemeVersion

        version = session.get(SchemeVersion, first.version_id)
        assert version is not None
        assert version.eligibility_json["source_dataset"] == "SarkarSeva_Project"

    def no_repeat_download(_: Path) -> None:
        raise AssertionError("Completed import must not fetch again for preserved existing slugs")

    monkeypatch.setattr("app.cli.prepare_catalogue.fetch_dataset", no_repeat_download)
    repeat = initialize_catalogue(engine, path)
    assert repeat is None
    engine.dispose()
