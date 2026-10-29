import { BarChart3, Download, RotateCcw } from 'lucide-react';

import { ExpressionChart } from '../../charts/ExpressionChart';
import { TimelineChart } from '../../charts/TimelineChart';
import { useSession } from '../../context/SessionContext';
import { duration, ms, percent } from '../../lib/format';
import { EmptyState } from '../common/States';

function downloadSummary(payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `emovision-session-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function SessionMetrics({ labels }: { labels: readonly string[] }) {
  const { state, summary, reset } = useSession();
  const tiles = [
    {
      label: 'Frames analysed',
      value: summary.frames.toLocaleString(),
      note: `${summary.framesWithFace} with a face`,
    },
    {
      label: 'No-face frames',
      value: summary.noFaceFrames.toLocaleString(),
      note: 'Excluded from distribution',
    },
    { label: 'Session span', value: duration(summary.spanMs), note: 'First to latest frame' },
    {
      label: 'Avg server latency',
      value: summary.avgServerMs != null ? ms(summary.avgServerMs) : '—',
      note: summary.avgRoundTripMs != null ? `${ms(summary.avgRoundTripMs)} round trip` : 'No frames yet',
    },
  ];

  return (
    <section aria-labelledby="analytics-heading" className="panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="analytics-heading" className="text-base font-semibold tracking-tight">
            Session analytics
          </h2>
          <p className="mt-0.5 text-xs text-fg-subtle">
            Scope: frames analysed in this browser tab since the last reset. Kept in memory only.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!summary.frames}
            onClick={() =>
              downloadSummary({
                generated_at: new Date().toISOString(),
                scope: 'Frames analysed in this browser session. Contains no images.',
                ...summary,
              })
            }
            className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-3 py-1.5 text-xs text-fg-muted transition hover:bg-white/[0.05] hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Summary JSON
          </button>
          <button
            type="button"
            disabled={!summary.frames}
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-3 py-1.5 text-xs text-fg-muted transition hover:bg-white/[0.05] hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Reset session
          </button>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="bg-ink-900 p-4">
            <dt className="text-xs text-fg-subtle">{tile.label}</dt>
            <dd className="mt-1 font-display text-2xl font-semibold tracking-tight">{tile.value}</dd>
            <dd className="text-xs text-fg-subtle">{tile.note}</dd>
          </div>
        ))}
      </dl>

      {summary.framesWithFace === 0 ? (
        <EmptyState icon={<BarChart3 className="h-8 w-8" />} title="No observations yet">
          Charts appear after the first frame with a detected face. Only real predictions are counted.
        </EmptyState>
      ) : (
        <>
          <p className="mt-5 text-sm text-fg-muted" data-testid="session-summary">
            Across <span className="text-fg">{summary.framesWithFace}</span> frames with a face,{' '}
            {summary.dominant && summary.dominant.labels.length > 1 ? (
              <>
                the most frequent top expressions were tied:{' '}
                <span className="text-fg">{summary.dominant.labels.join(', ')}</span> (
                {percent(summary.dominant.share)} each).
              </>
            ) : (
              <>
                the most frequent top expression was{' '}
                <span className="text-fg">{summary.dominant?.labels[0]}</span> (
                {percent(summary.dominant?.share ?? 0)}), with an average confidence of{' '}
                {percent(summary.distribution[0]?.avgConfidence ?? 0)}.
              </>
            )}
          </p>
          <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <h3 className="mb-3 text-sm font-medium">Expression distribution</h3>
              <ExpressionChart counts={state.counts} labels={labels} total={summary.framesWithFace} />
            </div>
            <div>
              <h3 className="mb-3 text-sm font-medium">Happy · Sad · Angry over time</h3>
              <TimelineChart observations={state.recent} startedAt={state.startedAt} />
            </div>
          </div>
        </>
      )}
    </section>
  );
}
