import { ArrowRight, Cpu, Lock, ScanFace } from 'lucide-react';
import { Link } from 'react-router';

import { HeroIllustration } from './HeroIllustration';

const BADGES = [
  { icon: Lock, label: 'Runs 100% locally' },
  { icon: ScanFace, label: '8 expression classes' },
  { icon: Cpu, label: 'Real-time on CPU' },
];

export function HeroSection() {
  return (
    <section className="mx-auto grid max-w-[1200px] items-center gap-14 px-4 pb-24 pt-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-24">
      <div className="animate-fade-up">
        <p className="eyebrow inline-flex items-center gap-2 rounded-full border border-line-strong bg-white/[0.03] px-3 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-cyan" />
          Computer vision · Deep learning
        </p>
        <h1 className="mt-6 text-[clamp(2.75rem,6vw,4.75rem)] font-semibold">
          See Beyond the <span className="text-gradient">Expression.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-fg-muted">
          EmoVisionAI detects faces in your live webcam feed and classifies their visible facial expressions
          with a pretrained EfficientNet model. You get the full class probabilities, latency telemetry and
          session analytics, all on your own machine.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/studio"
            className="bg-brand-gradient inline-flex items-center gap-2 rounded-full px-6 py-3 font-medium text-white shadow-[0_0_40px_-8px_rgb(124_92_246/0.8)] transition hover:brightness-110"
          >
            Launch AI Studio
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            to="/#technology"
            className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-white/[0.03] px-6 py-3 font-medium text-fg transition hover:bg-white/[0.07]"
          >
            Explore the Technology
          </Link>
        </div>
        <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-fg-muted">
          {BADGES.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-brand-blue" aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>
      </div>
      <div className="animate-fade-up [animation-delay:120ms]">
        <HeroIllustration />
      </div>
    </section>
  );
}
