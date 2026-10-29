import { Ban, CircleOff, Eye, HardDrive } from 'lucide-react';

import { SectionHeading } from './SectionHeading';

const POINTS = [
  {
    icon: Eye,
    title: 'Expressions, not emotions',
    body: 'A face can smile without happiness and frown without anger. Scores describe visible facial configuration only.',
  },
  {
    icon: CircleOff,
    title: 'Stress and tiredness: not available',
    body: 'No validated model or labelled evaluation data for these states is included, so the app reports them as unsupported instead of guessing.',
  },
  {
    icon: HardDrive,
    title: 'Local and ephemeral',
    body: 'Frames go only to the backend on 127.0.0.1, are processed in memory and are discarded. Nothing is recorded or uploaded.',
  },
  {
    icon: Ban,
    title: 'No consequential decisions',
    body: 'Not for hiring, medical, educational, security or disciplinary use. Accuracy varies with lighting, pose, age and demographics.',
  },
];

export function ResponsibleAISection() {
  return (
    <section
      id="responsible-ai"
      aria-labelledby="responsible-heading"
      className="scroll-mt-20 border-y border-line bg-ink-900/40"
    >
      <div className="mx-auto grid max-w-[1200px] gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_1.4fr]">
        <SectionHeading
          id="responsible-heading"
          eyebrow="Limitations & responsible AI"
          title="Know what the model cannot see."
        >
          Facial-expression recognition is useful for interaction research and demos. It is also easy to
          over-interpret, so the limits are part of the product.
        </SectionHeading>
        <ul className="grid gap-4 sm:grid-cols-2">
          {POINTS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="panel p-6">
              <Icon className="h-5 w-5 text-warn" aria-hidden="true" />
              <h3 className="mt-4 font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 text-sm text-fg-muted">{body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
