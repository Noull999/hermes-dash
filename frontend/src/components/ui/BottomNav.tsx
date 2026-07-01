'use client';

import { MessageSquare, BarChart3, FolderGit2, Mail, CalendarDays, Briefcase, Brain, Settings } from 'lucide-react';
import DockNav from './DockNav';

const tabs = [
  { href: '/', label: 'CHAT', Icon: MessageSquare },
  { href: '/dashboard', label: 'PANEL', Icon: BarChart3 },
  { href: '/email', label: 'MAIL', Icon: Mail },
  { href: '/calendar', label: 'CAL', Icon: CalendarDays },
  { href: '/repos', label: 'REPOS', Icon: FolderGit2 },
  { href: '/jobs', label: 'JOBS', Icon: Briefcase },
  { href: '/brain', label: 'BRAIN', Icon: Brain },
  { href: '/settings', label: 'SYS', Icon: Settings },
];

// El nav de todas las secciones ahora usa el mismo DockNav que la home
// (efecto lupa en desktop + realce del activo en touch).
export default function BottomNav() {
  return <DockNav tabs={tabs} />;
}
