'use client';

import { useEffect, useState, startTransition } from 'react';
import { getReminders, createReminder, deleteReminder } from '@/lib/api';
import { Trash2, Plus, Clock, AlertCircle, Loader2 } from 'lucide-react';

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    if (diffMs <= 0) return 'Vencido';
    const hours = Math.floor(diffMs / 3600000);
    const mins = Math.floor((diffMs % 3600000) / 60000);
    if (hours > 24) return `${Math.floor(hours / 24)}d`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  } catch {
    return '';
  }
}

function isOverdue(datetime: string): boolean {
  try {
    return new Date(datetime).getTime() < Date.now();
  } catch {
    return false;
  }
}

export default function ReminderList() {
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | string | null>(null);

  const load = () => {
    startTransition(() => {
      getReminders()
        .then((data) => {
          setReminders(Array.isArray(data) ? data : []);
          setError(null);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Error al cargar');
          setReminders([]);
        })
        .finally(() => setLoading(false));
    });
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!newText.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const due = new Date(Date.now() + 2 * 3600000).toISOString();
      await createReminder({ text: newText.trim(), datetime: due });
      setNewText('');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear');
    }
    setAdding(false);
  };

  const handleDelete = async (id: number | string) => {
    setDeletingId(id);
    setError(null);
    try {
      await deleteReminder(String(id));
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
    }
    setDeletingId(null);
  };

  if (loading) return <div className="skeleton h-24 w-full" />;

  return (
    <div>
      {/* Error alert */}
      {error && (
        <div className="flex items-center gap-1.5 px-2 py-1 mb-2 rounded border border-[rgba(255,59,48,0.2)] bg-[rgba(255,59,48,0.06)]">
          <AlertCircle size={10} className="text-[var(--error)] shrink-0" />
          <span className="text-[9px] text-[var(--error)] truncate">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-[var(--text-faint)] hover:text-[var(--text)]">
            ✕
          </button>
        </div>
      )}

      {/* Add new */}
      <div className="flex gap-2 mb-2">
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd(); } }}
          placeholder="Nuevo recordatorio..."
          className="flex-1 bg-[rgba(0,0,0,0.3)] border border-[var(--hairline)] rounded-[3px] px-2 py-1.5 text-[11px] text-[var(--text)] outline-none placeholder:text-[var(--text-faint)] focus:border-[rgba(255,45,85,0.3)]"
        />
        <button
          onClick={handleAdd}
          disabled={!newText.trim() || adding}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-[3px] bg-[rgba(255,45,85,0.1)] border border-[rgba(255,45,85,0.25)] text-[var(--cyan)] text-[10px] hover:bg-[rgba(255,45,85,0.2)] disabled:opacity-40 transition-all cursor-pointer"
          type="button"
        >
          {adding ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
        </button>
      </div>

      {/* List */}
      {reminders.length === 0 ? (
        <p className="text-[10px] text-[var(--text-faint)] text-center py-4">Sin recordatorios</p>
      ) : (
        <div className="space-y-1 max-h-[240px] overflow-y-auto">
          {reminders.slice(0, 10).map((r: any) => {
            const overdue = isOverdue(r.datetime) && !r.completed;
            const isDeleting = deletingId === r.id;
            return (
              <div
                key={r.id}
                className={`flex items-center gap-2 py-1.5 px-2 rounded-[3px] border transition-colors ${
                  overdue
                    ? 'border-[rgba(255,93,108,0.25)] bg-[rgba(255,93,108,0.06)]'
                    : 'border-[var(--hairline)] hover:border-[rgba(255,45,85,0.15)]'
                } ${r.completed ? 'opacity-50' : ''}`}
              >
                {/* Status indicator */}
                <span className="shrink-0">
                  {overdue ? (
                    <AlertCircle size={12} className="text-[var(--error)]" />
                  ) : r.completed ? (
                    <span className="text-[10px] text-[var(--success)]">✓</span>
                  ) : (
                    <span className="text-[10px] text-[var(--text-faint)]">○</span>
                  )}
                </span>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className={`text-[11px] truncate ${r.completed ? 'line-through text-[var(--text-faint)]' : 'text-[var(--text)]'}`}>
                    {r.text}
                  </p>
                </div>

                {/* Time remaining */}
                {!r.completed && (
                  <span className={`text-[9px] whitespace-nowrap ${overdue ? 'text-[var(--error)]' : 'text-[var(--text-faint)]'}`}>
                    <Clock size={9} className="inline mr-0.5" />
                    {formatTime(r.datetime)}
                  </span>
                )}

                {/* Delete button */}
                <button
                  onClick={() => handleDelete(r.id)}
                  disabled={isDeleting}
                  className="shrink-0 p-1 rounded-[2px] text-[var(--text-faint)] hover:text-[var(--error)] hover:bg-[rgba(255,93,108,0.1)] transition-all cursor-pointer disabled:opacity-40"
                  title="Eliminar recordatorio"
                  type="button"
                >
                  {isDeleting ? (
                    <Loader2 size={10} className="animate-spin" />
                  ) : (
                    <Trash2 size={10} />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
