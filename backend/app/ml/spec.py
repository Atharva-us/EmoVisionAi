"""Model constants shared by the classifier, metadata endpoint and evaluation.

Kept free of heavy imports (torch/timm) so lightweight modules can use them.
"""

MODEL_NAME = "HSEmotion EfficientNet-B0 (enet_b0_8_best_afew)"
WEIGHTS_FILENAME = "enet_b0_8_best_afew.safetensors"
ARCHITECTURE = "tf_efficientnet_b0"
INPUT_SIZE = 224
IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD = (0.229, 0.224, 0.225)
