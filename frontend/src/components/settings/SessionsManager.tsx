'use client';

import { useEffect, useState, useCallback } from 'react';
import { getSessions, deleteSession, SessionInfo } from '@/lib/api';
import { Trash2, MessageSquare, RefreshCw } from 'lucide-react';

export default function SessionsManager() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getSessions()
      .then(setSessions)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error al cargar sesiones'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch {
      // no-op: el usuario puede reintentar
    } finally {
      setDeletingId(null);
    }
  };

  if (loading && sessions.length === 0) {
    return <div className="text-xs text-[var(--text-faint)]">Cargando sesiones…</div>;
  }

  if (error && sessions.length === 0) {
    return <div className="text-xs text-[var(--error)]">{error}</div>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="hud-label text-[9px] text-[var(--text-faint)]">
          {sessions.length} sesión{sessions.length !== 1 ? 'es' : ''} guardada{sessions.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={load}
          className="btn-action w-6 h-6 flex items-center justify-center rounded border border-[var(--hairline)] hover:bg-[rgba(255,45,85,0.06)] transition-all"
          title="Refrescar"
        >
          <RefreshCw size={11} className="text-[var(--text-faint)]" />
        </button>
      </div>

      {sessions.length === 0 ? (
        <p className="text-[11px] text-[var(--text-faint)] text-center py-4">
          Sin sesiones guardadas todavía.
        </p>
      ) : (
        <div className="max-h-[320px] overflow-y-auto space-y-1.5">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="group flex items-start gap-2 px-3 py-2 rounded border border-[var(--hairline)] bg-[rgba(0,0,0,0.15)]"
            >
              <MessageSquare size={12} className="text-[var(--text-faint)] shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-[var(--text)] truncate font-medium">{s.title}</p>
                <p className="text-[9px] text-[var(--text-faint)] mt-0.5">
                  {s.message_count} mensajes · {new Date(s.updated_at).toLocaleString('es-CL', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
                {s.preview && (
                  <p className="text-[9px] text-[var(--text-muted)] mt-1 line-clamp-1">{s.preview}</p>
                )}
              </div>
              <button
                onClick={() => handleDelete(s.id)}
                disabled={deletingId === s.id}
                className="shrink-0 w-6 h-6 flex items-center justify-center rounded text-[var(--error)] opacity-0 group-hover:opacity-100 hover:bg-[rgba(255,93,108,0.08)] transition-all disabled:opacity-40"
                title="Eliminar sesión"
              >
                {deletingId === s.id ? (
                  <RefreshCw size={11} className="animate-spin" />
                ) : (
                  <Trash2 size={11} />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
