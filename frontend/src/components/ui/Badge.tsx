'use client';

import { classNames } from '@/lib/utils';

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'accent' | 'purple';
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const variants = {
  default: 'bg-[rgba(255,255,255,0.06)] text-[var(--text-muted)]',
  success: 'bg-[rgba(34,197,94,0.12)] text-[var(--success)]',
  warning: 'bg-[rgba(234,179,8,0.12)] text-[var(--warning)]',
  error: 'bg-[rgba(239,68,68,0.12)] text-[var(--error)]',
  accent: 'bg-[rgba(0,212,255,0.12)] text-[var(--accent)]',
  purple: 'bg-[rgba(139,92,246,0.12)] text-[var(--purple)]',
};

const dotColors = {
  default: 'bg-[var(--text-muted)]',
  success: 'bg-[var(--success)]',
  warning: 'bg-[var(--warning)]',
  error: 'bg-[var(--error)]',
  accent: 'bg-[var(--accent)]',
  purple: 'bg-[var(--purple)]',
};

export default function Badge({
  variant = 'default',
  children,
  className,
  dot = false,
}: BadgeProps) {
  return (
    <span
      className={classNames(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {dot && (
        <span
          className={classNames('w-1.5 h-1.5 rounded-full', dotColors[variant])}
        />
      )}
      {children}
    </span>
  );
}
