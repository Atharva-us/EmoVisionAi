import { CircleSlash, Info } from 'lucide-react';

import type { CategoryResult } from '../../types/api';

const REQUESTED = ['Happy', 'Sad', 'Angry', 'Stress', 'Tired'];

/**
 * The five product categories. Measured ones show the matching model score;
 * unsupported ones show "Not available" and never a number or bar.
 */
export function RequestedCategories({ categories }: { categories: CategoryResult[] | null }) {
  const byName = new Map(categories?.map((c) => [c.name, c]));
  return (
    <section aria-labelledby="requested-heading" className="panel p-5">
      <div className="flex items-center justify-between">
        <h2 id="requested-heading" className="text-base font-semibold tracking-tight">
          Requested categories
        </h2>
        <span className="font-mono text-[11px] text-fg-subtle">primary face</span>
      </div>
      <ul className="mt-4 divide-y divide-line">
        {REQUESTED.map((name) => {
          const category = byName.get(name);
          const unsupported = category?.status === 'unsupported' || name === 'Stress' || name === 'Tired';
          return (
            <li key={name} className="py-2.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium">{name}</span>
                {unsupported ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-2 py-0.5 text-xs text-fg-muted">
                    <CircleSlash className="h-3 w-3" aria-hidden="true" />
                    Not available
                  </span>
                ) : category?.score != null ? (
                  <span className="tabular font-mono text-xs text-fg">
                    {(category.score * 100).toFixed(1)}%{' '}
                    <span className="text-fg-subtle">· {category.model_label}</span>
                  </span>
                ) : (
                  <span className="text-xs text-fg-subtle">Awaiting a detected face</span>
                )}
              </div>
              {unsupported && (
                <details className="group mt-1">
                  <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs text-fg-subtle hover:text-fg-muted">
                    <Info className="h-3 w-3" aria-hidden="true" />
                    Why?
                  </summary>
                  <p className="mt-1 text-xs text-fg-muted">
                    {category?.explanation ??
                      'Not available. The model has no such class and no validated model or evaluation data is included.'}
                  </p>
                </details>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
