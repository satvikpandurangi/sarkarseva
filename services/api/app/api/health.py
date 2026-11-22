"""Liveness endpoint."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import SecretStr
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.dependencies import get_db_session
from app.modules.ai.gemini import GeminiExtractor, get_extractor
from app.modules.speech.sarvam import SarvamSpeech, get_speech_service
from app.schemas.common import HealthResponse
from app.services.catalogue import draft_query

router = APIRouter(tags=["system"])


@router.get("/api/v1/capabilities")
def capabilities(
    extractor: Annotated[GeminiExtractor, Depends(get_extractor)],
    speech: Annotated[SarvamSpeech, Depends(get_speech_service)],
) -> dict[str, bool]:
    def present(value: SecretStr | None) -> bool:
        return bool(value and value.get_secret_value().strip())

    return {
        "speech": present(speech.settings.api_key),
        "profile_extraction": bool(
            present(extractor.groq_settings.api_key if extractor.groq_settings else None)
            or (present(extractor.settings.api_key) and extractor.settings.model)
            or present(extractor.sarvam_settings.api_key if extractor.sarvam_settings else None)
        ),
    }


@router.get("/ready")
def readiness(session: Annotated[Session, Depends(get_db_session)]) -> dict[str, object]:
    """Distinguish a live process from a connected, populated scheme catalogue."""
    try:
        count = session.scalar(select(func.count()).select_from(draft_query().subquery())) or 0
    except SQLAlchemyError:
        raise HTTPException(status_code=503, detail="Scheme service is not ready.") from None
    if count == 0:
        raise HTTPException(status_code=503, detail="Scheme catalogue is not initialized.")
    return {"ready": True, "catalogue_records": count}


@router.get("/health", response_model=HealthResponse)
def health(request: Request) -> HealthResponse:
    """Report process liveness without leaking dependency or secret values."""

    settings = request.app.state.settings
    return HealthResponse(
        service=settings.app_name,
        version=settings.app_version,
        environment=settings.app_env,
    )
