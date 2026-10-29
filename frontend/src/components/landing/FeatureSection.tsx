import { Activity, BarChart3, Gauge, ScanFace, ShieldCheck, SlidersHorizontal } from 'lucide-react';

import { SectionHeading } from './SectionHeading';

const FEATURES = [
  {
    icon: ScanFace,
    title: 'Live face detection',
    body: 'OpenCV YuNet locates every face in the frame. The largest is the primary subject, and up to three faces are analysed at once.',
  },
  {
    icon: Activity,
    title: 'Expression classification',
    body: 'An EfficientNet-B0 trained on AffectNet scores eight expression classes. You see the full probability distribution, not just a label.',
  },
  {
    icon: Gauge,
    title: 'Latency telemetry',
    body: 'Every response reports decode, detection and model time, plus the browser round trip, so performance is measured rather than assumed.',
  },
  {
    icon: BarChart3,
    title: 'Session analytics',
    body: 'Distribution, timeline and averages are computed only from frames you actually analysed, with the data scope labelled.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Tunable pipeline',
    body: 'Choose the camera, sampling interval and capture resolution. Requests never overlap, so a slow machine lowers the frame rate instead of queueing.',
  },
  {
    icon: ShieldCheck,
    title: 'Honest by design',
    body: 'Unsupported categories such as stress and tiredness are shown as "Not available". The app never invents a prediction.',
  },
];

export function FeatureSection() {
  return (
    <section aria-labelledby="features-heading" className="mx-auto max-w-[1200px] px-4 py-24 sm:px-6">
      <SectionHeading
        id="features-heading"
        eyebrow="Capabilities"
        title="Everything needed to read a face, nothing invented."
      >
        A complete computer-vision loop from webcam to insight, engineered for transparency.
      </SectionHeading>
      <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3 [&>*]:bg-ink-950">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <article key={title} className="group p-7 transition-colors hover:!bg-ink-900">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line-strong bg-white/[0.03] text-brand-blue transition group-hover:text-[#a48bff]">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="mt-5 text-lg font-semibold tracking-tight">{title}</h3>
            <p className="mt-2 text-sm text-fg-muted">{body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
