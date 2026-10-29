"""Face detection with OpenCV's YuNet model (``cv2.FaceDetectorYN``)."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np

YUNET_FILENAME = "face_detection_yunet_2023mar.onnx"


@dataclass(frozen=True)
class FaceBox:
    """Axis-aligned face box in original-image pixel coordinates."""

    x: int
    y: int
    width: int
    height: int
    score: float

    @property
    def area(self) -> int:
        return self.width * self.height


class YuNetFaceDetector:
    """Thin wrapper that handles input scaling and box clipping for YuNet."""

    name = "OpenCV YuNet (face_detection_yunet_2023mar)"

    def __init__(
        self,
        model_path: Path,
        score_threshold: float = 0.7,
        nms_threshold: float = 0.3,
        detection_max_side: int = 960,
        min_face_size: int = 40,
    ) -> None:
        if not model_path.is_file():
            raise FileNotFoundError(f"YuNet weights not found: {model_path.name}")
        self._detector = cv2.FaceDetectorYN.create(str(model_path), "", (320, 320), score_threshold, nms_threshold, 50)
        self._max_side = detection_max_side
        self._min_face = min_face_size

    def detect(self, image_bgr: np.ndarray) -> list[FaceBox]:
        height, width = image_bgr.shape[:2]
        # Large frames are downscaled for speed; boxes are mapped back afterwards.
        scale = min(1.0, self._max_side / max(height, width))
        work = image_bgr
        if scale < 1.0:
            work = cv2.resize(image_bgr, (round(width * scale), round(height * scale)), interpolation=cv2.INTER_AREA)
        self._detector.setInputSize((work.shape[1], work.shape[0]))
        _, raw = self._detector.detect(work)
        if raw is None:
            return []

        faces: list[FaceBox] = []
        for row in raw:
            x, y, w, h = (row[:4] / scale).tolist()
            # Clip to the image; YuNet can return boxes partially outside it.
            x0, y0 = max(0, int(round(x))), max(0, int(round(y)))
            x1, y1 = min(width, int(round(x + w))), min(height, int(round(y + h)))
            if x1 - x0 < self._min_face or y1 - y0 < self._min_face:
                continue
            faces.append(FaceBox(x0, y0, x1 - x0, y1 - y0, float(row[-1])))
        faces.sort(key=lambda f: f.area, reverse=True)
        return faces
