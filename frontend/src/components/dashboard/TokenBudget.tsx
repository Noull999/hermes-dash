'use client';

import { useEffect } from 'react';
import { useHermesStore } from '@/store/useHermesStore';

function CircularProgress({ pct }: { pct: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct > 80 ? 'var(--error)' : pct > 50 ? 'var(--amber)' : 'var(--success)';

  return (
    <svg width={72} height={72} viewBox="0 0 72 72" className="shrink-0">
      <circle cx={36} cy={36} r={r} fill="none" stroke="rgba(79,227,255,0.06)" strokeWidth={5} />
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
  const { tokens, tokensLoading, tokensError, fetchTokens } = useHermesStore();

  useEffect(() => {
    if (!tokens && !tokensLoading) fetchTokens();
  }, [tokens, tokensLoading, fetchTokens]);

  if (tokensError) return null;
  if (!tokens?.session) return <div className="skeleton h-20 w-full" />;

  const s = tokens.session;
  const limit = s.limit || 1;
  const used = s.new_total_tokens || 0;
  const pct = Math.min((used / limit) * 100, 100);
  const remaining = s.remaining_tokens ?? (limit - used);
  const nextReset = s.next_reset ? new Date(s.next_reset) : null;
  const resetIn = nextReset
    ? Math.max(0, Math.floor((nextReset.getTime() - Date.now()) / 3600000))
    : null;

  return (
    <div className="flex items-center gap-4">
      <CircularProgress pct={pct} />
      <div className="min-w-0 flex-1">
        <div className="hud-readout text-[13px] font-bold text-[var(--text)]">
          {(remaining > 0 ? remaining : 0).toLocaleString()}
        </div>
        <div className="hud-label text-[8px] text-[var(--text-muted)]">TOKENS RESTANTES</div>
        <div className="hud-label text-[8px] text-[var(--text-faint)] mt-1">
          {resetIn !== null ? `Reset en ~${resetIn}h` : ''}
        </div>
      </div>
    </div>
  );
}
