"""API tests with injected fake models (fast, deterministic, no weights needed)."""

from __future__ import annotations

import json

import numpy as np

from app.core.config import Settings
from app.ml.face_detector import FaceBox
from app.ml.labels import MODEL_LABELS
from app.schemas.api import PredictionResponse
from tests.conftest import FakeClassifier, FakeDetector, encode, one_face

PREDICT = "/api/v1/predict"


def post_image(client, data: bytes, content_type: str = "image/jpeg"):
    return client.post(PREDICT, files={"image": ("frame.jpg", data, content_type)})


def assert_error(response, status: int, code: str) -> None:
    assert response.status_code == status, response.text
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == code
    assert body["error"]["message"]
    # Internal details must never reach the client.
    text = response.text.lower()
    assert "traceback" not in text and "\\" not in text and ".py" not in text


# --- system endpoints -------------------------------------------------------


def test_health_reports_loaded_model(make_client):
    body = make_client().get("/api/v1/health").json()
    assert body["status"] == "ok"
    assert body["model_loaded"] is True
    assert body["device"] == "cpu"


def test_health_degraded_and_predict_unavailable_when_loading_fails(make_client, frame_bytes):
    client = make_client(fail_loading=True)
    body = client.get("/api/v1/health").json()
    assert body["status"] == "degraded"
    assert body["model_loaded"] is False
    assert "weights missing" not in (body["message"] or "")  # raw exception text is not exposed
    assert_error(post_image(client, frame_bytes), 503, "model_unavailable")


def test_model_info_without_evaluation(make_client):
    body = make_client().get("/api/v1/model/info").json()
    assert body["labels"] == list(MODEL_LABELS)
    assert body["input_size"] == [224, 224]
    assert body["evaluation"] is None
    statuses = {c["name"]: c["status"] for c in body["requested_categories"]}
    assert statuses == {
        "Happy": "measured",
        "Sad": "measured",
        "Angry": "measured",
        "Stress": "unsupported",
        "Tired": "unsupported",
    }


def test_model_info_includes_evaluation_when_present(make_client, tmp_path):
    results = tmp_path / "metrics.json"
    summary = {
        "dataset": "FER2013",
        "split": "test",
        "samples": 10,
        "protocol": "p",
        "accuracy": 0.5,
        "macro_f1": 0.4,
        "weighted_f1": 0.45,
        "evaluated_at": "2026-01-01T00:00:00Z",
        "hardware": "cpu",
    }
    results.write_text(json.dumps({"summary": summary}), encoding="utf-8")
    client = make_client(settings_override=Settings(evaluation_results=results))
    assert client.get("/api/v1/model/info").json()["evaluation"]["accuracy"] == 0.5


def test_model_info_ignores_corrupt_evaluation_file(make_client, tmp_path):
    results = tmp_path / "metrics.json"
    results.write_text("{not json", encoding="utf-8")
    client = make_client(settings_override=Settings(evaluation_results=results))
    assert client.get("/api/v1/model/info").json()["evaluation"] is None


def test_session_config(make_client):
    body = make_client().get("/api/v1/session/config").json()
    assert body["max_upload_bytes"] == 2 * 1024 * 1024
    assert "image/jpeg" in body["accepted_content_types"]
    assert body["min_interval_ms"] <= body["recommended_interval_ms"]


# --- prediction -------------------------------------------------------------


def test_predict_single_face_returns_full_schema(make_client, frame_bytes):
    classifier = FakeClassifier()
    response = post_image(make_client(FakeDetector(one_face()), classifier), frame_bytes)
    assert response.status_code == 200, response.text
    body = PredictionResponse.model_validate(response.json())

    assert body.success and body.face_detected
    assert body.face_count == 1 and len(body.faces) == 1
    assert body.predicted_expression == "Happiness"
    assert body.confidence == 0.7
    assert set(body.class_scores) == set(MODEL_LABELS)
    assert abs(sum(body.class_scores.values()) - 1.0) < 1e-3
    assert body.faces[0].box.x == round(100 / 320, 4)
    assert body.image.width == 320 and body.image.height == 240
    assert body.timings.total_ms >= body.timings.classification_ms
    assert body.model_name == "fake-classifier"
    assert classifier.calls == 1


def test_requested_categories_map_measured_and_unsupported(make_client, frame_bytes):
    body = post_image(make_client(FakeDetector(one_face())), frame_bytes).json()
    categories = {c["name"]: c for c in body["requested_categories"]}
    assert categories["Happy"]["score"] == body["class_scores"]["Happiness"]
    assert categories["Sad"]["score"] == body["class_scores"]["Sadness"]
    assert categories["Angry"]["score"] == body["class_scores"]["Anger"]
    for name in ("Stress", "Tired"):
        assert categories[name]["status"] == "unsupported"
        assert categories[name]["score"] is None
        assert categories[name]["model_label"] is None
    assert {c["name"] for c in body["unsupported_categories"]} == {"Stress", "Tired"}


def test_predict_no_face(make_client, frame_bytes):
    classifier = FakeClassifier()
    response = post_image(make_client(FakeDetector([]), classifier), frame_bytes)
    assert response.status_code == 200
    body = response.json()
    assert body["face_detected"] is False
    assert body["predicted_expression"] is None
    assert body["confidence"] is None
    assert body["class_scores"] is None
    assert body["faces"] == []
    assert all(c["score"] is None for c in body["requested_categories"])
    assert "No face" in body["message"]
    assert classifier.calls == 0  # no prediction is invented without a face


def test_predict_multiple_faces_caps_and_orders(make_client, frame_bytes):
    boxes = [FaceBox(10 + i * 70, 10, 60 - i * 5, 60 - i * 5, 0.9) for i in range(4)]
    body = post_image(make_client(FakeDetector(boxes)), frame_bytes).json()
    assert body["face_count"] == 4
    assert len(body["faces"]) == 3
    assert [f["is_primary"] for f in body["faces"]] == [True, False, False]
    assert "4 faces detected" in body["message"]


def test_png_and_webp_are_accepted(make_client):
    client = make_client(FakeDetector(one_face()))
    image = np.full((200, 300, 3), 90, dtype=np.uint8)
    assert post_image(client, encode(image, ".png"), "image/png").status_code == 200
    assert post_image(client, encode(image, ".webp"), "image/webp").status_code == 200


# --- validation -------------------------------------------------------------


def test_invalid_image_data(make_client):
    assert_error(post_image(make_client(), b"definitely not an image"), 422, "invalid_image")


def test_empty_image(make_client):
    assert_error(post_image(make_client(), b""), 422, "invalid_image")


def test_unsupported_content_type(make_client, frame_bytes):
    assert_error(post_image(make_client(), frame_bytes, "text/plain"), 415, "unsupported_media_type")


def test_content_not_matching_accepted_format(make_client):
    import io

    from PIL import Image

    buffer = io.BytesIO()
    Image.new("RGB", (8, 8)).save(buffer, format="GIF")
    gif = buffer.getvalue()
    assert_error(post_image(make_client(), gif, "image/png"), 415, "unsupported_media_type")


def test_oversized_upload_rejected(make_client):
    big = b"\xff" * (2 * 1024 * 1024 + 1)
    assert_error(post_image(make_client(), big), 413, "payload_too_large")


def test_oversized_request_rejected_early_by_content_length(make_client):
    big = b"\xff" * (3 * 1024 * 1024)
    assert_error(post_image(make_client(), big), 413, "payload_too_large")


def test_oversized_upload_rejected_by_route_limit(make_client, settings, frame_bytes):
    small = settings.model_copy(update={"max_upload_bytes": 100})
    response = post_image(make_client(settings_override=small), frame_bytes)
    assert_error(response, 413, "payload_too_large")


def test_oversized_dimensions_rejected(make_client, settings, frame_bytes):
    strict = settings.model_copy(update={"max_image_side": 100})
    assert_error(post_image(make_client(settings_override=strict), frame_bytes), 413, "image_too_large")


def test_missing_image_field(make_client):
    assert_error(make_client().post(PREDICT), 422, "validation_error")


# --- failures ---------------------------------------------------------------


def test_inference_error_is_reported_without_details(make_client, frame_bytes):
    classifier = FakeClassifier(error=RuntimeError("CUDA exploded at C:\\secret\\path.py"))
    response = post_image(make_client(FakeDetector(one_face()), classifier), frame_bytes)
    assert_error(response, 500, "inference_failed")
    assert "secret" not in response.text


def test_detector_error(make_client, frame_bytes):
    response = post_image(make_client(FakeDetector(error=ValueError("bad"))), frame_bytes)
    assert_error(response, 500, "detection_failed")


def test_malformed_model_output_is_not_returned(make_client, frame_bytes):
    classifier = FakeClassifier(probabilities=[float("nan")] * 8)
    response = post_image(make_client(FakeDetector(one_face()), classifier), frame_bytes)
    assert_error(response, 500, "inference_failed")


def test_busy_pipeline_returns_503(make_client, frame_bytes):
    client = make_client(FakeDetector(one_face()))
    pipeline = client.app.state.pipeline
    pipeline._lock.acquire()
    try:
        assert_error(post_image(client, frame_bytes), 503, "server_busy")
    finally:
        pipeline._lock.release()


def test_unknown_route_uses_error_envelope(make_client):
    assert_error(make_client().get("/api/v1/nope"), 404, "not_found")


# --- CORS -------------------------------------------------------------------


def test_cors_allows_local_frontend_only(make_client):
    client = make_client()
    allowed = client.options(
        PREDICT, headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST"}
    )
    assert allowed.headers.get("access-control-allow-origin") == "http://localhost:5173"
    assert "access-control-allow-credentials" not in allowed.headers

    denied = client.get("/api/v1/health", headers={"Origin": "https://evil.example"})
    assert "access-control-allow-origin" not in denied.headers
