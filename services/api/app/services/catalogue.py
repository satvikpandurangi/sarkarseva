"""Read-only, provenance-labelled discovery over imported draft records."""

import re
from typing import Any

from sqlalchemy import Select, and_, case, false, func, literal, or_, select
from sqlalchemy.orm import Session

from app.db.enums import ReviewStatus
from app.db.kaggle_import import CSV_SHA256, DATASET_URL
from app.db.models import Scheme, SchemeVersion

NOTICE = (
    "These are unverified dataset records, not current official policy or an eligibility decision. "
    "Confirm requirements with the administering department before applying."
)
STOP_WORDS = {
    "the",
    "a",
    "an",
    "i",
    "am",
    "for",
    "of",
    "in",
    "to",
    "and",
    "is",
    "my",
    "me",
    "can",
    "what",
    "which",
    "how",
    "get",
    "need",
    "help",
    "with",
    "are",
    "financial",
    "please",
    "want",
    "scheme",
    "schemes",
    "do",
    "does",
    "you",
    "your",
    "know",
    "about",
    "offer",
    "offers",
    "there",
    "any",
    "tell",
    "could",
    "would",
    "should",
    "available",
    "benefits",
}
SYNONYMS = (
    {
        "scholarship",
        "scholarships",
        "student",
        "students",
        "college",
        "fees",
        "tuition",
        "education",
        "छात्रवृत्ति",
        "शिक्षा",
        "ವಿದ್ಯಾರ್ಥಿವೇತನ",
        "ಶಿಕ್ಷಣ",
    },
    {"farmer", "farmers", "farming", "agriculture", "agricultural", "किसान", "ರೈತ"},
    {"housing", "house", "home", "आवास", "ವಸತಿ"},
    {"pension", "elderly", "retirement", "पेंशन", "ಪಿಂಚಣಿ"},
    {"women", "woman", "female", "महिला", "ಮಹಿಳೆ"},
    {"disability", "disabled", "divyang", "दिव्यांग", "ವಿಕಲಚೇತನ"},
)


def search_expression(q: str, *, require_all: bool = False) -> tuple[Any, Any]:
    """Portable weighted keyword retrieval, without models or generated policy."""
    tokens = sorted(
        {
            t.casefold()
            for t in re.findall(r"[^\W_][\w\u0900-\u097f\u0c80-\u0cff]*", q)
            if t.casefold() not in STOP_WORDS
        }
    )[:24]
    conditions = []
    scores = []
    for token in tokens:
        aliases = next((group for group in SYNONYMS if token in group), {token})
        # Tokens contain only Unicode word characters: no SQL wildcard expansion.
        title = or_(*(Scheme.name.ilike(f"%{word}%") for word in sorted(aliases)))
        body = or_(*(SchemeVersion.summary.ilike(f"%{word}%") for word in sorted(aliases)))
        exact_title = Scheme.name.ilike(f"%{token}%")
        conditions.append(or_(title, body))
        scores.append(case((exact_title, 8), (title, 4), (body, 1), else_=0))
    predicate = (and_(*conditions) if require_all else or_(*conditions)) if conditions else false()
    return predicate, sum(scores, literal(0))


def draft_query() -> Select[Scheme, SchemeVersion]:
    return (
        select(Scheme, SchemeVersion)
        .join(SchemeVersion, SchemeVersion.scheme_id == Scheme.id)
        .where(
            SchemeVersion.review_status == ReviewStatus.DRAFT,
            SchemeVersion.published_at.is_(None),
            SchemeVersion.verified_at.is_(None),
            SchemeVersion.eligibility_json["schema_version"].as_string() == "candidate-import-v1",
            SchemeVersion.eligibility_json["source_dataset"].as_string() == DATASET_URL,
            SchemeVersion.eligibility_json["source_sha256"].as_string() == CSV_SHA256,
            SchemeVersion.eligibility_json["unverified"].as_boolean().is_(True),
        )
    )


def summary(scheme: Scheme, version: SchemeVersion) -> dict[str, Any]:
    return {
        "slug": scheme.slug,
        "name": scheme.name,
        "category": scheme.category,
        "government_level": scheme.government_level.value,
        "summary": version.summary[:400],
        "verification_status": "unverified",
    }


def list_catalogue(
    session: Session, q: str, category: str, level: str, offset: int, limit: int
) -> dict[str, Any]:
    statement = draft_query()
    category_rows = session.execute(
        draft_query().with_only_columns(
            SchemeVersion.id,
            SchemeVersion.eligibility_json["raw_categories"],
            maintain_column_froms=True,
        )
    ).all()
    categories = sorted(
        {
            label
            for _, labels in category_rows
            if isinstance(labels, list)
            for label in labels
            if isinstance(label, str)
        }
    )
    score = None
    if q.strip():
        condition, score = search_expression(q)
        statement = statement.where(condition)
    if category:
        matching_ids = [
            version_id
            for version_id, labels in category_rows
            if isinstance(labels, list) and category in labels
        ]
        statement = statement.where(SchemeVersion.id.in_(matching_ids))
    if level:
        statement = statement.where(Scheme.government_level == level)
    total = session.scalar(select(func.count()).select_from(statement.subquery())) or 0
    order = (
        [score.desc(), Scheme.name, Scheme.id] if score is not None else [Scheme.name, Scheme.id]
    )
    rows = session.execute(statement.order_by(*order).offset(offset).limit(limit))
    return {
        "items": [summary(s, v) for s, v in rows],
        "total": total,
        "offset": offset,
        "limit": limit,
        "categories": categories,
        "notice": NOTICE,
    }


def catalogue_detail(session: Session, slug: str) -> dict[str, Any] | None:
    row = session.execute(draft_query().where(Scheme.slug == slug)).first()
    if row is None:
        return None
    scheme, version = row
    raw = version.eligibility_json
    return {
        **summary(scheme, version),
        "summary": version.summary,
        "benefits": version.benefit_text,
        "eligibility": raw.get("raw_eligibility_text", ""),
        "application": raw.get("raw_application_text", ""),
        "documents": raw.get("raw_documents_text", ""),
        "official_url": None,
        "dataset_url": raw.get("source_dataset", ""),
        "notice": NOTICE,
    }


def relevant_excerpt(text: str, question: str) -> str:
    if len(text) <= 1200:
        return text
    terms = {
        token.casefold()
        for token in re.findall(r"[^\W_][\w\u0900-\u097f\u0c80-\u0cff]*", question)
        if token.casefold() not in STOP_WORDS
    }
    aliases = {
        alias
        for term in terms
        for alias in next((group for group in SYNONYMS if term in group), {term})
    }
    positions = [text.casefold().find(term) for term in aliases if term in text.casefold()]
    start = max(0, min(positions, default=0) - 120)
    excerpt = text[start : start + 1196]
    return ("… " if start else "") + excerpt + (" …" if start + 1196 < len(text) else "")


def retrieve_answer(session: Session, question: str) -> dict[str, Any]:
    condition, score = search_expression(question, require_all=True)
    rows = session.execute(
        draft_query()
        .where(condition)
        .order_by(score.desc() if hasattr(score, "desc") else Scheme.name, Scheme.name, Scheme.id)
        .limit(5)
    )
    sources = [
        {
            "slug": s.slug,
            "name": s.name,
            "excerpt": relevant_excerpt(v.summary, question),
            "verification_status": "unverified",
        }
        for s, v in rows
    ]
    return {
        "mode": "extractive",
        "answer": (
            "I found these relevant passages in the imported scheme records. Open each record "
            "to read its benefits, requirements and application guidance."
            if sources
            else "I could not find supporting scheme records. Try a scheme name or a "
            "specific need, such as scholarship, housing or farming."
        ),
        "sources": sources,
        "notice": NOTICE,
    }
