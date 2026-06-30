'use client';

import dynamic from 'next/dynamic';

const CommandPalette = dynamic(() => import('@/components/ui/CommandPalette'), { ssr: false });
const SearchPanel = dynamic(() => import('@/components/ui/SearchPanel'), { ssr: false });

export default function ClientWidgets() {
  return (
    <>
      <CommandPalette />
      <SearchPanel />
    </>
  );
}
