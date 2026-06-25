'use client';

import { classNames } from '@/lib/utils';

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'accent' | 'purple';
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

// Angular HUD chips: hairline border + low-alpha fill, mono uppercase text.
const variants = {
  default: 'border-[var(--hairline)] bg-[rgba(79,227,255,0.04)] text-[var(--text-muted)]',
  success: 'border-[rgba(93,255,176,0.3)] bg-[rgba(93,255,176,0.08)] text-[var(--success)]',
  warning: 'border-[rgba(255,177,61,0.3)] bg-[rgba(255,177,61,0.08)] text-[var(--amber)]',
  error: 'border-[rgba(255,93,108,0.3)] bg-[rgba(255,93,108,0.08)] text-[var(--error)]',
  accent: 'border-[var(--hairline-strong)] bg-[rgba(79,227,255,0.08)] text-[var(--cyan)]',
  purple: 'border-[rgba(255,177,61,0.3)] bg-[rgba(255,177,61,0.08)] text-[var(--amber)]',
};

const dotColors = {
  default: 'bg-[var(--text-muted)]',
  success: 'bg-[var(--success)] shadow-[0_0_6px_var(--success)]',
  warning: 'bg-[var(--amber)] shadow-[0_0_6px_var(--amber)]',
  error: 'bg-[var(--error)] shadow-[0_0_6px_var(--error)]',
  accent: 'bg-[var(--cyan)] shadow-[0_0_6px_var(--cyan)]',
  purple: 'bg-[var(--amber)] shadow-[0_0_6px_var(--amber)]',
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
        'inline-flex items-center gap-1.5 px-2.5 h-6 border rounded-[2px] text-[10px] font-medium tracking-[0.12em] uppercase font-mono',
        variants[variant],
        className
      )}
    >
      {dot && <span className={classNames('w-1.5 h-1.5 rounded-full', dotColors[variant])} />}
      {children}
    </span>
  );
}
