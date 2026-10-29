import { CircleSlash, ExternalLink, Gauge } from 'lucide-react';

import type { ModelInfoResponse } from '../../types/api';

export function ModelInfoPanel({ info }: { info: ModelInfoResponse }) {
  const facts = [
    { label: 'Model', value: info.model_name },
    { label: 'Architecture', value: info.architecture },
    { label: 'Training data', value: info.training_data },
    { label: 'Input', value: `${info.input_size.join(' × ')} RGB face crop` },
    { label: 'Face detector', value: info.face_detector },
    { label: 'Licence', value: info.code_license },
    { label: 'Runtime device', value: info.device ? info.device.toUpperCase() : 'Model not loaded' },
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
      <section aria-labelledby="card-heading" className="panel p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 id="card-heading" className="text-xl font-semibold">
            Model card
          </h2>
          <a
            href={info.source_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1 text-sm text-brand-blue hover:text-fg"
          >
            Source <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
        <dl className="mt-5 divide-y divide-line">
          {facts.map((fact) => (
            <div key={fact.label} className="grid gap-1 py-3 sm:grid-cols-[150px_1fr]">
              <dt className="text-sm text-fg-subtle">{fact.label}</dt>
              <dd className="text-sm">{fact.value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4">
          <p className="text-sm text-fg-subtle">Supported labels ({info.labels.length})</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {info.labels.map((label) => (
              <li
                key={label}
                className="rounded-full border border-line-strong px-2.5 py-0.5 font-mono text-xs text-fg-muted"
              >
                {label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="flex flex-col gap-5">
        <section aria-labelledby="mapping-heading" className="panel p-6">
          <h2 id="mapping-heading" className="text-xl font-semibold">
            Requested categories
          </h2>
          <p className="mt-1 text-sm text-fg-muted">
            How the five product categories relate to the model&apos;s real outputs.
          </p>
          <ul className="mt-4 space-y-3">
            {info.requested_categories.map((c) => (
              <li key={c.name} className="rounded-xl border border-line p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{c.name}</span>
                  {c.status === 'measured' ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-ok/40 px-2 py-0.5 text-xs text-ok">
                      <Gauge className="h-3 w-3" aria-hidden="true" /> Measured · {c.model_label}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-line-strong px-2 py-0.5 text-xs text-fg-muted">
                      <CircleSlash className="h-3 w-3" aria-hidden="true" /> Unsupported
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-fg-muted">{c.explanation}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section aria-labelledby="preprocess-heading" className="panel p-6 lg:col-span-2">
        <h2 id="preprocess-heading" className="text-xl font-semibold">
          Preprocessing and inference pipeline
        </h2>
        <ol className="mt-4 grid gap-3 md:grid-cols-5">
          {info.preprocessing.map((step, index) => (
            <li key={step} className="rounded-xl border border-line bg-ink-900/60 p-4">
              <span className="font-mono text-xs text-[#a48bff]">0{index + 1}</span>
              <p className="mt-2 text-sm text-fg-muted">{step}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
