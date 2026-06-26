'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Message from '@/components/chat/Message';
import InputBox from '@/components/chat/InputBox';
import VoiceButton from '@/components/chat/VoiceButton';
import { useChatStore } from '@/store/useChatStore';
import {
  Wifi, WifiOff, Mic, Sparkles,
  BarChart3, FolderGit2, Mail, CalendarDays, Briefcase, Brain, Settings,
} from 'lucide-react';
import { classNames } from '@/lib/utils';

const navTabs = [
  { href: '/', label: 'CHAT', Icon: Sparkles },
  { href: '/dashboard', label: 'PANEL', Icon: BarChart3 },
  { href: '/email', label: 'MAIL', Icon: Mail },
  { href: '/calendar', label: 'CAL', Icon: CalendarDays },
  { href: '/repos', label: 'REPOS', Icon: FolderGit2 },
  { href: '/jobs', label: 'JOBS', Icon: Briefcase },
  { href: '/brain', label: 'BRAIN', Icon: Brain },
  { href: '/settings', label: 'SYS', Icon: Settings },
];

export default function HomePage() {
  const messages = useChatStore((s) => s.messages);
  const isConnected = useChatStore((s) => s.isConnected);
  const isTyping = useChatStore((s) => s.isTyping);
  const connect = useChatStore((s) => s.connect);
  const disconnect = useChatStore((s) => s.disconnect);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // ── Auto-connect ──
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  // ── Auto-scroll ──
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // ── Voice state ──
  const [micActive, setMicActive] = useState(false);

  // Voice result → auto-send directo
  const handleVoiceResult = (text: string) => {
    if (text.trim()) {
      sendMessage(text.trim());
    }
  };

  return (
    <div className="flex flex-col h-dvh bg-[var(--void)]">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[rgba(255,255,255,0.04)] z-10">
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <Wifi size={12} className="text-[var(--success)]" />
              <span className="text-[11px] text-[var(--success)]">HERMES</span>
            </>
          ) : (
            <>
              <WifiOff size={12} className="text-[var(--error)]" />
              <span className="text-[11px] text-[var(--error)]">OFF</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {micActive && (
            <span className="text-[11px] text-[var(--cyan)] flex items-center gap-1 animate-pulse">
              <Mic size={10} />
              ESCUCHANDO
            </span>
          )}
          <VoiceButton
            onResult={handleVoiceResult}
            autoStart={messages.length === 0}
            onActiveChange={setMicActive}
          />
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-[68px]">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-[rgba(0,212,255,0.06)] flex items-center justify-center mb-6 overflow-hidden border border-[rgba(0,212,255,0.1)] shadow-[0_0_30px_rgba(0,212,255,0.06)]">
              <img src="/hermes-avatar.svg" alt="Hermes" className="w-20 h-20" />
            </div>

            <h2 className="text-xl font-bold tracking-[0.12em] text-[var(--text)] mb-2">
              HERMES
            </h2>
            <p className="text-sm text-[var(--text-muted)] max-w-xs leading-relaxed mb-8">
              {micActive
                ? '🎤 Te escucho, di lo que necesites'
                : 'Presiona el micrófono y habla, o escribe tu mensaje'}
            </p>

            {/* Sugerencias rápidas */}
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
              <div className="mt-8 px-4 py-2 rounded-xl bg-[rgba(0,212,255,0.06)] border border-[rgba(0,212,255,0.1)] text-xs text-[var(--cyan)]">
                🎤 Micrófono activo — habla normalmente
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

      {/* ── Input ── */}
      <div className="pb-[60px]">
        <InputBox />
      </div>

      {/* ── Bottom Nav ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--void)]/92 backdrop-blur-xl border-t border-[var(--hairline)] safe-area-bottom">
        <div className="max-w-lg mx-auto flex items-center justify-start overflow-x-auto gap-0.5 h-[60px] px-2 scrollbar-none snap-x snap-mandatory">
          {navTabs.map(({ href, label, Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={classNames(
                  'group relative flex flex-col items-center gap-1 px-2.5 py-1.5 transition-all duration-200 snap-start flex-shrink-0',
                  isActive ? 'text-[var(--cyan)]' : 'text-[var(--text-faint)] hover:text-[var(--text-muted)]'
                )}
              >
                <span
                  className={classNames(
                    'absolute top-0 left-1/2 -translate-x-1/2 h-[2px] rounded-full transition-all duration-300',
                    isActive ? 'w-7 bg-[var(--cyan)] shadow-[0_0_8px_var(--cyan)]' : 'w-0 bg-transparent'
                  )}
                />
                <Icon
                  size={19}
                  className={classNames(
                    'transition-all duration-200',
                    isActive && 'drop-shadow-[0_0_6px_var(--cyan)]'
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
