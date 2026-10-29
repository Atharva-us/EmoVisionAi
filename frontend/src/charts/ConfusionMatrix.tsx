import { memo } from 'react';

interface Props {
  labels: string[];
  matrix: number[][];
}

// Single-hue sequential ramp for the dark surface: low values recede toward the
// panel colour, high values brighten toward blue.
const LOW = [18, 26, 46]; // ink-800
const HIGH = [85, 152, 231]; // #5598e7

function cellColor(t: number) {
  const mix = LOW.map((low, i) => Math.round(low + (HIGH[i] - low) * Math.sqrt(t)));
  return `rgb(${mix.join(' ')})`;
}

/** Row-normalised confusion matrix (each row = one true class, cells = recall share). */
export const ConfusionMatrix = memo(function ConfusionMatrix({ labels, matrix }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-separate border-spacing-[2px] text-xs">
        <caption className="mb-3 text-left text-fg-subtle">
          Rows: true label. Columns: predicted label. Cells show the share of each true class (row sums to
          100%); hover for counts.
        </caption>
        <thead>
          <tr>
            <th scope="col" className="w-24 p-1 text-left font-normal text-fg-subtle">
              True \ Pred
            </th>
            {labels.map((label) => (
              <th key={label} scope="col" className="p-1 font-mono font-normal text-fg-muted">
                {label.slice(0, 4)}
                <span className="sr-only">{label.slice(4)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => {
            const total = row.reduce((a, b) => a + b, 0) || 1;
            return (
              <tr key={labels[i]}>
                <th scope="row" className="p-1 text-left font-normal text-fg-muted">
                  {labels[i]}
                </th>
                {row.map((count, j) => {
                  const share = count / total;
                  return (
                    <td
                      key={labels[j]}
                      title={`True ${labels[i]} → predicted ${labels[j]}: ${count} of ${total}`}
                      className={`tabular rounded-[4px] p-2 text-center font-mono ${
                        i === j ? 'ring-1 ring-inset ring-white/25' : ''
                      } ${share > 0.45 ? 'text-ink-950' : 'text-fg'}`}
                      style={{ background: cellColor(share) }}
                    >
                      {(share * 100).toFixed(0)}%
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});
