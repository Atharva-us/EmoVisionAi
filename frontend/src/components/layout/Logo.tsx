import { useId } from 'react';

export function LogoMark({ className = 'h-7 w-7' }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6d8bff" />
          <stop offset="1" stopColor="#c084fc" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="#0b1020" stroke="rgb(148 163 255 / 0.2)" />
      <path
        d="M7 11V8a1 1 0 0 1 1-1h3M21 7h3a1 1 0 0 1 1 1v3M25 21v3a1 1 0 0 1-1 1h-3M11 25H8a1 1 0 0 1-1-1v-3"
        stroke={`url(#${id})`}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="16" cy="16" r="5" fill="none" stroke={`url(#${id})`} strokeWidth="2" />
      <circle cx="16" cy="16" r="1.8" fill="#eef1ff" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="font-display text-[17px] font-semibold tracking-tight text-fg">
        EmoVision<span className="text-gradient">AI</span>
      </span>
    </span>
  );
}
