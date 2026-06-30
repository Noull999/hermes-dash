'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Brain, X, RefreshCw, FolderGit2, CheckCircle2,
  Zap, Clock, Loader2,
} from 'lucide-react';
import { useMemoryStore } from '@/store/useMemoryStore';

const API = '/api/proxy';

interface MemoryData {
  updated_at: string;
  active_projects: string[];
  recent_decisions: string[];
  user_preferences: string[];
  pending_tasks: string[];
  _source: string;
}

function formatRelative(iso: string): string {
  if (!iso) return '—';
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `Hace ${mins}min`;
    const hrs = Math.floor(mins / 60);
    return `Hace ${hrs}h ${mins % 60}min`;
  } catch {
    return '—';
  }
}

export default function MemoryPanel() {
  const open = useMemoryStore((s) => s.open);
  const setOpen = useMemoryStore((s) => s.setOpen);
  const onClose = useCallback(() => setOpen(false), [setOpen]);
  const [data, setData] = useState<MemoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMemory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/memory`);
      if (!res.ok) throw new Error(res.statusText);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchMemory();
  }, [open, fetchMemory]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex justify-end"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-sm h-full bg-[var(--panel-solid)] border-l border-[var(--hairline)] shadow-2xl animate-slide-in overflow-y-auto"
        style={{ backdropFilter: 'blur(14px)' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--hairline)] sticky top-0 bg-[var(--panel-solid)] z-10">
          <div className="flex items-center gap-2">
            <Brain size={16} className="text-[var(--cyan)]" />
            <span className="hud-label text-[9px] text-[var(--text)]">MEMORIA ACTIVA</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={fetchMemory} disabled={loading} className="p-1.5 hover:bg-[rgba(255,255,255,0.06)] rounded transition-colors">
              {loading ? <Loader2 size={14} className="animate-spin text-[var(--text-faint)]" /> : <RefreshCw size={14} className="text-[var(--text-faint)]" />}
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-[rgba(255,255,255,0.06)] rounded transition-colors">
              <X size={16} className="text-[var(--text-faint)]" />
            </button>
          </div>
        </div>

        {error && <div className="px-4 py-3 text-[10px] text-[var(--error)]">{error}</div>}

        {loading && !data && (
          <div className="px-4 py-8 space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-12 w-full" />)}
          </div>
        )}

        {data && (
          <div className="p-4 space-y-5">
            <div className="flex items-center gap-2 text-[9px] text-[var(--text-faint)]">
              <Clock size={10} />
              <span>Actualizado {formatRelative(data.updated_at)}</span>
              {data._source === 'fallback' && (
                <span className="px-1.5 py-0.5 border border-[var(--hairline)] rounded text-[7px]">FALLBACK</span>
              )}
            </div>

            <section>
              <div className="flex items-center gap-2 mb-2">
                <FolderGit2 size={12} className="text-[var(--cyan)]" />
                <span className="hud-label text-[8px] text-[var(--text-faint)]">PROYECTOS ACTIVOS</span>
              </div>
              {data.active_projects.length === 0 ? (
                <p className="text-[10px] text-[var(--text-faint)]">Sin proyectos activos</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {data.active_projects.map((p) => (
                    <span key={p} className="px-2 py-1 text-[10px] border border-[var(--hairline)] rounded bg-[rgba(255,45,85,0.04)] text-[var(--text-muted)]">{p}</span>
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center gap-2 mb-2">
                <Zap size={12} className="text-[var(--amber)]" />
                <span className="hud-label text-[8px] text-[var(--text-faint)]">PREFERENCIAS</span>
              </div>
              {data.user_preferences.length === 0 ? (
                <p className="text-[10px] text-[var(--text-faint)]">Sin preferencias registradas</p>
              ) : (
                <ul className="space-y-1">
                  {data.user_preferences.map((pref, i) => (
                    <li key={i} className="flex items-start gap-2 text-[10px] text-[var(--text-muted)]"><span className="text-[var(--text-faint)] mt-0.5">•</span>{pref}</li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 size={12} className="text-[var(--success)]" />
                <span className="hud-label text-[8px] text-[var(--text-faint)]">DECISIONES RECIENTES</span>
              </div>
              {data.recent_decisions.length === 0 ? (
                <p className="text-[10px] text-[var(--text-faint)]">Sin decisiones registradas</p>
              ) : (
                <ul className="space-y-1.5">
                  {data.recent_decisions.map((d, i) => (
                    <li key={i} className="flex items-start gap-2 text-[10px] text-[var(--text-muted)]"><span className="text-[var(--success)] mt-0.5">✓</span>{d}</li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <div className="flex items-center gap-2 mb-2">
                <Clock size={12} className="text-[var(--warning)]" />
                <span className="hud-label text-[8px] text-[var(--text-faint)]">TAREAS PENDIENTES</span>
              </div>
              {data.pending_tasks.length === 0 ? (
                <p className="text-[10px] text-[var(--text-faint)]">Sin tareas pendientes</p>
              ) : (
                <ul className="space-y-1.5">
                  {data.pending_tasks.map((t, i) => (
                    <li key={i} className="flex items-start gap-2 text-[10px] text-[var(--text-muted)]"><span className="text-[var(--warning)] mt-0.5">○</span>{t}</li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
