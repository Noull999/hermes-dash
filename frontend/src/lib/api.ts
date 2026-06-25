const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const AUTH_TOKEN = 'dev-token';

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }

  if (res.status === 204) return {} as T;
  return res.json();
}

// Health
export async function getHealth() {
  return request<{ status: string; uptime: number }>('/api/health');
}

// Tokens
export interface TokenData {
  total_new: number;
  total_cached: number;
  total_gross: number;
  projects: Record<string, { new_tokens: number; cached_tokens: number; description?: string }>;
}

export async function getTokens() {
  return request<TokenData>('/api/tokens');
}

// System
export interface SystemData {
  gateway_status: string;
  cpu_percent: number;
  memory_percent: number;
  memory_used_gb: number;
  memory_total_gb: number;
  disk_percent: number;
  uptime_hours: number;
}

export async function getSystem() {
  return request<SystemData>('/api/system');
}

// Repos
export interface RepoData {
  name: string;
  branch: string;
  commits_behind: number;
  dirty: boolean;
  sync_status: 'synced' | 'behind' | 'ahead' | 'error';
  last_commit?: string;
  last_commit_time?: string;
}

export async function getRepos() {
  return request<RepoData[]>('/api/repos');
}

// Timeline
export interface TimelineEvent {
  id: string;
  type: 'commit' | 'deploy' | 'note' | 'system' | 'chat';
  title: string;
  description?: string;
  timestamp: string;
  repo?: string;
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
  return request<{ response: string; session_id: string }>('/api/claude', {
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
