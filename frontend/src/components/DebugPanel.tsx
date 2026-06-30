'use client';

import { useState, useEffect, useRef } from 'react';
import { useLogStore, type LogEntry } from '@/store/useLogStore';
import { X, Terminal, AlertTriangle, Info, Bug, Trash2 } from 'lucide-react';

const LEVEL_ICON: Record<string, React.ReactNode> = {
  error: <AlertTriangle size={12} className="text-[var(--error)]" />,
  warn: <AlertTriangle size={12} className="text-[var(--warning)]" />,
  info: <Info size={12} className="text-[var(--cyan)]" />,
};

const LEVEL_COLOR: Record<string, string> = {
  error: 'text-[var(--error)]',
  warn: 'text-[var(--warning)]',
  info: 'text-[var(--text-muted)]',
};

export default function DebugPanel() {
  const [open, setOpen] = useState(false);
  const entries = useLogStore((s) => s.entries);
  const clear = useLogStore((s) => s.clear);
  const [filter, setFilter] = useState<string>('all');
  const bottomRef = useRef<HTMLDivElement>(null);

  const filtered = filter === 'all'
    ? entries
    : entries.filter((e) => e.source === filter || e.level === filter);

  // Long-press / 5 taps handler
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTitleTap = () => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    if (tapCountRef.current >= 5) {
      setOpen(true);
      tapCountRef.current = 0;
    } else {
      tapTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0;
      }, 1500);
    }
  };

  if (!open) {
    return (
      <button
        onClick={handleTitleTap}
        className="fixed bottom-20 right-3 z-50 p-2 rounded-full bg-[var(--card)] border border-[var(--hairline)] text-[var(--text-muted)] hover:text-[var(--text)] opacity-40 hover:opacity-100 transition-all"
        title="Toca 5 veces para abrir logs de debug"
      >
        <Bug size={16} />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[var(--void)]/95 backdrop-blur-md flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--hairline)]">
        <div className="flex items-center gap-2">
          <Terminal size={16} className="text-[var(--cyan)]" />
          <h2 className="text-sm font-semibold text-[var(--text)]">DEBUG LOGS</h2>
          <span className="text-[10px] text-[var(--text-faint)]">
            {entries.length} eventos
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clear}
            className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.06)] text-[var(--text-muted)] hover:text-[var(--text)]"
            title="Limpiar logs"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.06)] text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 px-4 py-2 border-b border-[var(--hairline)] overflow-x-auto">
        {['all', 'error', 'warn', 'api', 'ws', 'gateway', 'system'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wider font-mono whitespace-nowrap transition-all ${
              filter === f
                ? 'bg-[var(--cyan)]/20 text-[var(--cyan)] border border-[rgba(255,45,85,0.2)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text)] border border-transparent'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Log entries */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5 font-mono text-[11px]">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[var(--text-faint)]">
            <p>Sin eventos</p>
            <p className="text-[10px] mt-1">Los errores aparecerán aquí automáticamente</p>
          </div>
        ) : (
          filtered.map((entry) => (
            <LogRow key={entry.id} entry={entry} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-[var(--hairline)] text-[9px] text-[var(--text-faint)] text-center">
        Toca 5 veces el ícono de bug para abrir · Los logs no persisten al recargar
      </div>
    </div>
  );
}

function LogRow({ entry }: { entry: LogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const time = entry.timestamp.toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div
      className={`px-2 py-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.03)] cursor-pointer ${
        entry.level === 'error' ? 'bg-[rgba(255,93,108,0.04)]' : ''
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-2">
        <span className="text-[var(--text-faint)] shrink-0 w-14">{time}</span>
        <span className="shrink-0">{LEVEL_ICON[entry.level]}</span>
        <span className="text-[9px] uppercase text-[var(--text-faint)] shrink-0 w-12">
          [{entry.source}]
        </span>
        <span className={`truncate ${LEVEL_COLOR[entry.level]}`}>
          {entry.message}
        </span>
      </div>
      {expanded && entry.details && (
        <pre className="mt-1 ml-[4.5rem] text-[10px] text-[var(--text-faint)] whitespace-pre-wrap break-all bg-[rgba(0,0,0,0.3)] p-2 rounded-lg">
          {entry.details}
        </pre>
      )}
    </div>
  );
}
