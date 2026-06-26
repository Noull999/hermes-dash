import type {
  TokenData,
  SystemData,
  RepoData,
  TimelineEvent,
  BrainItem,
  Reminder,
  EmailData,
  CalendarEvent,
  JobInfo,
  RunEntry,
  AchievementInfo,
  GamificationData,
} from './api';

// ── Tokens ────────────────────────────────────────────────────────────────
export const mockTokenData: TokenData = {
  session: {
    calls: 42,
    new_total_tokens: 125_000,
    completion_tokens: 18_000,
    new_prompt_tokens: 107_000,
    gross_prompt_tokens: 447_000,
    gross_total_tokens: 465_000,
    cached_tokens: 340_000,
    cache_pct: 76,
    limit: 1_000_000,
    remaining_tokens: 875_000,
    remaining_hours: 3.8,
    next_reset: '2026-06-25T22:00:00Z',
  },
  categories: {
    'hermes-conversacion': { calls: 20, new_tokens: 45_000, cached_tokens: 120_000, total_tokens: 165_000, models: ['deepseek-v4-flash'] },
    'code-review-bot': { calls: 12, new_tokens: 30_000, cached_tokens: 80_000, total_tokens: 110_000, models: ['kimi-k2.7-code'] },
    'claude-code': { calls: 10, new_tokens: 50_000, cached_tokens: 140_000, total_tokens: 190_000, models: ['claude-sonnet-4-6'] },
  },
};

// ── System ────────────────────────────────────────────────────────────────
export const mockSystemData: SystemData = {
  gateway: 'online',
  uptime: 1_123_200, // ~13 days in seconds
  cpu_pct: 34.2,
  ram_pct: 62.8,
  disk_pct: 44.5,
};

// ── Repos ─────────────────────────────────────────────────────────────────
export const mockRepoData: RepoData[] = [
  { name: 'hermes-dash', github_url: 'https://github.com/Noull999/hermes-dash', description: 'Dashboard Hermes', language: 'TypeScript', updated_at: '2026-06-26T16:00:00Z', private: false, fork: false, on_vps: true, branch: 'main', vps_commit: 'abc1234', vps_message: 'Add dashboard API routes', dirty: false, status: 'synced', behind: 0, ahead: 0 },
  { name: 'Jarvis', github_url: 'https://github.com/Noull999/Jarvis', description: 'AI assistant', language: 'Python', updated_at: '2026-06-25T12:00:00Z', private: false, fork: false, on_vps: true, branch: 'main', vps_commit: 'def4567', vps_message: 'Merge savings dashboard', dirty: true, status: 'behind', behind: 2, ahead: 0 },
  { name: 'multi-agentes', github_url: 'https://github.com/Noull999/multi-agentes', description: 'Multi-agent system', language: 'Python', updated_at: '2026-06-24T10:00:00Z', private: false, fork: false, on_vps: true, branch: 'main', vps_commit: 'ghi7890', vps_message: 'Fix LLM prefix', dirty: false, status: 'synced', behind: 0, ahead: 0 },
  { name: 'proyecto-administrativo', github_url: 'https://github.com/Noull999/proyecto-administrativo', description: 'Administrative project', language: 'Python', updated_at: '2026-06-23T08:00:00Z', private: false, fork: false, on_vps: false, branch: 'main', vps_commit: '', vps_message: '', dirty: false, status: 'not-cloned', behind: 0, ahead: 0 },
];

// ── Timeline ──────────────────────────────────────────────────────────────
export const mockTimelineEvents: TimelineEvent[] = [
  { timestamp: '2026-06-25T09:00:00Z', type: 'commit', message: 'fix: resolve token refresh race', project: 'hermes-core' },
  { timestamp: '2026-06-25T08:00:00Z', type: 'action', message: 'Deploy v2.4.1 to staging', project: 'dash-frontend' },
  { timestamp: '2026-06-24T20:00:00Z', type: 'chat', message: 'User asked about email integration' },
  { timestamp: '2026-06-24T03:00:00Z', type: 'system', message: 'Weekly backup completed', project: 'cron' },
  { timestamp: '2026-06-23T16:30:00Z', type: 'info', message: 'Planning: Calendar sync architecture' },
];

// ── Brain ─────────────────────────────────────────────────────────────────
export const mockBrainItems: BrainItem[] = [
  { id: 'brain-1', type: 'idea', title: 'Auto-archive stale reminders', content: 'Move reminders >30d old to an archive collection automatically.', tags: ['ux', 'cleanup'], created_at: '2025-06-22T10:00:00Z' },
  { id: 'brain-2', type: 'link', title: 'Next.js 15 caching docs', content: 'https://nextjs.org/docs/app/building-your-application/caching', tags: ['reference', 'nextjs'], created_at: '2025-06-21T14:00:00Z' },
  { id: 'brain-3', type: 'snippet', title: 'Debounce hook pattern', content: 'export function useDebounce<T>(value: T, delay: number): T { … }', tags: ['react', 'hooks'], created_at: '2025-06-20T09:30:00Z' },
  { id: 'brain-4', type: 'note', title: 'Gamification milestones', content: 'Level 5 → unlock custom dashboard themes. Level 10 → early access features.', tags: ['gamification', 'planning'], created_at: '2025-06-19T11:00:00Z' },
];

// ── Reminders ─────────────────────────────────────────────────────────────
export const mockReminders: Reminder[] = [
  { id: 'rem-1', text: 'Review PR #342', datetime: '2025-06-25T14:00:00Z', status: 'pending', created_at: '2025-06-24T12:00:00Z' },
  { id: 'rem-2', text: 'Push emails mock data branch', datetime: '2025-06-25T10:00:00Z', status: 'done', created_at: '2025-06-24T08:00:00Z' },
  { id: 'rem-3', text: 'Weekly team standup', datetime: '2025-06-26T09:30:00Z', status: 'pending', created_at: '2025-06-25T07:00:00Z' },
  { id: 'rem-4', text: 'Server certificate renewal', datetime: '2025-06-20T00:00:00Z', status: 'missed', created_at: '2025-06-18T16:00:00Z' },
];

// ── Email ─────────────────────────────────────────────────────────────────
export const mockEmails: EmailData[] = [
  { id: 'email-1', from: 'noreply@github.com', subject: '[hermes-core] PR #342: fix token refresh', date: '2025-06-25T09:15:00Z', snippet: 'Adds mutex around refresh call to prevent concurrent token…', labelIds: ['INBOX', 'CATEGORY_UPDATES'] },
  { id: 'email-2', from: 'ci@circleci.com', subject: 'Build failed: main (abc123)', date: '2025-06-25T08:45:00Z', snippet: 'Stage \"lint\" failed with exit code 1.', labelIds: ['INBOX', 'IMPORTANT'] },
  { id: 'email-3', from: 'calendar-notification@google.com', subject: 'Invitation: Sprint Review', date: '2025-06-25T07:30:00Z', snippet: 'You have a new event: Sprint Review — Fri, Jun 27 at 15:00…', labelIds: ['INBOX', 'CATEGORY_SOCIAL'] },
  { id: 'email-4', from: 'alerts@datadoghq.com', subject: 'Alert: CPU > 80% on hermes-worker-3', date: '2025-06-24T22:00:00Z', snippet: 'Metric avg:cpu.user{host:hermes-worker-3} is 82.5%', labelIds: ['INBOX', 'CATEGORY_UPDATES'] },
];

export const mockEmailResponse = {
  emails: mockEmails,
  total: 4,
};

// ── Calendar ──────────────────────────────────────────────────────────────
export const mockCalendarEvents: CalendarEvent[] = [
  { id: 'cal-1', title: 'Sprint Review', description: 'Demo completed stories for stakeholder feedback.', start: '2025-06-27T15:00:00Z', end: '2025-06-27T16:00:00Z', allDay: false, location: 'Zoom #main', reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 30 }] } },
  { id: 'cal-2', title: '1:1 with Alex', description: 'Weekly catch-up on career growth.', start: '2025-06-26T10:00:00Z', end: '2025-06-26T10:30:00Z', allDay: false, location: 'Room 3B', reminders: { useDefault: true, overrides: [] } },
  { id: 'cal-3', title: 'OKR Planning — Q3', description: 'Set objectives and key results for next quarter.', start: '2025-06-30T09:00:00Z', end: '2025-06-30T12:00:00Z', allDay: false, location: 'Conference Room A', reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 1440 }, { method: 'email', minutes: 60 }] } },
  { id: 'cal-4', title: 'Independence Day (US)', description: 'US holiday — optional work-from-home.', start: '2025-07-04T00:00:00Z', end: '2025-07-05T00:00:00Z', allDay: true, location: '', reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 1440 }] } },
];

export const mockCalendarResponse = {
  events: mockCalendarEvents,
  total: 4,
};

// ── Jobs ──────────────────────────────────────────────────────────────────
export const mockJobInfo: JobInfo[] = [
  { source: 'github', id: 'job-gh-1', name: 'Build & Test', schedule: 'on:push', status: 'success', substatus: 'completed' },
  { source: 'github', id: 'job-gh-2', name: 'Lint Check', schedule: 'on:push', status: 'success', substatus: 'completed' },
  { source: 'scheduler', id: 'job-sch-1', name: 'Daily Backup', schedule: '0 3 * * *', status: 'idle' },
  { source: 'scheduler', id: 'job-sch-2', name: 'Sync Email Labels', schedule: '*/15 * * * *', status: 'running', substatus: 'processing batch #4' },
  { source: 'scheduler', id: 'job-sch-3', name: 'Rotate Logs', schedule: '0 0 * * 0', status: 'idle' },
];

export const mockRunEntries: RunEntry[] = [
  { time: '2025-06-25T09:00:00Z', event: 'Build & Test — passed (2m 14s)' },
  { time: '2025-06-25T08:45:00Z', event: 'Lint Check — passed (35s)' },
  { time: '2025-06-25T08:30:00Z', event: 'Sync Email Labels — started' },
  { time: '2025-06-25T03:00:00Z', event: 'Daily Backup — completed (16 GB)' },
  { time: '2025-06-24T23:59:00Z', event: 'Sync Email Labels — completed (187 emails)' },
];

export const mockJobsResponse = {
  jobs: mockJobInfo,
  recent_runs: mockRunEntries,
};

// ── Push ──────────────────────────────────────────────────────────────────
export const mockPushSubscriptionsResponse = {
  subscriptions: [
    { id: 'sub-1', endpoint: 'https://fcm.googleapis.com/…', keys: { p256dh: '…', auth: '…' } },
    { id: 'sub-2', endpoint: 'https://fcm.googleapis.com/…', keys: { p256dh: '…', auth: '…' } },
  ],
  total: 2,
};

export const mockSubscribePushResponse = {
  status: 'subscribed',
  total: 3,
};

// ── Gamification ──────────────────────────────────────────────────────────
export const mockAchievementsUnlocked: AchievementInfo[] = [
  { id: 'ach-first-deploy', name: 'First Deploy', icon: '🚀', desc: 'Deploy your first dashboard update.' },
  { id: 'ach-email-sync', name: 'Inbox Hero', icon: '📧', desc: 'Sync email for the first time.' },
  { id: 'ach-level-3', name: 'Level 3 Achieved', icon: '⭐', desc: 'Reach user level 3.' },
];

export const mockAchievementsLocked: AchievementInfo[] = [
  { id: 'ach-100-emails', name: 'Mail Master', icon: '📬', desc: 'Sync 100+ emails in a single day.' },
  { id: 'ach-7-day-streak', name: 'Steady Hand', icon: '🔥', desc: 'Use the dashboard 7 days in a row.' },
  { id: 'ach-cal-sync', name: 'Calendar Guru', icon: '📅', desc: 'Sync calendar events.' },
  { id: 'ach-level-10', name: 'Level 10 Achieved', icon: '🏆', desc: 'Reach user level 10.' },
];

export const mockGamificationData: GamificationData = {
  level: 4,
  xp: 1850,
  xp_next: 2500,
  unlocked: mockAchievementsUnlocked,
  locked: mockAchievementsLocked,
  new_achievements: [],
  stats: {
    emails_synced: 42,
    calendar_events_created: 8,
    reminders_completed: 17,
    deployments: 5,
    days_active: 23,
  },
};

export const mockGamificationTrackResponse = {
  xp: 1875,
  level: 4,
  new_achievements: [] as AchievementInfo[],
};
