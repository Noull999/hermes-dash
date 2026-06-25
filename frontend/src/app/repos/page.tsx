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
          <h1 className="text-2xl font-bold text-white/90">Repos</h1>
          <button
            onClick={loadRepos}
            className="text-xs text-cyan-400 hover:text-cyan-300 transition"
          >
            ↻ Actualizar
          </button>
        </div>

        {loading && (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <Card className="p-4 border-red-500/30">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </Card>
        )}

        {!loading && !error && repos.length === 0 && (
          <Card className="p-8 text-center">
            <GitBranch className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/50">No se encontraron repositorios.</p>
          </Card>
        )}

        {repos.map(repo => (
          <div key={repo.name} className="relative">
            <RepoCard repo={repo} />
          </div>
        ))}
      </div>
    </ClientLayout>
  );
}
