"""FastAPI application factory.

Run locally from the ``backend`` directory:
    .venv\\Scripts\\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
"""

from __future__ import annotations

import logging
import time
from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.types import ASGIApp, Receive, Scope, Send

from app import __version__
from app.api.v1 import router as v1_router
from app.core.config import Settings, get_settings
from app.core.errors import error_body, register_exception_handlers
from app.services.inference import InferencePipeline

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("emovision")

PipelineFactory = Callable[[Settings], InferencePipeline]


def load_real_pipeline(settings: Settings) -> InferencePipeline:
    # Imported lazily so unit tests that inject fakes never import torch/timm.
    from app.ml.emotion_model import EmotionClassifier
    from app.ml.face_detector import YUNET_FILENAME, YuNetFaceDetector

    detector = YuNetFaceDetector(
        settings.models_dir / YUNET_FILENAME,
        score_threshold=settings.face_score_threshold,
        detection_max_side=settings.detection_max_side,
        min_face_size=settings.min_face_size,
    )
    classifier = EmotionClassifier(settings.models_dir, device=settings.device)
    return InferencePipeline(detector, classifier, settings)


class BodySizeLimitMiddleware:
    """Reject oversized prediction uploads early using the Content-Length header.

    The route also enforces the limit on the bytes it actually reads, which
    covers clients that stream without a Content-Length.
    """

    MULTIPART_OVERHEAD = 16 * 1024

    def __init__(self, app: ASGIApp, max_bytes: int) -> None:
        self.app = app
        self.max_bytes = max_bytes + self.MULTIPART_OVERHEAD

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http" and scope["path"].endswith("/predict"):
            length = dict(scope["headers"]).get(b"content-length")
            if length is not None and length.isdigit() and int(length) > self.max_bytes:
                from fastapi.responses import JSONResponse

                response = JSONResponse(
                    status_code=413, content=error_body("payload_too_large", "Request body is too large.")
                )
                await response(scope, receive, send)
                return
        await self.app(scope, receive, send)


def create_app(
    settings: Settings | None = None,
    pipeline_factory: PipelineFactory | None = load_real_pipeline,
) -> FastAPI:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        app.state.pipeline = None
        app.state.load_error = None
        if pipeline_factory is not None:
            try:
                started = time.perf_counter()
                app.state.pipeline = pipeline_factory(settings)
                logger.info("Models loaded on %s in %.1fs", app.state.pipeline.device, time.perf_counter() - started)
            except Exception as exc:
                # Keep serving so /health can report the problem; /predict returns 503.
                logger.error("Model loading failed (%s): %s", type(exc).__name__, exc)
                app.state.load_error = "Model weights could not be loaded. Run scripts/setup_models.py."
        yield
        app.state.pipeline = None

    app = FastAPI(
        title="EmoVisionAI API",
        version=__version__,
        description="Local facial-expression recognition API. Frames are processed in memory and never stored.",
        lifespan=lifespan,
    )
    app.state.settings = settings
    app.state.started_at = time.monotonic()
    app.state.pipeline = None
    app.state.load_error = None

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )
    app.add_middleware(BodySizeLimitMiddleware, max_bytes=settings.max_upload_bytes)
    register_exception_handlers(app)
    app.include_router(v1_router)
    return app


app = create_app()
