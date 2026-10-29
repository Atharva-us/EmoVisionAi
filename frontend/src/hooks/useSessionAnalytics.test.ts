import { describe, expect, it } from 'vitest';

import { makePrediction, noFacePrediction } from '../test/fixtures';
import {
  initialSession,
  sessionReducer,
  summarize,
  TIMELINE_CAPACITY,
  toObservation,
} from './useSessionAnalytics';

const record = (state = initialSession, result = makePrediction(), rtt = 100, t = 1000) =>
  sessionReducer(state, { type: 'record', observation: toObservation(result, rtt, t) });

describe('session analytics', () => {
  it('counts only frames with a face in the distribution', () => {
    let s = record(initialSession, makePrediction(), 100, 1000);
    s = record(s, noFacePrediction(), 120, 2000);
    s = record(s, makePrediction({ predicted_expression: 'Sadness', confidence: 0.5 }), 80, 4000);
    const summary = summarize(s);

    expect(summary.frames).toBe(3);
    expect(summary.framesWithFace).toBe(2);
    expect(summary.noFaceFrames).toBe(1);
    expect(summary.distribution.map((d) => [d.label, d.count])).toEqual([
      ['Happiness', 1],
      ['Sadness', 1],
    ]);
    expect(summary.spanMs).toBe(3000);
    expect(summary.avgRoundTripMs).toBe(100);
    expect(summary.avgServerMs).toBeCloseTo(66.1);
  });

  it('computes the dominant expression and its average confidence', () => {
    let s = record();
    s = record(s, makePrediction({ confidence: 0.9 }));
    s = record(s, makePrediction({ predicted_expression: 'Neutral', confidence: 0.6 }));
    const summary = summarize(s);
    expect(summary.dominant).toEqual({ labels: ['Happiness'], share: 2 / 3 });
    expect(summary.distribution[0].avgConfidence).toBeCloseTo(0.8);
  });

  it('stores no image data and bounds timeline memory', () => {
    let s = initialSession;
    for (let i = 0; i < TIMELINE_CAPACITY + 20; i++) s = record(s, makePrediction(), 50, i);
    expect(s.recent).toHaveLength(TIMELINE_CAPACITY);
    expect(s.frames).toBe(TIMELINE_CAPACITY + 20);
    expect(Object.keys(s.recent[0]).sort()).toEqual(
      ['confidence', 'expression', 'faceCount', 'roundTripMs', 'scores', 'serverMs', 't'].sort(),
    );
  });

  it('reports ties instead of picking one expression arbitrarily', () => {
    let s = record();
    s = record(s, makePrediction({ predicted_expression: 'Surprise' }));
    expect(summarize(s).dominant).toEqual({ labels: ['Happiness', 'Surprise'], share: 0.5 });
  });

  it('resets to an empty session', () => {
    const s = sessionReducer(record(), { type: 'reset' });
    expect(s).toEqual(initialSession);
    expect(summarize(s).dominant).toBeNull();
  });
});
