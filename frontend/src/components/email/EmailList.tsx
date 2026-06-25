'use client';

import { EmailData } from '@/lib/api';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Mail, Inbox } from 'lucide-react';
import { formatRelativeTime, truncate } from '@/lib/utils';

interface EmailListProps {
  emails: EmailData[];
  loading: boolean;
}

export default function EmailList({ emails, loading }: EmailListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-28 bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Inbox className="w-12 h-12 text-white/20 mx-auto mb-3" />
        <p className="text-white/50">Bandeja de entrada vacía.</p>
        <p className="text-white/30 text-sm mt-1">No se encontraron correos.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {emails.map((email) => (
        <Card key={email.id} className="p-4 fade-in">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4 text-cyan-400" />
            </div>

            <div className="flex-1 min-w-0">
              {/* From + Date */}
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm font-medium text-white/90 truncate">
                  {email.from}
                </span>
                <span className="text-xs text-white/40 whitespace-nowrap">
                  {formatRelativeTime(email.date)}
                </span>
              </div>

              {/* Subject */}
              <p className="text-sm text-white/80 font-medium truncate mb-0.5">
                {email.subject}
              </p>

              {/* Snippet */}
              <p className="text-xs text-white/50 line-clamp-2">
                {truncate(email.snippet, 120)}
              </p>

              {/* Labels */}
              {email.labelIds && email.labelIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {email.labelIds.map((label) => (
                    <Badge key={label} variant="accent" dot>
                      {label.replace('CATEGORY_', '').replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
