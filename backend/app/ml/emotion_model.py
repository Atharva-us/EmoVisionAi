"""HSEmotion EfficientNet-B0 facial-expression classifier.

Preprocessing mirrors the upstream HSEmotion inference code exactly:
RGB face crop -> PIL bilinear resize to 224x224 -> [0, 1] float ->
ImageNet mean/std normalisation. Softmax over the 8 logits gives class
probabilities.
"""

from __future__ import annotations

import logging
from pathlib import Path

import numpy as np
import timm
import torch
from PIL import Image
from safetensors.torch import load_file

from app.ml.labels import MODEL_LABELS
from app.ml.spec import ARCHITECTURE, INPUT_SIZE, MODEL_NAME, WEIGHTS_FILENAME
from app.ml.spec import IMAGENET_MEAN as _MEAN
from app.ml.spec import IMAGENET_STD as _STD

logger = logging.getLogger("emovision.model")

IMAGENET_MEAN = np.array(_MEAN, dtype=np.float32)
IMAGENET_STD = np.array(_STD, dtype=np.float32)


def select_device(preference: str) -> torch.device:
    if preference == "cuda" or (preference == "auto" and torch.cuda.is_available()):
        if not torch.cuda.is_available():
            logger.warning("CUDA requested but unavailable; falling back to CPU.")
            return torch.device("cpu")
        return torch.device("cuda")
    return torch.device("cpu")


def preprocess(face_rgb: np.ndarray) -> np.ndarray:
    """Return a CHW float32 array ready for the network."""
    resized = Image.fromarray(face_rgb).resize((INPUT_SIZE, INPUT_SIZE), Image.BILINEAR)
    array = np.asarray(resized, dtype=np.float32) / 255.0
    array = (array - IMAGENET_MEAN) / IMAGENET_STD
    return np.ascontiguousarray(array.transpose(2, 0, 1))


class EmotionClassifier:
    name = MODEL_NAME
    labels = MODEL_LABELS

    def __init__(self, models_dir: Path, device: str = "auto") -> None:
        weights = models_dir / WEIGHTS_FILENAME
        if not weights.is_file():
            raise FileNotFoundError(f"Expression model weights not found: {weights.name}")
        self.device = select_device(device)
        model = timm.create_model(ARCHITECTURE, pretrained=False, num_classes=len(MODEL_LABELS))
        # safetensors files contain only tensors, so loading cannot execute code.
        model.load_state_dict(load_file(str(weights)), strict=True)
        # channels_last lets oneDNN pick faster depthwise-conv kernels on CPU
        # (measured ~20% lower latency on an i5-13420H).
        self._model = model.to(self.device, memory_format=torch.channels_last).eval()
        self.warm_up()

    def warm_up(self) -> None:
        """Run one dummy pass so the first real request is not slowed by lazy init."""
        self.predict_proba([np.zeros((INPUT_SIZE, INPUT_SIZE, 3), dtype=np.uint8)])

    def predict_proba(self, faces_rgb: list[np.ndarray]) -> np.ndarray:
        """Return an (N, 8) array of class probabilities for N RGB face crops."""
        if not faces_rgb:
            return np.zeros((0, len(MODEL_LABELS)), dtype=np.float32)
        batch = torch.from_numpy(np.stack([preprocess(f) for f in faces_rgb]))
        batch = batch.to(self.device, memory_format=torch.channels_last)
        with torch.inference_mode():
            probabilities = torch.softmax(self._model(batch), dim=1)
        return probabilities.cpu().numpy()
