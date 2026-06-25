'use client';

import ClientLayout from '@/components/ui/ClientLayout';
import BrainView from '@/components/brain/BrainView';
import AddNoteModal from '@/components/brain/AddNoteModal';
import AddReminderModal from '@/components/brain/AddReminderModal';
import { useState } from 'react';
import { Plus } from 'lucide-react';

export default function BrainPage() {
  const [showNote, setShowNote] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <ClientLayout>
      <div className="p-4 pb-24 max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white/90">Segundo Cerebro</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowReminder(true)}
              className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 transition"
            >
              ⏰ Recordatorio
            </button>
            <button
              onClick={() => setShowNote(true)}
              className="text-xs px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 transition flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Nota
            </button>
          </div>
        </div>

        <BrainView key={refreshKey} />
      </div>

      {showNote && (
        <AddNoteModal
          open={true}
          onClose={() => setShowNote(false)}
          onCreated={() => { setShowNote(false); setRefreshKey(k => k + 1); }}
        />
      )}
      {showReminder && (
        <AddReminderModal
          open={true}
          onClose={() => setShowReminder(false)}
          onCreated={() => { setShowReminder(false); setRefreshKey(k => k + 1); }}
        />
      )}
    </ClientLayout>
  );
}
