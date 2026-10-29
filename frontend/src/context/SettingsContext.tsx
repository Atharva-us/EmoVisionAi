import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/** Harmless display/capture preferences. The only data EmoVisionAI persists. */
export interface Preferences {
  preferredDeviceId: string | null;
  intervalMs: number;
  captureWidth: number;
  jpegQuality: number;
  mirrorVideo: boolean;
  showOverlay: boolean;
  showAllFaces: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  preferredDeviceId: null,
  intervalMs: 700,
  captureWidth: 640,
  jpegQuality: 0.8,
  mirrorVideo: true,
  showOverlay: true,
  showAllFaces: true,
};

export const INTERVAL_RANGE = { min: 250, max: 2000, step: 50 } as const;
export const CAPTURE_WIDTHS = [480, 640, 800] as const;
export const STORAGE_KEY = 'emovision.preferences.v1';

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

/** Parse untrusted localStorage content into valid preferences. */
export function sanitizePreferences(raw: unknown): Preferences {
  const d = DEFAULT_PREFERENCES;
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Record<string, unknown>;
  const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
  return {
    preferredDeviceId: typeof r.preferredDeviceId === 'string' ? r.preferredDeviceId : null,
    intervalMs: clamp(r.intervalMs, INTERVAL_RANGE.min, INTERVAL_RANGE.max, d.intervalMs),
    captureWidth: CAPTURE_WIDTHS.includes(r.captureWidth as (typeof CAPTURE_WIDTHS)[number])
      ? (r.captureWidth as number)
      : d.captureWidth,
    jpegQuality: clamp(r.jpegQuality, 0.5, 0.95, d.jpegQuality),
    mirrorVideo: bool(r.mirrorVideo, d.mirrorVideo),
    showOverlay: bool(r.showOverlay, d.showOverlay),
    showAllFaces: bool(r.showAllFaces, d.showAllFaces),
  };
}

function load(): Preferences {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? sanitizePreferences(JSON.parse(stored)) : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function save(preferences: Preferences) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    /* storage unavailable (private mode); preferences still apply for this visit */
  }
}

interface SettingsContextValue {
  preferences: Preferences;
  update: (patch: Partial<Preferences>) => void;
  clearSaved: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>(load);

  const update = useCallback((patch: Partial<Preferences>) => {
    setPreferences((current) => {
      const next = sanitizePreferences({ ...current, ...patch });
      save(next);
      return next;
    });
  }, []);

  const clearSaved = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setPreferences(DEFAULT_PREFERENCES);
  }, []);

  const value = useMemo(() => ({ preferences, update, clearSaved }), [preferences, update, clearSaved]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used inside SettingsProvider');
  return context;
}
