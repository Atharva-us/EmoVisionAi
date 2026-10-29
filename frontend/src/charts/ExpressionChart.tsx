import { memo, useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { AXIS_TICK, ChartTooltipCard, GRID_STROKE } from './ChartTooltip';

interface Props {
  counts: Record<string, number>;
  labels: readonly string[];
  total: number;
}

const COLOR = '#3987e5';

/** Count of frames per top expression. Nominal categories, so a single hue in fixed model order. */
export const ExpressionChart = memo(function ExpressionChart({ counts, labels, total }: Props) {
  const data = useMemo(
    () =>
      labels.map((label) => ({
        label,
        count: counts[label] ?? 0,
        share: total ? (counts[label] ?? 0) / total : 0,
      })),
    [counts, labels, total],
  );
  return (
    <figure>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 400, height: 256 }}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 16, bottom: 0, left: 8 }}
            barCategoryGap={6}
          >
            <CartesianGrid stroke={GRID_STROKE} horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="label"
              width={76}
              tick={{ ...AXIS_TICK, fill: '#a3abc8' }}
              axisLine={{ stroke: GRID_STROKE }}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'rgb(148 163 255 / 0.06)' }}
              content={({ active, payload }) => {
                const row = active && payload?.[0]?.payload;
                return row ? (
                  <ChartTooltipCard
                    title={row.label}
                    rows={[
                      { label: 'Frames', value: String(row.count), color: COLOR },
                      { label: 'Share', value: `${(row.share * 100).toFixed(1)}%` },
                    ]}
                  />
                ) : null;
              }}
            />
            <Bar dataKey="count" fill={COLOR} radius={[0, 4, 4, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Frames per top expression</caption>
        <thead>
          <tr>
            <th>Expression</th>
            <th>Frames</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <td>{d.label}</td>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
});
