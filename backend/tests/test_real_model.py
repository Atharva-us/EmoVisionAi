"""Smoke tests against the real installed weights (CPU). Skipped if weights are missing."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pytest

from app.core.config import Settings
from app.ml.face_detector import YUNET_FILENAME
from app.ml.spec import WEIGHTS_FILENAME
from tests.conftest import encode

MODELS_DIR = Settings().models_dir
FER_SAMPLES = Path(__file__).resolve().parents[2] / "evaluation" / "data" / "fer2013_test.parquet"

pytestmark = [
    pytest.mark.model,
    pytest.mark.skipif(
        not (MODELS_DIR / WEIGHTS_FILENAME).is_file() or not (MODELS_DIR / YUNET_FILENAME).is_file(),
        reason="Model weights not installed; run scripts/setup_models.py",
    ),
]


@pytest.fixture(scope="module")
def classifier():
    from app.ml.emotion_model import EmotionClassifier

    return EmotionClassifier(MODELS_DIR, device="cpu")


@pytest.fixture(scope="module")
def detector():
    from app.ml.face_detector import YuNetFaceDetector

    return YuNetFaceDetector(MODELS_DIR / YUNET_FILENAME)


def test_classifier_outputs_probabilities_on_cpu(classifier):
    rng = np.random.default_rng(0)
    faces = [rng.integers(0, 255, (120, 100, 3), dtype=np.uint8) for _ in range(2)]
    probabilities = classifier.predict_proba(faces)
    assert str(classifier.device) == "cpu"
    assert probabilities.shape == (2, 8)
    assert np.allclose(probabilities.sum(axis=1), 1.0, atol=1e-5)
    assert np.all(probabilities >= 0)


def test_detector_finds_no_face_in_blank_frame(detector):
    assert detector.detect(np.full((480, 640, 3), 127, dtype=np.uint8)) == []


def test_real_pipeline_no_face_end_to_end():
    from fastapi.testclient import TestClient

    from app.main import create_app

    with TestClient(create_app(Settings(device="cpu"))) as client:
        assert client.get("/api/v1/health").json()["model_loaded"] is True
        frame = encode(np.full((480, 640, 3), 127, dtype=np.uint8))
        body = client.post("/api/v1/predict", files={"image": ("f.jpg", frame, "image/jpeg")}).json()
        assert body["success"] is True
        assert body["face_detected"] is False
        assert body["predicted_expression"] is None


@pytest.mark.skipif(not FER_SAMPLES.is_file(), reason="FER2013 test data not downloaded (evaluation/evaluate.py)")
def test_happy_faces_are_mostly_classified_as_happiness(classifier):
    """Sanity check that weights and preprocessing are wired correctly on real faces."""
    import io

    import pandas as pd
    from PIL import Image

    frame = pd.read_parquet(FER_SAMPLES)
    happy = frame[frame["label_name"] == "happy"].head(100)
    faces = [np.asarray(Image.open(io.BytesIO(b)).convert("RGB")) for b in happy["img_bytes"]]
    predictions = classifier.predict_proba(faces).argmax(axis=1)
    happiness_index = classifier.labels.index("Happiness")
    assert (predictions == happiness_index).mean() > 0.6
