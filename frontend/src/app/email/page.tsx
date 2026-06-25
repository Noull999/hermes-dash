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
      const query = q ? `in:inbox ${q}` : 'in:inbox';
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
            <h1 className="text-2xl font-bold text-white/90">Correo</h1>
            {!loading && (
              <p className="text-xs text-white/40 mt-0.5">
                {total} {total === 1 ? 'correo' : 'correos'} en bandeja
              </p>
            )}
          </div>
          <button
            onClick={() => loadEmails()}
            disabled={loading}
            className="text-xs text-cyan-400 hover:text-cyan-300 transition disabled:opacity-40 flex items-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar en bandeja de entrada…"
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white/80 placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 transition"
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
