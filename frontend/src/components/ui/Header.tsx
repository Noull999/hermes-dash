'use client';

import { useEffect, useState, startTransition } from 'react';
import { Zap, TrendingUp } from 'lucide-react';
import { getStreakDays, updateStreak } from '@/lib/utils';

export default function Header() {
  const [time, setTime] = useState('');
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    startTransition(() => setStreak(updateStreak()));
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('es-CL', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 py-3 px-4 flex items-center justify-between bg-[var(--bg)]/80 backdrop-blur-lg border-b border-[rgba(255,255,255,0.04)]">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-[var(--accent)]/20 flex items-center justify-center">
          <span className="text-xs font-bold text-[var(--accent)]">H</span>
        </div>
        <span className="text-sm font-semibold text-[var(--text)]">Hermes</span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-[var(--text-muted)] font-mono">{time}</span>

        {streak > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[rgba(234,179,8,0.1)] border border-[rgba(234,179,8,0.15)]">
            <Zap size={12} className="text-[var(--warning)]" />
            <span className="text-xs font-semibold text-[var(--warning)]">{streak}</span>
            <TrendingUp size={10} className="text-[var(--warning)]" />
          </div>
        )}
      </div>
    </header>
  );
}
