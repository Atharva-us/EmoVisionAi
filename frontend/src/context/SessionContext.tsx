import { createContext, useContext, type ReactNode } from 'react';

import { useSessionAnalytics } from '../hooks/useSessionAnalytics';

type SessionContextValue = ReturnType<typeof useSessionAnalytics>;

const SessionContext = createContext<SessionContextValue | null>(null);

/** Keeps session analytics alive across page navigation (in memory only, never persisted). */
export function SessionProvider({ children }: { children: ReactNode }) {
  const session = useSessionAnalytics();
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used inside SessionProvider');
  return context;
}
