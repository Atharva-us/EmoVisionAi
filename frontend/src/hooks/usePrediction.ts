import { useEffect, useRef, useState, type RefObject } from 'react';

import { ApiError, api, isAbortError } from '../services/api';
import { captureFrame } from '../services/frameCapture';
import type { PredictionResponse } from '../types/api';

export interface PredictionOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  enabled: boolean;
  intervalMs: number;
  captureWidth: number;
  jpegQuality: number;
  onResult?: (result: PredictionResponse, roundTripMs: number) => void;
}

export interface PredictionState {
  result: PredictionResponse | null;
  roundTripMs: number | null;
  error: ApiError | null;
  pending: boolean;
}

const MAX_BACKOFF_MS = 8000;
const IDLE: PredictionState = { result: null, roundTripMs: null, error: null, pending: false };

/**
 * Sample frames from the video and send them to the backend.
 *
 * Requests never overlap: the next capture is scheduled only after the
 * previous request settles, so a slow backend lowers the frame rate instead
 * of building a queue. Consecutive failures back off exponentially.
 */
export function usePrediction({
  videoRef,
  enabled,
  intervalMs,
  captureWidth,
  jpegQuality,
  onResult,
}: PredictionOptions): PredictionState {
  const [state, setState] = useState<PredictionState>(IDLE);
  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | null = null;
    let failures = 0;

    const schedule = (delay: number) => {
      if (!cancelled) timer = setTimeout(tick, delay);
    };

    async function tick() {
      const video = videoRef.current;
      // Browsers may pause a live <video> (e.g. an interrupted play() call); resume it.
      if (video?.paused && video.srcObject) void video.play().catch(() => undefined);
      if (document.hidden || !video || video.readyState < 2 || !video.videoWidth) {
        schedule(intervalMs); // wait for the tab to be visible and the stream to have data
        return;
      }
      const started = performance.now();
      controller = new AbortController();
      setState((s) => ({ ...s, pending: true }));
      try {
        const frame = await captureFrame(video, captureWidth, jpegQuality);
        const result = await api.predict(frame, controller.signal);
        if (cancelled) return;
        const roundTripMs = performance.now() - started;
        failures = 0;
        setState({ result, roundTripMs, error: null, pending: false });
        onResultRef.current?.(result, roundTripMs);
      } catch (error) {
        if (cancelled || isAbortError(error)) return;
        failures += 1;
        const apiError =
          error instanceof ApiError
            ? error
            : new ApiError('capture_failed', 'Could not capture a camera frame.');
        // Clear the old result so a stale prediction is never shown as current.
        setState({ result: null, roundTripMs: null, error: apiError, pending: false });
      }
      const elapsed = performance.now() - started;
      const backoff = failures ? Math.min(intervalMs * 2 ** failures, MAX_BACKOFF_MS) : intervalMs;
      schedule(Math.max(0, backoff - (failures ? 0 : elapsed)));
    }

    schedule(0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller?.abort();
      // Never carry a result over from a previous camera run.
      setState(IDLE);
    };
  }, [enabled, intervalMs, captureWidth, jpegQuality, videoRef]);

  return state;
}
