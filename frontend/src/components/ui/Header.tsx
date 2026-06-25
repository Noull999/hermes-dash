'use client';

import { useEffect, useState, startTransition } from 'react';
import { Flame } from 'lucide-react';
import { updateStreak } from '@/lib/utils';
import { useHermesStore } from '@/store/useHermesStore';

export default function Header() {
  const [time, setTime] = useState('--:--');
  const [streak, setStreak] = useState(0);
  const health = useHermesStore((s) => s.health);
  const online = health?.status === 'ok';

  useEffect(() => {
    startTransition(() => setStreak(updateStreak()));
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('es-CL', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 h-14 px-4 flex items-center justify-between bg-[var(--void)]/80 backdrop-blur-xl border-b border-[var(--hairline)]">
      {/* Arc-reactor mark + wordmark */}
      <div className="flex items-center gap-2.5">
        <div className="relative w-7 h-7 flex items-center justify-center">
          <span className="absolute inset-0 rounded-full border border-[var(--hairline-strong)] reticle" />
          <span className="absolute inset-[5px] rounded-full bg-[var(--cyan)]/15 pulse-glow" />
          <span className="absolute inset-[10px] rounded-full bg-[var(--cyan)] shadow-[0_0_10px_var(--cyan)]" />
        </div>
        <div className="leading-none">
          <div className="text-sm font-semibold tracking-[0.28em] text-[var(--text)]">HERMES</div>
          <div className="hud-label text-[8px] mt-0.5">COMMAND&nbsp;HUD</div>
        </div>
      </div>

      {/* Telemetry */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-[var(--success)] shadow-[0_0_8px_var(--success)]' : 'bg-[var(--error)] shadow-[0_0_8px_var(--error)]'}`}
          />
          <span className="hud-label text-[9px]">{online ? 'ONLINE' : 'OFFLINE'}</span>
        </div>

        <span className="hud-readout text-xs text-[var(--cyan-bright)] tabular-nums">{time}</span>

        {streak > 0 && (
          <div className="flex items-center gap-1 px-2 h-6 border border-[rgba(255,177,61,0.25)] bg-[rgba(255,177,61,0.08)]">
            <Flame size={11} className="text-[var(--amber)]" />
            <span className="hud-readout text-xs glow-amber">{streak}</span>
          </div>
        )}
      </div>
    </header>
  );
}
