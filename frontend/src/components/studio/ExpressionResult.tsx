import { Clock, Gauge, ScanFace, Timer } from 'lucide-react';

import { clockTime, ms, percent } from '../../lib/format';
import type { ApiError } from '../../services/api';
import type { PredictionResponse } from '../../types/api';
import { ErrorState } from '../common/States';
import { ConfidenceBars } from './ConfidenceBars';

interface Props {
  result: PredictionResponse | null;
  roundTripMs: number | null;
  error: ApiError | null;
  running: boolean;
  labels: readonly string[];
}

function errorTitle(error: ApiError) {
  switch (error.code) {
    case 'network_error':
      return 'Backend unreachable';
    case 'model_unavailable':
      return 'Model not loaded';
    case 'timeout':
      return 'Backend timed out';
    case 'server_busy':
      return 'Backend busy';
    default:
      return 'Prediction failed';
  }
}

export function ExpressionResult({ result, roundTripMs, error, running, labels }: Props) {
  const hasFace = Boolean(result?.face_detected && result.predicted_expression);
  return (
    <section aria-labelledby="prediction-heading" className="panel p-5">
      <div className="flex items-center justify-between">
        <h2 id="prediction-heading" className="text-base font-semibold tracking-tight">
          Prediction
        </h2>
        {result && (
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-fg-subtle">
            <Clock className="h-3 w-3" aria-hidden="true" />
            <time dateTime={result.timestamp}>{clockTime(result.timestamp)}</time>
          </span>
        )}
      </div>

      <div aria-live="polite" aria-atomic="true" className="mt-4">
        {error ? (
          <ErrorState title={errorTitle(error)} message={`${error.message} Retrying automatically.`} />
        ) : !running ? (
          <p className="text-sm text-fg-muted">Start the camera to see live predictions.</p>
        ) : !result ? (
          <p className="text-sm text-fg-muted">Waiting for the first analysed frame…</p>
        ) : !hasFace ? (
          <div className="flex items-center gap-3">
            <ScanFace className="h-6 w-6 text-warn" aria-hidden="true" />
            <div>
              <p className="font-medium">No face detected</p>
              <p className="text-sm text-fg-muted">No prediction is made without a face.</p>
            </div>
          </div>
        ) : (
          <div>
            <p className="eyebrow !text-[11px]">Top expression</p>
            <p className="mt-1 font-display text-4xl font-semibold tracking-tight">
              {result.predicted_expression}
            </p>
            <p className="mt-1 text-sm text-fg-muted">
              Confidence <span className="tabular font-mono text-fg">{percent(result.confidence ?? 0)}</span>
              <span className="text-fg-subtle"> · model probability, not certainty</span>
            </p>
          </div>
        )}
      </div>

      {result && (
        <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-4 text-xs">
          <div>
            <dt className="flex items-center gap-1 text-fg-subtle">
              <Gauge className="h-3 w-3" aria-hidden="true" /> Model
            </dt>
            <dd className="tabular mt-0.5 font-mono text-fg">
              {hasFace ? ms(result.inference_time_ms) : '—'}
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-1 text-fg-subtle">
              <Timer className="h-3 w-3" aria-hidden="true" /> Server
            </dt>
            <dd className="tabular mt-0.5 font-mono text-fg">{ms(result.timings.total_ms)}</dd>
          </div>
          <div>
            <dt className="text-fg-subtle">Round trip</dt>
            <dd className="tabular mt-0.5 font-mono text-fg">
              {roundTripMs != null ? ms(roundTripMs) : '—'}
            </dd>
          </div>
        </dl>
      )}

      {hasFace && result?.class_scores && (
        <div className="mt-5 border-t border-line pt-4">
          <p className="mb-3 text-xs text-fg-subtle">All {labels.length} model classes (primary face)</p>
          <ConfidenceBars scores={result.class_scores} labels={labels} />
        </div>
      )}
      {result?.message && hasFace && <p className="mt-4 text-xs text-fg-subtle">{result.message}</p>}
    </section>
  );
}
