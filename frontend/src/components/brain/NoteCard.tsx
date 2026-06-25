'use client';

import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { BrainItem } from '@/lib/api';
import { StickyNote, Link2, Code2, Lightbulb, Trash2 } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

interface NoteCardProps {
  note: BrainItem;
  onDelete: (id: string) => void;
}

const typeIcons: Record<string, React.ReactNode> = {
  note: <StickyNote size={14} />,
  link: <Link2 size={14} />,
  snippet: <Code2 size={14} />,
  idea: <Lightbulb size={14} />,
};

const typeColors: Record<string, string> = {
  note: 'var(--accent)',
  link: 'var(--success)',
  snippet: 'var(--purple)',
  idea: 'var(--warning)',
};

const typeLabels: Record<string, string> = {
  note: 'Nota',
  link: 'Enlace',
  snippet: 'Snippet',
  idea: 'Idea',
};

export default function NoteCard({ note, onDelete }: NoteCardProps) {
  return (
    <Card padding="sm" className="group relative">
      <div className="flex gap-3">
        <div
          className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center"
          style={{
            background: `${typeColors[note.type] || 'var(--text-muted)'}15`,
            color: typeColors[note.type] || 'var(--text-muted)',
          }}
        >
          {typeIcons[note.type]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold text-[var(--text)] truncate">{note.title}</h4>
            <Badge variant={note.type as 'accent' | 'success' | 'purple' | 'warning'}>
              {typeLabels[note.type] || note.type}
            </Badge>
          </div>
          <p className="text-xs text-[var(--text-muted)] line-clamp-3 whitespace-pre-wrap">
            {note.content}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-[var(--text-muted)]">
              {formatRelativeTime(note.created_at)}
            </span>
            {note.tags && note.tags.length > 0 && (
              <div className="flex gap-1">
                {note.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.04)] text-[var(--text-muted)]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => onDelete(note.id)}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-[rgba(239,68,68,0.1)] text-[var(--error)] transition-all absolute top-3 right-3"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </Card>
  );
}
