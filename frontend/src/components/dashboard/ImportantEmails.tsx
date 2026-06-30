'use client';

import { useEffect, useState } from 'react';
import { getRelevantEmails, EmailData } from '@/lib/api';
import { Mail, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';

const REL_COLORS: Record<string, string> = {
  urgent: 'var(--error)',
  important: 'var(--amber)',
  normal: 'var(--text-faint)',
  spam: 'var(--text-faint)',
};

const REL_ICONS: Record<string, string> = {
  urgent: '🔴',
  important: '🟡',
  normal: '⚪',
  spam: '⚫',
};

export default function ImportantEmails() {
  const [emails, setEmails] = useState<EmailData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, number>>({});

  const fetchEmails = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRelevantEmails(8);
      setEmails(data.emails);
      if (data.stats) setStats(data.stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
    const interval = setInterval(fetchEmails, 120000);
    return () => clearInterval(interval);
  }, []);

  if (error && !loading && emails.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
        <AlertCircle size={12} />
        <span>Error: {error}</span>
        <button onClick={fetchEmails} className="ml-auto p-1">
          <RefreshCw size={10} />
        </button>
      </div>
    );
  }

  if (loading && emails.length === 0) {
    return <div className="space-y-2">
      {[1,2,3].map(i => <div key={i} className="skeleton h-12 w-full" />)}
    </div>;
  }

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-4">
        <Mail size={20} className="text-[var(--text-faint)]" />
        <span className="hud-label text-[9px] text-[var(--text-faint)]">No hay correos urgentes</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Stats row */}
      {stats.urgent > 0 && (
        <div className="flex items-center gap-2 px-2 py-1 rounded border border-[rgba(255,59,48,0.2)] bg-[rgba(255,59,48,0.04)]">
          <span className="text-[10px]">🔴</span>
          <span className="text-[10px] font-semibold text-[var(--error)]">
            {stats.urgent} urgente(s)
          </span>
          {stats.important > 0 && (
            <>
              <span className="text-[var(--hairline-strong)]">|</span>
              <span className="text-[10px] text-[var(--amber)]">
                🟡 {stats.important} importante(s)
              </span>
            </>
          )}
          <button onClick={fetchEmails} className="ml-auto p-0.5 hover:bg-[rgba(255,255,255,0.05)] rounded">
            <RefreshCw size={9} className="text-[var(--text-faint)]" />
          </button>
        </div>
      )}

      {/* Email list */}
      <div className="space-y-1.5">
        {emails.slice(0, 5).map((email) => {
          const icon = REL_ICONS[email.relevance || 'normal'] || '⚪';
          const color = REL_COLORS[email.relevance || 'normal'] || 'var(--text-faint)';
          const fromName = email.from.split('<')[0].trim().slice(0, 22);
          const ago = email.date
            ? (() => {
                try {
                  const d = new Date(email.date);
                  const diff = (Date.now() - d.getTime()) / 3600000;
                  if (diff < 1) return 'ahora';
                  if (diff < 24) return `${Math.floor(diff)}h`;
                  return `${Math.floor(diff / 24)}d`;
                } catch { return ''; }
              })()
            : '';

          return (
            <div
              key={email.id}
              className="flex items-start gap-2 px-2 py-1.5 rounded border border-[var(--hairline)] bg-[rgba(0,0,0,0.15)] hover:border-[rgba(255,45,85,0.2)] transition-colors"
            >
              <span className="text-[10px] mt-0.5 shrink-0">{icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className="hud-label text-[8px] font-semibold truncate max-w-[100px]"
                    style={{ color }}
                  >
                    {fromName || email.from.slice(0, 18)}
                  </span>
                  {ago && (
                    <span className="hud-label text-[7px] text-[var(--text-faint)] ml-auto shrink-0">
                      {ago}
                    </span>
                  )}
                </div>
                <div className="text-[9px] text-[var(--text)] truncate leading-tight mt-0.5">
                  {email.subject}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* More link */}
      {emails.length > 5 && (
        <a
          href="/email"
          className="block text-center hud-label text-[8px] text-[var(--text-faint)] hover:text-[var(--cyan)] transition-colors py-1"
        >
          +{emails.length - 5} más → ver todos
        </a>
      )}
    </div>
  );
}
