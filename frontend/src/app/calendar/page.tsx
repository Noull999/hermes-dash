'use client';

import { useState, useEffect, startTransition } from 'react';
import ClientLayout from '@/components/ui/ClientLayout';
import Card from '@/components/ui/Card';
import CalendarView from '@/components/calendar/CalendarView';
import { getCalendarEvents, CalendarEvent, trackGamification } from '@/lib/api';
import { AlertCircle, RefreshCw } from 'lucide-react';

const DAY_OPTIONS = [
  { label: '7 días', value: 7 },
  { label: '14 días', value: 14 },
  { label: '30 días', value: 30 },
] as const;

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);

  useEffect(() => {
    startTransition(() => {
      loadEvents(days);
    });
    // Fire-and-forget gamification track
    trackGamification({ action: 'view_calendar', value: 1 }).catch(() => {});
  }, []);

  async function loadEvents(d: number) {
    setLoading(true);
    setError(null);
    try {
      const data = await getCalendarEvents(d);
      setEvents(data.events);
      setTotal(data.total);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar calendario');
    } finally {
      setLoading(false);
    }
  }

  function handleDayChange(d: number) {
    setDays(d);
    startTransition(() => {
      loadEvents(d);
    });
  }

  return (
    <ClientLayout>
      <div className="p-4 pb-24 max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white/90">Calendario</h1>
            {!loading && (
              <p className="text-xs text-white/40 mt-0.5">
                {total} {total === 1 ? 'evento' : 'eventos'} en los próximos {days} días
              </p>
            )}
          </div>
          <button
            onClick={() => loadEvents(days)}
            disabled={loading}
            className="text-xs text-cyan-400 hover:text-cyan-300 transition disabled:opacity-40 flex items-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>

        {/* Day selector */}
        <div className="flex gap-2">
          {DAY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleDayChange(opt.value)}
              className={`text-xs px-3 py-1.5 rounded-lg transition ${
                days === opt.value
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 border border-transparent'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <CalendarView events={[]} loading={true} />
        )}

        {/* Error */}
        {error && (
          <Card className="p-4 border-red-500/30">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          </Card>
        )}

        {/* Calendar events */}
        {!loading && !error && (
          <CalendarView events={events} loading={false} />
        )}
      </div>
    </ClientLayout>
  );
}
