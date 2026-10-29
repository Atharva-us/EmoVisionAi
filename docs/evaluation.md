# Evaluation

All numbers below were produced by `evaluation/evaluate.py` on 2026-10-28 and stored in `evaluation/results/metrics.json`. The Model Lab page and the landing page read that file through `GET /api/v1/model/info`.

## Dataset

| Field | Value |
| --- | --- |
| Dataset | FER2013 (Goodfellow et al., ICML 2013 challenge) |
| Source | Hugging Face mirror `Jeneral/fer-2013`, auto-converted parquet branch (`refs/convert/parquet`). The main branch's pickled `.pt` files are deliberately not loaded. |
| Split | Test (PublicTest + PrivateTest), 7,178 images, 48×48 grayscale |
| Licence | The mirror declares Apache-2.0. The original FER2013 images were web-collected and are generally used for non-commercial research. Data is not redistributed in this repository. |
| Label mapping | The mirror stores labels alphabetically (angry, disgust, fear, happy, neutral, sad, surprise). They are mapped by name. Per-class counts match the official test distribution exactly. |

Class distribution: Anger 958, Disgust 111, Fear 1,024, Happiness 1,774, Neutral 1,233, Sadness 1,247, Surprise 831.

## Procedure

- **Classifier-only.** FER2013 images are already face crops, so the detector is bypassed. Grayscale is replicated to 3 channels, then the standard preprocessing is applied.
- **Primary protocol.** Argmax over the 7 classes shared with FER2013. The Contempt logit is excluded, and because softmax is monotonic this equals renormalising.
- **Secondary protocol.** Unrestricted 8-class argmax, where Contempt predictions count as errors.
- **No training or tuning on FER2013.** The model was trained on AffectNet. No subject overlap is known, but both datasets were web-scraped, so overlap cannot be ruled out completely.
- **Hardware.** 13th Gen Intel Core i5-13420H, CPU only, PyTorch 2.14.1+cpu, 8 threads, Windows 11.

## Results

| Metric | Primary (7-class) | Secondary (8-class) |
| --- | --- | --- |
| Accuracy | **0.561** | 0.555 |
| Macro F1 | **0.508** | 0.507 |
| Weighted F1 | 0.561 | — |
| Macro precision | 0.506 | — |
| Macro recall | 0.524 | — |

Contempt was predicted for 1.6% of images under the secondary protocol.

### Per class

| Class | Precision | Recall | F1 | Support |
| --- | --- | --- | --- | --- |
| Anger | 0.503 | 0.512 | 0.507 | 958 |
| Disgust | 0.275 | 0.505 | 0.356 | 111 |
| Fear | 0.323 | 0.381 | 0.350 | 1,024 |
| Happiness | 0.821 | 0.852 | 0.837 | 1,774 |
| Neutral | 0.526 | 0.569 | 0.547 | 1,233 |
| Sadness | 0.523 | 0.407 | 0.458 | 1,247 |
| Surprise | 0.569 | 0.445 | 0.500 | 831 |

### Confusion matrix (counts; rows = true, columns = predicted)

| True \ Pred | Anger | Disgust | Fear | Happiness | Neutral | Sadness | Surprise |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Anger | **490** | 72 | 165 | 40 | 92 | 62 | 37 |
| Disgust | 28 | **56** | 14 | 2 | 2 | 8 | 1 |
| Fear | 143 | 16 | **390** | 52 | 153 | 212 | 58 |
| Happiness | 17 | 21 | 59 | **1512** | 53 | 14 | 98 |
| Neutral | 105 | 18 | 59 | 131 | **702** | 159 | 59 |
| Sadness | 178 | 20 | 128 | 70 | 317 | **507** | 27 |
| Surprise | 13 | 1 | 391 | 34 | 15 | 7 | **370** |

Notable confusions: Surprise→Fear (47% of Surprise), Sadness→Neutral (25%), and Fear→Sadness (21%). These pairs share facial action units such as raised brows, an open mouth, or a lowered mouth corner.

### Latency (CPU, 200 samples each)

| Measurement | Median | Mean | p95 |
| --- | --- | --- | --- |
| Classifier only, batch 1, 224×224 | 48.6 ms | 49.0 ms | 54.5 ms |
| Full pipeline: JPEG decode + YuNet + classifier, 640×480 | 73.4 ms | 73.4 ms | 79.8 ms |

Switching the model to channels-last memory format reduced the median classifier latency from 86.9 ms to 48.6 ms on this machine. Accuracy was identical.

## Interpretation

- This is a **domain-shifted** benchmark: low-resolution grayscale test images against a model trained on higher-resolution colour images. The numbers are a lower-bound sanity check, not a measure of webcam performance.
- Published in-domain FER2013 results for dedicated models are higher. This project deliberately uses an off-the-shelf model without fine-tuning.
- **Test-set performance does not demonstrate reliable real-world emotion recognition.** See the [model card](model-card.md) for limitations.

## Reproduce

```powershell
backend\.venv\Scripts\python.exe evaluation\prepare_dataset.py
backend\.venv\Scripts\python.exe evaluation\evaluate.py
```
