import { memo } from 'react';

interface Props {
  scores: Record<string, number>;
  labels: readonly string[];
}

/**
 * All model classes in a fixed order (stable positions frame to frame).
 * One hue; the top class is emphasised and every value is printed as text.
 */
export const ConfidenceBars = memo(function ConfidenceBars({ scores, labels }: Props) {
  const top = labels.reduce(
    (best, label) => ((scores[label] ?? 0) > (scores[best] ?? 0) ? label : best),
    labels[0],
  );
  return (
    <ul className="space-y-2.5" aria-label="Class probabilities">
      {labels.map((label) => {
        const value = scores[label] ?? 0;
        const isTop = label === top;
        return (
          <li key={label} className="grid grid-cols-[84px_1fr_48px] items-center gap-3 text-sm">
            <span className={isTop ? 'font-medium text-fg' : 'text-fg-muted'}>{label}</span>
            <span className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
              <span
                className={`block h-full rounded-full transition-[width] duration-300 ease-out ${
                  isTop ? 'bg-series-1' : 'bg-series-1/40'
                }`}
                style={{ width: `${Math.max(value * 100, 0.5)}%` }}
              />
            </span>
            <span className={`tabular text-right font-mono text-xs ${isTop ? 'text-fg' : 'text-fg-muted'}`}>
              {(value * 100).toFixed(1)}%
            </span>
          </li>
        );
      })}
    </ul>
  );
});
