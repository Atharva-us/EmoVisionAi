"""Application settings, loaded from environment variables or ``backend/.env``."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="EMOVISION_",
        env_file=Path(__file__).resolve().parents[2] / ".env",
        extra="ignore",
    )

    # Locations
    models_dir: Path = REPO_ROOT / "models"
    evaluation_results: Path = REPO_ROOT / "evaluation" / "results" / "metrics.json"

    # Hardware: "auto" picks CUDA when available, otherwise CPU.
    device: Literal["auto", "cpu", "cuda"] = "auto"

    # CORS: only the local Vite dev/preview servers by default.
    allowed_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:4173",
            "http://127.0.0.1:4173",
        ]
    )

    # Input limits
    max_upload_bytes: int = 2 * 1024 * 1024
    max_image_side: int = 4096  # reject larger images outright (decompression-bomb guard)
    detection_max_side: int = 960  # frames are downscaled to this before detection

    # Face detection
    face_score_threshold: float = 0.7
    max_faces: int = Field(default=3, ge=1, le=10)
    min_face_size: int = 40  # pixels in the original frame

    # Concurrency: one inference at a time; waiting requests time out.
    inference_lock_timeout_s: float = 5.0

    # Hints served to the frontend.
    recommended_interval_ms: int = 700
    recommended_capture_width: int = 640
    recommended_jpeg_quality: float = 0.8


@lru_cache
def get_settings() -> Settings:
    return Settings()
