'use client';

import { classNames } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  className?: string;
  height?: number;
  showLabel?: boolean;
}

export default function ProgressBar({
  value,
  max = 100,
  color = 'var(--accent)',
  className,
  height = 6,
  showLabel = false,
}: ProgressBarProps) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={classNames('flex items-center gap-2', className)}>
      <div
        className="flex-1 rounded-full overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.06)',
          height: `${height}px`,
        }}
      >
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${pct}%`,
            background: color,
            boxShadow: `0 0 8px ${color}40`,
          }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-[var(--text-muted)] min-w-[40px] text-right">
          {Math.round(pct)}%
        </span>
      )}
    </div>
  );
}
