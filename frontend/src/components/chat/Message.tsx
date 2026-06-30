'use client';

import { User, Copy, Check, Mic } from 'lucide-react';
import { useState } from 'react';
import { ChatMessage } from '@/store/useChatStore';
import { formatRelativeTime } from '@/lib/utils';

interface MessageProps {
  message: ChatMessage;
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-2 rounded-xl overflow-hidden border border-[rgba(255,255,255,0.06)]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[rgba(255,255,255,0.03)] border-b border-[rgba(255,255,255,0.06)]">
        <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">code</span>
        <button
          onClick={handleCopy}
          className="p-1 rounded hover:bg-[rgba(255,255,255,0.06)] transition-colors"
        >
          {copied ? <Check size={12} className="text-[var(--success)]" /> : <Copy size={12} className="text-[var(--text-muted)]" />}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-sm leading-relaxed" style={{ background: '#08080e' }}>
        <code className="text-[var(--text)]">{code}</code>
      </pre>
    </div>
  );
}

function renderContent(content: string) {
  const parts = content.split(/(```[\s\S]*?```)/g);

  return parts.map((part, i) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const code = part.slice(3, -3).replace(/^\w+\n/, '');
      return <CodeBlock key={i} code={code.trim()} />;
    }

    const lines = part.split('\n');
    return (
      <div key={i}>
        {lines.map((line, j) => {
          let rendered = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          rendered = rendered.replace(/\*(.*?)\*/g, '<em>$1</em>');
          rendered = rendered.replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.06);padding:1px 4px;border-radius:3px;font-size:0.9em">$1</code>');
          rendered = rendered.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:var(--accent);text-decoration:underline">$1</a>');

          if (rendered.trim() === '') return <br key={j} />;
          return (
            <p
              key={j}
              className="text-sm leading-relaxed mb-1 last:mb-0"
              dangerouslySetInnerHTML={{ __html: rendered }}
            />
          );
        })}
      </div>
    );
  });
}

function estimateVoiceDuration(content: string): string {
  const words = content.split(/\s+/).length;
  const seconds = Math.round((words / 150) * 60); // ~150 wpm speaking
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}min ${seconds % 60}s`;
}

export default function Message({ message }: MessageProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isVoice = message.source === 'voice';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} fade-in`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center relative ${
          isUser
            ? 'bg-[rgba(255,45,85,0.15)] text-[var(--accent)]'
            : isSystem
            ? 'bg-[rgba(234,179,8,0.15)] text-[var(--warning)]'
            : 'bg-[rgba(139,92,246,0.15)] text-[var(--purple)]'
        }`}
      >
        {isUser ? (
          isVoice ? <Mic size={14} /> : <User size={16} />
        ) : (
          <img src="/hermes-avatar.svg" alt="Hermes" className="w-6 h-6" />
        )}
      </div>

      {/* Content */}
      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div
          className={`rounded-2xl px-4 py-2.5 ${
            isUser
              ? isVoice
                ? 'bg-[rgba(139,92,246,0.15)] border border-[rgba(139,92,246,0.2)]'
                : 'bg-[var(--accent)]/20 border border-[rgba(255,45,85,0.15)]'
              : isSystem
              ? 'bg-[rgba(234,179,8,0.08)] border border-[rgba(234,179,8,0.1)]'
              : 'bg-[var(--card)] border border-[rgba(255,255,255,0.06)]'
          }`}
          style={isUser && isVoice ? { borderLeft: '2px solid rgba(139,92,246,0.5)' } : undefined}
        >
          {message.loading ? (
            <div className="flex gap-1 py-1">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          ) : (
            renderContent(message.content)
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 px-1">
          {isVoice && (
            <span className="flex items-center gap-1 text-[9px] text-[var(--purple)]">
              <Mic size={9} />
              {estimateVoiceDuration(message.content)}
            </span>
          )}
          <span className="text-[10px] text-[var(--text-muted)]">
            {formatRelativeTime(message.timestamp)}
          </span>
        </div>
      </div>
    </div>
  );
}