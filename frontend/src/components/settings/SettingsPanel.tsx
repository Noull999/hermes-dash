'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import {
  User,
  Moon,
  Sun,
  Bell,
  BellOff,
  Globe,
  ShieldCheck,
  Info,
  ExternalLink,
  Monitor,
} from 'lucide-react';

export default function SettingsPanel() {
  const [theme, setTheme] = useState('dark');
  const [notifications, setNotifications] = useState(true);

  const themes = [
    { id: 'dark', icon: Moon, label: 'Oscuro' },
    { id: 'light', icon: Sun, label: 'Claro' },
    { id: 'system', icon: Monitor, label: 'Sistema' },
  ];

  return (
    <div className="space-y-4">
      {/* Perfil */}
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold text-white/90 flex items-center gap-2">
          <User className="w-4 h-4 text-cyan-400" />
          Perfil
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
            <span className="text-white/50">Nombre</span>
            <span className="text-white/80">José</span>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
            <span className="text-white/50">Email</span>
            <span className="text-white/80">jose@ejemplo.cl</span>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-white/50">Rol</span>
            <Badge variant="accent">Administrador</Badge>
          </div>
        </div>
      </Card>

      {/* Preferencias */}
      <Card className="p-4 space-y-4">
        <h3 className="font-semibold text-white/90 flex items-center gap-2">
          <Monitor className="w-4 h-4 text-cyan-400" />
          Preferencias
        </h3>

        {/* Theme toggle */}
        <div>
          <label className="text-xs text-white/50 mb-2 block">Tema</label>
          <div className="flex gap-2">
            {themes.map((t) => {
              const Icon = t.icon;
              const active = theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition ${
                    active
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notifications toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {notifications ? (
              <Bell size={16} className="text-cyan-400" />
            ) : (
              <BellOff size={16} className="text-white/40" />
            )}
            <span className="text-sm text-white/80">Notificaciones</span>
          </div>
          <button
            onClick={() => setNotifications(!notifications)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              notifications ? 'bg-cyan-500' : 'bg-white/10'
            }`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                notifications ? 'translate-x-[22px]' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </Card>

      {/* API */}
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold text-white/90 flex items-center gap-2">
          <Globe className="w-4 h-4 text-cyan-400" />
          API
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
            <span className="text-white/50">Endpoint</span>
            <code className="text-xs text-white/70 bg-white/5 px-2 py-0.5 rounded font-mono">
              {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}
            </code>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-white/50">Autenticación</span>
            <Badge variant="success" dot>
              Conectado
            </Badge>
          </div>
        </div>
      </Card>

      {/* About */}
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold text-white/90 flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan-400" />
          Acerca de
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
            <span className="text-white/50">Versión</span>
            <span className="text-white/80">Hermes Dashboard v1.0.0</span>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
            <span className="text-white/50">Framework</span>
            <span className="text-white/80">Next.js 16</span>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-white/50">Hecho con</span>
            <span className="text-white/80">❤️ para José</span>
          </div>
        </div>
        <div className="flex items-center gap-3 pt-1">
          <a
            href="https://hermes-agent.nousresearch.com/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition"
          >
            Documentación <ExternalLink size={10} />
          </a>
          <a
            href="https://github.com/nousresearch/hermes-agent"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition"
          >
            GitHub <ExternalLink size={10} />
          </a>
        </div>
      </Card>
    </div>
  );
}
