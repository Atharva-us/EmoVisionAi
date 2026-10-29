"""Pydantic models that define the public API contract (mirrored in frontend/src/types/api.ts)."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    success: Literal[False] = False
    error: ErrorDetail


class BoundingBox(BaseModel):
    """Face box normalised to [0, 1] relative to the submitted image."""

    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)
    width: float = Field(ge=0, le=1)
    height: float = Field(ge=0, le=1)


class FacePrediction(BaseModel):
    box: BoundingBox
    detection_score: float
    predicted_expression: str
    confidence: float
    class_scores: dict[str, float]
    is_primary: bool


class CategoryResult(BaseModel):
    name: str
    status: Literal["measured", "unsupported"]
    score: float | None
    model_label: str | None
    explanation: str


class UnsupportedCategory(BaseModel):
    name: str
    reason: str


class Timings(BaseModel):
    decode_ms: float
    detection_ms: float
    classification_ms: float
    total_ms: float


class ImageMeta(BaseModel):
    width: int
    height: int


class PredictionResponse(BaseModel):
    success: Literal[True] = True
    face_detected: bool
    face_count: int = Field(description="Faces detected in the frame.")
    faces: list[FacePrediction] = Field(description="Analysed faces, largest first (at most max_faces).")
    predicted_expression: str | None = Field(description="Top model class for the primary (largest) face.")
    confidence: float | None
    class_scores: dict[str, float] | None
    requested_categories: list[CategoryResult]
    unsupported_categories: list[UnsupportedCategory]
    inference_time_ms: float = Field(description="Model forward-pass time for all analysed faces.")
    timings: Timings
    image: ImageMeta
    model_name: str
    timestamp: datetime
    message: str | None = None


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    model_loaded: bool
    device: str | None
    version: str
    uptime_s: float
    message: str | None = None


class PerClassMetric(BaseModel):
    label: str
    precision: float
    recall: float
    f1: float
    support: int


class ConfusionMatrix(BaseModel):
    labels: list[str] = Field(description="Row = true label, column = predicted label.")
    matrix: list[list[int]]


class LatencyStats(BaseModel):
    description: str
    samples: int
    mean_ms: float
    median_ms: float
    p95_ms: float


class EvaluationSummary(BaseModel):
    dataset: str
    split: str
    samples: int
    protocol: str
    accuracy: float
    macro_f1: float
    weighted_f1: float
    macro_precision: float | None = None
    macro_recall: float | None = None
    evaluated_at: str
    hardware: str
    mean_latency_ms: float | None = None
    per_class: list[PerClassMetric] = Field(default_factory=list)
    confusion_matrix: ConfusionMatrix | None = None
    class_distribution: dict[str, int] = Field(default_factory=dict)
    latency: list[LatencyStats] = Field(default_factory=list)
    secondary_protocol: dict[str, float | str] | None = None
    notes: list[str] = Field(default_factory=list)


class RequestedCategoryInfo(BaseModel):
    name: str
    status: Literal["measured", "unsupported"]
    model_label: str | None
    explanation: str


class ModelInfoResponse(BaseModel):
    model_name: str
    architecture: str
    source_url: str
    code_license: str
    training_data: str
    labels: list[str]
    input_size: list[int]
    preprocessing: list[str]
    face_detector: str
    device: str | None
    model_loaded: bool
    requested_categories: list[RequestedCategoryInfo]
    limitations: list[str]
    evaluation: EvaluationSummary | None


class SessionConfigResponse(BaseModel):
    recommended_interval_ms: int
    min_interval_ms: int
    recommended_capture_width: int
    recommended_jpeg_quality: float
    max_upload_bytes: int
    accepted_content_types: list[str]
    max_faces: int
