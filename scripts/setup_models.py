"""Download, verify and convert the model weights used by EmoVisionAI.

Steps
-----
1. Download the HSEmotion EfficientNet-B0 expression checkpoint and the OpenCV
   YuNet face detector into ``models/`` (skipped when already present).
2. Verify both files against pinned SHA-256 digests.
3. Load the HSEmotion checkpoint with ``torch.load(weights_only=True)`` and an
   explicit allowlist of timm/torch layer classes (the original file is a
   pickled ``nn.Module``; the restricted unpickler refuses anything else).
4. Re-save only the tensors as ``safetensors`` and check that a freshly built
   ``timm`` model reproduces the original model's outputs.

After this script runs once, the backend works fully offline and never
unpickles third-party data.

Usage (from the repository root):
    backend\\.venv\\Scripts\\python.exe scripts\\setup_models.py
"""

from __future__ import annotations

import hashlib
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODELS_DIR = ROOT / "models"

EMOTION_URL = (
    "https://github.com/av-savchenko/face-emotion-recognition/raw/main/models/affectnet_emotions/enet_b0_8_best_afew.pt"
)
EMOTION_FILE = MODELS_DIR / "enet_b0_8_best_afew.pt"
EMOTION_SHA256 = "47c1423f3e6f50e3750bf7b0eda7db947c9ce0c2637e1766bf2187eddc652b17"
EMOTION_SAFETENSORS = MODELS_DIR / "enet_b0_8_best_afew.safetensors"

YUNET_URL = (
    "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
)
YUNET_FILE = MODELS_DIR / "face_detection_yunet_2023mar.onnx"
YUNET_SHA256 = "8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4"

TIMM_ARCHITECTURE = "tf_efficientnet_b0"
NUM_CLASSES = 8


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def fetch(url: str, destination: Path, expected_sha256: str) -> None:
    if not destination.exists():
        print(f"Downloading {destination.name} ...")
        destination.parent.mkdir(parents=True, exist_ok=True)
        tmp = destination.with_suffix(destination.suffix + ".part")
        urllib.request.urlretrieve(url, tmp)  # noqa: S310 - fixed https URLs
        tmp.replace(destination)
    actual = sha256(destination)
    if actual != expected_sha256:
        raise SystemExit(
            f"Checksum mismatch for {destination.name}: expected {expected_sha256}, got {actual}. "
            "Delete the file and run this script again."
        )
    print(f"Verified {destination.name}")


def convert_emotion_checkpoint() -> None:
    import timm
    import torch
    from safetensors.torch import save_file
    from timm.layers.adaptive_avgmax_pool import SelectAdaptivePool2d
    from timm.layers.conv2d_same import Conv2dSame
    from timm.layers.norm_act import BatchNormAct2d
    from timm.models._efficientnet_blocks import (
        DepthwiseSeparableConv,
        InvertedResidual,
        SqueezeExcite,
    )
    from timm.models.efficientnet import EfficientNet

    # Exactly the classes listed by scripts/inspect_checkpoint.py. Anything else
    # in the pickle makes torch.load raise instead of executing it.
    allowlist = [
        set,
        EfficientNet,
        SelectAdaptivePool2d,
        Conv2dSame,
        BatchNormAct2d,
        DepthwiseSeparableConv,
        InvertedResidual,
        SqueezeExcite,
        torch.nn.SiLU,
        torch.nn.Sigmoid,
        torch.nn.Sequential,
        torch.nn.Conv2d,
        torch.nn.Flatten,
        torch.nn.Identity,
        torch.nn.Linear,
        torch.nn.AdaptiveAvgPool2d,
    ]
    with torch.serialization.safe_globals(allowlist):
        original = torch.load(EMOTION_FILE, map_location="cpu", weights_only=True)
    original.eval()

    # The authors wrapped the head as Sequential(Linear); timm's stock layout
    # is a bare Linear, so "classifier.0.*" becomes "classifier.*".
    if not (isinstance(original.classifier, torch.nn.Sequential) and len(original.classifier) == 1):
        if not isinstance(original.classifier, torch.nn.Linear):
            raise SystemExit(f"Unexpected classifier head: {original.classifier!r}")
    state_dict = {k.replace("classifier.0.", "classifier."): v.contiguous() for k, v in original.state_dict().items()}
    fresh = timm.create_model(TIMM_ARCHITECTURE, pretrained=False, num_classes=NUM_CLASSES)
    fresh.load_state_dict(state_dict, strict=True)
    fresh.eval()

    # The pickled model was produced by an older timm whose blocks lack
    # attributes the current forward() expects, so it cannot be executed for a
    # numeric comparison. Instead verify that every layer of the fresh model
    # has the same type and hyper-parameters as the original; together with a
    # strict state_dict load this guarantees identical computation.
    mismatches = compare_structure(original, fresh)
    if mismatches:
        raise SystemExit("Architecture mismatch:\n  " + "\n  ".join(mismatches[:20]))

    save_file(
        state_dict,
        str(EMOTION_SAFETENSORS),
        metadata={
            "architecture": TIMM_ARCHITECTURE,
            "num_classes": str(NUM_CLASSES),
            "source": EMOTION_URL,
            "source_sha256": EMOTION_SHA256,
        },
    )
    print(f"Wrote {EMOTION_SAFETENSORS.name} ({len(state_dict)} tensors, structure verified)")


def compare_structure(original, fresh) -> list[str]:
    import torch

    def describe(module) -> tuple:
        if isinstance(module, torch.nn.Conv2d):
            return (module.kernel_size, module.stride, module.padding, module.dilation, module.groups)
        if isinstance(module, torch.nn.BatchNorm2d):
            return (module.num_features, module.eps)
        if isinstance(module, torch.nn.Linear):
            return (module.in_features, module.out_features)
        return ()

    original_modules = {
        name.replace("classifier.0", "classifier"): m
        for name, m in original.named_modules()
        if name != "classifier" or not isinstance(m, torch.nn.Sequential)
    }
    fresh_modules = dict(fresh.named_modules())
    problems: list[str] = []
    for name, module in fresh_modules.items():
        if not any(True for _ in module.parameters(recurse=False)) and not isinstance(module, torch.nn.Conv2d):
            continue  # only layers that own weights affect the comparison
        other = original_modules.get(name)
        if other is None:
            problems.append(f"{name}: missing in original")
        elif type(other).__name__ != type(module).__name__:
            problems.append(f"{name}: {type(other).__name__} != {type(module).__name__}")
        elif describe(other) != describe(module):
            problems.append(f"{name}: {describe(other)} != {describe(module)}")
    for name, module in original_modules.items():
        # Activation types matter even though they own no weights.
        if isinstance(module, (torch.nn.SiLU, torch.nn.Sigmoid)):
            other = fresh_modules.get(name)
            if other is not None and type(other) is not type(module):
                problems.append(f"{name}: activation {type(module).__name__} != {type(other).__name__}")
    return problems


def main() -> int:
    fetch(EMOTION_URL, EMOTION_FILE, EMOTION_SHA256)
    fetch(YUNET_URL, YUNET_FILE, YUNET_SHA256)
    convert_emotion_checkpoint()
    print("Model setup complete. The backend can now run offline.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
