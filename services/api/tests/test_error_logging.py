"""Unexpected database/provider errors must not copy private payloads to logs."""

import logging

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine

from app.core.config import Settings
from app.main import create_app


def test_unhandled_errors_log_type_and_request_id_not_private_payload(
    caplog: pytest.LogCaptureFixture,
) -> None:
    settings = Settings(_env_file=None, APP_ENV="test", DATABASE_URL="sqlite+pysqlite://")
    application = create_app(settings, database_engine=create_engine("sqlite+pysqlite://"))

    @application.get("/_test-error")
    def crash() -> None:
        raise ValueError("private-profile-fact synthetic-secret-key")

    with caplog.at_level(logging.ERROR), TestClient(application) as client:
        response = client.get("/_test-error", headers={"X-Request-ID": "safe-request-123"})
    assert response.status_code == 500
    assert "ValueError" in caplog.text
    assert "safe-request-123" in caplog.text
    assert "private-profile-fact" not in caplog.text
    assert "synthetic-secret-key" not in caplog.text
    assert "private-profile-fact" not in response.text
