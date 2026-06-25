'use client';

import { useEffect, useRef } from 'react';
import Message from './Message';
import InputBox from './InputBox';
import { useChatStore } from '@/store/useChatStore';
import { Wifi, WifiOff } from 'lucide-react';

export default function ChatView() {
  const messages = useChatStore((s) => s.messages);
  const isConnected = useChatStore((s) => s.isConnected);
  const isTyping = useChatStore((s) => s.isTyping);
  const connect = useChatStore((s) => s.connect);
  const disconnect = useChatStore((s) => s.disconnect);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <div className="flex flex-col h-full">
      {/* Connection status */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[rgba(255,255,255,0.04)]">
        {isConnected ? (
          <>
            <Wifi size={12} className="text-[var(--success)]" />
            <span className="text-[11px] text-[var(--success)]">Conectado</span>
          </>
        ) : (
          <>
            <WifiOff size={12} className="text-[var(--error)]" />
            <span className="text-[11px] text-[var(--error)]">Desconectado</span>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-20 h-20 rounded-2xl bg-[rgba(0,212,255,0.08)] flex items-center justify-center mb-4 overflow-hidden border border-[rgba(0,212,255,0.12)]">
              <img src="/hermes-avatar.svg" alt="Hermes" className="w-16 h-16" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--text)] mb-2">Hermes Chat</h3>
            <p className="text-sm text-[var(--text-muted)] max-w-xs">
              Pregúntame lo que necesites. Estoy aquí para ayudarte.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <Message key={msg.id} message={msg} />
          ))
        )}

        {isTyping && (
          <div className="flex gap-3 fade-in">
            <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-[rgba(139,92,246,0.15)] flex items-center justify-center">
              <MessageSquare size={14} className="text-[var(--purple)]" />
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

      {/* Input */}
      <InputBox />
    </div>
  );
}
