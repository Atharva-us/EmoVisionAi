import { ConfusionMatrix } from '../../charts/ConfusionMatrix';
import { percent } from '../../lib/format';
import type { EvaluationSummary } from '../../types/api';

export function EvaluationDetails({ evaluation }: { evaluation: EvaluationSummary }) {
  const headline = [
    { label: 'Accuracy', value: percent(evaluation.accuracy) },
    { label: 'Macro F1', value: evaluation.macro_f1.toFixed(3) },
    { label: 'Weighted F1', value: evaluation.weighted_f1.toFixed(3) },
    { label: 'Macro precision', value: evaluation.macro_precision?.toFixed(3) ?? '—' },
    { label: 'Macro recall', value: evaluation.macro_recall?.toFixed(3) ?? '—' },
  ];
  const secondary = evaluation.secondary_protocol;
  const maxF1 = Math.max(...evaluation.per_class.map((c) => c.f1), 0.0001);

  return (
    <div className="flex flex-col gap-5">
      <section aria-labelledby="eval-heading" className="panel p-6">
        <h2 id="eval-heading" className="text-xl font-semibold">
          Evaluation results
        </h2>
        <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm text-fg-muted sm:grid-cols-2">
          <div>
            <dt className="inline text-fg-subtle">Dataset: </dt>
            <dd className="inline">{evaluation.dataset}</dd>
          </div>
          <div>
            <dt className="inline text-fg-subtle">Split: </dt>
            <dd className="inline">
              {evaluation.split}, {evaluation.samples.toLocaleString()} images
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="inline text-fg-subtle">Protocol: </dt>
            <dd className="inline">{evaluation.protocol}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="inline text-fg-subtle">Hardware: </dt>
            <dd className="inline">{evaluation.hardware}</dd>
          </div>
          <div>
            <dt className="inline text-fg-subtle">Evaluated: </dt>
            <dd className="inline">{new Date(evaluation.evaluated_at).toLocaleString()}</dd>
          </div>
        </dl>

        <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-5">
          {headline.map((m) => (
            <div key={m.label} className="bg-ink-900 p-4">
              <dt className="text-xs text-fg-subtle">{m.label}</dt>
              <dd className="mt-1 font-display text-2xl font-semibold">{m.value}</dd>
            </div>
          ))}
        </dl>
        {secondary && (
          <p className="mt-3 text-xs text-fg-subtle">
            {String(secondary.name)}: accuracy {percent(Number(secondary.accuracy))}, macro F1{' '}
            {Number(secondary.macro_f1).toFixed(3)}, Contempt predicted for{' '}
            {percent(Number(secondary.contempt_prediction_rate))} of images.
          </p>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section aria-labelledby="perclass-heading" className="panel p-6">
          <h3 id="perclass-heading" className="text-lg font-semibold">
            Per-class metrics
          </h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-fg-subtle">
                  <th scope="col" className="py-2 font-normal">
                    Class
                  </th>
                  <th scope="col" className="py-2 text-right font-normal">
                    Precision
                  </th>
                  <th scope="col" className="py-2 text-right font-normal">
                    Recall
                  </th>
                  <th scope="col" className="py-2 pl-4 font-normal">
                    F1
                  </th>
                  <th scope="col" className="py-2 text-right font-normal">
                    Support
                  </th>
                </tr>
              </thead>
              <tbody className="tabular font-mono text-xs">
                {evaluation.per_class.map((c) => (
                  <tr key={c.label} className="border-b border-line/60">
                    <th scope="row" className="py-2 text-left font-sans text-sm font-normal">
                      {c.label}
                    </th>
                    <td className="py-2 text-right">{c.precision.toFixed(3)}</td>
                    <td className="py-2 text-right">{c.recall.toFixed(3)}</td>
                    <td className="py-2 pl-4">
                      <span className="flex items-center gap-2">
                        <span className="h-1.5 w-16 rounded-full bg-white/[0.05]">
                          <span
                            className="block h-full rounded-full bg-series-1"
                            style={{ width: `${(c.f1 / maxF1) * 100}%` }}
                          />
                        </span>
                        {c.f1.toFixed(3)}
                      </span>
                    </td>
                    <td className="py-2 text-right text-fg-muted">{c.support.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="latency-heading" className="panel p-6">
          <h3 id="latency-heading" className="text-lg font-semibold">
            Inference latency
          </h3>
          <p className="mt-1 text-xs text-fg-subtle">
            Hardware-dependent. Measured on the machine listed above.
          </p>
          <ul className="mt-4 space-y-3">
            {evaluation.latency.map((l) => (
              <li key={l.description} className="rounded-xl border border-line p-4">
                <p className="text-sm text-fg-muted">{l.description}</p>
                <dl className="tabular mt-2 grid grid-cols-3 font-mono text-sm">
                  <div>
                    <dt className="text-xs text-fg-subtle">median</dt>
                    <dd>{l.median_ms.toFixed(1)} ms</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-fg-subtle">mean</dt>
                    <dd>{l.mean_ms.toFixed(1)} ms</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-fg-subtle">p95</dt>
                    <dd>{l.p95_ms.toFixed(1)} ms</dd>
                  </div>
                </dl>
                <p className="mt-1 text-xs text-fg-subtle">{l.samples} samples</p>
              </li>
            ))}
          </ul>
          <h3 className="mt-6 text-sm font-medium">Test-set class distribution</h3>
          <ul className="mt-2 flex flex-wrap gap-2 font-mono text-xs text-fg-muted">
            {Object.entries(evaluation.class_distribution).map(([label, n]) => (
              <li key={label} className="rounded-full border border-line px-2.5 py-0.5">
                {label} {n.toLocaleString()}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {evaluation.confusion_matrix && (
        <section aria-labelledby="cm-heading" className="panel p-6">
          <h3 id="cm-heading" className="text-lg font-semibold">
            Confusion matrix
          </h3>
          <div className="mt-4">
            <ConfusionMatrix
              labels={evaluation.confusion_matrix.labels}
              matrix={evaluation.confusion_matrix.matrix}
            />
          </div>
        </section>
      )}

      {evaluation.notes.length > 0 && (
        <section aria-labelledby="notes-heading" className="panel p-6">
          <h3 id="notes-heading" className="text-lg font-semibold">
            Methodology notes
          </h3>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-fg-muted">
            {evaluation.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
