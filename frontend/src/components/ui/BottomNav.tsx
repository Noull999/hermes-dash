'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, BarChart3, FolderGit2, Mail, CalendarDays, Briefcase, Brain, Settings } from 'lucide-react';
import { classNames } from '@/lib/utils';

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

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--void)]/92 backdrop-blur-xl border-t border-[var(--hairline)] safe-area-bottom">
      <div className="max-w-lg mx-auto flex items-center justify-between h-[60px] px-1">
        {tabs.map(({ href, label, Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={classNames(
                'group relative flex flex-1 flex-col items-center gap-1 px-0.5 py-1.5 transition-all duration-200',
                isActive
                  ? 'text-[var(--cyan)] scale-[1.04]'
                  : 'text-[var(--text-faint)] hover:text-[var(--text-muted)] hover:scale-[1.02]'
              )}
            >
              {/* active top bracket - wider glow when active */}
              <span
                className={classNames(
                  'absolute top-0 left-1/2 -translate-x-1/2 h-[2px] rounded-full transition-all duration-300',
                  isActive
                    ? 'w-7 bg-[var(--cyan)] shadow-[0_0_12px_var(--cyan)]'
                    : 'w-0 bg-transparent group-hover:w-4 group-hover:bg-[var(--hairline-strong)]'
                )}
              />
              <Icon
                size={19}
                className={classNames(
                  'transition-all duration-200',
                  isActive && 'drop-shadow-[0_0_8px_var(--cyan)]'
                )}
              />
              <span className={classNames(
                'hud-label text-[8px] leading-none transition-all duration-200',
                isActive ? 'text-[var(--cyan)]' : 'text-[var(--text-faint)]'
              )}>
                {label}
              </span>
              {/* active dot indicator */}
              {isActive && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--cyan)] shadow-[0_0_6px_var(--cyan)]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
