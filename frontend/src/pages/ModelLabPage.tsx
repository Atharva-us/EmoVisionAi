import { AlertTriangle, FlaskConical } from 'lucide-react';

import { ErrorState, LoadingState } from '../components/common/States';
import { EvaluationDetails } from '../components/model/EvaluationDetails';
import { ModelInfoPanel } from '../components/model/ModelInfoPanel';
import { useApiResource } from '../hooks/useApiResource';
import { api } from '../services/api';

export default function ModelLabPage() {
  const { data, error, loading, reload } = useApiResource(api.modelInfo);

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6">
      <header>
        <p className="eyebrow">Technical documentation</p>
        <h1 className="mt-2 text-4xl font-semibold">Model Lab</h1>
        <p className="mt-2 max-w-2xl text-fg-muted">
          What the model is, how frames are processed, and how well it performed on a held-out benchmark.
          Every value is served by the backend from the installed model and the stored evaluation run.
        </p>
      </header>

      <div className="mt-8">
        {loading && <LoadingState label="Loading model information…" />}
        {error && (
          <ErrorState
            title="Model information unavailable"
            message={`${error.message} The Model Lab reads its data from the local backend.`}
            onRetry={reload}
          />
        )}
        {data && (
          <div className="flex flex-col gap-5">
            <ModelInfoPanel info={data} />
            {data.evaluation ? (
              <EvaluationDetails evaluation={data.evaluation} />
            ) : (
              <section className="panel flex items-center gap-3 p-6 text-fg-muted">
                <FlaskConical className="h-5 w-5" aria-hidden="true" />
                <p>
                  <span className="font-medium text-fg">Not evaluated yet.</span> Run{' '}
                  <code className="font-mono text-fg">evaluation/evaluate.py</code> to compute accuracy, F1,
                  the confusion matrix and latency.
                </p>
              </section>
            )}
            <section aria-labelledby="limits-heading" className="panel p-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warn" aria-hidden="true" />
                <h2 id="limits-heading" className="text-xl font-semibold">
                  Known limitations
                </h2>
              </div>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-fg-muted">
                {data.limitations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
