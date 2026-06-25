'use client';

import ClientLayout from '@/components/ui/ClientLayout';
import OrbCanvas from '@/components/orb/OrbCanvas';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import WeatherWidget from '@/components/dashboard/WeatherWidget';
import TokenCard from '@/components/dashboard/TokenCard';
import SystemCard from '@/components/dashboard/SystemCard';
import { useHermesStore } from '@/store/useHermesStore';
import { getTimeOfDay } from '@/lib/utils';
import { MessageSquare, Sparkles, Code2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const orbState = useHermesStore((s) => s.orbState);
  const health = useHermesStore((s) => s.health);
  const greeting = getTimeOfDay();

  return (
    <ClientLayout>
      <div className="space-y-4">
        {/* Orb Section */}
        <div className="relative h-[260px] -mx-4 -mt-4 mb-2 overflow-hidden">
          <OrbCanvas />

          {/* Overlay content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <h1 className="text-2xl font-bold text-[var(--text)] mb-1">
              {greeting}, José
            </h1>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              Bienvenido a tu dashboard inteligente
            </p>
            <div className="flex items-center gap-2">
              <Badge
                variant={orbState === 'error' ? 'error' : orbState === 'success' ? 'success' : 'accent'}
                dot
              >
                {orbState === 'idle' ? 'Listo' : orbState === 'processing' ? 'Procesando...' : orbState === 'success' ? 'Completado' : 'Error'}
              </Badge>
              {health && (
                <Badge variant={health.status === 'ok' ? 'success' : 'error'} dot>
                  API {health.status}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-2">
          <Link href="/chat" className="glass p-3 rounded-xl hover:border-[rgba(255,255,255,0.12)] transition-all text-center">
            <div className="w-9 h-9 rounded-xl bg-[rgba(0,212,255,0.1)] flex items-center justify-center mx-auto mb-1.5">
              <MessageSquare size={18} className="text-[var(--accent)]" />
            </div>
            <span className="text-xs font-medium text-[var(--text)]">Chat</span>
          </Link>
          <Link href="/dashboard" className="glass p-3 rounded-xl hover:border-[rgba(255,255,255,0.12)] transition-all text-center">
            <div className="w-9 h-9 rounded-xl bg-[rgba(139,92,246,0.1)] flex items-center justify-center mx-auto mb-1.5">
              <Sparkles size={18} className="text-[var(--purple)]" />
            </div>
            <span className="text-xs font-medium text-[var(--text)]">Analytics</span>
          </Link>
          <Link href="/repos" className="glass p-3 rounded-xl hover:border-[rgba(255,255,255,0.12)] transition-all text-center">
            <div className="w-9 h-9 rounded-xl bg-[rgba(34,197,94,0.1)] flex items-center justify-center mx-auto mb-1.5">
              <Code2 size={18} className="text-[var(--success)]" />
            </div>
            <span className="text-xs font-medium text-[var(--text)]">Repos</span>
          </Link>
        </div>

        {/* Weather & Tokens */}
        <WeatherWidget />
        <TokenCard />

        {/* System summary */}
        <SystemCard />

        {/* Quick link to brain */}
        <Link href="/brain">
          <Card hover className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[rgba(139,92,246,0.1)] flex items-center justify-center">
                <Sparkles size={18} className="text-[var(--purple)]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--text)]">Second Brain</h3>
                <p className="text-[10px] text-[var(--text-muted)]">Tus notas, ideas y snippets</p>
              </div>
            </div>
            <ArrowRight size={16} className="text-[var(--text-muted)]" />
          </Card>
        </Link>
      </div>
    </ClientLayout>
  );
}
