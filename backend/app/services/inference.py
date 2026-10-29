"""End-to-end inference pipeline: decode -> detect faces -> classify -> response.

Route handlers stay thin; this module owns the ML workflow. The detector and
classifier are injected, so unit tests can supply lightweight fakes while the
smoke tests exercise the real models.
"""

from __future__ import annotations

import logging
import threading
import time
from datetime import datetime, timezone
from typing import Protocol

import cv2
import numpy as np

from app.core.config import Settings
from app.core.errors import ApiError
from app.ml.face_detector import FaceBox
from app.ml.labels import REQUESTED_CATEGORIES
from app.schemas.api import (
    BoundingBox,
    CategoryResult,
    FacePrediction,
    ImageMeta,
    PredictionResponse,
    Timings,
    UnsupportedCategory,
)
from app.services.image_io import decode_image

logger = logging.getLogger("emovision.inference")


class FaceDetector(Protocol):
    name: str

    def detect(self, image_bgr: np.ndarray) -> list[FaceBox]: ...


class ExpressionClassifier(Protocol):
    name: str
    labels: tuple[str, ...]

    def predict_proba(self, faces_rgb: list[np.ndarray]) -> np.ndarray: ...


def _ms(start: float) -> float:
    return round((time.perf_counter() - start) * 1000, 2)


class InferencePipeline:
    def __init__(self, detector: FaceDetector, classifier: ExpressionClassifier, settings: Settings) -> None:
        self.detector = detector
        self.classifier = classifier
        self.settings = settings
        # PyTorch already parallelises a single forward pass across cores, so
        # running requests one at a time gives the best per-frame latency and
        # keeps memory bounded. Waiting requests give up after a timeout.
        self._lock = threading.Lock()

    @property
    def device(self) -> str:
        return str(getattr(self.classifier, "device", "cpu"))

    def predict(self, data: bytes) -> PredictionResponse:
        if not self._lock.acquire(timeout=self.settings.inference_lock_timeout_s):
            raise ApiError(503, "server_busy", "The inference engine is busy. Please retry shortly.")
        try:
            return self._predict_locked(data)
        finally:
            self._lock.release()

    def _predict_locked(self, data: bytes) -> PredictionResponse:
        started = time.perf_counter()
        image_bgr = decode_image(data, self.settings.max_image_side)
        decode_ms = _ms(started)
        height, width = image_bgr.shape[:2]

        t_detect = time.perf_counter()
        try:
            boxes = self.detector.detect(image_bgr)
        except Exception as exc:  # detector failures must not leak details
            logger.exception("Face detection failed: %s", type(exc).__name__)
            raise ApiError(500, "detection_failed", "Face detection failed for this frame.") from None
        detection_ms = _ms(t_detect)

        analysed = boxes[: self.settings.max_faces]
        probabilities = np.zeros((0, len(self.classifier.labels)), dtype=np.float32)
        classification_ms = 0.0
        if analysed:
            crops = [
                cv2.cvtColor(image_bgr[b.y : b.y + b.height, b.x : b.x + b.width], cv2.COLOR_BGR2RGB) for b in analysed
            ]
            t_classify = time.perf_counter()
            try:
                probabilities = self.classifier.predict_proba(crops)
            except Exception as exc:
                logger.exception("Expression inference failed: %s", type(exc).__name__)
                raise ApiError(500, "inference_failed", "Expression inference failed for this frame.") from None
            classification_ms = _ms(t_classify)
            if probabilities.shape != (len(analysed), len(self.classifier.labels)) or not np.all(
                np.isfinite(probabilities)
            ):
                logger.error("Classifier returned malformed output with shape %s", probabilities.shape)
                raise ApiError(500, "inference_failed", "Expression inference produced an invalid result.")

        faces = [
            self._face_result(box, probs, width, height, is_primary=(i == 0))
            for i, (box, probs) in enumerate(zip(analysed, probabilities, strict=True))
        ]
        primary = faces[0] if faces else None

        # Image buffers go out of scope here; nothing is written to disk or logged.
        return PredictionResponse(
            face_detected=bool(faces),
            face_count=len(boxes),
            faces=faces,
            predicted_expression=primary.predicted_expression if primary else None,
            confidence=primary.confidence if primary else None,
            class_scores=primary.class_scores if primary else None,
            requested_categories=self._requested_categories(primary),
            unsupported_categories=[
                UnsupportedCategory(name=c.name, reason=c.explanation)
                for c in REQUESTED_CATEGORIES
                if c.status == "unsupported"
            ],
            inference_time_ms=classification_ms,
            timings=Timings(
                decode_ms=decode_ms,
                detection_ms=detection_ms,
                classification_ms=classification_ms,
                total_ms=_ms(started),
            ),
            image=ImageMeta(width=width, height=height),
            model_name=self.classifier.name,
            timestamp=datetime.now(timezone.utc),
            message=self._message(len(boxes), len(analysed)),
        )

    def _face_result(
        self, box: FaceBox, probs: np.ndarray, width: int, height: int, is_primary: bool
    ) -> FacePrediction:
        top = int(np.argmax(probs))
        return FacePrediction(
            box=BoundingBox(
                x=round(box.x / width, 4),
                y=round(box.y / height, 4),
                width=round(box.width / width, 4),
                height=round(box.height / height, 4),
            ),
            detection_score=round(box.score, 4),
            predicted_expression=self.classifier.labels[top],
            confidence=round(float(probs[top]), 4),
            class_scores={label: round(float(p), 4) for label, p in zip(self.classifier.labels, probs, strict=True)},
            is_primary=is_primary,
        )

    @staticmethod
    def _requested_categories(primary: FacePrediction | None) -> list[CategoryResult]:
        results = []
        for category in REQUESTED_CATEGORIES:
            score = None
            if category.status == "measured" and primary is not None and category.model_label:
                score = primary.class_scores.get(category.model_label)
            results.append(
                CategoryResult(
                    name=category.name,
                    status=category.status,
                    score=score,
                    model_label=category.model_label,
                    explanation=category.explanation,
                )
            )
        return results

    @staticmethod
    def _message(detected: int, analysed: int) -> str | None:
        if detected == 0:
            return "No face detected. Face the camera in good, even lighting."
        if detected > analysed:
            return f"{detected} faces detected; analysed the {analysed} largest. The primary result is the largest."
        if detected > 1:
            return f"{detected} faces detected. The primary result is the largest face."
        return None
