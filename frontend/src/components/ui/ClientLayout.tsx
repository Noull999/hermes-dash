'use client';

import { ReactNode } from 'react';
import Header from '@/components/ui/Header';
import BottomNav from '@/components/ui/BottomNav';
import { useHermesStore } from '@/store/useHermesStore';
import { useEffect } from 'react';

interface ClientLayoutProps {
  children: ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const fetchAll = useHermesStore((s) => s.fetchAll);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 60000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="page-container">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
