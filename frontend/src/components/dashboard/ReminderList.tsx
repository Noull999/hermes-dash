'use client';

import { useEffect, useState, startTransition } from 'react';
import { getReminders, createReminder, deleteReminder, Reminder } from '@/lib/api';
import { CheckCircle2, Circle, Trash2, Plus, Clock, AlertCircle } from 'lucide-react';

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
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState('');
  const [adding, setAdding] = useState(false);

  const load = () => {
    startTransition(() => {
      getReminders()
        .then((data) => setReminders(Array.isArray(data) ? data : []))
        .catch(() => setReminders([]))
        .finally(() => setLoading(false));
    });
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!newText.trim()) return;
    setAdding(true);
    try {
      // Default: due in 2 hours from now
      const due = new Date(Date.now() + 2 * 3600000).toISOString();
      await createReminder({ text: newText.trim(), datetime: due });
      setNewText('');
      load();
    } catch { /* ignore */ }
    setAdding(false);
  };

  const handleDelete = async (id: string | number) => {
    try {
      await deleteReminder(String(id));
      load();
    } catch { /* ignore */ }
  };

  if (loading) return <div className="skeleton h-24 w-full" />;

  return (
    <div>
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
          className="flex items-center gap-1 px-2 py-1.5 rounded-[3px] bg-[rgba(255,45,85,0.1)] border border-[rgba(255,45,85,0.2)] text-[var(--cyan)] text-[10px] hover:bg-[rgba(255,45,85,0.18)] disabled:opacity-40"
        >
          <Plus size={12} />
        </button>
      </div>

      {/* List */}
      {reminders.length === 0 ? (
        <p className="text-[10px] text-[var(--text-faint)] text-center py-4">
          Sin recordatorios
        </p>
      ) : (
        <div className="space-y-1 max-h-[200px] overflow-y-auto">
          {reminders.slice(0, 10).map((r: any) => {
            const overdue = isOverdue(r.datetime) && !r.completed;
            return (
              <div
                key={r.id}
                className={`flex items-center gap-2 py-1.5 px-2 rounded-[3px] border border-[var(--hairline)] ${
                  overdue ? 'border-[rgba(255,93,108,0.2)] bg-[rgba(255,93,108,0.04)]' : ''
                }`}
              >
                <button
                  onClick={() => handleDelete(r.id)}
                  className="shrink-0 opacity-40 hover:opacity-100 transition-opacity"
                  title={r.completed ? 'Borrar' : 'Completar'}
                >
                  {r.completed ? (
                    <CheckCircle2 size={12} className="text-[var(--success)]" />
                  ) : overdue ? (
                    <AlertCircle size={12} className="text-[var(--error)]" />
                  ) : (
                    <Circle size={12} className="text-[var(--text-faint)]" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-[11px] truncate ${r.completed ? 'line-through text-[var(--text-faint)]' : 'text-[var(--text)]'}`}>
                    {r.text}
                  </p>
                </div>
                {!r.completed && (
                  <span className={`text-[9px] whitespace-nowrap ${overdue ? 'text-[var(--error)]' : 'text-[var(--text-faint)]'}`}>
                    <Clock size={9} className="inline mr-0.5" />
                    {formatTime(r.datetime)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
