'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import OrbCanvas from '@/components/orb/OrbCanvas';
import Message from '@/components/chat/Message';
import InputBox from '@/components/chat/InputBox';
import VoiceButton from '@/components/chat/VoiceButton';
import SessionsPanel from '@/components/chat/SessionsPanel';
import { useChatStore } from '@/store/useChatStore';
import { useHermesStore } from '@/store/useHermesStore';
import { getTimeOfDay, classNames } from '@/lib/utils';
import DebugPanel from '@/components/DebugPanel';
import {
  Wifi, WifiOff, Mic, Sparkles, Search,
  BarChart3, FolderGit2, Mail, CalendarDays, Briefcase, Brain, Settings,
} from 'lucide-react';

const STATE_LABEL: Record<string, string> = {
  idle: 'STANDBY',
  processing: 'PROCESANDO',
  success: 'COMPLETADO',
  error: 'ALERTA',
};

const navTabs = [
  { href: '/', label: 'HOME', Icon: Sparkles },
  { href: '/dashboard', label: 'PANEL', Icon: BarChart3 },
  { href: '/email', label: 'MAIL', Icon: Mail },
  { href: '/calendar', label: 'CAL', Icon: CalendarDays },
  { href: '/repos', label: 'REPOS', Icon: FolderGit2 },
  { href: '/jobs', label: 'JOBS', Icon: Briefcase },
  { href: '/brain', label: 'BRAIN', Icon: Brain },
  { href: '/settings', label: 'SYS', Icon: Settings },
];

export default function HomePage() {
  const pathname = usePathname();

  // ── Chat ──
  const messages = useChatStore((s) => s.messages);
  const isConnected = useChatStore((s) => s.isConnected);
  const connectionStatus = useChatStore((s) => s.connectionStatus);
  const isTyping = useChatStore((s) => s.isTyping);
  const connect = useChatStore((s) => s.connect);
  const disconnect = useChatStore((s) => s.disconnect);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Orb ──
  const orbState = useHermesStore((s) => s.orbState);
  const health = useHermesStore((s) => s.health);
  const greeting = getTimeOfDay();
  const online = health?.status === 'ok';
  const healthLoaded = health !== null;

  // ── Voice ──
  const [micActive, setMicActive] = useState(false);
  const [orbCompact, setOrbCompact] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const hasMessages = messages.length > 0;

  // ── Sessions ──
  const [currentSessionId, setCurrentSessionId] = useState('');

  // ── Drag & Drop ──
  const [dragOver, setDragOver] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<{
    type: 'image' | 'text';
    filename: string;
    content: string;
    mime?: string;
  } | null>(null);

  const handleSelectSession = useCallback((id: string) => {
    setCurrentSessionId(id);
    // Clear messages on session switch (WS reconnect will load history)
    useChatStore.getState().clearMessages();
  }, []);

  // Auto-connect
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Detect scroll to compact the orb
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => {
      setOrbCompact(el.scrollTop > 60);
    };
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, []);

  // Voice → auto-send (estable con useCallback)
  const handleVoiceResult = useCallback((text: string) => {
    if (text.trim()) {
      sendMessage(text.trim(), { source: 'voice' });
    }
  }, [sendMessage]);

  // ── Drag & Drop handlers ──
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (!files.length) return;

    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/proxy/api/upload', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer dev-token' },
        body: formData,
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.type === 'image' || data.type === 'text') {
        setPendingAttachment({
          type: data.type,
          filename: data.filename,
          content: data.type === 'image' ? data.base64 : data.content,
          mime: data.mime,
        });
      }
    } catch {
      // silently fail
    }
  }, []);

  const orbHeight = orbCompact ? 'h-0 overflow-hidden' : 'h-[200px]';

  return (
    <div className="flex flex-col h-dvh bg-[var(--void)]">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[rgba(255,255,255,0.04)] z-10 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold tracking-[0.18em] text-[var(--text)]">
            HERMES
          </span>
          {connectionStatus === 'connected' ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] shadow-[0_0_6px_var(--success)]" />
              <span className="text-[9px] text-[var(--text-muted)] hidden sm:inline">ON</span>
            </>
          ) : connectionStatus === 'connecting' ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--warning)] animate-pulse" />
              <span className="text-[9px] text-[var(--warning)] hidden sm:inline">CONECTANDO</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--error)]" />
              <span className="text-[9px] text-[var(--error)] hidden sm:inline">SIN CONEXIÓN</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Command Palette trigger */}
          <button
            onClick={() => {
              window.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'k', metaKey: true, bubbles: true,
              }));
            }}
            className="flex items-center gap-1.5 px-2 py-1 border border-[var(--hairline)] rounded text-[var(--text-faint)] hover:text-[var(--text-muted)] transition-all sm:px-2"
            title="Buscar (Cmd+K)"
          >
            <Search size={12} />
            <span className="hidden sm:inline hud-label text-[9px]">CMD+K</span>
          </button>
          <SessionsPanel
            currentSessionId={currentSessionId}
            onSelectSession={handleSelectSession}
          />
          {micActive && (
            <span className="text-[11px] text-[var(--cyan)] flex items-center gap-1 animate-pulse">
              <Mic size={10} />
              ESCUCHANDO
            </span>
          )}
          <VoiceButton
            onResult={handleVoiceResult}
            disabled={isTyping}
            onActiveChange={setMicActive}
          />
        </div>
      </div>

      {/* ── Banner de conexión ── */}
      {(connectionStatus === 'timeout' || connectionStatus === 'disconnected') && (
        <div className="flex items-center justify-between px-4 py-1.5 bg-[rgba(255,93,108,0.08)] border-b border-[rgba(255,93,108,0.15)] shrink-0">
          <div className="flex items-center gap-2">
            <WifiOff size={12} className="text-[var(--error)]" />
            <span className="text-[10px] text-[var(--error)]">
              {connectionStatus === 'timeout'
                ? 'No se pudo conectar al servidor'
                : 'Servidor no disponible'}
            </span>
          </div>
          <button
            onClick={() => connect()}
            className="text-[10px] px-2 py-0.5 rounded border border-[rgba(255,93,108,0.3)] text-[var(--error)] hover:bg-[rgba(255,93,108,0.1)] transition-all"
          >
            RECONECTAR
          </button>
        </div>
      )}

      {/* ── Drop zone overlay ── */}
      {dragOver && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
          <div className="rounded-2xl border-2 border-dashed border-[var(--cyan)] bg-[rgba(0,212,255,0.06)] backdrop-blur-sm px-8 py-6 text-center">
            <p className="text-sm text-[var(--cyan)] font-semibold">📎 Suelta el archivo</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-1">PDF, PNG, JPG, TXT, código...</p>
          </div>
        </div>
      )}

      {/* ── Scrollable content ── */}
      <div
        ref={scrollRef}
        className={`flex-1 overflow-y-auto transition-all ${dragOver ? 'bg-[rgba(0,212,255,0.03)]' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {/* ── Orb hero ── */}
        <div
          className={classNames(
            'relative transition-all duration-300 ease-out',
            orbHeight,
          )}
        >
          <div className="absolute inset-0">
            <OrbCanvas />
          </div>

          {/* Reticle */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="reticle w-[168px] h-[168px] rounded-full border border-[var(--hairline)]" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="reticle-rev w-[132px] h-[132px] rounded-full border border-dashed border-[rgba(79,227,255,0.15)]" />
          </div>

          {/* Corner telemetry */}
          <div className="absolute top-2 left-3 hud-label text-[7px] text-[var(--text-faint)]">
            SYS.HERMES//v2
          </div>
          <div className="absolute top-2 right-3 hud-label text-[7px] text-[var(--text-faint)]">
            PTO.MONTT · CL
          </div>

          {/* Scrim */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[var(--void)] via-transparent to-transparent" />

          {/* Overlay status */}
          <div className="absolute inset-0 flex flex-col justify-end items-center px-5 pb-3 text-center pointer-events-none">
            <div className="hud-label text-[8px] mb-0.5">{greeting}</div>
            <h1 className="text-lg font-bold tracking-[0.18em] text-[var(--text)] glow-text">
              JOSÉ
            </h1>
            <div className="mt-1.5 flex items-center justify-center gap-2">
              <span
                className={classNames(
                  'inline-flex items-center gap-1 px-2 h-5 border rounded-[2px] text-[9px] font-mono tracking-[0.14em]',
                  orbState === 'error'
                    ? 'border-[rgba(255,93,108,0.3)] text-[var(--error)]'
                    : orbState === 'success'
                    ? 'border-[rgba(93,255,176,0.3)] text-[var(--success)]'
                    : 'border-[var(--hairline-strong)] text-[var(--cyan)]',
                )}
              >
                <span className="w-1 h-1 rounded-full bg-current animate-pulse" />
                {STATE_LABEL[orbState] || 'STANDBY'}
              </span>
              <span
                className={classNames(
                  'inline-flex items-center gap-1 px-2 h-5 border rounded-[2px] text-[9px] font-mono tracking-[0.14em]',
                  !healthLoaded
                    ? 'border-[var(--hairline-strong)] text-[var(--text-muted)]'
                    : online
                    ? 'border-[rgba(93,255,176,0.3)] text-[var(--success)]'
                    : 'border-[rgba(255,93,108,0.3)] text-[var(--error)]',
                )}
              >
                <span className="w-1 h-1 rounded-full bg-current" />
                {!healthLoaded ? '---' : online ? 'API OK' : 'API ERR'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Messages ── */}
        <div className="px-4 py-4 space-y-4 pb-[132px]">
          {!hasMessages ? (
            <div className="flex flex-col items-center text-center px-6 pt-4">
              <p className="text-sm text-[var(--text-muted)] max-w-xs leading-relaxed mb-6">
                {micActive
                  ? '🎤 Te escucho, di lo que necesites'
                  : 'Presiona el micrófono y habla, o escribe tu mensaje'}
              </p>

              {/* Sugerencias */}
              <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
                {[
                  { label: '¿Qué puedes hacer?', icon: '✨' },
                  { label: 'Estado del sistema', icon: '🖥️' },
                  { label: 'Resume mi día', icon: '📋' },
                  { label: 'Abre el dashboard', icon: '📊' },
                ].map((sug) => (
                  <button
                    key={sug.label}
                    onClick={() => sendMessage(sug.label)}
                    className="glass text-left px-3 py-2.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[rgba(0,212,255,0.15)] transition-all"
                  >
                    <span className="mr-1.5">{sug.icon}</span>
                    {sug.label}
                  </button>
                ))}
              </div>

              {micActive && (
                <div className="mt-6 px-4 py-2 rounded-xl bg-[rgba(0,212,255,0.06)] border border-[rgba(0,212,255,0.1)] text-xs text-[var(--cyan)]">
                  🎤 Habla normalmente, te escucho
                </div>
              )}
            </div>
          ) : (
            messages.map((msg) => (
              <Message key={msg.id} message={msg} />
            ))
          )}

          {isTyping && (
            <div className="flex gap-3 fade-in">
              <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-[rgba(139,92,246,0.15)] flex items-center justify-center overflow-hidden">
                <img src="/hermes-avatar.svg" alt="Hermes" className="w-6 h-6" />
              </div>
              <div className="bg-[var(--card)] border border-[rgba(255,255,255,0.06)] rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Input ── */}
      <div className="shrink-0 pb-[60px] bg-[var(--void)]">
        <InputBox
          attachment={pendingAttachment}
          onRemoveAttachment={() => setPendingAttachment(null)}
        />
      </div>

      {/* ── Bottom Nav ── */}
      <DebugPanel />
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--void)]/92 backdrop-blur-xl border-t border-[var(--hairline)] safe-area-bottom">
        <div className="max-w-lg mx-auto flex items-center justify-between h-[60px] px-1">
          {navTabs.map(({ href, label, Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={classNames(
                  'group relative flex flex-1 flex-col items-center gap-1 px-0.5 py-1.5 transition-all duration-200',
                  isActive
                    ? 'text-[var(--cyan)]'
                    : 'text-[var(--text-faint)] hover:text-[var(--text-muted)]',
                )}
              >
                <span
                  className={classNames(
                    'absolute top-0 left-1/2 -translate-x-1/2 h-[2px] rounded-full transition-all duration-300',
                    isActive
                      ? 'w-7 bg-[var(--cyan)] shadow-[0_0_8px_var(--cyan)]'
                      : 'w-0 bg-transparent',
                  )}
                />
                <Icon
                  size={19}
                  className={classNames(
                    'transition-all duration-200',
                    isActive && 'drop-shadow-[0_0_6px_var(--cyan)]',
                  )}
                />
                <span className="hud-label text-[8px] leading-none">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
