'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Orbit, MessageSquare, BarChart3, FolderGit2, Mail, CalendarDays, Briefcase, Brain, Settings } from 'lucide-react';
import { classNames } from '@/lib/utils';

const tabs = [
  { href: '/', label: 'Orb', Icon: Orbit },
  { href: '/chat', label: 'Chat', Icon: MessageSquare },
  { href: '/dashboard', label: 'Panel', Icon: BarChart3 },
  { href: '/email', label: 'Email', Icon: Mail },
  { href: '/calendar', label: 'Cal', Icon: CalendarDays },
  { href: '/repos', label: 'Repos', Icon: FolderGit2 },
  { href: '/jobs', label: 'Jobs', Icon: Briefcase },
  { href: '/brain', label: 'Cerebro', Icon: Brain },
  { href: '/settings', label: 'Ajustes', Icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg)]/90 backdrop-blur-xl border-t border-[rgba(255,255,255,0.06)] safe-area-bottom">
      <div className="max-w-lg mx-auto flex items-center justify-start overflow-x-auto gap-1 h-16 px-2 scrollbar-none snap-x snap-mandatory">
        {tabs.map(({ href, label, Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={classNames(
                'flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl transition-all duration-200 relative snap-start flex-shrink-0',
                isActive
                  ? 'text-[var(--accent)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              )}
            >
              <div
                className={classNames(
                  'p-1.5 rounded-lg transition-all duration-200',
                  isActive && 'bg-[rgba(0,212,255,0.1)]'
                )}
              >
                <Icon size={20} />
              </div>
              <span className="text-[10px] font-medium leading-none">{label}</span>
              {isActive && (
                <div className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-6 h-[2px] rounded-full bg-[var(--accent)]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
