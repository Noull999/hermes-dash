'use client';

import ClientLayout from '@/components/ui/ClientLayout';
import OrbCanvas from '@/components/orb/OrbCanvas';
import Card from '@/components/ui/Card';
import WeatherWidget from '@/components/dashboard/WeatherWidget';
import TokenCard from '@/components/dashboard/TokenCard';
import SystemCard from '@/components/dashboard/SystemCard';
import TimelineCard from '@/components/dashboard/TimelineCard';
import WeeklyChart from '@/components/dashboard/WeeklyChart';
import { useHermesStore } from '@/store/useHermesStore';
import { getTimeOfDay } from '@/lib/utils';
import { BarChart3, Code2, Brain, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

const STATE_LABEL: Record<string, string> = {
  idle: 'STANDBY',
  processing: 'PROCESANDO',
  success: 'COMPLETADO',
  error: 'ALERTA',
};

export default function DashboardPage() {
  const orbState = useHermesStore((s) => s.orbState);
  const health = useHermesStore((s) => s.health);
  const greeting = getTimeOfDay();
  const online = health?.status === 'ok';

  return (
    <ClientLayout>
      <div className="space-y-3 pb-24">
        {/* ── Orb command hero ──────────────────────────────────── */}
        <div className="relative h-[300px] -mx-4 -mt-4 overflow-hidden border-b border-[var(--hairline)]">
          <OrbCanvas />

          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none">
            <div className="reticle w-[230px] h-[230px] rounded-full border border-[var(--hairline)]" />
          </div>
          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none">
            <div className="reticle-rev w-[186px] h-[186px] rounded-full border border-dashed border-[rgba(79,227,255,0.18)]" />
          </div>

          <div className="absolute top-3 left-3 hud-label text-[8px] text-[var(--text-faint)]">
            SYS.HERMES//v2
          </div>
          <div className="absolute top-3 right-3 hud-label text-[8px] text-[var(--text-faint)]">
            PTO.MONTT · CL
          </div>

          <div className="absolute top-0 left-0 w-full h-full pointer-events-none bg-gradient-to-t from-[var(--void)] via-transparent to-transparent" />

          <div className="absolute top-0 left-0 w-full h-full flex flex-col justify-end items-center px-5 pb-4 text-center">
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

        {/* ── Quick actions ── */}
        <div className="grid grid-cols-2 gap-2 px-4">
          {[
            { href: '/dashboard', label: 'PANEL', Icon: BarChart3 },
            { href: '/repos', label: 'REPOS', Icon: Code2 },
          ].map(({ href, label, Icon }, i) => (
            <Link
              key={href}
              href={href}
              className="glass boot-in flex flex-col items-center gap-2 py-3.5 hover:-translate-y-0.5"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <Icon size={18} className="text-[var(--cyan)] drop-shadow-[0_0_6px_var(--cyan)]" />
              <span className="hud-label text-[9px]">{label}</span>
            </Link>
          ))}
        </div>

        {/* ── Dashboard widgets ── */}
        <div className="px-4 space-y-4">
          <WeatherWidget />

          <TokenCard />

          <SystemCard />

          <WeeklyChart />
          <TimelineCard />
        </div>

        {/* ── Second brain link ── */}
        <div className="px-4">
          <Link href="/brain" className="block boot-in">
            <Card hover className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[3px] border border-[rgba(255,177,61,0.25)] bg-[rgba(255,177,61,0.07)] flex items-center justify-center">
                  <Brain size={16} className="text-[var(--amber)]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold tracking-wide text-[var(--text)]">SECOND BRAIN</h3>
                  <p className="hud-label text-[8px] mt-0.5">NOTAS · IDEAS · SNIPPETS</p>
                </div>
              </div>
              <ArrowUpRight size={16} className="text-[var(--text-muted)]" />
            </Card>
          </Link>
        </div>
      </div>
    </ClientLayout>
  );
}
