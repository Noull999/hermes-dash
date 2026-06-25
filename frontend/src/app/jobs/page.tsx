'use client';

import { useState, useEffect, startTransition } from 'react';
import ClientLayout from '@/components/ui/ClientLayout';
import JobsPanel from '@/components/jobs/JobsPanel';
import Card from '@/components/ui/Card';
import { AlertCircle, Briefcase } from 'lucide-react';

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

/** Stub API call — will connect to real endpoint later */
async function getJobs(): Promise<{ jobs: JobInfo[]; recent_runs: RunEntry[] }> {
  // Simulate network delay
  await new Promise((r) => setTimeout(r, 600));
  return {
    jobs: [
      {
        source: 'hermes',
        id: 'job-1',
        name: 'sync-repos',
        schedule: '0 */6 * * *',
        status: 'active',
        substatus: 'Última ejecución exitosa',
      },
      {
        source: 'systemd',
        id: 'job-2',
        name: 'log-rotate',
        schedule: '0 0 * * *',
        status: 'active',
      },
      {
        source: 'hermes',
        id: 'job-3',
        name: 'health-check',
        schedule: '*/5 * * * *',
        status: 'error',
        substatus: 'Timeout — reintentando en 30s',
      },
      {
        source: 'hermes',
        id: 'job-4',
        name: 'backup-db',
        schedule: '0 2 * * 0',
        status: 'paused',
      },
    ],
    recent_runs: [
      { time: new Date(Date.now() - 2 * 60000).toISOString(), event: 'health-check — exitoso (120ms)' },
      { time: new Date(Date.now() - 7 * 60000).toISOString(), event: 'sync-repos — 3 repos actualizados' },
      { time: new Date(Date.now() - 15 * 60000).toISOString(), event: 'log-rotate — completado (1.2MB liberados)' },
      { time: new Date(Date.now() - 35 * 60000).toISOString(), event: 'health-check — exitoso (98ms)' },
      { time: new Date(Date.now() - 60 * 60000).toISOString(), event: 'sync-repos — sin cambios' },
    ],
  };
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobInfo[]>([]);
  const [runs, setRuns] = useState<RunEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startTransition(() => {
      loadJobs();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadJobs() {
    setLoading(true);
    setError(null);
    try {
      const data = await getJobs();
      setJobs(data.jobs);
      setRuns(data.recent_runs);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar jobs');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ClientLayout>
      <div className="p-4 pb-24 max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white/90 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-cyan-400" />
            Jobs
          </h1>
          <button
            onClick={loadJobs}
            className="text-xs text-cyan-400 hover:text-cyan-300 transition"
          >
            ↻ Actualizar
          </button>
        </div>

        {error && (
          <Card className="p-4 border-red-500/30">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </Card>
        )}

        <JobsPanel jobs={jobs} runs={runs} loading={loading} />
      </div>
    </ClientLayout>
  );
}
