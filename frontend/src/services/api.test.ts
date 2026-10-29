import { describe, expect, it, vi } from 'vitest';

import { json, makePrediction, mockApi } from '../test/fixtures';
import { api, ApiError, isAbortError } from './api';

describe('api client', () => {
  it('posts the frame as multipart form data and returns the prediction', async () => {
    const fetchMock = mockApi({ predict: () => json(makePrediction()) });
    const result = await api.predict(new Blob(['x'], { type: 'image/jpeg' }));
    expect(result.predicted_expression).toBe('Happiness');
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.method).toBe('POST');
    expect((init?.body as FormData).get('image')).toBeInstanceOf(Blob);
  });

  it('turns the error envelope into an ApiError with code and status', async () => {
    mockApi({
      predict: () => json({ success: false, error: { code: 'payload_too_large', message: 'Too big.' } }, 413),
    });
    const error = await api.predict(new Blob(['x'])).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: 'payload_too_large', status: 413, message: 'Too big.' });
  });

  it('handles non-JSON error responses', async () => {
    mockApi({ health: () => new Response('<html>Bad gateway</html>', { status: 502 }) });
    await expect(api.health()).rejects.toMatchObject({ code: 'http_error', status: 502 });
  });

  it('reports a network failure clearly', async () => {
    mockApi({});
    await expect(api.health()).rejects.toMatchObject({ code: 'network_error' });
  });

  it('times out slow requests', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_: string, init: RequestInit) =>
          new Promise((_, reject) =>
            init.signal!.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))),
          ),
      ),
    );
    const pending = api.health().catch((e) => e);
    await vi.advanceTimersByTimeAsync(5000);
    expect(await pending).toMatchObject({ code: 'timeout' });
    vi.useRealTimers();
  });

  it('propagates caller aborts as AbortError, not as a failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_: string, init: RequestInit) =>
          new Promise((_, reject) =>
            init.signal!.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))),
          ),
      ),
    );
    const controller = new AbortController();
    const pending = api.modelInfo(controller.signal).catch((e) => e);
    controller.abort();
    expect(isAbortError(await pending)).toBe(true);
  });
});
