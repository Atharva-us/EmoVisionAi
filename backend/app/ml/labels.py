"""Model labels and how they relate to the categories the product asks for.

The classifier outputs exactly eight AffectNet expression classes. The product
brief asks for five categories (Happy, Sad, Angry, Stress, Tired). Three map
one-to-one onto model outputs. Stress and Tired have **no** corresponding
model output and no validated model in this project, so they are reported as
unsupported rather than derived from unrelated classes (e.g. we deliberately do
not relabel Fear as Stress or Neutral as Tired).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

# Class order verified against the upstream HSEmotion source
# (``idx_to_class`` for 8-class models in hsemotion/facial_emotions.py).
MODEL_LABELS: tuple[str, ...] = (
    "Anger",
    "Contempt",
    "Disgust",
    "Fear",
    "Happiness",
    "Neutral",
    "Sadness",
    "Surprise",
)

CategoryStatus = Literal["measured", "unsupported"]


@dataclass(frozen=True)
class RequestedCategory:
    name: str
    status: CategoryStatus
    model_label: str | None
    explanation: str


REQUESTED_CATEGORIES: tuple[RequestedCategory, ...] = (
    RequestedCategory(
        "Happy", "measured", "Happiness", "Direct model output: probability of the 'Happiness' expression class."
    ),
    RequestedCategory(
        "Sad", "measured", "Sadness", "Direct model output: probability of the 'Sadness' expression class."
    ),
    RequestedCategory(
        "Angry", "measured", "Anger", "Direct model output: probability of the 'Anger' expression class."
    ),
    RequestedCategory(
        "Stress",
        "unsupported",
        None,
        "Not available. Stress is an internal physiological and psychological state. The model has no stress "
        "class, and no validated stress model or labelled evaluation data is included, so no score is produced.",
    ),
    RequestedCategory(
        "Tired",
        "unsupported",
        None,
        "Not available. The model has no tiredness class, and no validated fatigue model or labelled evaluation "
        "data is included, so no score is produced.",
    ),
)

assert all(c.model_label in MODEL_LABELS for c in REQUESTED_CATEGORIES if c.status == "measured")
