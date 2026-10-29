import { useId } from 'react';

// Abstract face landmarks (original artwork, 400x440 viewBox).
const CONTOUR =
  'M200 52 C 278 52 322 112 322 196 C 322 268 300 318 262 352 C 240 372 220 382 200 382 C 180 382 160 372 138 352 C 100 318 78 268 78 196 C 78 112 122 52 200 52 Z';
const POINTS: [number, number][] = [
  [128, 168],
  [146, 160],
  [166, 158],
  [184, 164], // left brow
  [216, 164],
  [234, 158],
  [254, 160],
  [272, 168], // right brow
  [140, 196],
  [156, 188],
  [172, 188],
  [186, 196],
  [172, 202],
  [156, 202], // left eye
  [214, 196],
  [228, 188],
  [244, 188],
  [260, 196],
  [244, 202],
  [228, 202], // right eye
  [200, 206],
  [200, 230],
  [200, 254],
  [186, 266],
  [200, 270],
  [214, 266], // nose
  [160, 302],
  [178, 296],
  [200, 298],
  [222, 296],
  [240, 302],
  [222, 316],
  [200, 320],
  [178, 316], // mouth
  [96, 236],
  [106, 284],
  [126, 324],
  [304, 236],
  [294, 284],
  [274, 324], // jaw
];
const MESH: [number, number][] = [
  [0, 8],
  [3, 11],
  [4, 14],
  [7, 17],
  [11, 20],
  [14, 20],
  [20, 21],
  [21, 22],
  [22, 23],
  [22, 25],
  [23, 26],
  [25, 30],
  [26, 34],
  [30, 37],
  [34, 35],
  [35, 36],
  [37, 38],
  [38, 39],
  [36, 32],
  [39, 30],
];

/**
 * Decorative hero artwork that previews the Studio layout. It contains no model
 * output: the bars are unlabeled shapes and the panel says so explicitly.
 */
export function HeroIllustration() {
  const gradient = useId();
  const glow = useId();
  return (
    <figure
      className="relative mx-auto w-full max-w-[560px]"
      aria-label="Illustration of the AI Studio analysis view"
    >
      <div className="panel relative overflow-hidden p-3 shadow-[0_40px_120px_-40px_rgb(79_124_255/0.45)]">
        <div className="flex items-center justify-between px-2 pb-3 pt-1">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse-soft rounded-full bg-brand-cyan" />
            <span className="font-mono text-[11px] tracking-wider text-fg-muted">STUDIO PREVIEW</span>
          </div>
          <span className="rounded-full border border-line-strong px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
            Illustration · not live output
          </span>
        </div>

        <div className="relative grid gap-3 sm:grid-cols-[1.35fr_1fr]">
          <div className="hud-corners relative aspect-[4/4.4] overflow-hidden rounded-xl bg-[radial-gradient(ellipse_at_50%_35%,#16224a_0%,#0b1020_70%)]">
            <svg viewBox="0 0 400 440" className="absolute inset-0 h-full w-full" aria-hidden="true">
              <defs>
                <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#7d97ff" />
                  <stop offset="1" stopColor="#c084fc" />
                </linearGradient>
                <radialGradient id={glow}>
                  <stop offset="0" stopColor="#4f7cff" stopOpacity="0.35" />
                  <stop offset="1" stopColor="#4f7cff" stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx="200" cy="220" r="190" fill={`url(#${glow})`} />
              <path
                d={CONTOUR}
                fill="none"
                stroke={`url(#${gradient})`}
                strokeWidth="1.5"
                strokeOpacity="0.7"
              />
              {MESH.map(([a, b]) => (
                <line
                  key={`${a}-${b}`}
                  x1={POINTS[a][0]}
                  y1={POINTS[a][1]}
                  x2={POINTS[b][0]}
                  y2={POINTS[b][1]}
                  stroke="#7d97ff"
                  strokeOpacity="0.25"
                />
              ))}
              {POINTS.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="2.6" fill="#eef1ff" fillOpacity={i % 3 === 0 ? 0.95 : 0.6} />
              ))}
              {/* Detection box */}
              <rect
                x="70"
                y="40"
                width="260"
                height="356"
                rx="6"
                fill="none"
                stroke="#4f7cff"
                strokeWidth="2"
              />
              <rect x="70" y="16" width="118" height="22" rx="4" fill="#3d5ce6" />
              <text x="80" y="31" fill="white" fontSize="12" fontFamily="JetBrains Mono, monospace">
                face · primary
              </text>
            </svg>
            <div
              aria-hidden="true"
              className="absolute inset-x-6 top-6 h-px animate-scan bg-gradient-to-r from-transparent via-brand-cyan to-transparent shadow-[0_0_16px_2px_rgb(34_211_238/0.6)] [--scan-distance:340px]"
            />
          </div>

          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-line bg-ink-900/80 p-4">
              <p className="eyebrow !text-[10px]">Expression</p>
              <div className="mt-3 h-6 w-28 rounded-md bg-gradient-to-r from-[#7d97ff] to-[#c084fc] opacity-80" />
              <div className="mt-2 h-2.5 w-20 rounded bg-white/10" />
            </div>
            <div className="flex-1 rounded-xl border border-line bg-ink-900/80 p-4">
              <p className="eyebrow !text-[10px]">Class scores</p>
              <div className="mt-3 space-y-2.5">
                {[78, 42, 30, 22, 14, 9].map((w, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="h-2 w-12 rounded bg-white/10" />
                    <div className="h-2 flex-1 rounded-full bg-white/[0.04]">
                      <div
                        className={`h-2 rounded-full ${i === 0 ? 'bg-brand-blue' : 'bg-white/20'}`}
                        style={{ width: `${w}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-line bg-ink-900/80 p-3 font-mono text-[11px] text-fg-muted">
              YuNet → EfficientNet-B0 → softmax
            </div>
          </div>
        </div>
      </div>
      <figcaption className="sr-only">
        Decorative illustration of the AI Studio. It does not show real predictions.
      </figcaption>
    </figure>
  );
}
