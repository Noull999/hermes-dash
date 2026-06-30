'use client';

import { useEffect } from 'react';
import { useHermesStore } from '@/store/useHermesStore';
import { Database, Activity, Cpu } from 'lucide-react';

function CircularProgress({ pct }: { pct: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct > 80 ? 'var(--error)' : pct > 50 ? 'var(--amber)' : 'var(--success)';

  return (
    <svg width={62} height={62} viewBox="0 0 72 72" className="shrink-0">
      <circle cx={36} cy={36} r={r} fill="none" stroke="rgba(255,45,85,0.06)" strokeWidth={5} />
      <circle
        cx={36} cy={36} r={r}
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 36 36)"
        style={{ transition: 'stroke-dashoffset 1s ease-out' }}
      />
      <text x={36} y={36} textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize="12" fontWeight="bold" fontFamily="var(--font-mono)">
        {pct.toFixed(0)}%
      </text>
    </svg>
  );
}

export default function TokenBudget() {
  const { tokens, tokensLoading, fetchTokens } = useHermesStore();

  useEffect(() => {
    if (!tokens && !tokensLoading) fetchTokens();
  }, [tokens, tokensLoading, fetchTokens]);

  if (tokensLoading && !tokens) return <div className="skeleton h-28 w-full" />;
  if (!tokens?.session) return null;

  const s = tokens.session;
  const limit = s.limit || 1;
  const used = s.new_total_tokens || 0;
  const pct = Math.min((used / limit) * 100, 100);
  const remaining = s.remaining_tokens ?? (limit - used);
  const nextReset = s.next_reset ? new Date(s.next_reset) : null;
  const resetIn = nextReset
    ? Math.max(0, Math.floor((nextReset.getTime() - Date.now()) / 3600000))
    : null;

  // Top 3 categories by total tokens
  const categories = tokens.categories || {};
  const topCats = Object.entries(categories)
    .sort(([, a], [, b]) => b.total_tokens - a.total_tokens)
    .slice(0, 3);

  return (
    <div className="space-y-3">
      {/* Main gauge */}
      <div className="flex items-center gap-3">
        <CircularProgress pct={pct} />
        <div className="min-w-0 flex-1">
          <div className="hud-readout text-sm font-bold text-[var(--text)]">
            {(remaining > 0 ? remaining : 0).toLocaleString()}
          </div>
          <div className="hud-label text-[9px] text-[var(--text-muted)]">TOKENS RESTANTES</div>
          <div className="hud-label text-[8px] text-[var(--text-faint)] mt-0.5">
            {used.toLocaleString()} / {limit.toLocaleString()} usados
            {resetIn !== null ? ` · reset ~${resetIn}h` : ''}
          </div>
        </div>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-1.5 rounded border border-[var(--hairline)] bg-[rgba(0,0,0,0.15)] px-2 py-1.5">
          <Activity size={10} className="text-[var(--cyan)] shrink-0" />
          <div>
            <div className="hud-readout text-[10px] text-[var(--text)]">{s.calls}</div>
            <div className="hud-label text-[7px] text-[var(--text-faint)]">CALLS</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded border border-[var(--hairline)] bg-[rgba(0,0,0,0.15)] px-2 py-1.5">
          <Database size={10} className="text-[var(--amber)] shrink-0" />
          <div>
            <div className="hud-readout text-[10px] text-[var(--text)]">{s.cache_pct?.toFixed(0) || 0}%</div>
            <div className="hud-label text-[7px] text-[var(--text-faint)]">CACHE</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded border border-[var(--hairline)] bg-[rgba(0,0,0,0.15)] px-2 py-1.5">
          <Cpu size={10} className="text-[var(--success)] shrink-0" />
          <div>
            <div className="hud-readout text-[10px] text-[var(--text)]">{s.completion_tokens?.toLocaleString() || 0}</div>
            <div className="hud-label text-[7px] text-[var(--text-faint)]">COMPLETION</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded border border-[var(--hairline)] bg-[rgba(0,0,0,0.15)] px-2 py-1.5">
          <Database size={10} className="text-[var(--purple)] shrink-0" />
          <div>
            <div className="hud-readout text-[10px] text-[var(--text)]">{s.gross_total_tokens?.toLocaleString() || 0}</div>
            <div className="hud-label text-[7px] text-[var(--text-faint)]">TOTAL BRUTO</div>
          </div>
        </div>
      </div>

      {/* Top models */}
      {topCats.length > 0 && (
        <div>
          <div className="hud-label text-[7px] text-[var(--text-faint)] mb-1">MODELOS MÁS USADOS</div>
          <div className="space-y-1">
            {topCats.map(([key, cat]) => (
              <div key={key} className="flex items-center justify-between px-2 py-1 rounded border border-[var(--hairline)] bg-[rgba(0,0,0,0.1)]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="hud-label text-[7px] text-[var(--text-muted)] truncate max-w-[100px]">{key}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="hud-readout text-[8px] text-[var(--text-faint)]">{cat.calls} calls</span>
                  <span className="hud-readout text-[8px] text-[var(--text)]">{cat.total_tokens.toLocaleString()} tok</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
