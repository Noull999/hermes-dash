import { create } from 'zustand';
import {
  getTokens,
  getSystem,
  getRepos,
  getTimeline,
  getHealth,
  TokenData,
  SystemData,
  RepoData,
  TimelineEvent,
} from '@/lib/api';

interface HermesState {
  // Health
  health: { status: string; uptime: number } | null;
  healthLoading: boolean;
  healthError: string | null;

  // Tokens
  tokens: TokenData | null;
  tokensLoading: boolean;
  tokensError: string | null;

  // System
  system: SystemData | null;
  systemLoading: boolean;
  systemError: string | null;

  // Repos
  repos: RepoData[];
  reposLoading: boolean;
  reposError: string | null;

  // Timeline
  timeline: TimelineEvent[];
  timelineLoading: boolean;
  timelineError: string | null;

  // Orb state
  orbState: 'idle' | 'processing' | 'success' | 'error';
  orbMessage: string;

  // Actions
  fetchHealth: () => Promise<void>;
  fetchTokens: () => Promise<void>;
  fetchSystem: () => Promise<void>;
  fetchRepos: () => Promise<void>;
  fetchTimeline: () => Promise<void>;
  fetchAll: () => Promise<void>;
  setOrbState: (state: 'idle' | 'processing' | 'success' | 'error', message?: string) => void;
}

export const useHermesStore = create<HermesState>((set, get) => ({
  health: null,
  healthLoading: false,
  healthError: null,

  tokens: null,
  tokensLoading: false,
  tokensError: null,

  system: null,
  systemLoading: false,
  systemError: null,

  repos: [],
  reposLoading: false,
  reposError: null,

  timeline: [],
  timelineLoading: false,
  timelineError: null,

  orbState: 'idle',
  orbMessage: '',

  fetchHealth: async () => {
    set({ healthLoading: true, healthError: null });
    try {
      const health = await getHealth();
      set({ health, healthLoading: false });
    } catch (err) {
      set({ healthError: (err as Error).message, healthLoading: false });
    }
  },

  fetchTokens: async () => {
    set({ tokensLoading: true, tokensError: null });
    try {
      const tokens = await getTokens();
      set({ tokens, tokensLoading: false });
    } catch (err) {
      set({ tokensError: (err as Error).message, tokensLoading: false });
    }
  },

  fetchSystem: async () => {
    set({ systemLoading: true, systemError: null });
    try {
      const system = await getSystem();
      set({ system, systemLoading: false });
    } catch (err) {
      set({ systemError: (err as Error).message, systemLoading: false });
    }
  },

  fetchRepos: async () => {
    set({ reposLoading: true, reposError: null });
    try {
      const repos = await getRepos();
      set({ repos, reposLoading: false });
    } catch (err) {
      set({ reposError: (err as Error).message, reposLoading: false });
    }
  },

  fetchTimeline: async () => {
    set({ timelineLoading: true, timelineError: null });
    try {
      const timeline = await getTimeline();
      set({ timeline, timelineLoading: false });
    } catch (err) {
      set({ timelineError: (err as Error).message, timelineLoading: false });
    }
  },

  fetchAll: async () => {
    const { fetchHealth, fetchTokens, fetchSystem, fetchRepos, fetchTimeline } = get();
    await Promise.allSettled([
      fetchHealth(),
      fetchTokens(),
      fetchSystem(),
      fetchRepos(),
      fetchTimeline(),
    ]);
  },

  setOrbState: (state, message = '') => set({ orbState: state, orbMessage: message }),
}));
