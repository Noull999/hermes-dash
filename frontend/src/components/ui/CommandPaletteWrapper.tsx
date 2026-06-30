'use client';

import dynamic from 'next/dynamic';

// Dynamic import so CommandPalette (uses router, hooks) doesn't block SSR
const CommandPalette = dynamic(() => import('@/components/ui/CommandPalette'), { ssr: false });

export default function CommandPaletteWrapper() {
  return <CommandPalette />;
}
