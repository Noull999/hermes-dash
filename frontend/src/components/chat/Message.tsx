'use client';

import { User, Copy, Check } from 'lucide-react';
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
  // Simple markdown-like rendering
  const parts = content.split(/(```[\s\S]*?```)/g);

  return parts.map((part, i) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const code = part.slice(3, -3).replace(/^\w+\n/, ''); // remove language tag
      return <CodeBlock key={i} code={code.trim()} />;
    }

    // Inline formatting
    const lines = part.split('\n');
    return (
      <div key={i}>
        {lines.map((line, j) => {
          // Bold
          let rendered = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          // Italic
          rendered = rendered.replace(/\*(.*?)\*/g, '<em>$1</em>');
          // Inline code
          rendered = rendered.replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.06);padding:1px 4px;border-radius:3px;font-size:0.9em">$1</code>');
          // Links
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

export default function Message({ message }: MessageProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} fade-in`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${
          isUser
            ? 'bg-[rgba(0,212,255,0.15)] text-[var(--accent)]'
            : isSystem
            ? 'bg-[rgba(234,179,8,0.15)] text-[var(--warning)]'
            : 'bg-[rgba(139,92,246,0.15)] text-[var(--purple)]'
        }`}
      >
        {isUser ? <User size={16} /> : <img src="/hermes-avatar.svg" alt="Hermes" className="w-6 h-6" />}
      </div>

      {/* Content */}
      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div
          className={`rounded-2xl px-4 py-2.5 ${
            isUser
              ? 'bg-[var(--accent)]/20 border border-[rgba(0,212,255,0.15)]'
              : isSystem
              ? 'bg-[rgba(234,179,8,0.08)] border border-[rgba(234,179,8,0.1)]'
              : 'bg-[var(--card)] border border-[rgba(255,255,255,0.06)]'
          }`}
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
        <span className="text-[10px] text-[var(--text-muted)] mt-1 px-1">
          {formatRelativeTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}
