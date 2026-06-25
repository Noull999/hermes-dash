'use client';

import Card from '@/components/ui/Card';
import { useHermesStore } from '@/store/useHermesStore';
import { Cpu, Database, HardDrive, Clock, RefreshCw } from 'lucide-react';
import { useEffect } from 'react';

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  if (d > 0) return `${d}d ${h}h`;
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function SystemCard() {
  const { system, systemLoading, systemError, fetchSystem } = useHermesStore();

  useEffect(() => {
    if (!system && !systemLoading) fetchSystem();
  }, [system, systemLoading, fetchSystem]);

  if (systemLoading && !system) {
    return (
      <Card>
        <div className="space-y-3">
          <div className="skeleton h-4 w-28" />
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-14" />)}
          </div>
        </div>
      </Card>
    );
  }

  if (systemError) {
    return (
      <Card>
        <div className="flex items-center justify-between">
          <span className="hud-label text-[var(--error)]">ERR · {systemError}</span>
          <button onClick={fetchSystem} className="p-1.5 border border-[var(--hairline)] hover:border-[var(--hairline-strong)]">
            <RefreshCw size={13} className="text-[var(--cyan)]" />
          </button>
        </div>
      </Card>
    );
  }

  if (!system) return null;

  const online = system.gateway === 'online';
  const metrics = [
    { Icon: Cpu, label: 'CPU', val: system.cpu_pct, unit: '%', warn: 85 },
    { Icon: Database, label: 'RAM', val: system.ram_pct, unit: '%', warn: 85 },
    { Icon: HardDrive, label: 'DISCO', val: system.disk_pct, unit: '%', warn: 85 },
  ];

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Cpu size={14} className="text-[var(--cyan)]" />
          <h3 className="hud-label text-[10px] text-[var(--text)]">SISTEMA · VPS</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 h-5 border rounded-[2px] text-[9px] font-mono tracking-[0.14em]"
            style={{
              borderColor: online ? 'rgba(93,255,176,0.3)' : 'rgba(255,93,108,0.3)',
              color: online ? 'var(--success)' : 'var(--error)',
            }}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {online ? 'ONLINE' : 'OFFLINE'}
          </span>
          <button onClick={fetchSystem} className="p-1 hover:bg-[rgba(79,227,255,0.08)] transition-colors">
            <RefreshCw size={12} className="text-[var(--text-muted)]" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {metrics.map(({ Icon, label, val, unit, warn }) => {
          const over = val > warn;
          const color = over ? 'var(--error)' : 'var(--cyan)';
          return (
            <div key={label} className="border border-[var(--hairline)] px-2.5 py-2 bg-[rgba(79,227,255,0.02)]">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Icon size={11} className="text-[var(--text-faint)]" />
                <span className="hud-label text-[8px]">{label}</span>
              </div>
              <span className="hud-readout text-base font-bold text-[var(--text)]">
                {val.toFixed(0)}<span className="text-[var(--text-muted)] text-xs">{unit}</span>
              </span>
              <div className="mt-1.5 h-[3px] bg-[rgba(79,227,255,0.08)] overflow-hidden">
                <div className="h-full transition-all duration-700"
                  style={{ width: `${Math.min(val, 100)}%`, background: color, boxShadow: `0 0 6px ${color}` }} />
              </div>
            </div>
          );
        })}

        {/* uptime */}
        <div className="border border-[var(--hairline)] px-2.5 py-2 bg-[rgba(79,227,255,0.02)]">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Clock size={11} className="text-[var(--text-faint)]" />
            <span className="hud-label text-[8px]">UPTIME</span>
          </div>
          <span className="hud-readout text-base font-bold text-[var(--text)]">
            {formatUptime(system.uptime)}
          </span>
          <div className="hud-label text-[7px] mt-1.5">GATEWAY</div>
        </div>
      </div>
    </Card>
  );
}
