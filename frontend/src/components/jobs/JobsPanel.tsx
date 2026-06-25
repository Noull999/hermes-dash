'use client';

import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import {
  CalendarClock,
  Timer,
  Activity,
  PauseCircle,
  AlertCircle,
  Terminal,
  Cpu,
} from 'lucide-react';

interface JobInfo {
  source: string;
  id: string;
  name: string;
  schedule: string;
  status: string;
  substatus?: string;
}

interface RunEntry {
  time: string;
  event: string;
}

interface JobsPanelProps {
  jobs: JobInfo[];
  runs: RunEntry[];
  loading: boolean;
}

const statusConfig: Record<
  string,
  { variant: 'success' | 'warning' | 'error'; icon: React.ReactNode }
> = {
  active: {
    variant: 'success',
    icon: <Activity size={12} />,
  },
  paused: {
    variant: 'warning',
    icon: <PauseCircle size={12} />,
  },
  error: {
    variant: 'error',
    icon: <AlertCircle size={12} />,
  },
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('es-CL', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function JobsPanel({ jobs, runs, loading }: JobsPanelProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {/* Skeleton section */}
        <div className="h-5 w-44 bg-white/5 rounded animate-pulse mb-3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-5 w-40 bg-white/5 rounded animate-pulse mt-6 mb-3" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Jobs Programados */}
      <section>
        <h2 className="text-lg font-semibold text-white/90 flex items-center gap-2 mb-3">
          <CalendarClock className="w-5 h-5 text-cyan-400" />
          Jobs Programados
        </h2>

        {jobs.length === 0 ? (
          <Card className="p-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <Terminal className="w-10 h-10 text-white/20" />
              <p className="text-white/50 text-sm">No hay jobs programados.</p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {jobs.map((job) => {
              const cfg = statusConfig[job.status] || statusConfig.error;
              return (
                <Card key={job.id} className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-white/90 truncate">
                        {job.name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        {job.source === 'systemd' ? (
                          <Cpu size={11} className="text-purple-400" />
                        ) : (
                          <Terminal size={11} className="text-cyan-400" />
                        )}
                        <Badge
                          variant={job.source === 'systemd' ? 'purple' : 'accent'}
                        >
                          {job.source === 'systemd' ? 'systemd' : 'Hermes'}
                        </Badge>
                      </div>
                    </div>
                    <Badge variant={cfg.variant} dot>
                      {job.status === 'active'
                        ? 'Activo'
                        : job.status === 'paused'
                          ? 'Pausado'
                          : 'Error'}
                    </Badge>
                  </div>

                  {/* Schedule */}
                  <div className="flex items-center gap-2 text-xs text-white/50">
                    <Timer size={12} />
                    <span className="font-mono">{job.schedule}</span>
                  </div>

                  {/* Substatus hint */}
                  {job.substatus && (
                    <p className="text-[11px] text-white/40">{job.substatus}</p>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Últimas Ejecuciones */}
      <section>
        <h2 className="text-lg font-semibold text-white/90 flex items-center gap-2 mb-3">
          <Activity className="w-5 h-5 text-cyan-400" />
          Últimas Ejecuciones
        </h2>

        {runs.length === 0 ? (
          <Card className="p-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <Timer className="w-10 h-10 text-white/20" />
              <p className="text-white/50 text-sm">
                No hay ejecuciones recientes.
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-1">
            {runs.map((run, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] fade-in"
                style={{ animationDelay: `${idx * 30}ms` }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/60 flex-shrink-0" />
                <span className="text-xs text-white/40 flex-shrink-0 min-w-[100px] font-mono">
                  {formatTime(run.time)}
                </span>
                <span className="text-sm text-white/70">{run.event}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
