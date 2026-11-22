"""Liveness endpoint."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.dependencies import get_db_session
from app.schemas.common import HealthResponse
from app.services.catalogue import draft_query

router = APIRouter(tags=["system"])


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
