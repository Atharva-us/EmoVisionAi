import { Camera, CameraOff, FlipHorizontal2, Loader2, Play, Square, UserX, Users } from 'lucide-react';
import { useState, type RefObject } from 'react';
import { Link } from 'react-router';

import type { CameraDevice, CameraStatus } from '../../hooks/useCamera';
import type { PredictionResponse } from '../../types/api';
import { ErrorState } from '../common/States';
import { DetectionOverlay } from './DetectionOverlay';

interface Props {
  videoRef: RefObject<HTMLVideoElement | null>;
  status: CameraStatus;
  message: string | null;
  devices: CameraDevice[];
  activeDeviceId: string | null;
  result: PredictionResponse | null;
  analysing: boolean;
  mirrored: boolean;
  showOverlay: boolean;
  showAllFaces: boolean;
  intervalMs: number;
  onStart: () => void;
  onStop: () => void;
  onSelectDevice: (deviceId: string) => void;
  onToggleMirror: () => void;
}

const STATUS_LABEL: Record<CameraStatus, string> = {
  idle: 'Camera off',
  requesting: 'Requesting access',
  active: 'Live',
  denied: 'Permission denied',
  'not-found': 'No camera',
  unsupported: 'Unsupported',
  error: 'Camera error',
};

export function CameraPanel(props: Props) {
  const { videoRef, status, message, devices, activeDeviceId, result, analysing, mirrored } = props;
  const [aspect, setAspect] = useState(16 / 9);
  const active = status === 'active';
  const failed =
    status === 'denied' || status === 'not-found' || status === 'unsupported' || status === 'error';

  return (
    <section aria-labelledby="camera-heading" className="panel flex flex-col p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 pb-3">
        <h2 id="camera-heading" className="text-base font-semibold tracking-tight">
          Camera workspace
        </h2>
        <span
          role="status"
          className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider ${
            active
              ? 'border-brand-cyan/40 text-brand-cyan'
              : failed
                ? 'border-err/40 text-err'
                : 'border-line-strong text-fg-muted'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${active ? 'animate-pulse-soft bg-brand-cyan' : failed ? 'bg-err' : 'bg-fg-subtle'}`}
          />
          {STATUS_LABEL[status]}
        </span>
      </div>

      <div
        className={`relative w-full overflow-hidden rounded-xl bg-ink-950 ${active ? 'hud-corners' : ''}`}
        style={{ aspectRatio: active ? aspect : 16 / 9 }}
      >
        <video
          ref={videoRef}
          muted
          autoPlay
          playsInline
          aria-label="Live camera preview"
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            if (v.videoWidth && v.videoHeight) setAspect(v.videoWidth / v.videoHeight);
          }}
          className={`absolute inset-0 h-full w-full object-contain ${active ? '' : 'invisible'}`}
          style={{ transform: mirrored ? 'scaleX(-1)' : undefined }}
        />

        {active && props.showOverlay && result?.face_detected && (
          <DetectionOverlay faces={result.faces} mirrored={mirrored} showAllFaces={props.showAllFaces} />
        )}

        {active && result && !result.face_detected && (
          <div className="absolute inset-x-0 bottom-4 flex justify-center">
            <p className="glass flex items-center gap-2 rounded-full px-4 py-2 text-sm text-fg">
              <UserX className="h-4 w-4 text-warn" aria-hidden="true" />
              No face detected. Face the camera in even lighting.
            </p>
          </div>
        )}
        {active && result && result.face_count > 1 && (
          <p className="glass absolute left-3 top-3 flex items-center gap-2 rounded-full px-3 py-1 text-xs text-fg">
            <Users className="h-3.5 w-3.5 text-[#a48bff]" aria-hidden="true" />
            {result.face_count} faces · primary = largest
          </p>
        )}
        {active && analysing && !result && (
          <p className="glass absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-sm text-fg-muted">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Analysing first frame…
          </p>
        )}

        {!active && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            {status === 'requesting' ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-brand-blue" aria-hidden="true" />
                <p className="text-sm text-fg-muted">
                  Waiting for camera permission. Check your browser&apos;s prompt.
                </p>
              </>
            ) : failed ? (
              <ErrorState
                className="max-w-md text-left"
                title={STATUS_LABEL[status]}
                message={message ?? 'The camera is unavailable.'}
                onRetry={props.onStart}
                retryLabel="Try again"
              />
            ) : (
              <>
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-line-strong bg-white/[0.03]">
                  <CameraOff className="h-7 w-7 text-fg-subtle" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-medium">The camera is off</p>
                  <p className="mt-1 max-w-sm text-sm text-fg-muted">
                    Start the camera to analyse your facial expression in real time. Frames stay on this
                    computer.
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 px-1 pt-4">
        {active || status === 'requesting' ? (
          <button
            type="button"
            onClick={props.onStop}
            className="inline-flex items-center gap-2 rounded-full border border-err/50 bg-err/10 px-4 py-2 text-sm font-medium text-fg transition hover:bg-err/20"
          >
            <Square className="h-4 w-4 fill-current text-err" aria-hidden="true" />
            Stop camera
          </button>
        ) : (
          <button
            type="button"
            onClick={props.onStart}
            className="bg-brand-gradient inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
          >
            <Play className="h-4 w-4 fill-current" aria-hidden="true" />
            Start camera
          </button>
        )}

        <label className="flex min-w-0 items-center gap-2 rounded-full border border-line-strong bg-ink-800 py-1 pl-3 pr-1 text-sm">
          <Camera className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden="true" />
          <span className="sr-only">Camera device</span>
          <select
            value={activeDeviceId ?? ''}
            onChange={(e) => props.onSelectDevice(e.target.value)}
            disabled={devices.length === 0}
            className="max-w-[180px] truncate rounded-full bg-transparent py-1 pr-2 text-fg-muted outline-none disabled:opacity-60"
          >
            {devices.length === 0 && <option value="">Default camera</option>}
            {devices.length > 0 && !activeDeviceId && <option value="">Choose camera</option>}
            {devices.map((d) => (
              <option key={d.deviceId || d.label} value={d.deviceId}>
                {d.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={props.onToggleMirror}
          aria-pressed={mirrored}
          className="inline-flex items-center gap-2 rounded-full border border-line-strong px-3 py-2 text-sm text-fg-muted transition hover:bg-white/[0.05] hover:text-fg"
        >
          <FlipHorizontal2 className="h-4 w-4" aria-hidden="true" />
          Mirror
        </button>

        <p className="ml-auto font-mono text-xs text-fg-subtle">
          1 frame / {props.intervalMs} ms ·{' '}
          <Link to="/settings" className="underline decoration-line-strong underline-offset-4 hover:text-fg">
            adjust
          </Link>
        </p>
      </div>
    </section>
  );
}
