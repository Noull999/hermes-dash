'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Plus, BarChart3, Mail, CalendarDays, FolderGit2, Brain,
  Briefcase, Settings, Wifi, Mic, ArrowUp, ArrowDown,
} from 'lucide-react';
import { useChatStore } from '@/store/useChatStore';
import { useSearchStore } from '@/store/useSearchStore';

// ── Types ──────────────────────────────────────────────────────────────────
interface Command {
  id: string;
  label: string;
  keywords: string[];
  icon: React.ElementType;
  section: string;
  action: () => void;
}

// ── Built-in commands ──────────────────────────────────────────────────────
function useCommands() {
  const router = useRouter();

  return useMemo<Command[]>(() => [
    {
      id: 'new-session',
      label: 'Nueva sesión',
      keywords: ['nueva', 'sesion', 'nuevo', 'chat', 'clear', 'limpiar', 'empezar'],
      icon: Plus,
      section: 'Acciones',
      action: () => useChatStore.getState().clearMessages(),
    },
    {
      id: 'go-dashboard',
      label: 'Ir a Dashboard',
      keywords: ['dashboard', 'panel', 'estadisticas', 'graficos', 'dashboard'],
      icon: BarChart3,
      section: 'Navegación',
      action: () => router.push('/dashboard'),
    },
    {
      id: 'go-email',
      label: 'Ir a Email',
      keywords: ['email', 'mail', 'correo', 'gmail', 'mensajes', 'inbox'],
      icon: Mail,
      section: 'Navegación',
      action: () => router.push('/email'),
    },
    {
      id: 'go-calendar',
      label: 'Ir a Calendario',
      keywords: ['calendario', 'calendar', 'eventos', 'agenda', 'dia'],
      icon: CalendarDays,
      section: 'Navegación',
      action: () => router.push('/calendar'),
    },
    {
      id: 'go-repos',
      label: 'Ir a Repositorios',
      keywords: ['repos', 'repositorios', 'github', 'git', 'codigo', 'source'],
      icon: FolderGit2,
      section: 'Navegación',
      action: () => router.push('/repos'),
    },
    {
      id: 'go-brain',
      label: 'Ir a Brain',
      keywords: ['brain', 'notas', 'cerebro', 'ideas', 'memoria'],
      icon: Brain,
      section: 'Navegación',
      action: () => router.push('/brain'),
    },
    {
      id: 'go-jobs',
      label: 'Ir a Jobs',
      keywords: ['jobs', 'trabajos', 'cron', 'tareas', 'automatizaciones'],
      icon: Briefcase,
      section: 'Navegación',
      action: () => router.push('/jobs'),
    },
    {
      id: 'go-settings',
      label: 'Ir a Configuración',
      keywords: ['configuracion', 'settings', 'ajustes', 'preferencias', 'sys'],
      icon: Settings,
      section: 'Navegación',
      action: () => router.push('/settings'),
    },
    {
      id: 'reconnect',
      label: 'Reconectar WebSocket',
      keywords: ['reconectar', 'websocket', 'conectar', 'ws', 'reconnect', 'online'],
      icon: Wifi,
      section: 'Acciones',
      action: () => useChatStore.getState().connect(),
    },
    {
      id: 'search-chat',
      label: 'Buscar en conversaciones',
      keywords: ['buscar', 'search', 'conversaciones', 'historial', 'mensajes', 'encuentra'],
      icon: Search,
      section: 'Acciones',
      action: () => { useSearchStore.getState().setOpen(true); },
    },
    {
      id: 'toggle-voice',
      label: 'Modo TAP / AUTO',
      keywords: ['voz', 'voice', 'modo', 'tap', 'auto', 'microfono', 'audio'],
      icon: Mic,
      section: 'Acciones',
      action: () => {
        const current = localStorage.getItem('voice_mode') || 'tap';
        const next = current === 'tap' ? 'auto' : 'tap';
        localStorage.setItem('voice_mode', next);
      },
    },
  ], [router]);
}

// ── Highlight matching substring ──────────────────────────────────────────
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-[var(--cyan)] font-semibold">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

// ── CommandPalette ─────────────────────────────────────────────────────────
export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const allCommands = useCommands();

  // Filtered commands
  const filtered = useMemo(() => {
    if (!query.trim()) return allCommands;
    const q = query.toLowerCase().trim();
    return allCommands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.keywords.some((kw) => kw.toLowerCase().includes(q)),
    );
  }, [query, allCommands]);

  // Reset index when results change
  useEffect(() => { setActiveIdx(0); }, [filtered.length]);

  // Execute selected command
  const execute = useCallback((cmd: Command) => {
    setOpen(false);
    setQuery('');
    setTimeout(() => cmd.action(), 50); // small delay so palette closes first
  }, []);

  // Keyboard handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((prev) => (prev + 1) % filtered.length);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((prev) => (prev - 1 + filtered.length) % filtered.length);
      return;
    }
    if (e.key === 'Enter' && filtered[activeIdx]) {
      e.preventDefault();
      execute(filtered[activeIdx]);
      return;
    }
  }, [filtered, activeIdx, execute]);

  // Auto-scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector<HTMLDivElement>('[data-active="true"]');
    activeEl?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
        setQuery('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Group filtered by section
  const sections = useMemo(() => {
    const map = new Map<string, Command[]>();
    for (const cmd of filtered) {
      const list = map.get(cmd.section) || [];
      list.push(cmd);
      map.set(cmd.section, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) { setOpen(false); setQuery(''); }
      }}
    >
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-[var(--hairline)] animate-in fade-in slide-in-from-top-4 duration-200"
        style={{ background: 'var(--card)' }}
      >
        {/* ── Input ── */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--hairline)]">
          <Search size={16} className="text-[var(--text-faint)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar comandos…"
            className="flex-1 bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-faint)]"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-mono text-[var(--text-faint)] border border-[var(--hairline)] rounded">
            <span className="text-[10px]">⌘</span>K
          </kbd>
        </div>

        {/* ── Results ── */}
        <div ref={listRef} className="max-h-[360px] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-[var(--text-faint)]">
                Sin resultados para <span className="text-[var(--text-muted)]">&quot;{query}&quot;</span>
              </p>
            </div>
          ) : (
            sections.map(([section, cmds]) => (
              <div key={section}>
                <div className="hud-label text-[8px] text-[var(--text-faint)] px-4 py-1.5 tracking-wider">
                  {section.toUpperCase()}
                </div>
                {cmds.map((cmd, i) => {
                  const globalIdx = filtered.indexOf(cmd);
                  const isActive = globalIdx === activeIdx;
                  const Icon = cmd.icon;
                  return (
                    <div
                      key={cmd.id}
                      data-active={isActive ? 'true' : undefined}
                      onMouseDown={() => execute(cmd)}
                      onMouseEnter={() => setActiveIdx(globalIdx)}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-[rgba(0,212,255,0.12)] text-[var(--cyan)]'
                          : 'text-[var(--text)] hover:bg-[rgba(0,212,255,0.06)]'
                      }`}
                    >
                      <Icon size={15} className="shrink-0 opacity-70" />
                      <span className="text-sm flex-1 truncate">
                        <HighlightMatch text={cmd.label} query={query} />
                      </span>
                      {isActive && (
                        <div className="flex items-center gap-1 text-[9px] text-[var(--text-faint)]">
                          <ArrowUp size={10} />
                          <ArrowDown size={10} />
                          <span className="ml-1">↵</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--hairline)]">
          <div className="flex items-center gap-3">
            <kbd className="hud-readout text-[8px] text-[var(--text-faint)] bg-[rgba(255,255,255,0.04)] px-1.5 py-0.5 rounded">↑↓</kbd>
            <span className="text-[9px] text-[var(--text-faint)]">Navegar</span>
          </div>
          <div className="flex items-center gap-3">
            <kbd className="hud-readout text-[8px] text-[var(--text-faint)] bg-[rgba(255,255,255,0.04)] px-1.5 py-0.5 rounded">↵</kbd>
            <span className="text-[9px] text-[var(--text-faint)]">Ejecutar</span>
          </div>
          <div className="flex items-center gap-3">
            <kbd className="hud-readout text-[8px] text-[var(--text-faint)] bg-[rgba(255,255,255,0.04)] px-1.5 py-0.5 rounded">Esc</kbd>
            <span className="text-[9px] text-[var(--text-faint)]">Cerrar</span>
          </div>
        </div>
      </div>
    </div>
  );
}
