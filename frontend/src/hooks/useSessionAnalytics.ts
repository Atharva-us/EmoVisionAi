import { useCallback, useMemo, useReducer } from 'react';

import type { PredictionResponse } from '../types/api';

/** One analysed frame. Only derived numbers are kept; no image data. */
export interface Observation {
  t: number; // epoch ms (client clock)
  expression: string | null; // null = no face detected
  confidence: number | null;
  scores: Record<string, number> | null;
  serverMs: number;
  roundTripMs: number;
  faceCount: number;
}

export interface SessionState {
  startedAt: number | null;
  lastAt: number | null;
  frames: number;
  framesWithFace: number;
  counts: Record<string, number>;
  confidenceSum: Record<string, number>;
  serverMsSum: number;
  roundTripMsSum: number;
  /** Most recent observations for the timeline (bounded memory). */
  recent: Observation[];
}

export const TIMELINE_CAPACITY = 240;

export const initialSession: SessionState = {
  startedAt: null,
  lastAt: null,
  frames: 0,
  framesWithFace: 0,
  counts: {},
  confidenceSum: {},
  serverMsSum: 0,
  roundTripMsSum: 0,
  recent: [],
};

type Action = { type: 'record'; observation: Observation } | { type: 'reset' };

export function sessionReducer(state: SessionState, action: Action): SessionState {
  if (action.type === 'reset') return initialSession;
  const o = action.observation;
  const counts = { ...state.counts };
  const confidenceSum = { ...state.confidenceSum };
  if (o.expression) {
    counts[o.expression] = (counts[o.expression] ?? 0) + 1;
    confidenceSum[o.expression] = (confidenceSum[o.expression] ?? 0) + (o.confidence ?? 0);
  }
  const recent = state.recent.length >= TIMELINE_CAPACITY ? state.recent.slice(1) : state.recent.slice();
  recent.push(o);
  return {
    startedAt: state.startedAt ?? o.t,
    lastAt: o.t,
    frames: state.frames + 1,
    framesWithFace: state.framesWithFace + (o.expression ? 1 : 0),
    counts,
    confidenceSum,
    serverMsSum: state.serverMsSum + o.serverMs,
    roundTripMsSum: state.roundTripMsSum + o.roundTripMs,
    recent,
  };
}

export function toObservation(
  result: PredictionResponse,
  roundTripMs: number,
  now = Date.now(),
): Observation {
  return {
    t: now,
    expression: result.face_detected ? result.predicted_expression : null,
    confidence: result.confidence,
    scores: result.class_scores,
    serverMs: result.timings.total_ms,
    roundTripMs,
    faceCount: result.face_count,
  };
}

export interface SessionSummary {
  frames: number;
  framesWithFace: number;
  noFaceFrames: number;
  spanMs: number;
  avgServerMs: number | null;
  avgRoundTripMs: number | null;
  distribution: { label: string; count: number; share: number; avgConfidence: number }[];
  /** Most frequent top expression(s); several labels when counts are tied. */
  dominant: { labels: string[]; share: number } | null;
}

export function summarize(state: SessionState): SessionSummary {
  const distribution = Object.entries(state.counts)
    .map(([label, count]) => ({
      label,
      count,
      share: state.framesWithFace ? count / state.framesWithFace : 0,
      avgConfidence: count ? (state.confidenceSum[label] ?? 0) / count : 0,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  return {
    frames: state.frames,
    framesWithFace: state.framesWithFace,
    noFaceFrames: state.frames - state.framesWithFace,
    spanMs: state.startedAt && state.lastAt ? state.lastAt - state.startedAt : 0,
    avgServerMs: state.frames ? state.serverMsSum / state.frames : null,
    avgRoundTripMs: state.frames ? state.roundTripMsSum / state.frames : null,
    distribution,
    dominant: distribution[0]
      ? {
          labels: distribution.filter((d) => d.count === distribution[0].count).map((d) => d.label),
          share: distribution[0].share,
        }
      : null,
  };
}

/** Session analytics computed exclusively from real prediction responses. In memory only. */
export function useSessionAnalytics() {
  const [state, dispatch] = useReducer(sessionReducer, initialSession);
  const record = useCallback(
    (result: PredictionResponse, roundTripMs: number) =>
      dispatch({ type: 'record', observation: toObservation(result, roundTripMs) }),
    [],
  );
  const reset = useCallback(() => dispatch({ type: 'reset' }), []);
  const summary = useMemo(() => summarize(state), [state]);
  return { state, summary, record, reset };
}
