'use client';

import { useMemo } from 'react';
import { CalendarEvent } from '@/lib/api';
import Card from '@/components/ui/Card';
import { Calendar, MapPin, CalendarDays } from 'lucide-react';

interface CalendarViewProps {
  events: CalendarEvent[];
  loading: boolean;
}

function formatTimeRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
  return `${s.toLocaleTimeString('es-CL', opts)}–${e.toLocaleTimeString('es-CL', opts)}`;
}

function getDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const fmt: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
  if (d.toDateString() === today.toDateString()) return 'HOY';
  if (d.toDateString() === tomorrow.toDateString()) return 'MAÑANA';
  return d.toLocaleDateString('es-CL', fmt).toUpperCase();
}

export default function CalendarView({ events, loading }: CalendarViewProps) {
  const grouped = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const key = new Date(ev.start).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return Array.from(map.entries()).sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime());
  }, [events]);

  if (loading) {
    return (
      <div className="space-y-5">
        {[1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <div className="skeleton h-4 w-32" />
            <div className="skeleton h-20" />
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <Card className="py-10 text-center">
        <CalendarDays className="w-10 h-10 text-[var(--text-faint)] mx-auto mb-3" />
        <p className="hud-label text-[10px] text-[var(--text-muted)]">SIN EVENTOS PRÓXIMOS</p>
        <p className="text-[var(--text-faint)] text-xs mt-1.5">Tu calendario está despejado.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {grouped.map(([dayKey, dayEvents]) => {
        const dateStr = new Date(dayEvents[0].start).toLocaleDateString('es-CL', {
          day: 'numeric', month: 'short',
        });
        return (
          <div key={dayKey}>
            {/* day header */}
            <div className="hud-divider mb-2.5">
              <Calendar className="w-3.5 h-3.5 text-[var(--cyan)]" />
              <span className="hud-label text-[10px] text-[var(--text)]">{getDateLabel(dayEvents[0].start)}</span>
              <span className="hud-readout text-[10px] text-[var(--text-faint)]">{dateStr}</span>
            </div>

            <div className="space-y-2">
              {dayEvents.map((ev) => (
                <Card key={ev.id} hover className="relative fade-in pl-4">
                  {/* left accent rail */}
                  <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-[var(--cyan)] shadow-[0_0_8px_var(--cyan)]" />

                  {/* time line */}
                  <div className="flex items-center gap-2 mb-1.5">
                    {ev.allDay ? (
                      <span className="hud-label text-[9px] px-1.5 py-0.5 border border-[var(--hairline-strong)] text-[var(--cyan)]">
                        TODO EL DÍA
                      </span>
                    ) : (
                      <span className="hud-readout text-xs text-[var(--cyan-bright)] tracking-wide">
                        {formatTimeRange(ev.start, ev.end)}
                      </span>
                    )}
                  </div>

                  {/* title */}
                  <p className="text-sm font-semibold text-[var(--text)] leading-snug">
                    {ev.title}
                  </p>

                  {/* description */}
                  {ev.description && (
                    <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">
                      {ev.description}
                    </p>
                  )}

                  {/* location */}
                  {ev.location && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-[var(--text-faint)]">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{ev.location}</span>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
