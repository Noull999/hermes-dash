export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'ahora';
  if (diffMins < 60) return `hace ${diffMins} min`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays < 7) return `hace ${diffDays}d`;
  return formatDate(date);
}

export function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

export function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len) + '…';
}

export function classNames(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function getStreakDays(): number {
  // Calculate streak from localStorage
  if (typeof window === 'undefined') return 0;
  const stored = localStorage.getItem('hermes-streak');
  if (!stored) return 0;
  try {
    const { count, date } = JSON.parse(stored);
    const lastDate = new Date(date);
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / 86400000);
    if (diffDays === 0) return count;
    if (diffDays === 1) return count;
    return 0; // streak broken
  } catch {
    return 0;
  }
}

export function updateStreak(): number {
  if (typeof window === 'undefined') return 0;
  const stored = localStorage.getItem('hermes-streak');
  const today = new Date().toDateString();
  let count = 1;
  if (stored) {
    try {
      const data = JSON.parse(stored);
      if (data.date === today) return data.count;
      const lastDate = new Date(data.date);
      const diffDays = Math.floor((new Date().getTime() - lastDate.getTime()) / 86400000);
      count = diffDays === 1 ? data.count + 1 : 1;
    } catch {
      count = 1;
    }
  }
  localStorage.setItem('hermes-streak', JSON.stringify({ count, date: today }));
  return count;
}
