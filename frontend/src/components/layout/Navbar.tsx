import { Menu, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';

import { Wordmark } from './Logo';

const LINKS = [
  { to: '/studio', label: 'AI Studio' },
  { to: '/model-lab', label: 'Model Lab' },
  { to: '/settings', label: 'Settings' },
];

function navClass({ isActive }: { isActive: boolean }) {
  return `rounded-lg px-3 py-2 text-sm transition-colors ${
    isActive ? 'text-fg bg-white/[0.06]' : 'text-fg-muted hover:text-fg hover:bg-white/[0.04]'
  }`;
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const [prevPath, setPrevPath] = useState(location.pathname);
  if (prevPath !== location.pathname) {
    // Close the mobile menu after navigation (state adjustment during render, no effect needed).
    setPrevPath(location.pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className="glass sticky top-0 z-40 border-x-0 border-t-0">
      <nav
        aria-label="Main"
        className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 sm:px-6"
      >
        <Link to="/" aria-label="EmoVisionAI home" className="rounded-lg">
          <Wordmark />
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} className={navClass}>
              {link.label}
            </NavLink>
          ))}
          <Link
            to="/#technology"
            className="rounded-lg px-3 py-2 text-sm text-fg-muted hover:bg-white/[0.04] hover:text-fg"
          >
            Technology
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/studio"
            className="bg-brand-gradient hidden items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white shadow-[0_0_24px_-6px_rgb(124_92_246/0.7)] transition hover:brightness-110 sm:inline-flex"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Launch AI Studio
          </Link>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-fg-muted hover:bg-white/[0.06] hover:text-fg md:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <div id="mobile-menu" className="border-t border-line px-4 pb-4 pt-2 md:hidden">
          <div className="flex flex-col gap-1">
            {LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} className={navClass}>
                {link.label}
              </NavLink>
            ))}
            <Link to="/#technology" className="rounded-lg px-3 py-2 text-sm text-fg-muted hover:text-fg">
              Technology
            </Link>
            <Link
              to="/studio"
              className="bg-brand-gradient mt-2 inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-white"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Launch AI Studio
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
