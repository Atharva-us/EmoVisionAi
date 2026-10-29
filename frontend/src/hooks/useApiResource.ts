import { useCallback, useEffect, useState } from 'react';

import { ApiError, isAbortError } from '../services/api';

export interface Resource<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  reload: () => void;
}

/** Load a resource once (and on reload), optionally polling. Aborts on unmount. */
export function useApiResource<T>(loader: (signal: AbortSignal) => Promise<T>, pollMs?: number): Resource<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = async () => {
      try {
        const value = await loader(controller.signal);
        setData(value);
        setError(null);
      } catch (err) {
        if (isAbortError(err)) return;
        setData(null);
        setError(err instanceof ApiError ? err : new ApiError('unknown', 'Request failed.'));
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          if (pollMs) timer = setTimeout(load, pollMs);
        }
      }
    };
    void load();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [loader, pollMs, version]);

  const reload = useCallback(() => {
    setLoading(true);
    setVersion((v) => v + 1);
  }, []);

  return { data, error, loading, reload };
}
