'use client';

import { useState, useEffect } from 'react';
import { getSessions, deleteSession, SessionInfo } from '@/lib/api';
import { wsClient } from '@/lib/ws';

interface Props {
  currentSessionId: string;
  onSelectSession: (id: string) => void;
}

const SESSION_KEY = 'hermes_chat_session_id';

export default function SessionsPanel({ currentSessionId, onSelectSession }: Props) {
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getSessions()
      .then(setSessions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  const handleSelect = (id: string) => {
    localStorage.setItem(SESSION_KEY, id);
    onSelectSession(id);
    setOpen(false);
    // Force reconnect with new session
    wsClient.disconnect();
    wsClient.connect();
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteSession(id).catch(() => {});
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const handleNew = () => {
    localStorage.removeItem(SESSION_KEY);
    onSelectSession('');
    setOpen(false);
    wsClient.disconnect();
    wsClient.connect();
  };

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border border-[var(--hairline-strong)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--cyan)]/30 transition-all"
        title="Historial de sesiones"
      >
        📋 <span className="hidden sm:inline">SESIONES</span>
      </button>

      {/* Panel overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div className="relative ml-auto w-80 max-w-[85vw] h-full bg-[var(--card)] border-l border-[var(--hairline-strong)] overflow-y-auto animate-slide-in">
            <div className="sticky top-0 z-10 bg-[var(--card)]/95 backdrop-blur-sm border-b border-[var(--hairline-strong)] px-4 py-3 flex items-center justify-between">
              <h2 className="text-xs font-semibold tracking-wider">📋 SESIONES</h2>
              <div className="flex gap-2">
                <button
                  onClick={handleNew}
                  className="text-[10px] px-2 py-1 rounded border border-[var(--hairline-strong)] text-[var(--cyan)] hover:bg-[rgba(0,212,255,0.06)] transition-all"
                >
                  + NUEVA
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="text-[10px] px-2 py-1 rounded border border-[var(--hairline-strong)] text-[var(--text-muted)] hover:text-[var(--text)] transition-all"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-3 space-y-2">
              {loading ? (
                <p className="text-[11px] text-[var(--text-muted)] text-center py-8">Cargando...</p>
              ) : sessions.length === 0 ? (
                <p className="text-[11px] text-[var(--text-faint)] text-center py-8">Sin sesiones anteriores</p>
              ) : (
                sessions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => handleSelect(s.id)}
                    className={`group cursor-pointer rounded-xl px-3 py-2.5 border transition-all ${
                      s.id === currentSessionId
                        ? 'border-[var(--cyan)]/30 bg-[rgba(0,212,255,0.04)]'
                        : 'border-transparent hover:bg-[rgba(255,255,255,0.02)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium text-[var(--text)] truncate">
                          {s.title}
                        </p>
                        <p className="text-[9px] text-[var(--text-faint)] mt-0.5">
                          {s.message_count} mensajes · {new Date(s.updated_at).toLocaleString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {s.preview && (
                          <p className="text-[9px] text-[var(--text-muted)] mt-1 line-clamp-1">
                            {s.preview}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={(e) => handleDelete(s.id, e)}
                        className="opacity-0 group-hover:opacity-100 text-[9px] px-1.5 py-0.5 rounded text-[var(--error)] hover:bg-[rgba(255,93,108,0.08)] transition-all"
                        title="Eliminar sesión"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
