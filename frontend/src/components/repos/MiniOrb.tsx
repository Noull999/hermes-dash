'use client';

import { classNames } from '@/lib/utils';

interface MiniOrbProps {
  status: string;
  size?: number;
  pulse?: boolean;
}

const statusColors: Record<string, { bg: string; shadow: string }> = {
  synced: { bg: 'bg-[var(--success)]', shadow: 'rgba(93,255,176,0.5)' },
  behind: { bg: 'bg-[var(--warning)]', shadow: 'rgba(255,177,61,0.5)' },
  ahead: { bg: 'bg-[var(--accent)]', shadow: 'rgba(79,227,255,0.5)' },
  error: { bg: 'bg-[var(--error)]', shadow: 'rgba(255,93,108,0.5)' },
  unknown: { bg: 'bg-[var(--text-muted)]', shadow: 'rgba(111,138,153,0.5)' },
};

export default function MiniOrb({ status, size = 8, pulse = false }: MiniOrbProps) {
  const colors = statusColors[status] || statusColors.unknown;

  return (
    <div
      className={classNames(
        'rounded-full flex-shrink-0',
        colors.bg,
        pulse && 'animate-pulse'
      )}
      style={{
        width: size,
        height: size,
        boxShadow: `0 0 ${size}px ${colors.shadow}`,
      }}
      title={status}
    />
  );
}
