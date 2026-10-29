import { ArrowRight, FlaskConical } from 'lucide-react';
import { Link } from 'react-router';

import { useApiResource } from '../../hooks/useApiResource';
import { ms, percent } from '../../lib/format';
import { api } from '../../services/api';
import { ErrorState, LoadingState } from '../common/States';
import { SectionHeading } from './SectionHeading';

export function EvaluationSection() {
  const { data, error, loading, reload } = useApiResource(api.modelInfo);
  const evaluation = data?.evaluation ?? null;
  const pipelineLatency = evaluation?.latency.find((l) => l.description.startsWith('Full pipeline'));

  return (
    <section
      id="evaluation"
      aria-labelledby="evaluation-heading"
      className="mx-auto max-w-[1200px] scroll-mt-20 px-4 py-24 sm:px-6"
    >
      <SectionHeading id="evaluation-heading" eyebrow="Model evaluation" title="Measured, not marketed.">
        These numbers are loaded from the evaluation run stored with the project. If no evaluation has run,
        nothing is shown.
      </SectionHeading>

      <div className="mt-12">
        {loading && <LoadingState label="Loading evaluation results from the backend…" />}
        {error && (
          <ErrorState
            title="Evaluation results unavailable"
            message={`${error.message} Start the backend to load the measured results.`}
            onRetry={reload}
          />
        )}
        {data && !evaluation && (
          <div className="panel flex items-center gap-3 p-6 text-fg-muted">
            <FlaskConical className="h-5 w-5" aria-hidden="true" />
            Not evaluated yet. Run <code className="font-mono text-fg">evaluation/evaluate.py</code> to
            measure the model.
          </div>
        )}
        {evaluation && (
          <>
            <dl className="grid overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4 [&>*]:bg-ink-950">
              {[
                { label: 'Accuracy', value: percent(evaluation.accuracy), note: '7 shared classes' },
                { label: 'Macro F1', value: evaluation.macro_f1.toFixed(3), note: 'Unweighted class mean' },
                {
                  label: 'Weighted F1',
                  value: evaluation.weighted_f1.toFixed(3),
                  note: 'Weighted by support',
                },
                {
                  label: 'Pipeline latency',
                  value: pipelineLatency ? ms(pipelineLatency.median_ms) : '—',
                  note: 'Median, 640×480 frame, CPU',
                },
              ].map((stat) => (
                <div key={stat.label} className="p-7">
                  <dt className="eyebrow !text-[11px]">{stat.label}</dt>
                  <dd className="mt-3 font-display text-4xl font-semibold tracking-tight">{stat.value}</dd>
                  <dd className="mt-1 text-sm text-fg-subtle">{stat.note}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-5 flex flex-col gap-4 text-sm text-fg-muted md:flex-row md:items-start md:justify-between">
              <p className="max-w-3xl">
                <span className="text-fg">Scope:</span> {evaluation.dataset}, {evaluation.split},{' '}
                {evaluation.samples.toLocaleString()} images. {evaluation.protocol}. This is a cross-dataset
                test on low-resolution images, and test-set performance does not prove reliable real-world
                emotion recognition.
              </p>
              <Link
                to="/model-lab"
                className="inline-flex shrink-0 items-center gap-1.5 text-brand-blue hover:text-fg"
              >
                Full results in Model Lab
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
