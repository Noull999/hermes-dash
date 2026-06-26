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

const DAYS_ES = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'];

/**
 * Translate a 5-field cron expression into plain Spanish.
 * Falls back to the raw expression for patterns it doesn't recognise.
 */
export function humanizeCron(expr: string): string {
  if (!expr) return '';
  if (expr === 'always') return 'Servicio continuo';

  const parts = expr.trim().split(/\s+/);
  if (parts.length < 5) {
    // Friendly interval shorthands like "6h", "30m", "@daily"
    const m = expr.match(/^(\d+)\s*([mhd])$/i);
    if (m) {
      const n = Number(m[1]);
      const unit = { m: 'minuto', h: 'hora', d: 'día' }[m[2].toLowerCase()]!;
      return `Cada ${n} ${unit}${n > 1 ? (m[2].toLowerCase() === 'h' ? 's' : 's') : ''}`;
    }
    if (expr === '@hourly') return 'Cada hora';
    if (expr === '@daily') return 'Diario a medianoche';
    if (expr === '@weekly') return 'Semanal (domingo)';
    return expr;
  }

  const [min, hour, dom, , dow] = parts;
  const at = (h: string, m: string) =>
    `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;

  // Every N minutes
  if (min.startsWith('*/') && hour === '*') {
    return `Cada ${min.slice(2)} minutos`;
  }
  // Every N hours
  if (hour.startsWith('*/') && (min === '0' || min === '*')) {
    return `Cada ${hour.slice(2)} horas`;
  }
  // Every minute
  if (min === '*' && hour === '*') return 'Cada minuto';

  // Specific time
  if (/^\d+$/.test(min) && /^\d+$/.test(hour)) {
    const time = at(hour, min);
    if (dow !== '*' && /^\d$/.test(dow)) {
      return `${DAYS_ES[Number(dow)]?.replace(/^\w/, (c) => c.toUpperCase())} a las ${time}`;
    }
    if (dom !== '*' && /^\d+$/.test(dom)) {
      return `Día ${dom} de cada mes a las ${time}`;
    }
    return `Diario a las ${time}`;
  }

  return expr;
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
