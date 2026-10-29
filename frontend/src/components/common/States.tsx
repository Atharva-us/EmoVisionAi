import { AlertTriangle, Loader2, RotateCcw } from 'lucide-react';
import type { ReactNode } from 'react';

export function LoadingState({ label = 'Loading…', className = '' }: { label?: string; className?: string }) {
  return (
    <div role="status" className={`flex items-center gap-3 text-sm text-fg-muted ${className}`}>
      <Loader2 className="h-4 w-4 animate-spin text-brand-blue" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

interface ErrorStateProps {
  title: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  children?: ReactNode;
  className?: string;
}

export function ErrorState({
  title,
  message,
  onRetry,
  retryLabel = 'Retry',
  children,
  className = '',
}: ErrorStateProps) {
  return (
    <div role="alert" className={`rounded-xl border border-err/30 bg-err/[0.06] p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-err" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-fg">{title}</p>
          <p className="mt-1 text-sm text-fg-muted">{message}</p>
          {children}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-line-strong px-3 py-1.5 text-sm text-fg hover:bg-white/[0.05]"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              {retryLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mb-4 text-fg-subtle">{icon}</div>
      <p className="font-medium text-fg">{title}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-fg-muted">{children}</div>}
    </div>
  );
}
