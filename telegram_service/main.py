"""
main.py
-------
FastAPI microservice that posts new job listings to a Telegram channel.

Endpoints
---------
GET  /health      – liveness probe
POST /send-job    – format and publish a vacancy to the configured channel
"""

import logging
import os
from typing import Any, Dict, List, Optional, Union

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator

# ---------------------------------------------------------------------------
# Bootstrap
# ---------------------------------------------------------------------------

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHANNEL_ID = os.getenv("TELEGRAM_CHANNEL_ID", "")
APP_URL = os.getenv("APP_URL", "http://localhost:8000").rstrip("/")

_raw_origins: str = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:8000,http://127.0.0.1:8000",
)
ALLOWED_ORIGINS: List[str] = [o.strip() for o in _raw_origins.split(",") if o.strip()]

TELEGRAM_API_BASE = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Telegram Job Notification Service",
    description="Posts new job vacancies to a Telegram channel with a deep-link back to the job board.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

EMPLOYMENT_LABELS: Dict[str, str] = {
    "full_time": "Full-time",
    "part_time": "Part-time",
    "contract": "Contract",
    "temporary": "Temporary",
    "internship": "Internship",
}

WORK_TYPE_LABELS: Dict[str, str] = {
    "remote": "Remote",
    "on_site": "On-site",
    "hybrid": "Hybrid",
}


class JobPayload(BaseModel):
    vacancy_id: int
    title: str = Field(..., min_length=1)
    company_name: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[str] = None
    work_type: Optional[str] = None
    salary_min: Optional[Union[str, float]] = None
    salary_max: Optional[Union[str, float]] = None
    description: str = Field(..., min_length=1)
    tags: Optional[List[str]] = None
    application_deadline: Optional[str] = None

    @field_validator("title", "description", mode="before")
    @classmethod
    def strip_str(cls, v: Any) -> Any:
        return v.strip() if isinstance(v, str) else v


class HealthResponse(BaseModel):
    status: str
    channel: str


class SendJobResponse(BaseModel):
    ok: bool
    message_id: Optional[int] = None

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_ESCAPE_CHARS = r"_*[]()~`>#+-=|{}.!"


def escape_md(text: str) -> str:
    """Escape special characters for Telegram MarkdownV2."""
    for ch in _ESCAPE_CHARS:
        text = text.replace(ch, f"\\{ch}")
    return text


def format_salary(salary_min: Optional[Union[str, float]], salary_max: Optional[Union[str, float]]) -> Optional[str]:
    """Return a human-readable salary range string or None."""
    has_min = salary_min not in (None, "", 0, "0")
    has_max = salary_max not in (None, "", 0, "0")
    if not has_min and not has_max:
        return None
    try:
        min_val = f"{float(salary_min):,.0f}" if has_min else None
        max_val = f"{float(salary_max):,.0f}" if has_max else None
    except (ValueError, TypeError):
        return None
    if min_val and max_val:
        return f"ETB {min_val} – {max_val}"
    if min_val:
        return f"ETB {min_val}+"
    return f"Up to ETB {max_val}"


def build_message(job: JobPayload) -> str:
    """
    Build a Telegram MarkdownV2 message for a new job posting.

    Example output:
    ─────────────────────────────────────
    🚀 *New Job Opportunity!*

    *Software Engineer*
    🏢 TechCorp
    📍 Addis Ababa · Remote · Full-time
    💰 ETB 50,000 – 80,000

    We are looking for a talented...

    🏷 *Tags:* Python, FastAPI, Docker
    📅 *Apply by:* Jun 30, 2026

    👉 [View & Apply →](https://example.com/jobs?vacancy=42)
    ─────────────────────────────────────
    """
    lines: list[str] = []

    lines.append("🚀 *New Job Opportunity\\!*")
    lines.append("")
    lines.append(f"*{escape_md(job.title)}*")

    if job.company_name:
        lines.append(f"🏢 {escape_md(job.company_name)}")

    meta_parts: list[str] = []
    if job.location:
        meta_parts.append(escape_md(job.location))
    if job.work_type:
        meta_parts.append(escape_md(WORK_TYPE_LABELS.get(job.work_type, job.work_type)))
    if job.employment_type:
        meta_parts.append(escape_md(EMPLOYMENT_LABELS.get(job.employment_type, job.employment_type)))
    if meta_parts:
        lines.append("📍 " + " · ".join(meta_parts))

    salary = format_salary(job.salary_min, job.salary_max)
    if salary:
        lines.append(f"💰 {escape_md(salary)}")

    lines.append("")

    # Truncate description to 300 chars for readability
    desc = job.description.strip()
    if len(desc) > 300:
        desc = desc[:297] + "..."
    lines.append(escape_md(desc))

    lines.append("")

    if job.tags:
        tag_str = ", ".join(job.tags[:8])
        lines.append(f"🏷 *Tags:* {escape_md(tag_str)}")

    if job.application_deadline:
        lines.append(f"📅 *Apply by:* {escape_md(job.application_deadline)}")

    deep_link = f"{APP_URL}/jobs?vacancy={job.vacancy_id}"
    lines.append("")
    lines.append(f"👉 [View & Apply →]({deep_link})")

    return "\n".join(lines)


async def post_to_telegram(text: str) -> Dict:
    """Send a MarkdownV2 message to the configured Telegram channel."""
    if not TELEGRAM_BOT_TOKEN:
        raise ValueError("TELEGRAM_BOT_TOKEN is not configured")
    if not TELEGRAM_CHANNEL_ID:
        raise ValueError("TELEGRAM_CHANNEL_ID is not configured")

    url = f"{TELEGRAM_API_BASE}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHANNEL_ID,
        "text": text,
        "parse_mode": "MarkdownV2",
        "disable_web_page_preview": False,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(url, json=payload)

    resp.raise_for_status()
    return resp.json()

# ---------------------------------------------------------------------------
# Exception handler
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
        content={"detail": "An internal server error occurred. Please check service logs."},
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
    configured = bool(TELEGRAM_BOT_TOKEN and TELEGRAM_CHANNEL_ID)
    return HealthResponse(
        status="ok" if configured else "unconfigured",
        channel=TELEGRAM_CHANNEL_ID or "(not set)",
    )


@app.post(
    "/send-job",
    response_model=SendJobResponse,
    summary="Post a new job vacancy to the Telegram channel",
    tags=["Notifications"],
    responses={
        200: {"description": "Message sent successfully."},
        422: {"description": "Validation error – check request body."},
        500: {"description": "Telegram API error or service misconfiguration."},
    },
)
async def send_job(job: JobPayload) -> SendJobResponse:
    """
    Receive a vacancy payload from the Laravel backend, format it as a
    Telegram MarkdownV2 message, and publish it to the configured channel.
    """
    logger.info(
        "POST /send-job – vacancy_id=%d title=%r",
        job.vacancy_id,
        job.title,
    )

    message = build_message(job)

    try:
        result = await post_to_telegram(message)
    except httpx.HTTPStatusError as exc:
        logger.error(
            "Telegram API returned %d: %s",
            exc.response.status_code,
            exc.response.text,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Telegram API error: {exc.response.text}",
        ) from exc
    except (httpx.RequestError, ValueError) as exc:
        logger.error("Failed to reach Telegram API: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    message_id: Optional[int] = result.get("result", {}).get("message_id")
    logger.info("Message sent – message_id=%s", message_id)
    return SendJobResponse(ok=True, message_id=message_id)


# ---------------------------------------------------------------------------
# Dev entrypoint  (python main.py)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    host = os.getenv("TELEGRAM_SERVICE_HOST", "0.0.0.0")
    port = int(os.getenv("PORT", os.getenv("TELEGRAM_SERVICE_PORT", "8002")))

    logger.info("Starting Telegram Job Notification Service on %s:%d", host, port)
    uvicorn.run("main:app", host=host, port=port, reload=False)
