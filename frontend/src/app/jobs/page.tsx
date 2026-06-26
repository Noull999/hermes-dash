'use client';

import { useState, useEffect, startTransition } from 'react';
import ClientLayout from '@/components/ui/ClientLayout';
import JobsPanel from '@/components/jobs/JobsPanel';
import Card from '@/components/ui/Card';
import { AlertCircle, Briefcase } from 'lucide-react';
import { getJobs, JobInfo, RunEntry } from '@/lib/api';

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobInfo[]>([]);
  const [runs, setRuns] = useState<RunEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startTransition(() => { loadJobs(); });
    // refresh every 30s so "running now" stays accurate
    const t = setInterval(() => startTransition(() => loadJobs()), 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadJobs() {
    setError(null);
    try {
      const data = await getJobs();
      setJobs(data.jobs || []);
      setRuns(data.recent_runs || []);
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
          <div>
            <h1 className="text-xl font-bold hud-label tracking-widest text-[var(--cyan)] flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              TAREAS PROGRAMADAS
            </h1>
            <p className="hud-readout text-[10px] text-[var(--text-faint)] mt-0.5">
              CRON · SYSTEMD · AUTOMATIZACIONES HERMES
            </p>
          </div>
          <button
            onClick={() => loadJobs()}
            className="hud-label text-[10px] text-[var(--cyan)] hover:text-[var(--text)] transition"
          >
            SYNC
          </button>
        </div>

        {error && (
          <Card className="p-4 border border-red-500/30">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          </Card>
        )}

        <JobsPanel jobs={jobs} runs={runs} loading={loading} />
      </div>
    </ClientLayout>
  );
}
