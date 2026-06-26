'use client';

import { create } from 'zustand';

export type LogLevel = 'info' | 'warn' | 'error';
export type LogSource = 'api' | 'ws' | 'gateway' | 'system' | 'app';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  source: LogSource;
  message: string;
  details?: string;
}

interface LogState {
  entries: LogEntry[];
  maxEntries: number;
  addLog: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  clear: () => void;
}

let logCounter = 0;

export const useLogStore = create<LogState>((set, get) => ({
  entries: [],
  maxEntries: 100,

  addLog: (entry) => {
    const newEntry: LogEntry = {
      ...entry,
      id: `log_${Date.now()}_${++logCounter}`,
      timestamp: new Date(),
    };
    set((s) => ({
      entries: [newEntry, ...s.entries].slice(0, s.maxEntries),
    }));

    // También al console
    const icon = entry.level === 'error' ? '❌' : entry.level === 'warn' ? '⚠️' : 'ℹ️';
    console.log(`[${entry.source}] ${icon} ${entry.message}`, entry.details || '');
  },

  clear: () => set({ entries: [] }),
}));

// Helper para envolver fetchs con logging automático
export async function loggedFetch<T>(
  source: LogSource,
  label: string,
  fetchFn: () => Promise<T>,
): Promise<T> {
  const { addLog } = useLogStore.getState();
  try {
    const result = await fetchFn();
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    addLog({
      level: 'error',
      source,
      message: `${label}: ${msg}`,
      details: msg,
    });
    throw err;
  }
}
