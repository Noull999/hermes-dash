'use client';

import Card from '@/components/ui/Card';
import ProgressBar from '@/components/ui/ProgressBar';
import { useHermesStore } from '@/store/useHermesStore';
import { Coins, RefreshCw, TrendingUp, Layers } from 'lucide-react';
import { useEffect } from 'react';

export default function TokenCard() {
  const { tokens, tokensLoading, tokensError, fetchTokens } = useHermesStore();

  useEffect(() => {
    if (!tokens && !tokensLoading) fetchTokens();
  }, [tokens, tokensLoading, fetchTokens]);

  if (tokensLoading && !tokens) {
    return (
      <Card>
        <div className="space-y-3">
          <div className="skeleton h-5 w-32" />
          <div className="skeleton h-8 w-full" />
          <div className="skeleton h-4 w-24" />
        </div>
      </Card>
    );
  }

  if (tokensError) {
    return (
      <Card>
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--error)]">Error: {tokensError}</span>
          <button onClick={fetchTokens} className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.06)]">
            <RefreshCw size={14} className="text-[var(--accent)]" />
          </button>
        </div>
      </Card>
    );
  }

  if (!tokens) return null;

  const totalBar = tokens.total_new + tokens.total_cached;
  const newPct = totalBar > 0 ? (tokens.total_new / totalBar) * 100 : 0;
  const projects = tokens.projects || {};
  const projectNames = Object.keys(projects);

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Coins size={16} className="text-[var(--accent)]" />
          <h3 className="text-sm font-semibold text-[var(--text)]">Tokens</h3>
        </div>
        <button onClick={fetchTokens} className="p-1 rounded-lg hover:bg-[rgba(255,255,255,0.06)] transition-colors">
          <RefreshCw size={12} className="text-[var(--text-muted)]" />
        </button>
      </div>

      {/* Stacked bar */}
      <div className="h-8 rounded-xl overflow-hidden flex mb-3">
        <div
          className="h-full transition-all duration-700"
          style={{
            width: `${newPct}%`,
            background: 'linear-gradient(90deg, var(--accent), var(--accent2))',
          }}
        />
        <div
          className="h-full transition-all duration-700"
          style={{
            width: `${100 - newPct}%`,
            background: 'rgba(0, 212, 255, 0.15)',
          }}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] mb-1">
            <TrendingUp size={10} />
            <span>New</span>
          </div>
          <span className="text-sm font-bold text-[var(--accent)]">
            {tokens.total_new.toLocaleString()}
          </span>
        </div>
        <div>
          <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] mb-1">
            <Layers size={10} />
            <span>Cached</span>
          </div>
          <span className="text-sm font-bold text-[var(--text)]">
            {tokens.total_cached.toLocaleString()}
          </span>
        </div>
        <div>
          <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] mb-1">
            <Coins size={10} />
            <span>Gross</span>
          </div>
          <span className="text-sm font-bold text-[var(--text)]">
            {tokens.total_gross.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Per-project breakdown */}
      {projectNames.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-[rgba(255,255,255,0.06)]">
          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-medium">
            Por proyecto
          </span>
          {projectNames.map((name) => {
            const p = projects[name];
            const pTotal = (p.new_tokens || 0) + (p.cached_tokens || 0);
            return (
              <div key={name} className="flex items-center justify-between text-xs">
                <span className="text-[var(--text)] truncate max-w-[140px]">{name}</span>
                <span className="text-[var(--text-muted)]">
                  <span className="text-[var(--accent)]">{p.new_tokens?.toLocaleString() || 0}</span>
                  {' / '}
                  {pTotal.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
