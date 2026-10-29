import { useCallback } from 'react';

import { PrivacyNotice } from '../components/common/PrivacyNotice';
import { BackendStatus } from '../components/studio/BackendStatus';
import { CameraPanel } from '../components/studio/CameraPanel';
import { ExpressionResult } from '../components/studio/ExpressionResult';
import { RequestedCategories } from '../components/studio/RequestedCategories';
import { SessionMetrics } from '../components/studio/SessionMetrics';
import { useSession } from '../context/SessionContext';
import { useSettings } from '../context/SettingsContext';
import { useApiResource } from '../hooks/useApiResource';
import { useCamera } from '../hooks/useCamera';
import { usePrediction } from '../hooks/usePrediction';
import { MODEL_LABELS } from '../lib/expressions';
import { api } from '../services/api';
import type { PredictionResponse } from '../types/api';

export default function StudioPage() {
  const { preferences, update } = useSettings();
  const { record } = useSession();
  const camera = useCamera();
  const modelInfo = useApiResource(api.modelInfo);
  const labels = modelInfo.data?.labels ?? MODEL_LABELS;

  const running = camera.status === 'active';
  const onResult = useCallback(
    (result: PredictionResponse, roundTripMs: number) => record(result, roundTripMs),
    [record],
  );
  const prediction = usePrediction({
    videoRef: camera.videoRef,
    enabled: running,
    intervalMs: preferences.intervalMs,
    captureWidth: preferences.captureWidth,
    jpegQuality: preferences.jpegQuality,
    onResult,
  });

  const { start } = camera;
  const handleStart = useCallback(
    () => void start(preferences.preferredDeviceId),
    [start, preferences.preferredDeviceId],
  );
  const handleSelectDevice = useCallback(
    (deviceId: string) => {
      update({ preferredDeviceId: deviceId || null });
      if (running) void start(deviceId || null);
    },
    [running, start, update],
  );

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Live inference</p>
          <h1 className="mt-2 text-4xl font-semibold">AI Studio</h1>
          <p className="mt-2 max-w-2xl text-fg-muted">
            Real-time facial expression analysis. Every number on this page comes from the model or from
            frames you analysed in this session.
          </p>
        </div>
        <BackendStatus />
      </header>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <div className="flex flex-col gap-5">
          <CameraPanel
            videoRef={camera.videoRef}
            status={camera.status}
            message={camera.message}
            devices={camera.devices}
            activeDeviceId={camera.activeDeviceId ?? preferences.preferredDeviceId}
            result={prediction.result}
            analysing={prediction.pending}
            mirrored={preferences.mirrorVideo}
            showOverlay={preferences.showOverlay}
            showAllFaces={preferences.showAllFaces}
            intervalMs={preferences.intervalMs}
            onStart={handleStart}
            onStop={camera.stop}
            onSelectDevice={handleSelectDevice}
            onToggleMirror={() => update({ mirrorVideo: !preferences.mirrorVideo })}
          />
          <PrivacyNotice compact />
        </div>
        <div className="flex flex-col gap-5">
          <ExpressionResult
            result={prediction.result}
            roundTripMs={prediction.roundTripMs}
            error={prediction.error}
            running={running}
            labels={labels}
          />
          <RequestedCategories categories={prediction.result?.requested_categories ?? null} />
        </div>
      </div>

      <div className="mt-5">
        <SessionMetrics labels={labels} />
      </div>
    </div>
  );
}
