'use client';

import Card from '@/components/ui/Card';
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
          <div className="skeleton h-4 w-32" />
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
          <span className="hud-label text-[var(--error)]">ERR · {tokensError}</span>
          <button onClick={fetchTokens} className="p-1.5 border border-[var(--hairline)] hover:border-[var(--hairline-strong)]">
            <RefreshCw size={13} className="text-[var(--cyan)]" />
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
      {/* header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Coins size={14} className="text-[var(--cyan)]" />
          <h3 className="hud-label text-[10px] text-[var(--text)]">TOKEN&nbsp;USAGE</h3>
        </div>
        <button onClick={fetchTokens} className="p-1 hover:bg-[rgba(79,227,255,0.08)] transition-colors">
          <RefreshCw size={12} className="text-[var(--text-muted)]" />
        </button>
      </div>

      {/* stacked telemetry bar */}
      <div className="relative h-7 border border-[var(--hairline)] overflow-hidden flex mb-1 bg-[rgba(79,227,255,0.03)]">
        <div
          className="h-full transition-all duration-700"
          style={{
            width: `${newPct}%`,
            background: 'linear-gradient(90deg, var(--cyan-deep), var(--cyan))',
            boxShadow: '0 0 14px rgba(79,227,255,0.5)',
          }}
        />
        <div
          className="h-full transition-all duration-700"
          style={{ width: `${100 - newPct}%`, background: 'rgba(79,227,255,0.12)' }}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 hud-readout text-[10px] text-[var(--cyan-bright)]">
          {newPct.toFixed(1)}%
        </span>
      </div>
      <div className="flex justify-between mb-3 hud-label text-[8px]">
        <span>NUEVOS</span>
        <span>CACHEADOS</span>
      </div>

      {/* stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { Icon: TrendingUp, label: 'NEW', value: tokens.total_new, glow: true },
          { Icon: Layers, label: 'CACHE', value: tokens.total_cached, glow: false },
          { Icon: Coins, label: 'GROSS', value: tokens.total_gross, glow: false },
        ].map(({ Icon, label, value, glow }) => (
          <div key={label} className="border border-[var(--hairline)] px-2 py-2 bg-[rgba(79,227,255,0.02)]">
            <div className="flex items-center gap-1 mb-1">
              <Icon size={9} className="text-[var(--text-faint)]" />
              <span className="hud-label text-[8px]">{label}</span>
            </div>
            <span className={`hud-readout text-sm font-bold ${glow ? 'glow-text' : 'text-[var(--text)]'}`}>
              {value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      {/* per-project */}
      {projectNames.length > 0 && (
        <div className="space-y-1.5 pt-2.5 border-t border-[var(--hairline)]">
          <div className="hud-divider"><span className="hud-label text-[8px]">POR&nbsp;PROYECTO</span></div>
          {projectNames.map((name) => {
            const p = projects[name];
            const pTotal = (p.new_tokens || 0) + (p.cached_tokens || 0);
            return (
              <div key={name} className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-muted)] truncate max-w-[150px] font-mono text-[11px]">{name}</span>
                <span className="hud-readout text-[11px] text-[var(--text-muted)]">
                  <span className="text-[var(--cyan)]">{p.new_tokens?.toLocaleString() || 0}</span>
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
