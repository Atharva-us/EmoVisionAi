"""Version 1 HTTP routes. Handlers validate input and delegate to services."""

from __future__ import annotations

import time

from fastapi import APIRouter, File, Request, UploadFile
from fastapi.concurrency import run_in_threadpool

from app import __version__
from app.core.config import Settings
from app.core.errors import ApiError
from app.schemas.api import (
    ErrorResponse,
    HealthResponse,
    ModelInfoResponse,
    PredictionResponse,
    SessionConfigResponse,
)
from app.services.image_io import ACCEPTED_CONTENT_TYPES, validate_content_type
from app.services.inference import InferencePipeline
from app.services.model_info import build_model_info

router = APIRouter(prefix="/api/v1")

ERROR_RESPONSES = {code: {"model": ErrorResponse} for code in (413, 415, 422, 500, 503)}


def _settings(request: Request) -> Settings:
    return request.app.state.settings


def _pipeline(request: Request) -> InferencePipeline | None:
    return request.app.state.pipeline


@router.get("/health", response_model=HealthResponse, tags=["system"])
def health(request: Request) -> HealthResponse:
    pipeline = _pipeline(request)
    return HealthResponse(
        status="ok" if pipeline else "degraded",
        model_loaded=pipeline is not None,
        device=pipeline.device if pipeline else None,
        version=__version__,
        uptime_s=round(time.monotonic() - request.app.state.started_at, 1),
        message=None if pipeline else request.app.state.load_error,
    )


@router.get("/model/info", response_model=ModelInfoResponse, tags=["model"])
def model_info(request: Request) -> ModelInfoResponse:
    pipeline = _pipeline(request)
    return build_model_info(
        device=pipeline.device if pipeline else None,
        model_loaded=pipeline is not None,
        evaluation_path=_settings(request).evaluation_results,
    )


@router.get("/session/config", response_model=SessionConfigResponse, tags=["session"])
def session_config(request: Request) -> SessionConfigResponse:
    s = _settings(request)
    return SessionConfigResponse(
        recommended_interval_ms=s.recommended_interval_ms,
        min_interval_ms=250,
        recommended_capture_width=s.recommended_capture_width,
        recommended_jpeg_quality=s.recommended_jpeg_quality,
        max_upload_bytes=s.max_upload_bytes,
        accepted_content_types=list(ACCEPTED_CONTENT_TYPES),
        max_faces=s.max_faces,
    )


@router.post(
    "/predict",
    response_model=PredictionResponse,
    responses=ERROR_RESPONSES,
    tags=["inference"],
    summary="Detect faces in one image and classify their expressions",
)
async def predict(
    request: Request,
    image: UploadFile = File(description="JPEG, PNG or WebP frame, at most 2 MB by default."),
) -> PredictionResponse:
    """Send a single frame as `multipart/form-data` in the `image` field.

    The frame is processed in memory and discarded; it is never stored or logged.
    """
    pipeline = _pipeline(request)
    if pipeline is None:
        raise ApiError(503, "model_unavailable", "The expression model is not loaded. See the backend logs.")

    validate_content_type(image.content_type)
    limit = _settings(request).max_upload_bytes
    data = await image.read(limit + 1)
    await image.close()
    if len(data) > limit:
        raise ApiError(413, "payload_too_large", f"Image exceeds the {limit // 1024} KB upload limit.")

    # Inference is CPU-bound; run it off the event loop.
    return await run_in_threadpool(pipeline.predict, data)
