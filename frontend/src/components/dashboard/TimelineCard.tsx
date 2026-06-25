'use client';

import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { useHermesStore } from '@/store/useHermesStore';
import { GitCommit, Rocket, StickyNote, Server, MessageSquare, RefreshCw, Clock } from 'lucide-react';
import { useEffect } from 'react';
import { formatRelativeTime } from '@/lib/utils';

const eventIcons: Record<string, React.ReactNode> = {
  commit: <GitCommit size={14} />,
  deploy: <Rocket size={14} />,
  note: <StickyNote size={14} />,
  system: <Server size={14} />,
  chat: <MessageSquare size={14} />,
};

const eventColors: Record<string, string> = {
  commit: 'var(--accent)',
  deploy: 'var(--success)',
  note: 'var(--purple)',
  system: 'var(--warning)',
  chat: 'var(--text-muted)',
};

export default function TimelineCard() {
  const { timeline, timelineLoading, timelineError, fetchTimeline } = useHermesStore();

  useEffect(() => {
    if (timeline.length === 0 && !timelineLoading) fetchTimeline();
  }, [timeline.length, timelineLoading, fetchTimeline]);

  if (timelineLoading && timeline.length === 0) {
    return (
      <Card>
        <div className="space-y-3">
          <div className="skeleton h-5 w-36" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="skeleton w-8 h-8 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (timelineError) {
    return (
      <Card>
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--error)]">Error: {timelineError}</span>
          <button onClick={fetchTimeline} className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.06)]">
            <RefreshCw size={14} className="text-[var(--accent)]" />
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-[var(--warning)]" />
          <h3 className="text-sm font-semibold text-[var(--text)]">Timeline</h3>
        </div>
        <button onClick={fetchTimeline} className="p-1 rounded-lg hover:bg-[rgba(255,255,255,0.06)] transition-colors">
          <RefreshCw size={12} className="text-[var(--text-muted)]" />
        </button>
      </div>

      <div className="space-y-1">
        {timeline.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] py-4 text-center">
            No hay eventos recientes
          </p>
        ) : (
          timeline.slice(0, 15).map((event) => (
            <div
              key={event.id}
              className="flex gap-3 py-2.5 border-b border-[rgba(255,255,255,0.04)] last:border-0 fade-in"
            >
              <div
                className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                style={{
                  background: `${eventColors[event.type] || 'var(--text-muted)'}15`,
                  color: eventColors[event.type] || 'var(--text-muted)',
                }}
              >
                {eventIcons[event.type] || <Clock size={14} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text)] truncate">
                  {event.title}
                </p>
                {event.description && (
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">
                    {event.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {formatRelativeTime(event.timestamp)}
                  </span>
                  {event.repo && (
                    <Badge variant="default">{event.repo}</Badge>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
