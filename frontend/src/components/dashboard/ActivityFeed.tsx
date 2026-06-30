'use client';

import { useActivityStore, ActivityEvent } from '@/store/useActivityStore';
import { Activity, Zap, FolderGit2, Globe, AlertTriangle, Info } from 'lucide-react';

const TYPE_ICONS: Record<string, React.ElementType> = {
  job: Zap,
  repo: FolderGit2,
  gateway: Globe,
  error: AlertTriangle,
  info: Info,
};

const TYPE_COLORS: Record<string, string> = {
  job: 'var(--cyan)',
  repo: 'var(--success)',
  gateway: 'var(--amber)',
  error: 'var(--error)',
  info: 'var(--text-muted)',
};

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const secs = Math.floor(diffMs / 1000);
    if (secs < 60) return 'Ahora';
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `hace ${mins}min`;
    const hrs = Math.floor(mins / 60);
    return `hace ${hrs}h`;
  } catch {
    return '';
  }
}

export default function ActivityFeed() {
  const events = useActivityStore((s) => s.events);
  const latest = events.slice(0, 20);

  if (latest.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60px] text-center">
        <Activity size={20} className="text-[var(--text-faint)] mb-1" />
        <p className="text-[10px] text-[var(--text-faint)]">Esperando actividad...</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-[240px] overflow-y-auto">
      {latest.map((evt) => {
        const Icon = TYPE_ICONS[evt.type] || Info;
        const color = TYPE_COLORS[evt.type] || 'var(--text-muted)';
        return (
          <div key={evt.id} className="flex items-start gap-2 py-1.5 border-b border-[var(--hairline)] last:border-0">
            <Icon size={11} className="shrink-0 mt-0.5" style={{ color }} />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-[var(--text-muted)] leading-tight truncate">{evt.message}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {evt.project && (
                  <span className="hud-label text-[6px] text-[var(--text-faint)]">{evt.project}</span>
                )}
                <span className="hud-label text-[6px] text-[var(--text-faint)]">{formatTime(evt.timestamp)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
