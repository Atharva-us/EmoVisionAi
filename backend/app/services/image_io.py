"""Validation and decoding of uploaded images."""

from __future__ import annotations

import io

import cv2
import numpy as np
from PIL import Image, UnidentifiedImageError

from app.core.errors import ApiError

ACCEPTED_CONTENT_TYPES: dict[str, str] = {
    "image/jpeg": "JPEG",
    "image/png": "PNG",
    "image/webp": "WEBP",
}


def validate_content_type(content_type: str | None) -> None:
    base = (content_type or "").split(";")[0].strip().lower()
    if base not in ACCEPTED_CONTENT_TYPES:
        raise ApiError(
            415,
            "unsupported_media_type",
            f"Unsupported image type. Accepted: {', '.join(ACCEPTED_CONTENT_TYPES)}.",
        )


def decode_image(data: bytes, max_side: int) -> np.ndarray:
    """Decode bytes into a BGR uint8 array, rejecting corrupt or oversized images.

    Pillow reads only the header first, so a tiny file that declares enormous
    dimensions is rejected before any pixel buffer is allocated.
    """
    if not data:
        raise ApiError(422, "invalid_image", "The uploaded image is empty.")
    try:
        with Image.open(io.BytesIO(data)) as header:
            width, height = header.size
            image_format = header.format
    except (UnidentifiedImageError, OSError):
        raise ApiError(422, "invalid_image", "The uploaded file is not a readable image.") from None

    if image_format not in ACCEPTED_CONTENT_TYPES.values():
        raise ApiError(415, "unsupported_media_type", "Image content does not match an accepted format.")
    if max(width, height) > max_side:
        raise ApiError(413, "image_too_large", f"Image dimensions exceed {max_side}px on the longest side.")

    image = cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise ApiError(422, "invalid_image", "The uploaded image could not be decoded.")
    return image
