'use client';

import Card from '@/components/ui/Card';
import ProgressBar from '@/components/ui/ProgressBar';
import Badge from '@/components/ui/Badge';
import { useHermesStore } from '@/store/useHermesStore';
import { Cpu, Memory, HardDrive, Clock, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useEffect } from 'react';

export default function SystemCard() {
  const { system, systemLoading, systemError, fetchSystem } = useHermesStore();

  useEffect(() => {
    if (!system && !systemLoading) fetchSystem();
  }, [system, systemLoading, fetchSystem]);

  if (systemLoading && !system) {
    return (
      <Card>
        <div className="space-y-3">
          <div className="skeleton h-5 w-28" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-16" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (systemError) {
    return (
      <Card>
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--error)]">Error: {systemError}</span>
          <button onClick={fetchSystem} className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.06)]">
            <RefreshCw size={14} className="text-[var(--accent)]" />
          </button>
        </div>
      </Card>
    );
  }

  if (!system) return null;

  const days = Math.floor(system.uptime_hours / 24);
  const hours = Math.floor(system.uptime_hours % 24);

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Cpu size={16} className="text-[var(--purple)]" />
          <h3 className="text-sm font-semibold text-[var(--text)]">Sistema</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={system.gateway_status === 'online' ? 'success' : 'error'}
            dot
          >
            {system.gateway_status}
          </Badge>
          <button onClick={fetchSystem} className="p-1 rounded-lg hover:bg-[rgba(255,255,255,0.06)] transition-colors">
            <RefreshCw size={12} className="text-[var(--text-muted)]" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* CPU */}
        <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]">
          <div className="flex items-center gap-1.5 mb-2">
            <Cpu size={12} className="text-[var(--accent)]" />
            <span className="text-[10px] text-[var(--text-muted)] uppercase">CPU</span>
          </div>
          <span className="text-lg font-bold text-[var(--text)]">{system.cpu_percent}%</span>
          <ProgressBar value={system.cpu_percent} className="mt-1" height={3} />
        </div>

        {/* RAM */}
        <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]">
          <div className="flex items-center gap-1.5 mb-2">
            <Memory size={12} className="text-[var(--purple)]" />
            <span className="text-[10px] text-[var(--text-muted)] uppercase">RAM</span>
          </div>
          <span className="text-lg font-bold text-[var(--text)]">{system.memory_percent}%</span>
          <span className="text-[10px] text-[var(--text-muted)] ml-1">
            {system.memory_used_gb?.toFixed(1)}/{system.memory_total_gb?.toFixed(0)} GB
          </span>
          <ProgressBar value={system.memory_percent} className="mt-1" height={3} color="var(--purple)" />
        </div>

        {/* Disk */}
        <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]">
          <div className="flex items-center gap-1.5 mb-2">
            <HardDrive size={12} className="text-[var(--success)]" />
            <span className="text-[10px] text-[var(--text-muted)] uppercase">Disco</span>
          </div>
          <span className="text-lg font-bold text-[var(--text)]">{system.disk_percent}%</span>
          <ProgressBar
            value={system.disk_percent}
            className="mt-1"
            height={3}
            color={system.disk_percent > 85 ? 'var(--error)' : 'var(--success)'}
          />
        </div>

        {/* Uptime */}
        <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]">
          <div className="flex items-center gap-1.5 mb-2">
            <Clock size={12} className="text-[var(--warning)]" />
            <span className="text-[10px] text-[var(--text-muted)] uppercase">Uptime</span>
          </div>
          <span className="text-lg font-bold text-[var(--text)]">
            {days > 0 ? `${days}d ` : ''}{hours}h
          </span>
          <div className="flex items-center gap-1 mt-1">
            {system.gateway_status === 'online' ? (
              <Wifi size={10} className="text-[var(--success)]" />
            ) : (
              <WifiOff size={10} className="text-[var(--error)]" />
            )}
            <span className="text-[10px] text-[var(--text-muted)]">Gateway</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
