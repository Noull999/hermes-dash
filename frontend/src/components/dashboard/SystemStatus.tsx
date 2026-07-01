'use client';

import { useEffect } from 'react';
import { useHermesStore } from '@/store/useHermesStore';
import { Cpu, Database, HardDrive } from 'lucide-react';
import NumberTicker from '@/components/ui/NumberTicker';

function Bar({ label, value, Icon }: { label: string; value: number; Icon: React.ElementType }) {
  const color =
    value > 90 ? 'var(--error)'
    : value > 70 ? 'var(--amber)'
    : 'var(--success)';

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <Icon size={10} className="text-[var(--text-faint)]" />
          <span className="hud-label text-[8px] text-[var(--text-muted)]">{label}</span>
        </div>
        <span className="hud-readout text-[10px]" style={{ color }}>
          <NumberTicker value={value} suffix="%" />
        </span>
      </div>
      <div className="h-2 bg-[rgba(255,45,85,0.06)] rounded-full overflow-hidden border border-[var(--hairline)]">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${Math.min(value, 100)}%`,
            background: color,
            boxShadow: `0 0 8px ${color}`,
          }}
        />
      </div>
    </div>
  );
}

export default function SystemStatus() {
  const { system, systemLoading, systemError, fetchSystem } = useHermesStore();

  useEffect(() => {
    if (!system && !systemLoading) fetchSystem();
    const interval = setInterval(fetchSystem, 10000);
    return () => clearInterval(interval);
  }, [system, systemLoading, fetchSystem]);

  if (systemError) return null;
  if (!system) return <div className="text-[10px] text-[var(--text-faint)]">Cargando sistema…</div>;

  return (
    <div className="space-y-2.5">
      <Bar label="CPU" value={system.cpu_pct} Icon={Cpu} />
      <Bar label="RAM" value={system.ram_pct} Icon={Database} />
      <Bar label="DISCO" value={system.disk_pct} Icon={HardDrive} />
    </div>
  );
}
