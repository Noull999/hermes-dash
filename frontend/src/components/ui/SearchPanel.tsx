'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, MessageSquare, Loader2 } from 'lucide-react';
import { useSearchStore } from '@/store/useSearchStore';

const API = '/api/proxy';

interface SearchResult {
  session_id: string;
  session_title: string;
  snippet: string;
  role: string;
  timestamp: string;
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-[var(--cyan)] font-semibold">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-CL', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export default function SearchPanel() {
  const router = useRouter();
  const open = useSearchStore((s) => s.open);
  const setOpen = useSearchStore((s) => s.setOpen);
  const onClose = useCallback(() => setOpen(false), [setOpen]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`${API}/api/sessions/search?q=${encodeURIComponent(q.trim())}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, doSearch]);

  // Focus input on open
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  // Global Escape to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handleSelectResult = (sessionId: string) => {
    onClose();
    router.push('/');
    // TODO: load session via WebSocket
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center pt-[10vh] px-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border border-[var(--hairline)] animate-in fade-in slide-in-from-top-4 duration-200"
        style={{ background: 'var(--card)' }}
      >
        {/* ── Header / Input ── */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--hairline)]">
          <Search size={16} className="text-[var(--text-faint)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar en todas las conversaciones…"
            className="flex-1 bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-faint)]"
            autoComplete="off"
            spellCheck={false}
          />
          {loading && <Loader2 size={14} className="animate-spin text-[var(--text-faint)]" />}
          {query && (
            <button onClick={() => { setQuery(''); setResults([]); setSearched(false); }} className="p-1 hover:bg-[rgba(255,255,255,0.06)] rounded">
              <X size={14} className="text-[var(--text-faint)]" />
            </button>
          )}
        </div>

        {/* ── Results ── */}
        <div className="max-h-[400px] overflow-y-auto">
          {!searched && (
            <div className="px-4 py-8 text-center">
              <MessageSquare size={24} className="mx-auto mb-2 text-[var(--text-faint)]" />
              <p className="text-xs text-[var(--text-faint)]">Escribe para buscar en tus conversaciones</p>
            </div>
          )}

          {searched && !loading && results.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-xs text-[var(--text-faint)]">
                Sin resultados para <span className="text-[var(--text-muted)]">&quot;{query}&quot;</span>
              </p>
            </div>
          )}

          {results.length > 0 && (
            <div className="py-2">
              <div className="hud-label text-[8px] text-[var(--text-faint)] px-4 py-1.5">
                {results.length} RESULTADOS
              </div>
              {results.map((r, i) => (
                <div
                  key={`${r.session_id}-${i}`}
                  onClick={() => handleSelectResult(r.session_id)}
                  className="px-4 py-3 cursor-pointer hover:bg-[rgba(0,212,255,0.05)] transition-colors border-b border-[var(--hairline)] last:border-0"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-medium text-[var(--text)] truncate">
                      {r.session_title}
                    </span>
                    <span className="hud-label text-[7px] text-[var(--text-faint)] shrink-0">
                      {r.role === 'user' ? 'TÚ' : 'HERMES'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                    {highlightMatch(r.snippet, query)}
                  </p>
                  <div className="hud-label text-[7px] text-[var(--text-faint)] mt-1">
                    {formatTime(r.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
