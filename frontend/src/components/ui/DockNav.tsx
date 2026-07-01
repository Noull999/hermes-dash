'use client';

import { useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { classNames } from '@/lib/utils';

export interface DockTab {
  href: string;
  label: string;
  Icon: LucideIcon;
}

interface DockNavProps {
  tabs: DockTab[];
}

// Efecto lupa: mientras más cerca del cursor, más grande el ícono.
const MAX_SCALE = 1.55;
const NEIGHBOR = 90; // px de radio de influencia

export default function DockNav({ tabs }: DockNavProps) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const [mouseX, setMouseX] = useState<number | null>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const handleMove = useCallback((e: React.MouseEvent) => {
    setMouseX(e.clientX);
  }, []);

  const scaleFor = (i: number, isActive: boolean): number => {
    // Sin cursor (móvil/touch): el ítem activo queda realzado igual.
    if (mouseX === null) return isActive ? 1.22 : 1;
    const el = itemRefs.current[i];
    if (!el) return isActive ? 1.22 : 1;
    const rect = el.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    const dist = Math.abs(mouseX - center);
    if (dist > NEIGHBOR) return isActive ? 1.12 : 1;
    // interpolación suave (coseno) del centro hacia el borde de influencia
    const t = 1 - dist / NEIGHBOR;
    return Math.max(isActive ? 1.12 : 1, 1 + (MAX_SCALE - 1) * (t * t));
  };

  return (
    <nav
      ref={navRef}
      onMouseMove={handleMove}
      onMouseLeave={() => setMouseX(null)}
      className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--void)]/92 backdrop-blur-xl border-t border-[var(--hairline)] safe-area-bottom"
    >
      <div className="max-w-lg mx-auto flex items-end justify-between h-[60px] px-1">
        {tabs.map(({ href, label, Icon }, i) => {
          const isActive = pathname === href;
          const scale = scaleFor(i, isActive);
          return (
            <Link
              key={href}
              href={href}
              ref={(el) => { itemRefs.current[i] = el; }}
              className={classNames(
                'dock-item group relative flex flex-1 flex-col items-center gap-1 px-0.5 py-1.5 origin-bottom',
                isActive
                  ? 'text-[var(--cyan)]'
                  : 'text-[var(--text-faint)] hover:text-[var(--text-muted)]',
              )}
              style={{ transform: `scale(${scale.toFixed(3)})` }}
            >
              <span
                className={classNames(
                  'absolute top-0 left-1/2 -translate-x-1/2 h-[2px] rounded-full transition-all duration-300',
                  isActive
                    ? 'w-7 bg-[var(--cyan)] nav-active-bar'
                    : 'w-0 bg-transparent',
                )}
              />
              <Icon
                size={19}
                className={classNames(
                  'transition-all duration-200',
                  isActive && 'drop-shadow-[0_0_6px_var(--cyan)] nav-active-icon',
                )}
              />
              <span className="hud-label text-[8px] leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
