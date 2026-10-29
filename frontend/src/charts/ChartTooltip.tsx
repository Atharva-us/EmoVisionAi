import type { ReactNode } from 'react';

export interface TooltipRow {
  label: string;
  value: string;
  color?: string;
}

/** Shared tooltip card: text stays in text colours; a swatch carries series identity. */
export function ChartTooltipCard({ title, rows }: { title: ReactNode; rows: TooltipRow[] }) {
  return (
    <div className="rounded-lg border border-line-strong bg-ink-800/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <p className="mb-1 font-mono text-fg-subtle">{title}</p>
      {rows.map((row) => (
        <p key={row.label} className="flex items-center gap-2 text-fg">
          {row.color && (
            <span className="h-2 w-2 rounded-full" style={{ background: row.color }} aria-hidden="true" />
          )}
          <span className="text-fg-muted">{row.label}</span>
          <span className="tabular ml-auto pl-3 font-mono">{row.value}</span>
        </p>
      ))}
    </div>
  );
}

export const AXIS_TICK = { fill: '#7b84a6', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' };
export const GRID_STROKE = 'rgb(148 163 255 / 0.08)';
