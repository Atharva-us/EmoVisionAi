"""Shared fixtures. Unit tests use fakes; see test_real_model.py for the real weights."""

from __future__ import annotations

from collections.abc import Callable, Iterator

import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from app.ml.face_detector import FaceBox
from app.ml.labels import MODEL_LABELS
from app.services.inference import InferencePipeline


class FakeDetector:
    name = "fake-detector"

    def __init__(self, boxes: list[FaceBox] | None = None, error: Exception | None = None) -> None:
        self.boxes = boxes or []
        self.error = error

    def detect(self, image_bgr: np.ndarray) -> list[FaceBox]:
        if self.error:
            raise self.error
        return list(self.boxes)


class FakeClassifier:
    name = "fake-classifier"
    labels = MODEL_LABELS
    device = "cpu"

    def __init__(self, probabilities: list[float] | None = None, error: Exception | None = None) -> None:
        default = [0.05, 0.01, 0.01, 0.03, 0.70, 0.10, 0.06, 0.04]
        self.probabilities = np.array(probabilities or default, dtype=np.float32)
        self.error = error
        self.calls = 0

    def predict_proba(self, faces_rgb: list[np.ndarray]) -> np.ndarray:
        self.calls += 1
        if self.error:
            raise self.error
        return np.tile(self.probabilities, (len(faces_rgb), 1))


def encode(image: np.ndarray, ext: str = ".jpg") -> bytes:
    ok, buffer = cv2.imencode(ext, image)
    assert ok
    return buffer.tobytes()


@pytest.fixture
def frame_bytes() -> bytes:
    return encode(np.full((240, 320, 3), 128, dtype=np.uint8))


@pytest.fixture
def settings(tmp_path) -> Settings:
    return Settings(evaluation_results=tmp_path / "missing.json", inference_lock_timeout_s=0.05)


ClientFactory = Callable[..., TestClient]


@pytest.fixture
def make_client(settings: Settings) -> Iterator[ClientFactory]:
    clients: list[TestClient] = []

    def factory(
        detector: FakeDetector | None = None,
        classifier: FakeClassifier | None = None,
        settings_override: Settings | None = None,
        fail_loading: bool = False,
    ) -> TestClient:
        active = settings_override or settings

        def pipeline_factory(s: Settings) -> InferencePipeline:
            if fail_loading:
                raise FileNotFoundError("weights missing")
            return InferencePipeline(detector or FakeDetector(), classifier or FakeClassifier(), s)

        client = TestClient(create_app(active, pipeline_factory=pipeline_factory))
        client.__enter__()  # runs the lifespan (model loading)
        clients.append(client)
        return client

    yield factory
    for client in clients:
        client.__exit__(None, None, None)


def one_face() -> list[FaceBox]:
    return [FaceBox(x=100, y=60, width=120, height=120, score=0.95)]
