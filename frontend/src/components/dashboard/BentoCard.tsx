'use client';

import { ReactNode } from 'react';

interface BentoCardProps {
  colSpan?: 1 | 2 | 3 | 4;
  rowSpan?: 1 | 2;
  title?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export default function BentoCard({
  colSpan = 1,
  rowSpan = 1,
  title,
  icon,
  children,
  className = '',
  loading,
  error,
  onRetry,
}: BentoCardProps) {
  const style: React.CSSProperties = {
    gridColumn: `span ${colSpan}`,
    gridRow: `span ${rowSpan}`,
  };

  return (
    <div
      style={style}
      className={`glass rounded-2xl p-4 border border-[var(--hairline)] transition-all duration-200 hover:border-[rgba(255,45,85,0.2)] hover:shadow-[0_0_18px_rgba(255,45,85,0.08)] stagger-card ${className}`}
    >
      {error && (
        <div className="flex flex-col items-center justify-center h-full min-h-[60px] gap-2">
          <span className="text-[10px] text-[var(--error)] text-center">{error}</span>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-[9px] px-2 py-1 border border-[var(--hairline)] rounded text-[var(--text-faint)] hover:text-[var(--text-muted)]"
            >
              REINTENTAR
            </button>
          )}
        </div>
      )}
      {loading && !error && (
        <div className="space-y-3">
          {title && <div className="skeleton h-3 w-24" />}
          <div className="skeleton h-12 w-full" />
        </div>
      )}
      {!loading && !error && (
        <>
          {title && (
            <div className="flex items-center gap-2 mb-3">
              {icon && <span className="text-[var(--text-faint)]">{icon}</span>}
              <span className="hud-label text-[8px] text-[var(--text-faint)] tracking-wider">
                {title.toUpperCase()}
              </span>
            </div>
          )}
          {children}
        </>
      )}
    </div>
  );
}
