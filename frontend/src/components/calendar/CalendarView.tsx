'use client';

import { useMemo } from 'react';
import { CalendarEvent } from '@/lib/api';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Calendar, MapPin, Clock, CalendarDays } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface CalendarViewProps {
  events: CalendarEvent[];
  loading: boolean;
}

function formatTimeRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
  return `${s.toLocaleTimeString('es-CL', opts)} – ${e.toLocaleTimeString('es-CL', opts)}`;
}

function getDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const fmt: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };

  if (d.toDateString() === today.toDateString()) return 'Hoy';
  if (d.toDateString() === tomorrow.toDateString()) return 'Mañana';
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer';

  return d.toLocaleDateString('es-CL', fmt);
}

function isSameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

export default function CalendarView({ events, loading }: CalendarViewProps) {
  const grouped = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const day = ev.start;
      const key = new Date(day).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return Array.from(map.entries()).sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime());
  }, [events]);

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-5 w-32 bg-white/5 rounded animate-pulse" />
            <div className="h-24 bg-white/5 rounded-xl animate-pulse" />
            <div className="h-24 bg-white/5 rounded-xl animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <Card className="p-8 text-center">
        <CalendarDays className="w-12 h-12 text-white/20 mx-auto mb-3" />
        <p className="text-white/50">No hay eventos próximos.</p>
        <p className="text-white/30 text-sm mt-1">Tu calendario está despejado.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {grouped.map(([dayKey, dayEvents]) => {
        const label = getDateLabel(dayEvents[0].start);
        const dateStr = new Date(dayEvents[0].start).toLocaleDateString('es-CL', {
          day: 'numeric',
          month: 'short',
        });

        return (
          <div key={dayKey}>
            {/* Date header */}
            <div className="flex items-center gap-2 mb-2 px-1">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white/80">{label}</h3>
              <span className="text-xs text-white/30">{dateStr}</span>
              <span className="text-xs text-white/20 ml-auto">{dayEvents.length} evento{dayEvents.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="space-y-2">
              {dayEvents.map((ev) => (
                <Card
                  key={ev.id}
                  className={`p-4 fade-in ${ev.allDay ? 'border-l-2 border-l-cyan-500/40 bg-cyan-500/5' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Time indicator */}
                    <div className="shrink-0 w-14 text-right">
                      {ev.allDay ? (
                        <Badge variant="accent" className="text-[10px] px-1.5 py-0.5">Todo el día</Badge>
                      ) : (
                        <span className="text-xs text-cyan-400/70 font-mono whitespace-nowrap">
                          {formatTimeRange(ev.start, ev.end)}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Title */}
                      <p className="text-sm font-medium text-white/90 truncate">
                        {ev.title}
                      </p>

                      {/* Description */}
                      {ev.description && (
                        <p className="text-xs text-white/50 mt-0.5 line-clamp-2">
                          {ev.description}
                        </p>
                      )}

                      {/* Location */}
                      {ev.location && (
                        <div className="flex items-center gap-1 mt-1.5 text-xs text-white/40">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">{ev.location}</span>
                        </div>
                      )}
                    </div>

                    {/* Time badge for non-allDay */}
                    {!ev.allDay && (
                      <div className="shrink-0">
                        <Clock className="w-3.5 h-3.5 text-white/30" />
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
