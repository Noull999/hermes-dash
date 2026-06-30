'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { createBrain, BrainItem } from '@/lib/api';
import { Loader2, Plus } from 'lucide-react';

interface AddNoteModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const types = [
  { id: 'note' as const, label: 'Nota', emoji: '📝' },
  { id: 'link' as const, label: 'Enlace', emoji: '🔗' },
  { id: 'snippet' as const, label: 'Snippet', emoji: '💻' },
  { id: 'idea' as const, label: 'Idea', emoji: '💡' },
];

export default function AddNoteModal({ open, onClose, onCreated }: AddNoteModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<BrainItem['type']>('note');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await createBrain({
        title: title.trim(),
        content: content.trim(),
        type,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      });
      setTitle('');
      setContent('');
      setType('note');
      setTags('');
      onCreated();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="🧠 Nueva nota" maxWidth="480px">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type selector */}
        <div className="flex gap-2">
          {types.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setType(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                type === t.id
                  ? 'bg-[var(--accent)]/20 text-[var(--accent)] border border-[rgba(255,45,85,0.2)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[rgba(255,255,255,0.04)]'
              }`}
            >
              <span>{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Title */}
        <div>
          <label className="text-xs text-[var(--text-muted)] mb-1 block">Título</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título de la nota"
            className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)]/50"
          />
        </div>

        {/* Content */}
        <div>
          <label className="text-xs text-[var(--text-muted)] mb-1 block">Contenido</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escribe tu nota aquí..."
            rows={4}
            className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)]/50 resize-none"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="text-xs text-[var(--text-muted)] mb-1 block">
            Tags <span className="text-[10px]">(separados por coma)</span>
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="hermes, dashboard, idea"
            className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)]/50"
          />
        </div>

        {error && (
          <p className="text-xs text-[var(--error)]">{error}</p>
        )}

        <button
          type="submit"
          disabled={!title.trim() || !content.trim() || loading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--accent)] text-[var(--bg)] font-medium text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--accent2)] transition-all active:scale-[0.98]"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Plus size={16} />
          )}
          Guardar nota
        </button>
      </form>
    </Modal>
  );
}
