"""
main.py
-------
FastAPI application entry-point for the AI job-résumé matching microservice.

Endpoints
---------
GET  /health  – liveness probe
POST /match   – résumé ↔ vacancy cosine-similarity scoring
"""

import logging
import os
from contextlib import asynccontextmanager
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator

# ---------------------------------------------------------------------------
# Bootstrap – environment & logging
# ---------------------------------------------------------------------------

load_dotenv()  # reads .env (or .env.example fallback) into os.environ

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# CORS origins – read from .env, fallback to localhost:8000
# ---------------------------------------------------------------------------

_raw_origins: str = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:8000,http://127.0.0.1:8000",
)
ALLOWED_ORIGINS: list[str] = [o.strip() for o in _raw_origins.split(",") if o.strip()]


# ---------------------------------------------------------------------------
# Lifespan – import the model during startup so the first POST /match is fast
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Import matcher (which loads the model) at startup, release on shutdown."""
    logger.info("Loading sentence-transformer model …")
    try:
        import matcher  # noqa: F401  – side-effect: model is loaded
        logger.info("Model ready.  Service accepting requests.")
    except Exception as exc:
        logger.critical("Could not load matcher module: %s", exc, exc_info=True)
        raise
    yield
    logger.info("Shutting down AI matching service.")


# ---------------------------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------------------------

app = FastAPI(
    title="AI Job-Résumé Matching Service",
    description=(
        "Computes semantic similarity between a résumé and a list of job "
        "vacancies using the all-MiniLM-L6-v2 sentence-transformer model."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Pydantic schemas (v2)
# ---------------------------------------------------------------------------

class VacancyIn(BaseModel):
    """A single job vacancy as received from the Laravel backend."""

    id: int | str = Field(..., description="Unique vacancy identifier.")
    title: str = Field(..., min_length=1, description="Job title.")
    description: str = Field(..., min_length=1, description="Full job description.")
    requirements: str | None = Field(
        default=None,
        description="Optional requirements / skills section.",
    )

    @field_validator("title", "description", mode="before")
    @classmethod
    def strip_whitespace(cls, value: Any) -> Any:
        if isinstance(value, str):
            return value.strip()
        return value


class MatchRequest(BaseModel):
    """Request body for POST /match."""

    resume_text: str = Field(
        ...,
        min_length=1,
        description="Full plain-text content of the applicant's résumé.",
    )
    vacancies: list[VacancyIn] = Field(
        ...,
        min_length=1,
        description="List of vacancies to score against the résumé.",
    )

    @field_validator("resume_text", mode="before")
    @classmethod
    def strip_resume(cls, value: Any) -> Any:
        if isinstance(value, str):
            return value.strip()
        return value


class MatchResult(BaseModel):
    """A single vacancy score."""

    vacancy_id: int | str
    score: float = Field(..., description="Cosine similarity in [-1, 1].")


class MatchResponse(BaseModel):
    """Response body for POST /match."""

    matches: list[MatchResult]


class HealthResponse(BaseModel):
    """Response body for GET /health."""

    status: str
    model: str


# ---------------------------------------------------------------------------
# Global exception handler – prevents raw tracebacks leaking to clients
# ---------------------------------------------------------------------------

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error(
        "Unhandled exception on %s %s: %s",
        request.method,
        request.url.path,
        exc,
        exc_info=True,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please try again later."},
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get(
    "/health",
    response_model=HealthResponse,
    summary="Liveness probe",
    tags=["Utility"],
)
async def health_check() -> HealthResponse:
    """Returns service status and the active model name."""
    return HealthResponse(status="ok", model="all-MiniLM-L6-v2")


@app.post(
    "/match",
    response_model=MatchResponse,
    summary="Score résumé against vacancies",
    tags=["Matching"],
    responses={
        200: {"description": "Sorted list of vacancy scores."},
        422: {"description": "Validation error – check request body."},
        500: {"description": "Internal server error."},
    },
)
async def match_resume(payload: MatchRequest) -> MatchResponse:
    """
    Compute cosine-similarity scores between the supplied résumé text and
    each vacancy, returning results sorted by descending score.
    """
    import matcher  # local import – model already warm from lifespan

    logger.info(
        "POST /match – resume length=%d chars, vacancies=%d",
        len(payload.resume_text),
        len(payload.vacancies),
    )

    try:
        raw_vacancies = [v.model_dump() for v in payload.vacancies]
        results = matcher.compute_matches(payload.resume_text, raw_vacancies)
    except Exception as exc:
        logger.error("compute_matches raised an exception: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to compute matches. Check service logs for details.",
        ) from exc

    logger.info("POST /match – returning %d scored results.", len(results))
    return MatchResponse(matches=[MatchResult(**r) for r in results])


# ---------------------------------------------------------------------------
# Dev entrypoint  (python main.py)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    host = os.getenv("AI_SERVICE_HOST", "0.0.0.0")
    port = int(os.getenv("AI_SERVICE_PORT", "8001"))

    logger.info("Starting AI Matching Service on %s:%d", host, port)
    uvicorn.run("main:app", host=host, port=port, reload=False)
