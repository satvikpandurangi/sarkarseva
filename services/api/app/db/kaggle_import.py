"""Validate the original Kaggle CSV without promoting records to verified policy."""

import csv
import hashlib
import io
import re
from dataclasses import dataclass, replace
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.draft_import import DraftCandidate, _candidate_from_row
from app.db.enums import ReviewStatus
from app.db.models import Scheme, SchemeVersion

DATASET_URL = "https://www.kaggle.com/datasets/jainamgada45/indian-government-schemes"
CSV_SHA256 = "9a6c67185e1455e107630d40a8bcb34c394547adb042a7e580dab2e854734511"
CSV_FIELDS = {
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
}


@dataclass(frozen=True)
class KaggleImport:
    rows: int
    sha256: str
    candidates: list[DraftCandidate]
    duplicate_rows: list[int]
    rejected_rows: list[dict[str, object]]


def refresh_import_categories(session: Session, candidates: list[DraftCandidate]) -> int:
    """Normalize metadata only for matching, source-bound unpublished imports."""
    by_slug = {candidate.slug: candidate for candidate in candidates}
    rows = session.execute(
        select(Scheme, SchemeVersion)
        .join(SchemeVersion, SchemeVersion.scheme_id == Scheme.id)
        .where(
            Scheme.slug.in_(by_slug),
            SchemeVersion.review_status == ReviewStatus.DRAFT,
            SchemeVersion.published_at.is_(None),
            SchemeVersion.verified_at.is_(None),
        )
    )
    changed = 0
    for scheme, version in rows:
        candidate = by_slug[scheme.slug]
        raw = version.eligibility_json
        if (
            raw.get("source_dataset") != DATASET_URL
            or raw.get("source_sha256") != candidate.eligibility_json["source_sha256"]
            or raw.get("schema_version") != "candidate-import-v1"
            or raw.get("unverified") is not True
        ):
            continue
        categories = candidate.eligibility_json["raw_categories"]
        if scheme.category != candidate.category or raw.get("raw_categories") != categories:
            scheme.category = candidate.category
            version.eligibility_json = {**raw, "raw_categories": categories}
            changed += 1
    return changed


def load_kaggle_csv(path: Path) -> KaggleImport:
    raw = path.read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    reader = csv.DictReader(io.StringIO(raw.decode("utf-8-sig"), newline=""))
    missing = CSV_FIELDS - set(reader.fieldnames or [])
    if missing:
        raise ValueError(f"Kaggle CSV missing columns: {sorted(missing)}")
    candidates: list[DraftCandidate] = []
    duplicates: list[int] = []
    rejected: list[dict[str, object]] = []
    seen: dict[str, dict[str, str]] = {}
    count = 0
    for number, row in enumerate(reader, 2):
        count += 1
        normalized = {key: (row.get(key) or "").strip() for key in CSV_FIELDS}
        slug = normalized["slug"].lower()
        normalized["slug"] = slug
        if slug in seen:
            if normalized != seen[slug]:
                raise ValueError(f"row {number}: conflicting duplicate slug {slug}")
            duplicates.append(number)
            continue
        if not re.fullmatch(r"[a-z0-9][a-z0-9_-]{0,159}", slug):
            rejected.append({"row": number, "reason": "missing or invalid slug"})
            continue
        normalized.update(official_url="", last_verified="", verification_status="unverified")
        try:
            candidate = _candidate_from_row(normalized, number)
        except ValueError as error:
            rejected.append({"row": number, "reason": str(error)})
            continue
        # Commas can belong to a canonical label, not just separate categories.
        category_text = normalized["schemeCategory"]
        compound = {
            "Agriculture,Rural & Environment": "Agriculture, Rural & Environment",
            "Agriculture, Rural & Environment": "Agriculture, Rural & Environment",
            "Banking,Financial Services and Insurance": "Banking, Financial Services and Insurance",
            "Banking, Financial Services and Insurance": (
                "Banking, Financial Services and Insurance"
            ),
            "Science, IT & Communications": "Science, IT & Communications",
        }
        protected: dict[str, str] = {}
        for index, (raw_label, canonical) in enumerate(compound.items()):
            token = f"__COMPOUND_{index}__"
            if raw_label in category_text:
                category_text = category_text.replace(raw_label, token)
                protected[token] = canonical
        categories = [
            protected.get(value.strip(), value.strip())
            for value in re.split(r",\s*", category_text)
            if value.strip()
        ]
        candidate = replace(candidate, category=categories[0])
        candidate.eligibility_json.update(
            source_dataset=DATASET_URL, source_sha256=digest, raw_categories=categories
        )
        # Store exactly the CSV fields for duplicate comparison; review metadata is generated.
        seen[slug] = {key: normalized[key] for key in CSV_FIELDS}
        candidates.append(candidate)
    if not candidates:
        raise ValueError("Kaggle CSV contains no usable schemes")
    return KaggleImport(count, digest, candidates, duplicates, rejected)
