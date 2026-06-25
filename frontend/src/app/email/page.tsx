'use client';

import { useState, useEffect, startTransition } from 'react';
import ClientLayout from '@/components/ui/ClientLayout';
import Card from '@/components/ui/Card';
import EmailList from '@/components/email/EmailList';
import { getEmails, EmailData, trackGamification } from '@/lib/api';
import { Search, AlertCircle, RefreshCw } from 'lucide-react';

export default function EmailPage() {
  const [emails, setEmails] = useState<EmailData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    startTransition(() => {
      loadEmails();
    });
    // Fire-and-forget gamification track
    trackGamification({ action: 'view_email_inbox', value: 1 }).catch(() => {});
  }, []);

  async function loadEmails(q?: string) {
    setLoading(true);
    setError(null);
    try {
      // Default to Gmail's Primary tab (real/important mail, no promos/social).
      const query = q ? `in:inbox ${q}` : 'in:inbox category:primary';
      const data = await getEmails(query, 20);
      setEmails(data.emails);
      setTotal(data.total);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar correos');
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    startTransition(() => {
      loadEmails(search);
    });
  }

  return (
    <ClientLayout>
      <div className="p-4 pb-24 max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold hud-label tracking-widest text-[var(--cyan)]">BANDEJA DE ENTRADA</h1>
            {!loading && (
              <p className="hud-readout text-[10px] text-[var(--text-faint)] mt-0.5">
                {total} {total === 1 ? 'MENSAJE' : 'MENSAJES'} · GMAIL PRIMARY
              </p>
            )}
          </div>
          <button
            onClick={() => loadEmails()}
            disabled={loading}
            className="hud-label text-[10px] text-[var(--cyan)] hover:text-[var(--text)] transition disabled:opacity-40 flex items-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            SYNC
          </button>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-faint)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="BUSCAR EN BANDEJA…"
            className="w-full pl-10 pr-4 py-2.5 bg-[rgba(4,6,10,0.6)] border border-[var(--hairline)] rounded text-sm text-[var(--text)] placeholder:text-[var(--text-faint)] placeholder:text-[10px] placeholder:tracking-widest focus:outline-none focus:border-[var(--cyan)] transition hud-readout"
          />
        </form>

        {/* Loading */}
        {loading && (
          <EmailList emails={[]} loading={true} />
        )}

        {/* Error */}
        {error && (
          <Card className="p-4 border-red-500/30">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          </Card>
        )}

        {/* Email list */}
        {!loading && !error && (
          <EmailList emails={emails} loading={false} />
        )}
      </div>
    </ClientLayout>
  );
}
