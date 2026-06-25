'use client';

import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import MiniOrb from './MiniOrb';
import { RepoData } from '@/lib/api';
import { GitBranch, GitCommitHorizontal, FileWarning, ArrowUpFromLine, ExternalLink, Sparkles } from 'lucide-react';
import { useState } from 'react';
import ClaudeLauncher from './ClaudeLauncher';

interface RepoCardProps {
  repo: RepoData;
}

export default function RepoCard({ repo }: RepoCardProps) {
  const [claudeOpen, setClaudeOpen] = useState(false);

  const syncLabel: Record<string, string> = {
    synced: 'Sincronizado',
    behind: 'Detrás',
    ahead: 'Adelantado',
    error: 'Error',
  };

  const syncVariant: Record<string, 'success' | 'warning' | 'accent' | 'error'> = {
    synced: 'success',
    behind: 'warning',
    ahead: 'accent',
    error: 'error',
  };

  return (
    <>
      <Card hover className="relative overflow-hidden">
        {/* Mini orb indicator */}
        <div className="absolute top-4 right-4">
          <MiniOrb status={repo.sync_status} size={10} pulse={repo.sync_status === 'error'} />
        </div>

        {/* Repo name */}
        <div className="flex items-center gap-2 mb-2 pr-8">
          <GitBranch size={14} className="text-[var(--accent)] flex-shrink-0" />
          <h3 className="text-sm font-semibold text-[var(--text)] truncate">{repo.name}</h3>
          <Badge variant="default">{repo.branch}</Badge>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-1">
            <GitCommitHorizontal size={12} className="text-[var(--text-muted)]" />
            <span className="text-xs text-[var(--text-muted)]">
              {repo.commits_behind > 0 ? `${repo.commits_behind} behind` : 'Actualizado'}
            </span>
          </div>
          {repo.dirty && (
            <div className="flex items-center gap-1">
              <FileWarning size={12} className="text-[var(--warning)]" />
              <span className="text-xs text-[var(--warning)]">Dirty</span>
            </div>
          )}
          <Badge variant={syncVariant[repo.sync_status]} dot>
            {syncLabel[repo.sync_status]}
          </Badge>
        </div>

        {/* Last commit */}
        {repo.last_commit && (
          <p className="text-[10px] text-[var(--text-muted)] mb-3 truncate">
            {repo.last_commit}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(0,212,255,0.1)] text-[var(--accent)] text-xs font-medium hover:bg-[rgba(0,212,255,0.15)] transition-all">
            <ArrowUpFromLine size={12} />
            Pull VPS
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.04)] text-[var(--text)] text-xs font-medium hover:bg-[rgba(255,255,255,0.08)] transition-all">
            <ExternalLink size={12} />
            View Diff
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.04)] text-[var(--text)] text-xs font-medium hover:bg-[rgba(255,255,255,0.08)] transition-all">
            <ExternalLink size={12} />
            Open Repo
          </button>
          <button
            onClick={() => setClaudeOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(139,92,246,0.12)] text-[var(--purple)] text-xs font-medium hover:bg-[rgba(139,92,246,0.18)] transition-all"
          >
            <Sparkles size={12} />
            Claude
          </button>
        </div>
      </Card>

      <ClaudeLauncher
        open={claudeOpen}
        onClose={() => setClaudeOpen(false)}
        defaultRepo={repo.name}
      />
    </>
  );
}
