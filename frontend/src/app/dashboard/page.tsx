'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ClientLayout from '@/components/ui/ClientLayout';
import { useHermesStore } from '@/store/useHermesStore';
import { useChatStore } from '@/store/useChatStore';
import BentoCard from '@/components/dashboard/BentoCard';
import SystemStatus from '@/components/dashboard/SystemStatus';
import NextEvent from '@/components/dashboard/NextEvent';
import TokenBudget from '@/components/dashboard/TokenBudget';
import ActiveJobs from '@/components/dashboard/ActiveJobs';
import RecentRepos from '@/components/dashboard/RecentRepos';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import QuickChat from '@/components/dashboard/QuickChat';
import { getTimeOfDay } from '@/lib/utils';
import { Sparkles, Wifi, WifiOff } from 'lucide-react';

const STATE_LABEL: Record<string, string> = {
  idle: 'STANDBY',
  processing: 'PROCESANDO',
  success: 'COMPLETADO',
  error: 'ALERTA',
};

export default function DashboardPage() {
  const router = useRouter();
  const orbState = useHermesStore((s) => s.orbState);
  const health = useHermesStore((s) => s.health);
  const greeting = getTimeOfDay();
  const online = health?.status === 'ok';
  const healthLoaded = health !== null;
  const connectionStatus = useChatStore((s) => s.connectionStatus);

  return (
    <ClientLayout>
      {/* ── Bento Grid Dashboard ── */}
      <div className="bento-grid px-4 pb-24">
        {/* Hero — compact orb + status */}
        <div className="bento-hero flex items-center justify-between mb-2 col-span-full">
          <div>
            <div className="hud-label text-[8px] text-[var(--text-faint)]">{greeting}</div>
            <h1 className="text-xl font-bold tracking-[0.18em] text-[var(--text)] glow-text mt-0.5">
              JOSÉ
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 px-2 h-5 border rounded-[2px] text-[9px] font-mono tracking-[0.14em] ${
                orbState === 'error'
                  ? 'border-[rgba(255,93,108,0.3)] text-[var(--error)]'
                  : orbState === 'success'
                  ? 'border-[rgba(93,255,176,0.3)] text-[var(--success)]'
                  : 'border-[var(--hairline-strong)] text-[var(--cyan)]'
              }`}
            >
              <span className="w-1 h-1 rounded-full bg-current animate-pulse" />
              {STATE_LABEL[orbState] || 'STANDBY'}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 h-5 border rounded-[2px] text-[9px] font-mono tracking-[0.14em] ${
                !healthLoaded
                  ? 'border-[var(--hairline-strong)] text-[var(--text-muted)]'
                  : online
                  ? 'border-[rgba(93,255,176,0.3)] text-[var(--success)]'
                  : 'border-[rgba(255,93,108,0.3)] text-[var(--error)]'
              }`}
            >
              <span className="w-1 h-1 rounded-full bg-current" />
              {!healthLoaded ? '---' : online ? 'API OK' : 'API ERR'}
            </span>
          </div>
        </div>

        {/* ── Row 1: System + NextEvent + TokenBudget ── */}
        <BentoCard colSpan={2} title="SISTEMA">
          <SystemStatus />
        </BentoCard>

        <BentoCard colSpan={1} title="PRÓXIMO EVENTO">
          <NextEvent />
        </BentoCard>

        <BentoCard colSpan={1} title="TOKENS">
          <TokenBudget />
        </BentoCard>

        {/* ── Row 2: ActiveJobs + RecentRepos ── */}
        <BentoCard colSpan={2} title="TRABAJOS ACTIVOS">
          <ActiveJobs />
        </BentoCard>

        <BentoCard colSpan={2} title="REPOSITORIOS">
          <RecentRepos />
        </BentoCard>

        {/* ── Row 3: ActivityFeed + QuickChat ── */}
        <BentoCard colSpan={2} title="ACTIVIDAD RECIENTE">
          <ActivityFeed />
        </BentoCard>

        <BentoCard colSpan={2} title="MENSAJE RÁPIDO" className="col-span-full md:col-span-4">
          <QuickChat />
        </BentoCard>
      </div>
    </ClientLayout>
  );
}
