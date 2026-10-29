import { ShieldCheck } from 'lucide-react';

export function PrivacyNotice({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="flex items-start gap-2 text-xs text-fg-subtle">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ok" aria-hidden="true" />
        Frames go only to your local backend, are analysed in memory and are never saved. Scores describe
        visible expressions, not feelings.
      </p>
    );
  }
  return (
    <section aria-labelledby="privacy-heading" className="panel p-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-ok" aria-hidden="true" />
        <h2 id="privacy-heading" className="text-lg font-semibold">
          Privacy and responsible use
        </h2>
      </div>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-fg-muted">
        <li>
          The camera feed stays in your browser. Only sampled, downscaled JPEG frames are sent to the FastAPI
          backend on this computer (127.0.0.1). Nothing is sent to the internet.
        </li>
        <li>Frames are processed in memory and discarded. No images or recordings are stored or logged.</li>
        <li>Session analytics live in browser memory and disappear when you reset or close the tab.</li>
        <li>Only display preferences are saved, in this browser&apos;s local storage.</li>
        <li>
          Predictions describe visible facial expressions. They are not ground truth about anyone&apos;s
          feelings and must not be used for medical, employment, educational, disciplinary or other
          consequential decisions.
        </li>
      </ul>
    </section>
  );
}
