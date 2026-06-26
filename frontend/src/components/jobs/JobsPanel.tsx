'use client';

import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { humanizeCron } from '@/lib/utils';
import { JobInfo, RunEntry } from '@/lib/api';
import {
  CalendarClock,
  Timer,
  Activity,
  PauseCircle,
  AlertCircle,
  Terminal,
  Cpu,
  ChevronRight,
  Clock,
} from 'lucide-react';

interface JobsPanelProps {
  jobs: JobInfo[];
  runs: RunEntry[];
  loading: boolean;
}

const statusLabel: Record<string, string> = {
  active: 'ACTIVO',
  paused: 'PAUSADO',
  inactive: 'DETENIDO',
  error: 'ERROR',
};

const statusVariant: Record<string, 'success' | 'warning' | 'error'> = {
  active: 'success',
  paused: 'warning',
  inactive: 'warning',
  error: 'error',
};

function formatTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-CL', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function relativeNext(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const diff = d.getTime() - Date.now();
  if (diff < 0) return 'pendiente';
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `en ${mins} min`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `en ${hrs}h`;
  return `en ${Math.round(hrs / 24)}d`;
}

export default function JobsPanel({ jobs, runs, loading }: JobsPanelProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-4 w-44 mb-3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-32 rounded" />)}
        </div>
      </div>
    );
  }

  const runningCount = jobs.filter((j) => j.running).length;

  return (
    <div className="space-y-6">
      {/* Jobs programados */}
      <section>
        <div className="hud-divider mb-3">
          <CalendarClock className="w-3.5 h-3.5 text-[var(--cyan)]" />
          <span className="hud-label text-[10px] text-[var(--text)]">JOBS REGISTRADOS</span>
          <span className="hud-readout text-[10px] text-[var(--text-faint)]">
            {jobs.length} · {runningCount} EN EJECUCIÓN
          </span>
        </div>

        {jobs.length === 0 ? (
          <Card className="py-10 text-center">
            <Terminal className="w-10 h-10 text-[var(--text-faint)] mx-auto mb-3" />
            <p className="hud-label text-[10px] text-[var(--text-muted)]">SIN JOBS PROGRAMADOS</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {jobs.map((job) => {
              const human = humanizeCron(job.schedule);
              const isSystemd = job.source === 'systemd';
              return (
                <Card key={job.id} className="relative p-4 space-y-2.5 overflow-hidden">
                  {/* running pulse accent */}
                  {job.running && (
                    <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-[var(--cyan)] shadow-[0_0_8px_var(--cyan)] animate-pulse" />
                  )}

                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-[var(--text)] truncate">
                        {job.name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        {isSystemd
                          ? <Cpu size={11} className="text-purple-400" />
                          : <Terminal size={11} className="text-[var(--cyan)]" />}
                        <span className="hud-label text-[8px] text-[var(--text-faint)]">
                          {isSystemd ? 'SYSTEMD' : 'HERMES CRON'}
                        </span>
                      </div>
                    </div>
                    {job.running
                      ? <Badge variant="accent" dot>EJECUTÁNDOSE</Badge>
                      : <Badge variant={statusVariant[job.status] || 'error'} dot>
                          {statusLabel[job.status] || job.status.toUpperCase()}
                        </Badge>}
                  </div>

                  {/* What it does */}
                  {job.description && (
                    <p className="text-xs text-[var(--text-muted)] leading-snug">
                      {job.description}
                    </p>
                  )}

                  {/* The actual command */}
                  {job.command && (
                    <div className="flex items-start gap-1.5">
                      <ChevronRight size={12} className="text-[var(--text-faint)] mt-0.5 flex-shrink-0" />
                      <code className="hud-readout text-[10px] text-[var(--cyan)] break-all leading-snug">
                        {job.command}
                      </code>
                    </div>
                  )}

                  {/* Schedule, humanized */}
                  <div className="flex items-center justify-between pt-1 border-t border-[var(--hairline)]">
                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                      <Timer size={12} className="text-[var(--text-faint)]" />
                      <span>{human || job.schedule}</span>
                    </div>
                    {job.next_run && (
                      <div className="flex items-center gap-1 hud-readout text-[10px] text-[var(--text-faint)]">
                        <Clock size={10} />
                        {relativeNext(job.next_run)}
                      </div>
                    )}
                  </div>

                  {/* raw cron, small */}
                  {!isSystemd && job.schedule && job.schedule !== '?' && (
                    <p className="hud-readout text-[9px] text-[var(--text-faint)] opacity-60">
                      {job.schedule}
                    </p>
                  )}

                  {job.substatus && (
                    <p className="text-[11px] text-[var(--text-faint)]">{job.substatus}</p>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Últimas ejecuciones */}
      <section>
        <div className="hud-divider mb-3">
          <Activity className="w-3.5 h-3.5 text-[var(--cyan)]" />
          <span className="hud-label text-[10px] text-[var(--text)]">REGISTRO DE EJECUCIONES</span>
        </div>

        {runs.length === 0 ? (
          <Card className="py-8 text-center">
            <Timer className="w-8 h-8 text-[var(--text-faint)] mx-auto mb-2" />
            <p className="hud-label text-[10px] text-[var(--text-muted)]">SIN EJECUCIONES RECIENTES</p>
          </Card>
        ) : (
          <div className="space-y-1">
            {runs.map((run, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 rounded bg-[rgba(255,255,255,0.02)] border border-[var(--hairline)] fade-in"
                style={{ animationDelay: `${idx * 30}ms` }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--cyan)] opacity-60 flex-shrink-0" />
                <span className="hud-readout text-[10px] text-[var(--text-faint)] flex-shrink-0 min-w-[110px]">
                  {formatTime(run.time)}
                </span>
                <span className="text-sm text-[var(--text-muted)]">{run.event}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
