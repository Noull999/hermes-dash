'use client';

import { useChatStore } from '@/store/useChatStore';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

const STATUS_META: Record<string, { label: string; color: string }> = {
  connected: { label: 'CONECTADO', color: 'var(--success)' },
  connecting: { label: 'CONECTANDO…', color: 'var(--amber)' },
  disconnected: { label: 'DESCONECTADO', color: 'var(--error)' },
  timeout: { label: 'TIMEOUT', color: 'var(--error)' },
};

export default function ConnectionCard() {
  const connectionStatus = useChatStore((s) => s.connectionStatus);
  const connect = useChatStore((s) => s.connect);
  const meta = STATUS_META[connectionStatus] || STATUS_META.disconnected;
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || '(mismo origen)';

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {connectionStatus === 'connected' ? (
            <Wifi size={14} style={{ color: meta.color }} />
          ) : (
            <WifiOff size={14} style={{ color: meta.color }} />
          )}
          <span className="text-sm font-mono tracking-wider" style={{ color: meta.color }}>
            {meta.label}
          </span>
        </div>
        <button
          onClick={() => connect()}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-[var(--hairline)] text-[10px] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[rgba(255,45,85,0.06)] transition-all"
        >
          <RefreshCw size={10} />
          RECONECTAR
        </button>
      </div>
      <div className="text-[10px] text-[var(--text-faint)] font-mono break-all">
        {wsUrl}
      </div>
    </div>
  );
}
