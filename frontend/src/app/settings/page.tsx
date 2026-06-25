'use client';

import ClientLayout from '@/components/ui/ClientLayout';
import Card from '@/components/ui/Card';
import { Settings, Moon, Sun, Monitor, Palette } from 'lucide-react';
import { useState } from 'react';

export default function SettingsPage() {
  const [theme, setTheme] = useState('dark');

  const themes = [
    { id: 'dark', icon: Moon, label: 'Oscuro' },
    { id: 'light', icon: Sun, label: 'Claro' },
    { id: 'system', icon: Monitor, label: 'Sistema' },
  ];

  return (
    <ClientLayout>
      <div className="p-4 pb-24 max-w-4xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-white/90 flex items-center gap-2">
          <Settings className="w-6 h-6 text-cyan-400" />
          Ajustes
        </h1>

        <Card className="p-4">
          <h3 className="font-semibold text-white/90 mb-3 flex items-center gap-2">
            <Palette className="w-4 h-4 text-cyan-400" />
            Tema
          </h3>
          <div className="flex gap-2">
            {themes.map(t => {
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
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold text-white/90 mb-2">Conexión</h3>
          <div className="text-sm text-white/60 space-y-1">
            <p>Backend: <span className="text-green-400">localhost:8080</span></p>
            <p>Estado: <span className="text-green-400">Conectado</span></p>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold text-white/90 mb-2">Acerca de</h3>
          <div className="text-sm text-white/60 space-y-1">
            <p>Hermes Dashboard v1.0.0</p>
            <p>Hecho con ❤️ para José</p>
          </div>
        </Card>
      </div>
    </ClientLayout>
  );
}
