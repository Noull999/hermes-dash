'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useChatStore } from '@/store/useChatStore';
import { Send, Sparkles } from 'lucide-react';

export default function QuickChat() {
  const [text, setText] = useState('');
  const router = useRouter();

  const handleSend = () => {
    if (!text.trim()) return;
    useChatStore.getState().sendMessage(text.trim());
    setText('');
    router.push('/');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Envía un mensaje a Hermes…"
          rows={1}
          className="flex-1 bg-[rgba(0,0,0,0.3)] border border-[var(--hairline)] rounded-xl px-3 py-2 text-xs text-[var(--text)] outline-none resize-none placeholder:text-[var(--text-faint)] focus:border-[rgba(0,212,255,0.3)] transition-colors"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.2)] text-[var(--cyan)] text-xs hover:bg-[rgba(0,212,255,0.18)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send size={14} />
        </button>
      </div>
      <p className="text-[8px] text-[var(--text-faint)] flex items-center gap-1">
        <Sparkles size={8} /> Te redirigirá al chat después de enviar
      </p>
    </div>
  );
}
