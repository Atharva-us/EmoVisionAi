import { ArrowRight, Check } from 'lucide-react';
import { Link } from 'react-router';

const POINTS = ['No account or API key', 'Works offline after setup', 'Camera stops with one click'];

export function CtaSection() {
  return (
    <section aria-labelledby="cta-heading" className="mx-auto max-w-[1200px] px-4 py-24 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl border border-line-strong bg-ink-900 px-6 py-16 text-center sm:px-12">
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-0 h-64 w-[640px] -translate-x-1/2 rounded-full bg-[#5b5cff]/25 blur-[100px]"
        />
        <div className="relative">
          <h2 id="cta-heading" className="text-[clamp(2rem,4vw,3.25rem)] font-semibold">
            Open the studio. <span className="text-gradient">Start reading expressions.</span>
          </h2>
          <ul className="mx-auto mt-6 flex max-w-xl flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-fg-muted">
            {POINTS.map((point) => (
              <li key={point} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-ok" aria-hidden="true" />
                {point}
              </li>
            ))}
          </ul>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link
              to="/studio"
              className="bg-brand-gradient inline-flex items-center gap-2 rounded-full px-6 py-3 font-medium text-white shadow-[0_0_40px_-8px_rgb(124_92_246/0.8)] transition hover:brightness-110"
            >
              Launch AI Studio
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              to="/model-lab"
              className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-white/[0.03] px-6 py-3 font-medium text-fg transition hover:bg-white/[0.07]"
            >
              Inspect the model
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
