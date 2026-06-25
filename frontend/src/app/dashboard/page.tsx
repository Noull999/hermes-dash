'use client';

import ClientLayout from '@/components/ui/ClientLayout';
import TokenCard from '@/components/dashboard/TokenCard';
import SystemCard from '@/components/dashboard/SystemCard';
import TimelineCard from '@/components/dashboard/TimelineCard';
import WeeklyChart from '@/components/dashboard/WeeklyChart';
import Card from '@/components/ui/Card';
import { Calendar } from 'lucide-react';

export default function DashboardPage() {
  return (
    <ClientLayout>
      <div className="p-4 pb-24 max-w-4xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-white/90 mb-2">Dashboard</h1>

        {/* Tokens */}
        <TokenCard />

        {/* System + Calendar grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SystemCard />
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-cyan-400" />
              <h3 className="font-semibold text-white/90">Hoy</h3>
            </div>
            <p className="text-white/50 text-sm">No hay eventos programados.</p>
          </Card>
        </div>

        {/* Chart */}
        <WeeklyChart />

        {/* Timeline */}
        <TimelineCard />
      </div>
    </ClientLayout>
  );
}
