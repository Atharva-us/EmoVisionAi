"""Download the FER2013 test split (7,178 images) into evaluation/data/.

Source: the Hugging Face mirror ``Jeneral/fer-2013`` (parquet). FER2013 was
released for the ICML 2013 representation-learning challenge (Goodfellow et
al.); the images were collected via web search and the dataset is generally
used for non-commercial research. The data is not committed to this
repository.

Usage (from the repository root):
    backend\\.venv\\Scripts\\python.exe evaluation\\prepare_dataset.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd
from huggingface_hub import HfApi, hf_hub_download

REPO_ID = "Jeneral/fer-2013"
PARQUET_REVISION = "refs/convert/parquet"
DATA_DIR = Path(__file__).resolve().parent / "data"
OUTPUT = DATA_DIR / "fer2013_test.parquet"

# The mirror stores labels as integers in alphabetical order (dataset info:
# angry, disgust, fear, happy, neutral, sad, surprise). This differs from the
# original FER2013 CSV order, so we map explicitly by name.
LABEL_NAMES = ["angry", "disgust", "fear", "happy", "neutral", "sad", "surprise"]


def main() -> int:
    if OUTPUT.is_file():
        print(f"Already prepared: {OUTPUT.relative_to(DATA_DIR.parent.parent)}")
        return 0
    # The main branch only ships pickled .pt tensors, which we refuse to load
    # (unpickling untrusted data can execute code). Hugging Face's dataset
    # viewer publishes a parquet conversion on a dedicated branch instead.
    files = HfApi().list_repo_files(REPO_ID, repo_type="dataset", revision=PARQUET_REVISION)
    test_files = sorted(f for f in files if f.endswith(".parquet") and "/test/" in f"/{f}")
    if not test_files:
        raise SystemExit(f"No test parquet found in {REPO_ID}@{PARQUET_REVISION}. Files: {files}")

    frames = []
    for name in test_files:
        local = hf_hub_download(REPO_ID, name, repo_type="dataset", revision=PARQUET_REVISION)
        frames.append(pd.read_parquet(local))
    frame = pd.concat(frames, ignore_index=True)

    images = frame["img_bytes"].map(lambda v: v["bytes"] if isinstance(v, dict) else v)
    labels = frame["labels"].astype(int)
    out = pd.DataFrame({"img_bytes": images, "label": labels, "label_name": labels.map(LABEL_NAMES.__getitem__)})

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    out.to_parquet(OUTPUT, index=False)
    print(f"Saved {len(out)} test images to {OUTPUT.name}")
    print(out["label_name"].value_counts().sort_index().to_string())
    return 0


if __name__ == "__main__":
    sys.exit(main())
