import { Check, RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useId, useState, type ReactNode } from 'react';

import { PrivacyNotice } from '../components/common/PrivacyNotice';
import { useSession } from '../context/SessionContext';
import { CAPTURE_WIDTHS, INTERVAL_RANGE, useSettings } from '../context/SettingsContext';

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-6 py-4">
      <div>
        <label htmlFor={id} className="font-medium">
          {label}
        </label>
        <p id={`${id}-desc`} className="text-sm text-fg-muted">
          {description}
        </p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={`${id}-desc`}
        onClick={() => onChange(!checked)}
        className={`relative mt-1 h-6 w-11 shrink-0 rounded-full border transition-colors ${
          checked ? 'border-brand-blue bg-brand-blue' : 'border-line-strong bg-ink-800'
        }`}
      >
        <span
          className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white transition-transform ${
            checked ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="panel p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
      <div className="mt-2">{children}</div>
    </section>
  );
}

type CameraOption = { deviceId: string; label: string };

export default function SettingsPage() {
  const { preferences, update, clearSaved } = useSettings();
  const { summary, reset } = useSession();
  const [cameras, setCameras] = useState<CameraOption[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const intervalId = useId();
  const widthId = useId();
  const cameraId = useId();

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      ?.enumerateDevices?.()
      .then((all) => {
        if (cancelled) return;
        setCameras(
          all
            .filter((d) => d.kind === 'videoinput')
            .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Camera ${i + 1}` })),
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  const fps = (1000 / preferences.intervalMs).toFixed(1);

  return (
    <div className="mx-auto max-w-[900px] px-4 py-10 sm:px-6">
      <header>
        <p className="eyebrow">Preferences</p>
        <h1 className="mt-2 text-4xl font-semibold">Settings</h1>
        <p className="mt-2 text-fg-muted">
          Preferences are saved in this browser only. Session data is never saved.
        </p>
      </header>

      <p role="status" aria-live="polite" className="mt-4 min-h-6 text-sm text-ok">
        {notice && (
          <span className="inline-flex items-center gap-1.5">
            <Check className="h-4 w-4" aria-hidden="true" />
            {notice}
          </span>
        )}
      </p>

      <div className="mt-2 flex flex-col gap-5">
        <Card
          title="Camera"
          description="Device names appear after you grant camera permission once in the AI Studio."
        >
          <label htmlFor={cameraId} className="mt-3 block text-sm font-medium">
            Preferred camera
          </label>
          <select
            id={cameraId}
            value={preferences.preferredDeviceId ?? ''}
            onChange={(e) => update({ preferredDeviceId: e.target.value || null })}
            className="mt-2 w-full rounded-lg border border-line-strong bg-ink-800 px-3 py-2 text-sm"
          >
            <option value="">System default</option>
            {cameras.map((c) => (
              <option key={c.deviceId || c.label} value={c.deviceId}>
                {c.label}
              </option>
            ))}
          </select>
        </Card>

        <Card title="Inference" description="How often frames are sent to the backend, and at what size.">
          <div className="py-3">
            <div className="flex items-center justify-between">
              <label htmlFor={intervalId} className="text-sm font-medium">
                Sampling interval
              </label>
              <span className="tabular font-mono text-sm text-fg-muted">
                {preferences.intervalMs} ms · up to {fps} fps
              </span>
            </div>
            <input
              id={intervalId}
              type="range"
              min={INTERVAL_RANGE.min}
              max={INTERVAL_RANGE.max}
              step={INTERVAL_RANGE.step}
              value={preferences.intervalMs}
              onChange={(e) => update({ intervalMs: Number(e.target.value) })}
              className="mt-3 w-full accent-brand-blue"
            />
            <p className="mt-1 text-xs text-fg-subtle">
              Requests never overlap, so the real rate is limited by backend latency on your hardware.
            </p>
          </div>
          <div className="border-t border-line py-3">
            <label htmlFor={widthId} className="text-sm font-medium">
              Capture width
            </label>
            <select
              id={widthId}
              value={preferences.captureWidth}
              onChange={(e) => update({ captureWidth: Number(e.target.value) })}
              className="mt-2 w-full rounded-lg border border-line-strong bg-ink-800 px-3 py-2 text-sm"
            >
              {CAPTURE_WIDTHS.map((w) => (
                <option key={w} value={w}>
                  {w} px{' '}
                  {w === 640
                    ? '(recommended)'
                    : w < 640
                      ? '(faster, small faces may be missed)'
                      : '(slower upload)'}
                </option>
              ))}
            </select>
          </div>
        </Card>

        <Card title="Display">
          <div className="divide-y divide-line">
            <Toggle
              label="Mirror preview"
              description="Flip the preview like a mirror. Frames sent for analysis are never flipped."
              checked={preferences.mirrorVideo}
              onChange={(v) => update({ mirrorVideo: v })}
            />
            <Toggle
              label="Show face boxes"
              description="Draw detection boxes and labels over the video."
              checked={preferences.showOverlay}
              onChange={(v) => update({ showOverlay: v })}
            />
            <Toggle
              label="Show all faces"
              description="Box every analysed face, not only the primary (largest) one."
              checked={preferences.showAllFaces}
              onChange={(v) => update({ showAllFaces: v })}
            />
          </div>
        </Card>

        <Card title="Session and data" description="Clear analytics or saved preferences at any time.">
          <div className="flex flex-col gap-3 py-3 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                reset();
                setNotice('Session analytics cleared.');
              }}
              disabled={!summary.frames}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-line-strong px-4 py-2 text-sm hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Reset session ({summary.frames} frames)
            </button>
            <button
              type="button"
              onClick={() => {
                clearSaved();
                setNotice('Saved preferences cleared. Defaults restored.');
              }}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-err/40 px-4 py-2 text-sm text-fg hover:bg-err/10"
            >
              <Trash2 className="h-4 w-4 text-err" aria-hidden="true" />
              Clear saved preferences
            </button>
          </div>
        </Card>

        <PrivacyNotice />
      </div>
    </div>
  );
}
