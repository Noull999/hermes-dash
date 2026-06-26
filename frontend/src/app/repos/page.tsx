'use client';

import { useState, useEffect, startTransition } from 'react';
import ClientLayout from '@/components/ui/ClientLayout';
import RepoCard from '@/components/repos/RepoCard';
import Card from '@/components/ui/Card';
import { GitBranch, AlertCircle } from 'lucide-react';
import { getRepos, RepoData } from '@/lib/api';

export default function ReposPage() {
  const [repos, setRepos] = useState<RepoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startTransition(() => { loadRepos(); });
  }, []);

  async function loadRepos() {
    setLoading(true);
    setError(null);
    try {
      const data = await getRepos();
      setRepos(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar repos');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ClientLayout>
      <div className="p-4 pb-24 max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold hud-label tracking-widest text-[var(--cyan)]">REPOSITORIOS</h1>
            <p className="hud-readout text-[10px] text-[var(--text-faint)] mt-0.5">CONTROL DE VERSIONES / VPS</p>
          </div>
          <button
            onClick={loadRepos}
            disabled={loading}
            className="hud-label text-[10px] text-[var(--cyan)] hover:text-[var(--text)] transition disabled:opacity-40 flex items-center gap-1"
          >
            <GitBranch className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            SYNC
          </button>
        </div>

        {loading && (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-24 skeleton rounded" />
            ))}
          </div>
        )}

        {error && (
          <Card className="p-4 border border-red-500/30">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          </Card>
        )}

        {!loading && !error && repos.length === 0 && (
          <Card className="p-8 text-center">
            <GitBranch className="w-10 h-10 text-[var(--text-faint)] mx-auto mb-3" />
            <p className="hud-label text-[10px] text-[var(--text-muted)]">SIN REPOSITORIOS DETECTADOS</p>
          </Card>
        )}

        {repos.map(repo => (
          <div key={repo.name} className="relative">
            <RepoCard repo={repo} onClone={loadRepos} />
          </div>
        ))}
      </div>
    </ClientLayout>
  );
}
