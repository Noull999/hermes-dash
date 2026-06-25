'use client';

import ClientLayout from '@/components/ui/ClientLayout';
import SettingsPanel from '@/components/settings/SettingsPanel';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <ClientLayout>
      <div className="p-4 pb-24 max-w-4xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-white/90 flex items-center gap-2">
          <Settings className="w-6 h-6 text-cyan-400" />
          Ajustes
        </h1>

        <SettingsPanel />
      </div>
    </ClientLayout>
  );
}
