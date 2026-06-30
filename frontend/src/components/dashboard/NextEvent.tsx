'use client';

import { useEffect, useState, startTransition } from 'react';
import { getCalendarEvents, CalendarEvent } from '@/lib/api';
import { CalendarDays } from 'lucide-react';

function formatTimeRemaining(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  if (diffMs <= 0) return 'Ahora';
  const hours = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  if (hours > 0) return `en ${hours}h ${mins}min`;
  return `en ${mins}min`;
}

export default function NextEvent() {
  const [event, setEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    startTransition(() => {
      getCalendarEvents(2)
        .then((data) => {
          const upcoming = (data.events || [])
            .filter((e) => new Date(e.start) > new Date())
            .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
          setEvent(upcoming[0] || null);
        })
        .catch(() => setEvent(null))
        .finally(() => setLoading(false));
    });
  }, []);

  if (loading) return <div className="skeleton h-16 w-full" />;

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60px] text-center">
        <CalendarDays size={20} className="text-[var(--text-faint)] mb-1" />
        <p className="text-[10px] text-[var(--text-faint)]">Sin eventos hoy</p>
      </div>
    );
  }

  const eventDate = new Date(event.start);
  const isAllDay = event.allDay;

  return (
    <div>
      <p className="text-sm font-medium text-[var(--text)] truncate">{event.title}</p>
      <p className="text-[10px] text-[var(--cyan)] mt-1">
        {isAllDay ? 'Todo el día' : formatTimeRemaining(eventDate)}
      </p>
      {event.location && (
        <p className="text-[9px] text-[var(--text-faint)] mt-0.5 truncate">{event.location}</p>
      )}
    </div>
  );
}
