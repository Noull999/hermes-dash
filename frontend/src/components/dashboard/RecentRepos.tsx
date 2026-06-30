'use client';

import { useEffect, useState } from 'react';
import { useHermesStore } from '@/store/useHermesStore';
import { pullRepo, RepoData } from '@/lib/api';
import { FolderGit2, GitBranch, ArrowDownToLine, CheckCircle2, Loader2 } from 'lucide-react';

export default function RecentRepos() {
  const { repos, reposLoading, reposError, fetchRepos } = useHermesStore();
  const [pulling, setPulling] = useState<Record<string, 'idle' | 'success' | 'error'>>({});
  const [pullMsgs, setPullMsgs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (repos.length === 0 && !reposLoading) fetchRepos();
  }, [repos, reposLoading, fetchRepos]);

  if (reposError) return null;
  if (repos.length === 0) return <div className="skeleton h-16 w-full" />;

  const recent = [...repos]
    .filter((r) => r.on_vps)
    .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime())
    .slice(0, 4);

  const handlePull = async (name: string) => {
    setPulling((p) => ({ ...p, [name]: 'idle' }));
    try {
      const res = await pullRepo(name);
      setPulling((p) => ({ ...p, [name]: res.success ? 'success' : 'error' }));
      setPullMsgs((p) => ({ ...p, [name]: res.output || '' }));
    } catch {
      setPulling((p) => ({ ...p, [name]: 'error' }));
    }
    setTimeout(() => {
      setPulling((p) => ({ ...p, [name]: 'idle' }));
      setPullMsgs((p) => ({ ...p, [name]: '' }));
      fetchRepos();
    }, 3000);
  };

  const statusColor = (r: RepoData) =>
    r.status === 'synced' ? 'var(--success)'
    : r.status === 'behind' ? 'var(--amber)'
    : r.status === 'ahead' ? 'var(--cyan)'
    : 'var(--text-faint)';

  return (
    <div className="space-y-1.5">
      {recent.map((repo) => (
        <div key={repo.name} className="flex items-center gap-2 py-1.5 border-b border-[var(--hairline)] last:border-0">
          <FolderGit2 size={12} className="text-[var(--text-faint)] shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[var(--text)] truncate">{repo.name}</span>
              <GitBranch size={9} className="text-[var(--text-faint)] shrink-0" />
              <span className="hud-readout text-[8px] text-[var(--text-faint)]">{repo.branch}</span>
            </div>
          </div>
          <span className="hud-label text-[7px]" style={{ color: statusColor(repo) }}>
            {repo.status?.toUpperCase()}
          </span>
          <button
            onClick={() => handlePull(repo.name)}
            disabled={pulling[repo.name] === 'success' || pulling[repo.name] === 'error'}
            className="p-1 hover:bg-[rgba(255,45,85,0.08)] rounded transition-colors disabled:opacity-50"
          >
            {pulling[repo.name] === 'success' ? (
              <CheckCircle2 size={11} className="text-[var(--success)]" />
            ) : pulling[repo.name] === 'error' ? (
              <CheckCircle2 size={11} className="text-[var(--error)]" />
            ) : (
              <ArrowDownToLine size={11} className="text-[var(--text-muted)]" />
            )}
          </button>
        </div>
      ))}
    </div>
  );
}
