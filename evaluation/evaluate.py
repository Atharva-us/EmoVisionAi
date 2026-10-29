"""Evaluate the expression classifier on the FER2013 test split.

Protocol
--------
* FER2013 images are 48x48 grayscale face crops that are already roughly
  aligned, so the face detector is bypassed and each image is fed directly to
  the classifier (grayscale replicated to 3 channels, then the model's standard
  preprocessing). This measures the *classifier*, not the full webcam pipeline.
* FER2013 has 7 classes; the model has 8 (it adds Contempt).
  - Primary protocol: argmax over the 7 shared classes (Contempt logit
    excluded). Softmax is monotonic, so this equals renormalising without it.
  - Secondary protocol: unrestricted 8-class argmax; any Contempt prediction
    counts as an error. Reported alongside the Contempt prediction rate.
* No training or fine-tuning is done on FER2013. The model was trained on
  AffectNet, a different dataset, so there is no known subject overlap, but
  both datasets were scraped from the web and overlap cannot be ruled out.

Latency is measured separately for (a) the classifier alone at batch size 1
and (b) the complete HTTP-free pipeline (JPEG decode + YuNet + classifier) on
640x480 frames.

Usage (from the repository root, after prepare_dataset.py):
    backend\\.venv\\Scripts\\python.exe evaluation\\evaluate.py
"""

from __future__ import annotations

import argparse
import io
import json
import platform
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import cv2
import numpy as np
import pandas as pd
import torch
from PIL import Image
from sklearn.metrics import accuracy_score, confusion_matrix, precision_recall_fscore_support

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.core.config import Settings  # noqa: E402
from app.main import load_real_pipeline  # noqa: E402
from app.ml.labels import MODEL_LABELS  # noqa: E402

DATA = ROOT / "evaluation" / "data" / "fer2013_test.parquet"
RESULTS_DIR = ROOT / "evaluation" / "results"

FER_TO_MODEL = {
    "angry": "Anger",
    "disgust": "Disgust",
    "fear": "Fear",
    "happy": "Happiness",
    "neutral": "Neutral",
    "sad": "Sadness",
    "surprise": "Surprise",
}
SHARED_LABELS = [label for label in MODEL_LABELS if label in FER_TO_MODEL.values()]


def cpu_name() -> str:
    if platform.system() == "Windows":
        try:
            import winreg

            key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"HARDWARE\DESCRIPTION\System\CentralProcessor\0")
            return str(winreg.QueryValueEx(key, "ProcessorNameString")[0]).strip()
        except OSError:
            pass
    return platform.processor() or platform.machine()


def latency_stats(description: str, samples_ms: list[float]) -> dict:
    values = np.array(samples_ms)
    return {
        "description": description,
        "samples": len(values),
        "mean_ms": round(float(values.mean()), 2),
        "median_ms": round(float(np.median(values)), 2),
        "p95_ms": round(float(np.percentile(values, 95)), 2),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--limit", type=int, default=None, help="Evaluate only the first N images (debugging).")
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--latency-samples", type=int, default=200)
    args = parser.parse_args()

    if not DATA.is_file():
        raise SystemExit("Dataset missing. Run evaluation/prepare_dataset.py first.")
    frame = pd.read_parquet(DATA)
    if args.limit:
        frame = frame.head(args.limit)

    pipeline = load_real_pipeline(Settings(device="cpu"))
    classifier = pipeline.classifier
    print(f"Evaluating {len(frame)} images on {cpu_name()} ({torch.get_num_threads()} torch threads)")

    faces = [np.asarray(Image.open(io.BytesIO(b)).convert("RGB")) for b in frame["img_bytes"]]
    y_true = [FER_TO_MODEL[name] for name in frame["label_name"]]

    probabilities = []
    started = time.perf_counter()
    for start in range(0, len(faces), args.batch_size):
        probabilities.append(classifier.predict_proba(faces[start : start + args.batch_size]))
    throughput_s = time.perf_counter() - started
    probs = np.concatenate(probabilities)

    shared_idx = [MODEL_LABELS.index(label) for label in SHARED_LABELS]
    y_pred_7 = [SHARED_LABELS[i] for i in probs[:, shared_idx].argmax(axis=1)]
    y_pred_8 = [MODEL_LABELS[i] for i in probs.argmax(axis=1)]

    precision, recall, f1, support = precision_recall_fscore_support(
        y_true, y_pred_7, labels=SHARED_LABELS, zero_division=0
    )
    macro = precision_recall_fscore_support(y_true, y_pred_7, labels=SHARED_LABELS, average="macro", zero_division=0)
    weighted = precision_recall_fscore_support(
        y_true, y_pred_7, labels=SHARED_LABELS, average="weighted", zero_division=0
    )
    matrix = confusion_matrix(y_true, y_pred_7, labels=SHARED_LABELS)
    accuracy_7 = accuracy_score(y_true, y_pred_7)
    accuracy_8 = accuracy_score(y_true, y_pred_8)
    macro_f1_8 = precision_recall_fscore_support(
        y_true, y_pred_8, labels=SHARED_LABELS, average="macro", zero_division=0
    )[2]
    contempt_rate = float(np.mean([p == "Contempt" for p in y_pred_8]))

    # Latency (a): classifier only, batch size 1, after warm-up.
    single_ms = []
    for face in faces[: args.latency_samples]:
        t = time.perf_counter()
        classifier.predict_proba([face])
        single_ms.append((time.perf_counter() - t) * 1000)

    # Latency (b): full pipeline on 640x480 JPEG frames. Each FER face is
    # upscaled to 240x240 and placed on a grey canvas so YuNet has a face to find.
    pipeline_ms, detected = [], 0
    for face in faces[: args.latency_samples]:
        canvas = np.full((480, 640, 3), 110, dtype=np.uint8)
        canvas[120:360, 200:440] = cv2.resize(cv2.cvtColor(face, cv2.COLOR_RGB2BGR), (240, 240))
        jpeg = cv2.imencode(".jpg", canvas, [cv2.IMWRITE_JPEG_QUALITY, 80])[1].tobytes()
        t = time.perf_counter()
        result = pipeline.predict(jpeg)
        pipeline_ms.append((time.perf_counter() - t) * 1000)
        detected += int(result.face_detected)

    hardware = f"{cpu_name()}, CPU only, PyTorch {torch.__version__}, {torch.get_num_threads()} threads"
    summary = {
        "dataset": "FER2013 (Hugging Face mirror Jeneral/fer-2013, parquet conversion)",
        "split": "test (PublicTest + PrivateTest)",
        "samples": len(frame),
        "protocol": "Classifier-only on pre-cropped 48x48 faces; argmax over the 7 shared classes (Contempt excluded)",
        "accuracy": round(float(accuracy_7), 4),
        "macro_f1": round(float(macro[2]), 4),
        "weighted_f1": round(float(weighted[2]), 4),
        "macro_precision": round(float(macro[0]), 4),
        "macro_recall": round(float(macro[1]), 4),
        "evaluated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "hardware": hardware,
        "mean_latency_ms": round(float(np.mean(single_ms)), 2),
        "per_class": [
            {
                "label": label,
                "precision": round(float(p), 4),
                "recall": round(float(r), 4),
                "f1": round(float(f), 4),
                "support": int(s),
            }
            for label, p, r, f, s in zip(SHARED_LABELS, precision, recall, f1, support, strict=True)
        ],
        "confusion_matrix": {"labels": SHARED_LABELS, "matrix": matrix.tolist()},
        "class_distribution": {label: int(sum(1 for y in y_true if y == label)) for label in SHARED_LABELS},
        "latency": [
            latency_stats("Classifier only, batch size 1 (224x224 input)", single_ms),
            latency_stats("Full pipeline: JPEG decode + YuNet detection + classifier, 640x480 frame", pipeline_ms),
        ],
        "secondary_protocol": {
            "name": "Unrestricted 8-class argmax (Contempt predictions count as errors)",
            "accuracy": round(float(accuracy_8), 4),
            "macro_f1": round(float(macro_f1_8), 4),
            "contempt_prediction_rate": round(contempt_rate, 4),
        },
        "notes": [
            "Cross-dataset evaluation: the model was trained on AffectNet and never saw FER2013 during training.",
            "FER2013 is low-resolution (48x48 grayscale) and has known label noise; the model was trained on "
            "higher-resolution colour images, so this is a domain-shifted benchmark.",
            f"Batch throughput: {len(frame) / throughput_s:.0f} images/s at batch size {args.batch_size}.",
            f"YuNet found the face in {detected}/{len(pipeline_ms)} synthetic 640x480 latency frames "
            "(upscaled 48x48 faces; not a measure of detector accuracy on real webcam video).",
            "Test-set metrics do not demonstrate reliable real-world emotion recognition.",
        ],
    }

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    (RESULTS_DIR / "metrics.json").write_text(json.dumps({"summary": summary}, indent=2), encoding="utf-8")
    print(json.dumps({k: summary[k] for k in ("accuracy", "macro_f1", "weighted_f1", "secondary_protocol")}, indent=2))
    for stats in summary["latency"]:
        print(f"{stats['description']}: median {stats['median_ms']} ms, p95 {stats['p95_ms']} ms")
    print(f"Wrote {RESULTS_DIR / 'metrics.json'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
