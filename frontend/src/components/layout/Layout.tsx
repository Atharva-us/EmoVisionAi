import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';

import { Footer } from './Footer';
import { Navbar } from './Navbar';

const TITLES: Record<string, string> = {
  '/': 'EmoVisionAI · See Beyond the Expression',
  '/studio': 'AI Studio · EmoVisionAI',
  '/model-lab': 'Model Lab · EmoVisionAI',
  '/settings': 'Settings · EmoVisionAI',
};

export function Layout() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    document.title = TITLES[pathname] ?? 'EmoVisionAI';
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0 });
    }
  }, [pathname, hash]);

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-ink-800 px-4 py-2 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      {/* Ambient depth: two soft glows and a fading grid. Decorative only. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[900px]">
        <div className="grid-backdrop absolute inset-0" />
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-[#3b5bff]/20 blur-[120px]" />
        <div className="absolute -right-40 top-20 h-[480px] w-[480px] rounded-full bg-[#8b5cf6]/18 blur-[120px]" />
      </div>
      <Navbar />
      <main id="main" className="relative z-10 flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
