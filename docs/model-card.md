# Model Card: EmoVisionAI expression classifier

## Model details

| Field | Value |
| --- | --- |
| Name | HSEmotion `enet_b0_8_best_afew` |
| Authors | A. V. Savchenko et al. (HSE University), [face-emotion-recognition](https://github.com/av-savchenko/face-emotion-recognition) |
| Architecture | EfficientNet-B0 (timm `tf_efficientnet_b0`) with an 8-way linear head, about 4M parameters, 16 MB |
| Training data | AffectNet (8 expression classes). This checkpoint was selected on the AFEW validation set by the authors. |
| Code licence | Apache-2.0 (HSEmotion / EmotiEffLib) |
| Data licence caveat | AffectNet is distributed for non-commercial research. This project is a non-commercial portfolio application. |
| Face detector | OpenCV YuNet `face_detection_yunet_2023mar.onnx` (MIT), from OpenCV Zoo |
| Weights integrity | SHA-256 `47c1423f…652b17` (classifier) and `8f2383e4…2552fa4` (YuNet), pinned in `scripts/setup_models.py` |

## Labels

The class order is verified against the upstream `hsemotion` source (`idx_to_class`):

`Anger, Contempt, Disgust, Fear, Happiness, Neutral, Sadness, Surprise`

### Requested product categories

| Category | Status | Source |
| --- | --- | --- |
| Happy | Measured | `Happiness` probability |
| Sad | Measured | `Sadness` probability |
| Angry | Measured | `Anger` probability |
| Stress | **Unsupported** | No model class, no validated model, no labelled evaluation data |
| Tired | **Unsupported** | No model class, no validated model, no labelled evaluation data |

Stress and tiredness are not inferred from other classes. Fear is not relabelled as stress, and Neutral or Sadness is not relabelled as tiredness. The API returns `score: null` with an explanation, and the UI shows "Not available".

## Preprocessing (identical to the upstream inference code)

1. Detect faces with YuNet (score ≥ 0.7, min side 40 px). Crop the box without margin.
2. Convert BGR to RGB.
3. Resize to 224×224 with PIL bilinear interpolation.
4. Scale to [0, 1] and normalise with ImageNet mean `(0.485, 0.456, 0.406)` and std `(0.229, 0.224, 0.225)`.
5. Softmax over the 8 logits.

Upstream used MTCNN boxes. YuNet boxes are similar but not identical, which is a small potential source of domain shift.

## Intended use

- Interactive demos and education about computer vision.
- Exploring how a facial-expression classifier responds to posed expressions.

## Out-of-scope uses

- Inferring internal emotional states, stress, fatigue, honesty, or mental health.
- Any consequential decision: hiring, education, insurance, policing, security, medical, or disciplinary.
- Monitoring people without their informed consent.

## Performance

See [evaluation.md](evaluation.md). On the FER2013 test set (7,178 images, cross-dataset), it reaches 56.1% accuracy and 0.508 macro F1 over the 7 shared classes. Happiness is strong (F1 0.837). Fear, Disgust and Sadness are weak (F1 0.35–0.46). Surprise is frequently confused with Fear.

## Limitations and risks

- Facial expressions are not emotions. People smile when uncomfortable and frown when concentrating.
- Performance varies with lighting, head pose, occlusion (glasses, masks, hands), camera quality, and distance.
- AffectNet and FER2013 are web-scraped datasets with documented demographic imbalances and label noise. Accuracy is not reported per demographic group here because no suitably labelled data was used, so disparities are likely but unmeasured.
- Confidence values are softmax probabilities. Their calibration has not been measured.
