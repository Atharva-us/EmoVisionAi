import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '../services/api';
import { makePrediction } from '../test/fixtures';
import { usePrediction } from './usePrediction';

vi.mock('../services/frameCapture', () => ({
  captureFrame: vi.fn(async () => new Blob(['jpeg'], { type: 'image/jpeg' })),
}));

function readyVideo() {
  const video = document.createElement('video');
  Object.defineProperty(video, 'readyState', { get: () => 4 });
  Object.defineProperty(video, 'videoWidth', { get: () => 640 });
  return { current: video };
}

let videoRef: ReturnType<typeof readyVideo>;
beforeEach(() => {
  vi.useFakeTimers();
  videoRef = readyVideo(); // stable across renders, like a real useRef
});
afterEach(() => vi.useRealTimers());

describe('usePrediction', () => {
  it('never sends overlapping requests', async () => {
    let resolve!: (v: ReturnType<typeof makePrediction>) => void;
    const predict = vi.spyOn(api, 'predict').mockImplementation(() => new Promise((r) => (resolve = r)));
    const onResult = vi.fn();
    renderHook(() =>
      usePrediction({
        videoRef,
        enabled: true,
        intervalMs: 100,
        captureWidth: 640,
        jpegQuality: 0.8,
        onResult,
      }),
    );

    await act(() => vi.advanceTimersByTimeAsync(1000)); // ten intervals pass while the first request hangs
    expect(predict).toHaveBeenCalledTimes(1);

    await act(async () => resolve(makePrediction()));
    expect(onResult).toHaveBeenCalledTimes(1);
    await act(() => vi.advanceTimersByTimeAsync(150));
    expect(predict).toHaveBeenCalledTimes(2);
  });

  it('stops sampling and aborts when disabled', async () => {
    const predict = vi.spyOn(api, 'predict').mockResolvedValue(makePrediction());
    const { rerender, result } = renderHook(
      ({ enabled }) =>
        usePrediction({ videoRef, enabled, intervalMs: 100, captureWidth: 640, jpegQuality: 0.8 }),
      { initialProps: { enabled: true } },
    );
    await act(() => vi.advanceTimersByTimeAsync(50));
    expect(result.current.result?.predicted_expression).toBe('Happiness');

    rerender({ enabled: false });
    const calls = predict.mock.calls.length;
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(predict.mock.calls.length).toBe(calls);
    expect(result.current.result).toBeNull();
  });

  it('clears the result on failure and backs off', async () => {
    const { ApiError } = await import('../services/api');
    const predict = vi.spyOn(api, 'predict').mockRejectedValue(new ApiError('network_error', 'down'));
    const { result } = renderHook(() =>
      usePrediction({ videoRef, enabled: true, intervalMs: 100, captureWidth: 640, jpegQuality: 0.8 }),
    );
    await act(() => vi.advanceTimersByTimeAsync(10));
    expect(result.current.error?.code).toBe('network_error');
    expect(result.current.result).toBeNull();

    // After one failure the next attempt waits 2x the interval, then 4x.
    await act(() => vi.advanceTimersByTimeAsync(150));
    expect(predict).toHaveBeenCalledTimes(1);
    await act(() => vi.advanceTimersByTimeAsync(100));
    expect(predict).toHaveBeenCalledTimes(2);
  });
});
