'use client';

import { classNames } from '@/lib/utils';

interface MiniOrbProps {
  status: 'synced' | 'behind' | 'ahead' | 'error';
  size?: number;
  pulse?: boolean;
}

const statusColors = {
  synced: { bg: 'bg-[var(--success)]', shadow: 'rgba(34,197,94,0.5)' },
  behind: { bg: 'bg-[var(--warning)]', shadow: 'rgba(234,179,8,0.5)' },
  ahead: { bg: 'bg-[var(--accent)]', shadow: 'rgba(0,212,255,0.5)' },
  error: { bg: 'bg-[var(--error)]', shadow: 'rgba(239,68,68,0.5)' },
};

export default function MiniOrb({ status, size = 8, pulse = false }: MiniOrbProps) {
  const colors = statusColors[status] || statusColors.error;

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
