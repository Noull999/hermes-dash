'use client';

import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Reminder } from '@/lib/api';
import { Bell, Trash2, Clock, CheckCircle, XCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useState } from 'react';
import { deleteReminder } from '@/lib/api';
import { Loader2 } from 'lucide-react';

interface ReminderCardProps {
  reminder: Reminder;
  onDeleted: () => void;
}

const statusConfig = {
  pending: { label: 'Pendiente', variant: 'warning' as const, Icon: Clock },
  done: { label: 'Completado', variant: 'success' as const, Icon: CheckCircle },
  missed: { label: 'Perdido', variant: 'error' as const, Icon: XCircle },
};

export default function ReminderCard({ reminder, onDeleted }: ReminderCardProps) {
  const [deleting, setDeleting] = useState(false);
  const config = statusConfig[reminder.status] || statusConfig.pending;
  const { Icon } = config;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteReminder(reminder.id);
      onDeleted();
    } catch {
      setDeleting(false);
    }
  };

  return (
    <Card padding="sm" className="relative group">
      <div className="flex items-center gap-3">
        <div
          className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
            reminder.status === 'pending'
              ? 'bg-[rgba(234,179,8,0.1)] text-[var(--warning)]'
              : reminder.status === 'done'
              ? 'bg-[rgba(34,197,94,0.1)] text-[var(--success)]'
              : 'bg-[rgba(239,68,68,0.1)] text-[var(--error)]'
          }`}
        >
          <Bell size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--text)]">{reminder.text}</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1">
              <Clock size={10} className="text-[var(--text-muted)]" />
              <span className="text-[10px] text-[var(--text-muted)]">
                {formatDate(reminder.datetime)}
              </span>
            </div>
            <Badge variant={config.variant} dot>
              {config.label}
            </Badge>
          </div>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-[rgba(239,68,68,0.1)] text-[var(--error)] transition-all"
        >
          {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        </button>
      </div>
    </Card>
  );
}
