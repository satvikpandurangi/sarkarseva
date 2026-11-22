"""Catalogue and extractive retrieval work without an external model or embeddings."""

from collections.abc import Generator
from uuid import NAMESPACE_URL, uuid5

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool

from app.core.config import Settings
from app.db.base import Base
from app.db.draft_import import DraftCandidate, import_draft_candidates
from app.db.enums import GovernmentLevel
from app.db.session import create_session_factory
from app.main import create_app
from app.services import catalogue


@pytest.fixture
def catalogue_client() -> Generator[TestClient]:
    engine = create_engine(
        "sqlite+pysqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    with create_session_factory(engine).begin() as session:
        for slug, name, detail, category in [
            ("student-aid", "Student scholarship", "Tuition support for students.", "Education"),
            ("farm-support", "Farm support", "Support for agricultural equipment.", "Agriculture"),
            ("private-draft", "Private draft", "Secretvoucher research notes.", "Private category"),
            (
                "spoof-schema",
                "Other schema",
                "candidate-import-v1 is just text.",
                "Hidden category",
            ),
            ("false-flag", "Not public", "Unrelated draft.", "Another private category"),
            (
                "wrong-digest",
                "Other dataset version",
                "Different input.",
                "Hidden checksum category",
            ),
        ]:
            scheme_id = uuid5(NAMESPACE_URL, slug)
            import_draft_candidates(
                session,
                [
                    DraftCandidate(
                        scheme_id=scheme_id,
                        version_id=uuid5(scheme_id, "1"),
                        slug=slug,
                        name=name,
                        government_level=GovernmentLevel.CENTRAL,
                        category=category,
                        summary=detail,
                        benefit_text=detail,
                        eligibility_json={
                            "schema_version": "other"
                            if slug == "spoof-schema"
                            else "candidate-import-v1",
                            "unverified": slug != "false-flag",
                            "raw_eligibility_text": "candidate-import-v1 is only a note"
                            if slug == "spoof-schema"
                            else "Check current official requirements.",
                            "raw_documents_text": "Identity proof",
                            "raw_application_text": "Contact office",
                            "raw_categories": [category, "Secondary support"]
                            if slug == "student-aid"
                            else [category],
                            "raw_tags": [],
                            "source_dataset": "SarkarSeva_Project"
                            if slug == "private-draft"
                            else "https://www.kaggle.com/datasets/jainamgada45/indian-government-schemes",
                            "source_sha256": "0" * 64
                            if slug == "wrong-digest"
                            else (
                                "9a6c67185e1455e107630d40a8bcb34c394547adb042a7e580dab2e854734511"
                            ),
                        },
                    )
                ],
            )
    settings = Settings(_env_file=None, APP_ENV="test", DATABASE_URL="sqlite+pysqlite://")
    with TestClient(create_app(settings, database_engine=engine)) as client:
        yield client


def test_catalogue_filters_and_paginates_without_publishing(catalogue_client: TestClient) -> None:
    response = catalogue_client.get("/api/v1/catalogue?q=scholarship&limit=1")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["slug"] == "student-aid"
    assert data["items"][0]["verification_status"] == "unverified"
    assert catalogue_client.get("/api/v1/schemes").json()["items"] == []
    assert catalogue_client.get("/api/v1/catalogue?offset=100").json()["items"] == []


def test_detail_exposes_requirements_with_no_invented_official_url(
    catalogue_client: TestClient,
) -> None:
    response = catalogue_client.get("/api/v1/catalogue/student-aid")
    assert response.status_code == 200
    data = response.json()
    assert data["documents"] == "Identity proof"
    assert data["official_url"] is None
    assert catalogue_client.get("/api/v1/catalogue/not-real").status_code == 404


def test_search_understands_multiple_words_and_common_needs(catalogue_client: TestClient) -> None:
    for question in [
        "student scholarship",
        "financial help for college fees",
        "छात्रवृत्ति",
        "ವಿದ್ಯಾರ್ಥಿವೇತನ",
    ]:
        data = catalogue_client.get("/api/v1/catalogue", params={"q": question}).json()
        assert data["total"] == 1
        assert data["items"][0]["slug"] == "student-aid"
    assert catalogue_client.get("/api/v1/catalogue?q=%25").json()["total"] == 0
    assert catalogue_client.get("/api/v1/catalogue?q=the+and").json()["total"] == 0


def test_catalogue_category_and_level_filters(catalogue_client: TestClient) -> None:
    response = catalogue_client.get("/api/v1/catalogue?category=Agriculture&level=central")
    assert [s["slug"] for s in response.json()["items"]] == ["farm-support"]
    assert catalogue_client.get("/api/v1/catalogue?level=state").json()["total"] == 0
    assert catalogue_client.get("/api/v1/catalogue?offset=-1").status_code == 422


def test_private_or_spoof_drafts_never_enter_public_reference_catalogue(
    catalogue_client: TestClient,
) -> None:
    data = catalogue_client.get("/api/v1/catalogue").json()
    assert data["total"] == 2
    assert data["categories"] == ["Agriculture", "Education", "Secondary support"]
    for slug in ["private-draft", "spoof-schema", "false-flag", "wrong-digest"]:
        assert catalogue_client.get(f"/api/v1/catalogue/{slug}").status_code == 404
    answer = catalogue_client.post("/api/v1/assistant", json={"question": "secretvoucher"}).json()
    assert answer["sources"] == []


def test_secondary_categories_are_exact_memberships(catalogue_client: TestClient) -> None:
    data = catalogue_client.get("/api/v1/catalogue?category=Secondary%20support").json()
    assert data["total"] == 1
    assert data["items"][0]["slug"] == "student-aid"
    assert catalogue_client.get("/api/v1/catalogue?category=Secondary").json()["total"] == 0


def test_readiness_checks_database_and_catalogue(catalogue_client: TestClient) -> None:
    response = catalogue_client.get("/ready")
    assert response.status_code == 200
    assert response.json() == {"ready": True, "catalogue_records": 2}


def test_readiness_hides_database_errors() -> None:
    engine = create_engine(
        "sqlite+pysqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    settings = Settings(_env_file=None, APP_ENV="test", DATABASE_URL="sqlite+pysqlite://")
    with TestClient(create_app(settings, database_engine=engine)) as client:
        response = client.get("/ready")
    assert response.status_code == 503
    assert "sqlite" not in response.text.lower()
    assert "traceback" not in response.text.lower()


def test_passage_window_includes_matching_evidence_beyond_the_intro() -> None:
    text = "Unrelated introductory text. " * 100 + "Scholarship tuition support for students."
    excerpt = catalogue.relevant_excerpt(text, "scholarship")
    assert "Scholarship tuition support" in excerpt
    assert len(excerpt) <= 1200


def test_assistant_returns_passages_and_abstains_without_evidence(
    catalogue_client: TestClient,
) -> None:
    response = catalogue_client.post("/api/v1/assistant", json={"question": "student scholarship"})
    assert response.status_code == 200
    data = response.json()
    assert data["mode"] == "extractive"
    assert data["sources"][0]["slug"] == "student-aid"
    assert data["sources"][0]["excerpt"] == "Tuition support for students."
    assert "unverified" in data["notice"].lower()
    empty = catalogue_client.post("/api/v1/assistant", json={"question": "spaceship repair"}).json()
    assert empty["sources"] == []
    assert "could not find" in empty["answer"].lower()
    unrelated = catalogue_client.post(
        "/api/v1/assistant", json={"question": "Do you know the capital of Neptune?"}
    ).json()
    assert unrelated["sources"] == []
    assert (
        catalogue_client.post(
            "/api/v1/assistant",
            json={"question": "Does Neptune offer tuition support to students?"},
        ).json()["sources"]
        == []
    )
    assert catalogue_client.post("/api/v1/assistant", json={"question": " "}).status_code == 422
    assert (
        catalogue_client.post("/api/v1/assistant", json={"question": "x" * 2001}).status_code == 422
    )
