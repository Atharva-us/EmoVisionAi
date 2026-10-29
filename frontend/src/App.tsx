import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, RouterProvider, type RouteObject } from 'react-router';

import { LoadingState } from './components/common/States';
import { Layout } from './components/layout/Layout';
import { SessionProvider } from './context/SessionContext';
import { SettingsProvider } from './context/SettingsContext';
import LandingPage from './pages/LandingPage';

// Chart-heavy pages are split into their own chunks.
const StudioPage = lazy(() => import('./pages/StudioPage'));
const ModelLabPage = lazy(() => import('./pages/ModelLabPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const page = (element: ReactNode) => (
  <Suspense fallback={<LoadingState className="mx-auto max-w-[1200px] px-6 py-16" label="Loading page…" />}>
    {element}
  </Suspense>
);

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'studio', element: page(<StudioPage />) },
      { path: 'model-lab', element: page(<ModelLabPage />) },
      { path: 'settings', element: page(<SettingsPage />) },
      { path: '*', element: page(<NotFoundPage />) },
    ],
  },
];

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      <SessionProvider>{children}</SessionProvider>
    </SettingsProvider>
  );
}

const router = createBrowserRouter(routes);

export default function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
