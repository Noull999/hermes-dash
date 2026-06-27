'use client';

import { useState, useRef } from 'react';
import { Send, Sparkles } from 'lucide-react';
import VoiceButton from './VoiceButton';
import { useChatStore } from '@/store/useChatStore';

export default function InputBox() {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const isConnected = useChatStore((s) => s.isConnected);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    sendMessage(trimmed);
    setInput('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleVoiceResult = (text: string) => {
    setInput((prev) => (prev ? `${prev} ${text}` : text));
    inputRef.current?.focus();
  };

  return (
    <div className="flex items-end gap-2 p-3 bg-[var(--card)] border-t border-[rgba(255,255,255,0.06)]">
      <div className="flex-1 relative">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isConnected ? 'Mensaje a Hermes...' : 'Desconectado...'}
          className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)]/50 focus:bg-[rgba(0,212,255,0.04)] transition-all"
          disabled={!isConnected}
        />
        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-muted)] bg-[rgba(255,255,255,0.04)] px-1.5 py-0.5 rounded hidden sm:inline">
          ↵
        </kbd>
      </div>
      <button
        onClick={handleSubmit}
        disabled={!input.trim() || !isConnected}
        className="p-2.5 rounded-xl bg-[var(--accent)] text-[var(--bg)] disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:bg-[var(--accent2)] active:scale-95"
      >
        <Send size={18} />
      </button>
    </div>
  );
}
