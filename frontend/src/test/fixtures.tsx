import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { vi } from 'vitest';

import { AppProviders, routes } from '../App';
import type { ModelInfoResponse, PredictionResponse } from '../types/api';

export const LABELS = ['Anger', 'Contempt', 'Disgust', 'Fear', 'Happiness', 'Neutral', 'Sadness', 'Surprise'];

const UNSUPPORTED = [
  { name: 'Stress', reason: 'Not available. No validated stress model.' },
  { name: 'Tired', reason: 'Not available. No validated fatigue model.' },
];

export function makePrediction(overrides: Partial<PredictionResponse> = {}): PredictionResponse {
  const scores = {
    Anger: 0.05,
    Contempt: 0.01,
    Disgust: 0.01,
    Fear: 0.03,
    Happiness: 0.7,
    Neutral: 0.1,
    Sadness: 0.06,
    Surprise: 0.04,
  };
  return {
    success: true,
    face_detected: true,
    face_count: 1,
    faces: [
      {
        box: { x: 0.3, y: 0.2, width: 0.3, height: 0.4 },
        detection_score: 0.93,
        predicted_expression: 'Happiness',
        confidence: 0.7,
        class_scores: scores,
        is_primary: true,
      },
    ],
    predicted_expression: 'Happiness',
    confidence: 0.7,
    class_scores: scores,
    requested_categories: [
      {
        name: 'Happy',
        status: 'measured',
        score: 0.7,
        model_label: 'Happiness',
        explanation: 'Direct model output.',
      },
      {
        name: 'Sad',
        status: 'measured',
        score: 0.06,
        model_label: 'Sadness',
        explanation: 'Direct model output.',
      },
      {
        name: 'Angry',
        status: 'measured',
        score: 0.05,
        model_label: 'Anger',
        explanation: 'Direct model output.',
      },
      {
        name: 'Stress',
        status: 'unsupported',
        score: null,
        model_label: null,
        explanation: UNSUPPORTED[0].reason,
      },
      {
        name: 'Tired',
        status: 'unsupported',
        score: null,
        model_label: null,
        explanation: UNSUPPORTED[1].reason,
      },
    ],
    unsupported_categories: UNSUPPORTED,
    inference_time_ms: 48.2,
    timings: { decode_ms: 2, detection_ms: 15, classification_ms: 48.2, total_ms: 66.1 },
    image: { width: 640, height: 480 },
    model_name: 'HSEmotion EfficientNet-B0 (enet_b0_8_best_afew)',
    timestamp: '2026-10-28T12:00:00Z',
    message: null,
    ...overrides,
  };
}

export const noFacePrediction = () =>
  makePrediction({
    face_detected: false,
    face_count: 0,
    faces: [],
    predicted_expression: null,
    confidence: null,
    class_scores: null,
    inference_time_ms: 0,
    message: 'No face detected.',
    requested_categories: makePrediction().requested_categories.map((c) => ({ ...c, score: null })),
  });

export function makeModelInfo(evaluated = true): ModelInfoResponse {
  return {
    model_name: 'HSEmotion EfficientNet-B0 (enet_b0_8_best_afew)',
    architecture: 'EfficientNet-B0',
    source_url: 'https://github.com/av-savchenko/face-emotion-recognition',
    code_license: 'Apache-2.0',
    training_data: 'AffectNet',
    labels: LABELS,
    input_size: [224, 224],
    preprocessing: ['Detect', 'Crop', 'Resize', 'Normalise', 'Softmax'],
    face_detector: 'OpenCV YuNet',
    device: 'cpu',
    model_loaded: true,
    requested_categories: [
      { name: 'Happy', status: 'measured', model_label: 'Happiness', explanation: 'Direct.' },
      { name: 'Stress', status: 'unsupported', model_label: null, explanation: 'Not available.' },
    ],
    limitations: ['Expressions are not emotions.'],
    evaluation: evaluated
      ? {
          dataset: 'FER2013',
          split: 'test',
          samples: 7178,
          protocol: 'Classifier-only, 7 shared classes',
          accuracy: 0.561,
          macro_f1: 0.5076,
          weighted_f1: 0.5611,
          macro_precision: 0.53,
          macro_recall: 0.52,
          evaluated_at: '2026-10-28T15:00:00+00:00',
          hardware: 'Test CPU',
          mean_latency_ms: 48,
          per_class: [{ label: 'Happiness', precision: 0.8, recall: 0.85, f1: 0.82, support: 1774 }],
          confusion_matrix: {
            labels: ['Anger', 'Happiness'],
            matrix: [
              [5, 1],
              [2, 8],
            ],
          },
          class_distribution: { Anger: 958, Happiness: 1774 },
          latency: [
            {
              description: 'Full pipeline: JPEG decode + YuNet',
              samples: 200,
              mean_ms: 75,
              median_ms: 73.4,
              p95_ms: 79.8,
            },
          ],
          secondary_protocol: {
            name: '8-class',
            accuracy: 0.5545,
            macro_f1: 0.5069,
            contempt_prediction_rate: 0.0157,
          },
          notes: ['Cross-dataset evaluation.'],
        }
      : null,
  };
}

type Handler = (init?: RequestInit) => Response | Promise<Response>;

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Install a fetch mock that routes by API path. Unhandled paths fail like a down server. */
export function mockApi(
  handlers: Partial<Record<'health' | 'model/info' | 'predict' | 'session/config', Handler>>,
) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const key = (Object.keys(handlers) as (keyof typeof handlers)[]).find((k) =>
      url.endsWith(`/api/v1/${k}`),
    );
    if (!key) throw new TypeError('Failed to fetch');
    return handlers[key]!(init);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

export function renderRoute(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return {
    router,
    ...render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    ),
  };
}

/** A fake MediaStream whose tracks record stop() calls. */
export function fakeStream() {
  const track = {
    stop: vi.fn(),
    addEventListener: vi.fn(),
    getSettings: () => ({ deviceId: 'cam-1' }),
    kind: 'video',
  };
  return {
    track,
    stream: { getTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream,
  };
}

export function installMediaDevices(getUserMedia: (c: MediaStreamConstraints) => Promise<MediaStream>) {
  const mediaDevices = {
    getUserMedia: vi.fn(getUserMedia),
    enumerateDevices: vi.fn(async () => [
      { kind: 'videoinput', deviceId: 'cam-1', label: 'Test Webcam', groupId: 'g' },
    ]),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  Object.defineProperty(navigator, 'mediaDevices', { value: mediaDevices, configurable: true });
  return mediaDevices;
}
