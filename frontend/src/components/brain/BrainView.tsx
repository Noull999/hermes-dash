'use client';

import { useEffect, useState, startTransition } from 'react';
import NoteCard from './NoteCard';
import AddNoteModal from './AddNoteModal';
import { getBrain, deleteBrain, BrainItem } from '@/lib/api';
import { Brain, Plus, RefreshCw, Search, Loader2 } from 'lucide-react';

export default function BrainView() {
  const [notes, setNotes] = useState<BrainItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchNotes = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBrain();
      setNotes(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    startTransition(() => { fetchNotes(); });
  }, []);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteBrain(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeleting(null);
    }
  };

  const filtered = search
    ? notes.filter(
        (n) =>
          n.title.toLowerCase().includes(search.toLowerCase()) ||
          n.content.toLowerCase().includes(search.toLowerCase()) ||
          n.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase()))
      )
    : notes;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain size={18} className="text-[var(--purple)]" />
          <h2 className="text-lg font-semibold text-[var(--text)]">Second Brain</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchNotes}
            className="p-2 rounded-xl hover:bg-[rgba(255,255,255,0.06)] transition-colors"
          >
            <RefreshCw size={16} className="text-[var(--text-muted)]" />
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--bg)] text-sm font-medium hover:bg-[var(--accent2)] transition-all active:scale-95"
          >
            <Plus size={16} />
            Nueva nota
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar en tu cerebro..."
          className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl pl-9 pr-3 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)]/50"
        />
      </div>

      {/* Content */}
      {loading && notes.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-sm text-[var(--error)] mb-3">{error}</p>
          <button
            onClick={fetchNotes}
            className="px-4 py-2 rounded-xl bg-[rgba(0,212,255,0.1)] text-[var(--accent)] text-sm font-medium hover:bg-[rgba(0,212,255,0.15)]"
          >
            Reintentar
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-[rgba(139,92,246,0.1)] flex items-center justify-center mx-auto mb-4">
            <Brain size={28} className="text-[var(--purple)]" />
          </div>
          <h3 className="text-base font-semibold text-[var(--text)] mb-2">
            {search ? 'Sin resultados' : 'Tu cerebro está vacío'}
          </h3>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            {search ? 'Intenta con otros términos' : 'Guarda tus notas, ideas y snippets'}
          </p>
          {!search && (
            <button
              onClick={() => setAddOpen(true)}
              className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--bg)] text-sm font-medium"
            >
              Crear primera nota
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((note) => (
            <div key={note.id} className="relative">
              {deleting === note.id && (
                <div className="absolute inset-0 bg-[var(--bg)]/60 rounded-xl flex items-center justify-center z-10">
                  <Loader2 size={18} className="animate-spin text-[var(--accent)]" />
                </div>
              )}
              <NoteCard note={note} onDelete={handleDelete} />
            </div>
          ))}
        </div>
      )}

      <AddNoteModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={fetchNotes}
      />
    </div>
  );
}
