import type {
  ApiErrorBody,
  HealthResponse,
  ModelInfoResponse,
  PredictionResponse,
  SessionConfigResponse,
} from '../types/api';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '');

/** A failed API call with a stable machine-readable code. */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number | undefined;

  constructor(code: string, message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: BodyInit;
  signal?: AbortSignal;
  timeoutMs?: number;
}

async function request<T>(
  path: string,
  { method = 'GET', body, signal, timeoutMs = 10_000 }: RequestOptions = {},
) {
  // Combine the caller's signal with a timeout (AbortSignal.any is not available everywhere).
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const forwardAbort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', forwardAbort, { once: true });

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { method, body, signal: controller.signal });
  } catch (error) {
    if (timedOut) throw new ApiError('timeout', 'The backend did not respond in time.');
    if (isAbortError(error) || signal?.aborted) throw new DOMException('Request aborted', 'AbortError');
    throw new ApiError(
      'network_error',
      `Cannot reach the EmoVisionAI backend at ${API_BASE_URL}. Is the FastAPI server running?`,
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forwardAbort);
  }

  if (!response.ok) {
    let parsed: ApiErrorBody | null = null;
    try {
      parsed = (await response.json()) as ApiErrorBody;
    } catch {
      /* non-JSON error body */
    }
    if (parsed?.error?.code) throw new ApiError(parsed.error.code, parsed.error.message, response.status);
    throw new ApiError('http_error', `The backend returned HTTP ${response.status}.`, response.status);
  }
  return (await response.json()) as T;
}

export const api = {
  health: (signal?: AbortSignal) => request<HealthResponse>('/api/v1/health', { signal, timeoutMs: 4000 }),
  modelInfo: (signal?: AbortSignal) => request<ModelInfoResponse>('/api/v1/model/info', { signal }),
  sessionConfig: (signal?: AbortSignal) =>
    request<SessionConfigResponse>('/api/v1/session/config', { signal }),
  predict(frame: Blob, signal?: AbortSignal) {
    const form = new FormData();
    form.append('image', frame, 'frame.jpg');
    return request<PredictionResponse>('/api/v1/predict', {
      method: 'POST',
      body: form,
      signal,
      timeoutMs: 8000,
    });
  },
};
