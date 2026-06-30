'use client';

import { useEffect, useState } from 'react';
import { getJobs, JobInfo } from '@/lib/api';
import { Briefcase, Clock, Play } from 'lucide-react';

export default function ActiveJobs() {
  const [jobs, setJobs] = useState<JobInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getJobs()
      .then((data) => setJobs(data.jobs || []))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="skeleton h-16 w-full" />;

  const running = jobs.filter((j) => j.running);
  const recent = jobs.slice(0, 4);

  if (running.length === 0 && recent.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60px] text-center">
        <Briefcase size={20} className="text-[var(--text-faint)] mb-1" />
        <p className="text-[10px] text-[var(--text-faint)]">Sin tareas activas</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {running.length > 0 && (
        <div className="mb-2">
          {running.map((job) => (
            <div key={job.id} className="flex items-center gap-2 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse shrink-0" />
              <span className="text-[11px] text-[var(--text)] truncate flex-1">{job.name}</span>
              <span className="hud-label text-[7px] text-[var(--success)]">EJECUTANDO</span>
            </div>
          ))}
        </div>
      )}
      {recent.slice(0, running.length > 0 ? 3 : 4).map((job) => (
        <div key={job.id} className="flex items-center gap-2 py-1">
          <Clock size={10} className="text-[var(--text-faint)] shrink-0" />
          <span className="text-[11px] text-[var(--text-muted)] truncate flex-1">{job.name}</span>
          <span className="hud-label text-[7px] text-[var(--text-faint)]">
            {job.last_run ? new Date(job.last_run).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '—'}
          </span>
        </div>
      ))}
    </div>
  );
}
