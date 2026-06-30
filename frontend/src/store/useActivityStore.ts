import { create } from 'zustand';

export interface ActivityEvent {
  id: string;
  type: 'job' | 'repo' | 'gateway' | 'error' | 'info' | 'heartbeat';
  message: string;
  timestamp: string;
  project?: string;
}

const MAX_EVENTS = 50;

interface ActivityState {
  events: ActivityEvent[];
  latestType: string | null;
  connect: () => void;
  disconnect: () => void;
}

let _source: EventSource | null = null;

export const useActivityStore = create<ActivityState>((set, get) => ({
  events: [],
  latestType: null,

  connect: () => {
    if (_source) return;

    const source = new EventSource('/api/proxy/api/activity/stream');

    source.onmessage = (e) => {
      try {
        const event: ActivityEvent = JSON.parse(e.data);
        if (event.type === 'heartbeat') return;

        set((s) => ({
          events: [event, ...s.events].slice(0, MAX_EVENTS),
          latestType: event.type,
        }));
      } catch {
        // ignore
      }
    };

    source.onerror = () => {
      // SSE auto-reconnects
    };

    _source = source;
  },

  disconnect: () => {
    if (_source) {
      _source.close();
      _source = null;
    }
  },
}));
