// All requests go through the same-origin server-side proxy
// (/api/proxy/...). The proxy injects the auth token server-side, so the
// token never reaches the browser and there is no CORS/mixed-content issue.
import { useLogStore } from '@/store/useLogStore';
const API_BASE = '/api/proxy';

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const errMsg = `API ${res.status}: ${text || res.statusText}`;
    useLogStore.getState().addLog({
      level: 'error',
      source: 'api',
      message: `${endpoint} → ${res.status}`,
      details: text || res.statusText,
    });
    throw new Error(errMsg);
  }

  if (res.status === 204) return {} as T;
  return res.json();
}

// Health
export async function getHealth() {
  return request<{ status: string; uptime: number }>('/api/health');
}

// Tokens — matches backend /api/tokens { session, categories }
export interface TokenSession {
  calls: number;
  new_total_tokens: number;
  completion_tokens: number;
  new_prompt_tokens: number;
  gross_prompt_tokens: number;
  gross_total_tokens: number;
  cached_tokens: number;
  cache_pct: number;
  limit: number;
  remaining_tokens: number;
  remaining_hours: number;
  next_reset: string;
}

export interface TokenCategory {
  calls: number;
  new_tokens: number;
  cached_tokens: number;
  total_tokens: number;
  models: string[];
}

export interface TokenData {
  session: TokenSession;
  categories: Record<string, TokenCategory>;
}

export async function getTokens() {
  return request<TokenData>('/api/tokens');
}

// System — matches backend /api/system
export interface SystemData {
  gateway: string;
  uptime: number; // seconds
  cpu_pct: number;
  ram_pct: number;
  disk_pct: number;
}

export async function getSystem() {
  return request<SystemData>('/api/system');
}

// Repos — matches backend /api/repos
export type RepoSyncStatus = 'synced' | 'behind' | 'ahead' | 'unknown' | string;

export interface RepoData {
  name: string;
  branch: string;
  vps_commit: string;
  vps_message: string;
  dirty: boolean;
  status: RepoSyncStatus;
  behind: number;
  ahead: number;
}

export async function getRepos() {
  return request<RepoData[]>('/api/repos');
}

export async function pullRepo(repoName: string) {
  return request<{ success: boolean; output: string; fetch: string }>('/api/repos/pull', {
    method: 'POST',
    body: JSON.stringify({ repo: repoName }),
  });
}

// Timeline — matches backend /api/timeline
export interface TimelineEvent {
  timestamp: string;
  type: string;
  message: string;
  project?: string;
}

export async function getTimeline() {
  return request<TimelineEvent[]>('/api/timeline');
}

// Brain
export interface BrainItem {
  id: string;
  type: 'note' | 'link' | 'snippet' | 'idea';
  title: string;
  content: string;
  tags?: string[];
  created_at: string;
}

export async function getBrain() {
  return request<BrainItem[]>('/api/brain');
}

export async function createBrain(item: Omit<BrainItem, 'id' | 'created_at'>) {
  return request<BrainItem>('/api/brain', {
    method: 'POST',
    body: JSON.stringify(item),
  });
}

export async function deleteBrain(id: string) {
  return request<void>(`/api/brain?id=${id}`, { method: 'DELETE' });
}

// Reminders
export interface Reminder {
  id: string;
  text: string;
  datetime: string;
  status: 'pending' | 'done' | 'missed';
  created_at: string;
}

export async function getReminders() {
  return request<Reminder[]>('/api/reminders');
}

export async function createReminder(reminder: Omit<Reminder, 'id' | 'created_at' | 'status'>) {
  return request<Reminder>('/api/reminders', {
    method: 'POST',
    body: JSON.stringify(reminder),
  });
}

export async function deleteReminder(id: string) {
  return request<void>(`/api/reminders?id=${id}`, { method: 'DELETE' });
}

// Claude
export interface ClaudePayload {
  repo?: string;
  model: string;
  prompt: string;
  mode?: 'chat' | 'code' | 'review';
}

export async function runClaude(payload: ClaudePayload) {
  return request<{ success: boolean; response: string; commit: string | null; error: string | null }>('/api/claude', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ── Email ─────────────────────────────────────────────────────────────────
export interface EmailData {
  id: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  labelIds: string[];
}

export interface EmailResponse {
  emails: EmailData[];
  total: number;
  error?: string;
}

export async function getEmails(q = 'in:inbox', maxResults = 10) {
  const params = new URLSearchParams({ q, max_results: String(maxResults) });
  return request<EmailResponse>(`/api/email?${params}`);
}

// ── Calendar ──────────────────────────────────────────────────────────────
export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start: string;
  end: string;
  allDay: boolean;
  location: string;
}

export interface CalendarResponse {
  events: CalendarEvent[];
  total: number;
  error?: string;
}

export async function getCalendarEvents(days = 7) {
  return request<CalendarResponse>(`/api/calendar?days=${days}`);
}

// ── Jobs ──────────────────────────────────────────────────────────────────
export interface JobInfo {
  source: string;
  id: string;
  name: string;
  schedule: string;
  status: string;
  substatus?: string;
  command?: string;     // what the job actually runs
  description?: string; // human description from cron.json
  last_run?: string;
  next_run?: string;
  running?: boolean;    // true if executing right now
}

export interface RunEntry {
  time: string;
  event: string;
}

export interface JobsResponse {
  jobs: JobInfo[];
  recent_runs: RunEntry[];
}

export async function getJobs() {
  return request<JobsResponse>('/api/jobs');
}

// ── Push ──────────────────────────────────────────────────────────────────
export interface PushSubscriptionsResponse {
  subscriptions: unknown[];
  total: number;
}

export async function getPushSubscriptions() {
  return request<PushSubscriptionsResponse>('/api/push/subscriptions');
}

export async function subscribePush() {
  return request<{ status: string; total: number }>('/api/push/subscribe', {
    method: 'POST',
  });
}

// ── Gamification ──────────────────────────────────────────────────────────
export interface AchievementInfo {
  id: string;
  name: string;
  icon: string;
  desc: string;
}

export interface GamificationData {
  level: number;
  xp: number;
  xp_next: number;
  unlocked: AchievementInfo[];
  locked: AchievementInfo[];
  new_achievements: AchievementInfo[];
  stats: Record<string, number>;
}

export interface GamificationTrackPayload {
  action: string;
  value: number;
}

export interface GamificationTrackResponse {
  xp: number;
  level: number;
  new_achievements: AchievementInfo[];
}

export async function getGamification() {
  return request<GamificationData>('/api/gamification');
}

export async function trackGamification(payload: GamificationTrackPayload) {
  return request<GamificationTrackResponse>('/api/gamification/track', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
