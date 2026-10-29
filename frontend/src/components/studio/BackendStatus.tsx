import { useApiResource } from '../../hooks/useApiResource';
import { api } from '../../services/api';

/** Polls /health so the Studio can explain backend problems before the camera starts. */
export function BackendStatus() {
  const { data, error } = useApiResource(api.health, 10_000);
  const state = error ? 'offline' : !data ? 'checking' : data.model_loaded ? 'ready' : 'degraded';
  const styles = {
    ready: 'border-ok/40 text-ok',
    degraded: 'border-warn/40 text-warn',
    offline: 'border-err/40 text-err',
    checking: 'border-line-strong text-fg-muted',
  }[state];
  const text = {
    ready: `Backend ready · ${data?.device?.toUpperCase() ?? ''}`,
    degraded: 'Backend up · model not loaded',
    offline: 'Backend offline',
    checking: 'Checking backend…',
  }[state];

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <span
        role="status"
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${styles}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
        {text}
      </span>
      {state === 'offline' && (
        <p className="text-xs text-fg-subtle">
          Start it with <code className="font-mono">uvicorn app.main:app --port 8000</code> in{' '}
          <code className="font-mono">backend/</code>.
        </p>
      )}
      {state === 'degraded' && data?.message && <p className="text-xs text-fg-subtle">{data.message}</p>}
    </div>
  );
}
