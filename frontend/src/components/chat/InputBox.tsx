'use client';

import { useState, useRef } from 'react';
import { Send, X, FileText, Image as ImageIcon } from 'lucide-react';
import VoiceButton from './VoiceButton';
import { useChatStore } from '@/store/useChatStore';

interface Attachment {
  type: 'image' | 'text';
  filename: string;
  content: string;
  mime?: string;
}

interface InputBoxProps {
  attachment?: Attachment | null;
  onRemoveAttachment?: () => void;
}

export default function InputBox({ attachment, onRemoveAttachment }: InputBoxProps) {
  const [input, setInput] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const isConnected = useChatStore((s) => s.isConnected);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed && !attachment) return;

    // Build message with attachment context
    let message = trimmed;
    if (attachment) {
      if (attachment.type === 'image') {
        message = `[Imagen adjunta: ${attachment.filename}]\n${attachment.content}`;
      } else {
        message = `[Archivo adjunto: ${attachment.filename}]\n\`\`\`\n${attachment.content}\n\`\`\``;
      }
      // If user also typed text, prepend it
      if (trimmed) {
        message = trimmed + '\n\n' + message;
      }
    }

    if (!message.trim()) return;
    sendMessage(message);
    setInput('');
    onRemoveAttachment?.();
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
    <div className="flex flex-col">
      {/* ── Attachment preview ── */}
      {attachment && (
        <div className="flex items-center gap-2 px-4 py-2 mx-3 mt-2 rounded-xl bg-[rgba(255,45,85,0.06)] border border-[rgba(255,45,85,0.12)]">
          {attachment.type === 'image' ? (
            <ImageIcon size={14} className="text-[var(--cyan)] shrink-0" />
          ) : (
            <FileText size={14} className="text-[var(--cyan)] shrink-0" />
          )}
          <span className="text-xs text-[var(--text-muted)] truncate flex-1">{attachment.filename}</span>
          <button
            onClick={onRemoveAttachment}
            className="p-0.5 hover:bg-[rgba(255,255,255,0.06)] rounded transition-colors"
          >
            <X size={12} className="text-[var(--text-faint)]" />
          </button>
        </div>
      )}

      {/* ── Input row ── */}
      <div className="flex items-end gap-2 p-3 bg-[var(--card)] border-t border-[rgba(255,255,255,0.06)]">
        <VoiceButton onResult={handleVoiceResult} />
        <div className={`flex-1 relative rounded-xl ${focused ? 'border-beam' : ''}`}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={
              attachment
                ? 'Añade un mensaje o envía el archivo...'
                : isConnected
                ? 'Mensaje a Hermes...'
                : 'Desconectado...'
            }
            className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)]/50 focus:bg-[rgba(255,45,85,0.04)] transition-all"
            disabled={!isConnected}
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-muted)] bg-[rgba(255,255,255,0.04)] px-1.5 py-0.5 rounded hidden sm:inline">
            ↵
          </kbd>
        </div>
        <button
          onClick={handleSubmit}
          disabled={(!input.trim() && !attachment) || !isConnected}
          className="p-2.5 rounded-xl bg-[var(--accent)] text-[var(--bg)] disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:bg-[var(--accent2)] active:scale-95"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
