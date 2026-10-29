/** Mirrors backend/app/schemas/api.py. Keep both in sync. */

export type CategoryStatus = 'measured' | 'unsupported';

export interface ApiErrorBody {
  success: false;
  error: { code: string; message: string };
}

export interface BoundingBox {
  /** All values normalised to [0, 1] relative to the submitted frame. */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FacePrediction {
  box: BoundingBox;
  detection_score: number;
  predicted_expression: string;
  confidence: number;
  class_scores: Record<string, number>;
  is_primary: boolean;
}

export interface CategoryResult {
  name: string;
  status: CategoryStatus;
  score: number | null;
  model_label: string | null;
  explanation: string;
}

export interface UnsupportedCategory {
  name: string;
  reason: string;
}

export interface Timings {
  decode_ms: number;
  detection_ms: number;
  classification_ms: number;
  total_ms: number;
}

export interface PredictionResponse {
  success: true;
  face_detected: boolean;
  face_count: number;
  faces: FacePrediction[];
  predicted_expression: string | null;
  confidence: number | null;
  class_scores: Record<string, number> | null;
  requested_categories: CategoryResult[];
  unsupported_categories: UnsupportedCategory[];
  inference_time_ms: number;
  timings: Timings;
  image: { width: number; height: number };
  model_name: string;
  timestamp: string;
  message: string | null;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  model_loaded: boolean;
  device: string | null;
  version: string;
  uptime_s: number;
  message: string | null;
}

export interface PerClassMetric {
  label: string;
  precision: number;
  recall: number;
  f1: number;
  support: number;
}

export interface LatencyStats {
  description: string;
  samples: number;
  mean_ms: number;
  median_ms: number;
  p95_ms: number;
}

export interface EvaluationSummary {
  dataset: string;
  split: string;
  samples: number;
  protocol: string;
  accuracy: number;
  macro_f1: number;
  weighted_f1: number;
  macro_precision: number | null;
  macro_recall: number | null;
  evaluated_at: string;
  hardware: string;
  mean_latency_ms: number | null;
  per_class: PerClassMetric[];
  confusion_matrix: { labels: string[]; matrix: number[][] } | null;
  class_distribution: Record<string, number>;
  latency: LatencyStats[];
  secondary_protocol: Record<string, number | string> | null;
  notes: string[];
}

export interface RequestedCategoryInfo {
  name: string;
  status: CategoryStatus;
  model_label: string | null;
  explanation: string;
}

export interface ModelInfoResponse {
  model_name: string;
  architecture: string;
  source_url: string;
  code_license: string;
  training_data: string;
  labels: string[];
  input_size: number[];
  preprocessing: string[];
  face_detector: string;
  device: string | null;
  model_loaded: boolean;
  requested_categories: RequestedCategoryInfo[];
  limitations: string[];
  evaluation: EvaluationSummary | null;
}

export interface SessionConfigResponse {
  recommended_interval_ms: number;
  min_interval_ms: number;
  recommended_capture_width: number;
  recommended_jpeg_quality: number;
  max_upload_bytes: number;
  accepted_content_types: string[];
  max_faces: number;
}
