'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useActivityStore } from '@/store/useActivityStore';

const CommandPalette = dynamic(() => import('@/components/ui/CommandPalette'), { ssr: false });
const SearchPanel = dynamic(() => import('@/components/ui/SearchPanel'), { ssr: false });
const MemoryPanel = dynamic(() => import('@/components/chat/MemoryPanel'), { ssr: false });

export default function ClientWidgets() {
  // Connect activity SSE on mount
  useEffect(() => {
    useActivityStore.getState().connect();
    return () => useActivityStore.getState().disconnect();
  }, []);

  return (
    <>
      <CommandPalette />
      <SearchPanel />
      <MemoryPanel />
    </>
  );
}
