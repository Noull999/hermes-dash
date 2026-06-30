'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ClientLayout from '@/components/ui/ClientLayout';
import { useHermesStore } from '@/store/useHermesStore';
import { useChatStore } from '@/store/useChatStore';
import OrbCanvas from '@/components/orb/OrbCanvas';
import BentoCard from '@/components/dashboard/BentoCard';
import SystemStatus from '@/components/dashboard/SystemStatus';
import ServiceMonitor from '@/components/dashboard/ServiceMonitor';
import TokenBudget from '@/components/dashboard/TokenBudget';
import ActiveJobs from '@/components/dashboard/ActiveJobs';
import RecentRepos from '@/components/dashboard/RecentRepos';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import ImportantEmails from '@/components/dashboard/ImportantEmails';
import QuickChat from '@/components/dashboard/QuickChat';
import WeatherWidget from '@/components/dashboard/WeatherWidget';
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
  const [greeting, setGreeting] = useState('');
  const online = health?.status === 'ok';
  const healthLoaded = health !== null;
  const connectionStatus = useChatStore((s) => s.connectionStatus);

  useEffect(() => {
    setGreeting(getTimeOfDay());
  }, []);

  return (
    <ClientLayout>
      {/* ── Orb hero ── */}
      <div className="relative h-[260px] -mx-4 -mt-4 overflow-hidden border-b border-[var(--hairline)] mb-4">
        <OrbCanvas />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="reticle w-[200px] h-[200px] rounded-full border border-[var(--hairline)]" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="reticle-rev w-[158px] h-[158px] rounded-full border border-dashed border-[rgba(255,45,85,0.18)]" />
        </div>
        <div className="absolute top-3 left-3 hud-label text-[8px] text-[var(--text-faint)]">
          SYS.HERMES//v2
        </div>
        <div className="absolute top-3 right-3 hud-label text-[8px] text-[var(--text-faint)]">
          PTO.MONTT · CL
        </div>
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[var(--void)] via-transparent to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end items-center px-5 pb-4 text-center pointer-events-none">
          <div className="hud-label text-[9px] mb-1">{greeting}</div>
          <h1 className="text-2xl font-bold tracking-[0.18em] text-[var(--text)] glow-text">JOSÉ</h1>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 h-6 border rounded-[2px] text-[10px] font-mono tracking-[0.14em] ${
                orbState === 'error'
                  ? 'border-[rgba(255,93,108,0.3)] text-[var(--error)]'
                  : orbState === 'success'
                  ? 'border-[rgba(93,255,176,0.3)] text-[var(--success)]'
                  : 'border-[var(--hairline-strong)] text-[var(--cyan)]'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              {STATE_LABEL[orbState] || 'STANDBY'}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 h-6 border rounded-[2px] text-[10px] font-mono tracking-[0.14em] ${
                online ? 'border-[rgba(93,255,176,0.3)] text-[var(--success)]' : 'border-[rgba(255,93,108,0.3)] text-[var(--error)]'
              }`}
            >
              API {online ? 'OK' : 'ERR'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Bento Grid Dashboard ── */}
      <div className="bento-grid px-4 pb-24">
        {/* ── Row 1: Monitor + Tokens + Clima ── */}
        <BentoCard colSpan={2} title="MONITOR DE SERVICIOS">
          <ServiceMonitor />
        </BentoCard>

        <BentoCard colSpan={1} title="TOKENS">
          <TokenBudget />
        </BentoCard>

        <BentoCard colSpan={1} title="CLIMA">
          <WeatherWidget />
        </BentoCard>

        {/* ── Alert row: correos relevantes ── */}
        <BentoCard colSpan={4} title="CORREOS RELEVANTES" className="order-first md:order-none">
          <ImportantEmails />
        </BentoCard>

        {/* ── Row 2: System + ActiveJobs ── */}
        <BentoCard colSpan={2} title="SISTEMA">
          <SystemStatus />
        </BentoCard>

        <BentoCard colSpan={2} title="TRABAJOS ACTIVOS">
          <ActiveJobs />
        </BentoCard>

        {/* ── Row 3: Activity + Repos ── */}
        <BentoCard colSpan={2} title="ACTIVIDAD RECIENTE">
          <ActivityFeed />
        </BentoCard>

        <BentoCard colSpan={2} title="REPOSITORIOS">
          <RecentRepos />
        </BentoCard>

        <BentoCard colSpan={2} title="MENSAJE RÁPIDO" className="col-span-full md:col-span-4">
          <QuickChat />
        </BentoCard>
      </div>
    </ClientLayout>
  );
}
