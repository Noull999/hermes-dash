'use client';

import dynamic from 'next/dynamic';

const CommandPalette = dynamic(() => import('@/components/ui/CommandPalette'), { ssr: false });
const SearchPanel = dynamic(() => import('@/components/ui/SearchPanel'), { ssr: false });
const MemoryPanel = dynamic(() => import('@/components/chat/MemoryPanel'), { ssr: false });

export default function ClientWidgets() {
  return (
    <>
      <CommandPalette />
      <SearchPanel />
      <MemoryPanel />
    </>
  );
}
