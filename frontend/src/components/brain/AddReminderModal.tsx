'use client';

import { useEffect, useState, startTransition } from 'react';
import Modal from '@/components/ui/Modal';
import { createReminder } from '@/lib/api';
import { Loader2, Plus, Calendar, Clock } from 'lucide-react';

interface AddReminderModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function AddReminderModal({ open, onClose, onCreated }: AddReminderModalProps) {
  const [text, setText] = useState('');
  const [datetime, setDatetime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      // Set default to 1 hour from now
      const d = new Date();
      d.setHours(d.getHours() + 1);
      startTransition(() => setDatetime(d.toISOString().slice(0, 16)));
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !datetime) return;

    setLoading(true);
    setError(null);
    try {
      await createReminder({
        text: text.trim(),
        datetime: new Date(datetime).toISOString(),
      });
      setText('');
      onCreated();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="⏰ Nuevo recordatorio" maxWidth="400px">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs text-[var(--text-muted)] mb-1 block">Recordatorio</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="¿Qué necesitas recordar?"
            rows={3}
            className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)]/50 resize-none"
          />
        </div>

        <div>
          <label className="text-xs text-[var(--text-muted)] mb-1 block">Fecha y hora</label>
          <input
            type="datetime-local"
            value={datetime}
            onChange={(e) => setDatetime(e.target.value)}
            className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]/50 [color-scheme:dark]"
          />
        </div>

        {error && <p className="text-xs text-[var(--error)]">{error}</p>}

        <button
          type="submit"
          disabled={!text.trim() || !datetime || loading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--accent)] text-[var(--bg)] font-medium text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--accent2)] transition-all active:scale-[0.98]"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Crear recordatorio
        </button>
      </form>
    </Modal>
  );
}
