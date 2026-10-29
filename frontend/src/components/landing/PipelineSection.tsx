import { Brain, Camera, Crop, FileImage, LineChart } from 'lucide-react';

import { SectionHeading } from './SectionHeading';

const STEPS = [
  {
    icon: Camera,
    title: 'Capture',
    detail: 'The browser samples one frame every ~700 ms, downscales it to 640 px and encodes it as JPEG.',
    tech: 'getUserMedia · Canvas',
  },
  {
    icon: FileImage,
    title: 'Validate',
    detail: 'FastAPI checks the type, size (2 MB cap) and dimensions, then decodes the frame in memory.',
    tech: 'FastAPI · Pydantic',
  },
  {
    icon: Crop,
    title: 'Detect',
    detail: 'YuNet finds faces. Boxes are clipped, filtered by size and ordered largest first.',
    tech: 'OpenCV YuNet',
  },
  {
    icon: Brain,
    title: 'Classify',
    detail:
      'Each crop is resized to 224×224, normalised with ImageNet statistics and scored by EfficientNet-B0.',
    tech: 'PyTorch · timm',
  },
  {
    icon: LineChart,
    title: 'Visualise',
    detail: 'React draws the boxes, the eight class probabilities and live session analytics.',
    tech: 'React · Recharts',
  },
];

export function PipelineSection() {
  return (
    <section
      id="technology"
      aria-labelledby="technology-heading"
      className="scroll-mt-20 border-y border-line bg-ink-900/40"
    >
      <div className="mx-auto max-w-[1200px] px-4 py-24 sm:px-6">
        <SectionHeading
          id="technology-heading"
          eyebrow="Technology"
          title="A five-stage computer-vision pipeline."
        >
          Each stage has one responsibility and is tested on its own. Model inference never runs inside a
          route handler, and the models load once at startup.
        </SectionHeading>
        <ol className="relative mt-14 grid gap-4 md:grid-cols-5">
          <div
            aria-hidden="true"
            className="absolute left-0 right-0 top-[38px] hidden h-px bg-gradient-to-r from-transparent via-line-strong to-transparent md:block"
          />
          {STEPS.map(({ icon: Icon, title, detail, tech }, index) => (
            <li key={title} className="relative">
              <div className="relative z-10 flex h-[76px] w-[76px] items-center justify-center rounded-2xl border border-line-strong bg-ink-900 shadow-[0_0_40px_-12px_rgb(79_124_255/0.6)]">
                <Icon className="h-7 w-7 text-brand-blue" aria-hidden="true" />
              </div>
              <p className="mt-5 font-mono text-xs text-fg-subtle">0{index + 1}</p>
              <h3 className="mt-1 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-fg-muted">{detail}</p>
              <p className="mt-3 font-mono text-[11px] text-[#a48bff]">{tech}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
