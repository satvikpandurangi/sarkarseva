"""Public reference catalogue, separate from verified publication and curation."""

from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.api.dependencies import get_db_session
from app.services.catalogue import catalogue_detail, list_catalogue, retrieve_answer

router = APIRouter(prefix="/api/v1", tags=["catalogue"])
Database = Annotated[Session, Depends(get_db_session)]


class AskRequest(BaseModel):
    question: str = Field(min_length=2, max_length=2000)

    @field_validator("question")
    @classmethod
    def nonblank(cls, value: str) -> str:
        if len(value.strip()) < 2:
            raise ValueError("Enter a question of at least two characters")
        return value.strip()


@router.get("/catalogue")
def catalogue(
    session: Database,
    q: Annotated[str, Query(max_length=200)] = "",
    category: Annotated[str, Query(max_length=100)] = "",
    level: Literal["", "central", "state"] = "",
    offset: Annotated[int, Query(ge=0, le=100000)] = 0,
    limit: Annotated[int, Query(ge=1, le=60)] = 24,
) -> dict[str, object]:
    return list_catalogue(session, q, category, level, offset, limit)


@router.get("/catalogue/{slug}")
def detail(slug: str, session: Database) -> dict[str, object]:
    result = catalogue_detail(session, slug)
    if result is None:
        raise HTTPException(status_code=404, detail="Scheme record not found.")
    return result


@router.post("/assistant")
def assistant(payload: AskRequest, session: Database) -> dict[str, object]:
    return retrieve_answer(session, payload.question)
