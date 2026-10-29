import { memo, useMemo } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { Observation } from '../hooks/useSessionAnalytics';
import { duration } from '../lib/format';
import { MEASURED_SERIES } from '../lib/expressions';
import { AXIS_TICK, ChartTooltipCard, GRID_STROKE } from './ChartTooltip';

interface Props {
  observations: Observation[];
  startedAt: number | null;
}

type Point = { elapsed: number } & Record<string, number | null>;

/**
 * Probability of the three measured requested categories over time. Frames
 * without a face are gaps (null), never zeros, so missing data is not drawn
 * as a real low score.
 */
export const TimelineChart = memo(function TimelineChart({ observations, startedAt }: Props) {
  const data = useMemo<Point[]>(
    () =>
      observations.map((o) => {
        const point: Point = { elapsed: startedAt ? (o.t - startedAt) / 1000 : 0 };
        for (const s of MEASURED_SERIES) point[s.key] = o.scores ? o.scores[s.key] * 100 : null;
        return point;
      }),
    [observations, startedAt],
  );

  return (
    <figure>
      <ul className="mb-3 flex flex-wrap gap-4 text-xs text-fg-muted" aria-label="Legend">
        {MEASURED_SERIES.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span className="h-0.5 w-4 rounded" style={{ background: s.color }} aria-hidden="true" />
            {s.label} <span className="text-fg-subtle">({s.key})</span>
          </li>
        ))}
      </ul>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 224 }}>
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
            <CartesianGrid stroke={GRID_STROKE} vertical={false} />
            <XAxis
              dataKey="elapsed"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(v: number) => duration(v * 1000)}
              tick={AXIS_TICK}
              axisLine={{ stroke: GRID_STROKE }}
              tickLine={false}
              minTickGap={40}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(v: number) => `${v}%`}
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ stroke: 'rgb(148 163 255 / 0.35)' }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <ChartTooltipCard
                    title={duration(Number(label) * 1000)}
                    rows={MEASURED_SERIES.map((s) => {
                      const v = payload.find((p) => p.dataKey === s.key)?.value;
                      return {
                        label: s.label,
                        color: s.color,
                        value: v == null ? 'no face' : `${Number(v).toFixed(1)}%`,
                      };
                    })}
                  />
                ) : null
              }
            />
            {MEASURED_SERIES.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: '#0b1020' }}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-2 text-xs text-fg-subtle">
        Probability for the primary face over the last {observations.length} analysed frames. Gaps are frames
        with no face.
      </figcaption>
    </figure>
  );
});
