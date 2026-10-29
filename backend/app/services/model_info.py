"""Static model documentation plus measured evaluation results (if any)."""

from __future__ import annotations

import json
import logging
from pathlib import Path

from pydantic import ValidationError

from app.ml.labels import MODEL_LABELS, REQUESTED_CATEGORIES
from app.ml.spec import ARCHITECTURE, INPUT_SIZE, MODEL_NAME
from app.schemas.api import EvaluationSummary, ModelInfoResponse, RequestedCategoryInfo

logger = logging.getLogger("emovision.model_info")

LIMITATIONS = [
    "Predicts visible facial expressions only. Scores are not ground truth about what a person feels.",
    "Trained on AffectNet web images; accuracy varies with lighting, head pose, occlusion, image quality, "
    "age, and demographic group.",
    "Expressions are culturally and individually variable; posed and spontaneous expressions differ.",
    "Stress and tiredness are not estimated: the model has no such classes and no validated data is included.",
    "Not suitable for medical, psychological, employment, educational, security, or disciplinary decisions.",
]


def load_evaluation(path: Path) -> EvaluationSummary | None:
    """Return the summary written by evaluation/evaluate.py, or None if absent/invalid."""
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return EvaluationSummary.model_validate(data["summary"])
    except (OSError, ValueError, KeyError, ValidationError):
        logger.warning("Ignoring unreadable evaluation results file.")
        return None


def build_model_info(*, device: str | None, model_loaded: bool, evaluation_path: Path) -> ModelInfoResponse:
    return ModelInfoResponse(
        model_name=MODEL_NAME,
        architecture=f"EfficientNet-B0 (timm '{ARCHITECTURE}'), 8-way linear classification head",
        source_url="https://github.com/av-savchenko/face-emotion-recognition",
        code_license="Apache-2.0 (HSEmotion / EmotiEffLib). Training data (AffectNet) is licensed for research use.",
        training_data="AffectNet (8 expression classes), selected on the AFEW validation set by the authors.",
        labels=list(MODEL_LABELS),
        input_size=[INPUT_SIZE, INPUT_SIZE],
        preprocessing=[
            "Detect faces with OpenCV YuNet; crop the detected box (no margin).",
            "Convert the crop from BGR to RGB.",
            "Resize to 224x224 with bilinear interpolation (PIL), as in the upstream HSEmotion code.",
            "Scale pixels to [0, 1] and normalise with ImageNet mean (0.485, 0.456, 0.406) "
            "and std (0.229, 0.224, 0.225).",
            "Apply softmax to the 8 logits to obtain class probabilities.",
        ],
        face_detector="OpenCV YuNet 2023mar (MIT License), score threshold 0.7",
        device=device,
        model_loaded=model_loaded,
        requested_categories=[
            RequestedCategoryInfo(name=c.name, status=c.status, model_label=c.model_label, explanation=c.explanation)
            for c in REQUESTED_CATEGORIES
        ],
        limitations=LIMITATIONS,
        evaluation=load_evaluation(evaluation_path),
    )
