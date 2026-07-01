'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import PushManager from '@/components/PushManager';
import SystemStatus from '@/components/dashboard/SystemStatus';
import TokenBudget from '@/components/dashboard/TokenBudget';
import ServiceMonitor from '@/components/dashboard/ServiceMonitor';
import ConnectionCard from './ConnectionCard';
import SessionsManager from './SessionsManager';
import {
  User,
  Bell,
  Volume2,
  VolumeX,
  Globe,
  Info,
  ExternalLink,
  Monitor,
  Bug,
  Terminal,
  Trash2,
  AlertTriangle,
  Activity,
  Radio,
  History,
  Cpu,
} from 'lucide-react';
import { useLogStore, type LogEntry } from '@/store/useLogStore';
import { isSoundEnabled, setSoundEnabled, uiSound } from '@/lib/useUiSound';

const LEVEL_ICON: Record<string, React.ReactNode> = {
  error: <AlertTriangle size={12} className="text-red-400" />,
  warn: <AlertTriangle size={12} className="text-yellow-400" />,
  info: <Terminal size={12} className="text-cyan-400" />,
};

export default function SettingsPanel() {
  const [sound, setSound] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const entries = useLogStore((s) => s.entries);
  const clear = useLogStore((s) => s.clear);
  const [logFilter, setLogFilter] = useState('all');

  useEffect(() => { setSound(isSoundEnabled()); }, []);

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    setSoundEnabled(next);
    if (next) uiSound.open(); // feedback inmediato al activar
  };

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
            <span className="text-white/80">José Esteban Asencio</span>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
            <span className="text-white/50">Email</span>
            <span className="text-white/80">joseestebanasencio@gmail.com</span>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-white/50">Rol</span>
            <Badge variant="accent">Administrador</Badge>
          </div>
        </div>
      </Card>

      {/* Conexión */}
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold text-white/90 flex items-center gap-2">
          <Radio className="w-4 h-4 text-cyan-400" />
          Conexión
        </h3>
        <ConnectionCard />
      </Card>

      {/* Telemetría del sistema */}
      <Card className="p-4 space-y-4">
        <h3 className="font-semibold text-white/90 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          Telemetría del Sistema
        </h3>
        <SystemStatus />
        <div className="pt-1 border-t border-white/[0.04]">
          <TokenBudget />
        </div>
      </Card>

      {/* Monitor de servicios */}
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold text-white/90 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          Monitor de Servicios
        </h3>
        <ServiceMonitor />
      </Card>

      {/* Preferencias */}
      <Card className="p-4 space-y-4">
        <h3 className="font-semibold text-white/90 flex items-center gap-2">
          <Monitor className="w-4 h-4 text-cyan-400" />
          Preferencias
        </h3>

        {/* Sound toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {sound ? (
              <Volume2 size={16} className="text-cyan-400" />
            ) : (
              <VolumeX size={16} className="text-white/40" />
            )}
            <span className="text-sm text-white/80">Sonidos de interfaz</span>
          </div>
          <button
            onClick={toggleSound}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              sound ? 'bg-cyan-500' : 'bg-white/10'
            }`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                sound ? 'translate-x-[22px]' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </Card>

      {/* Notificaciones Push */}
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold text-white/90 flex items-center gap-2">
          <Bell className="w-4 h-4 text-cyan-400" />
          Notificaciones Push
        </h3>
        <PushManager />
      </Card>

      {/* Sesiones */}
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold text-white/90 flex items-center gap-2">
          <History className="w-4 h-4 text-cyan-400" />
          Sesiones Guardadas
        </h3>
        <SessionsManager />
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
              /api/proxy → VPS
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

      {/* Debug Logs */}
      <Card className="p-4 space-y-3">
        <button
          onClick={() => setShowLogs(!showLogs)}
          className="w-full flex items-center justify-between"
        >
          <h3 className="font-semibold text-white/90 flex items-center gap-2">
            <Bug className="w-4 h-4 text-cyan-400" />
            Debug Logs
            {entries.length > 0 && (
              <span className="text-[10px] text-white/40 font-mono ml-2">
                ({entries.length})
              </span>
            )}
          </h3>
          <span className="text-[10px] text-cyan-400/60">
            {showLogs ? 'Ocultar' : 'Ver'}
          </span>
        </button>

        {showLogs && (
          <div className="space-y-2">
            {/* Filtros */}
            <div className="flex gap-1.5 flex-wrap">
              {['all', 'error', 'warn', 'info', 'api', 'ws', 'gateway'].map((f) => (
                <button
                  key={f}
                  onClick={() => setLogFilter(f)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider transition-all ${
                    logFilter === f
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'text-white/40 hover:text-white/70 border border-transparent'
                  }`}
                >
                  {f}
                </button>
              ))}
              <button
                onClick={clear}
                className="px-2 py-0.5 rounded text-[10px] font-mono text-white/30 hover:text-white/60 ml-auto"
              >
                <Trash2 size={12} className="inline mr-1" />
                Limpiar
              </button>
            </div>

            {/* Lista de logs */}
            <div className="max-h-[300px] overflow-y-auto space-y-0.5 font-mono text-[11px] bg-black/20 rounded-xl p-2">
              {(logFilter === 'all'
                ? entries
                : entries.filter((e) => e.source === logFilter || e.level === logFilter)
              ).length === 0 ? (
                <p className="text-white/30 text-center py-4 text-[11px]">
                  Sin eventos. Los errores aparecerán aquí automáticamente.
                </p>
              ) : (
                (logFilter === 'all'
                  ? entries
                  : entries.filter((e) => e.source === logFilter || e.level === logFilter)
                ).map((entry) => (
                  <LogLine key={entry.id} entry={entry} />
                ))
              )}
            </div>

            <p className="text-[9px] text-white/20 text-center">
              Los logs se pierden al recargar la página
            </p>
          </div>
        )}
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
            href="https://github.com/Noull999/hermes-dash"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition"
          >
            Repositorio <ExternalLink size={10} />
          </a>
        </div>
      </Card>
    </div>
  );
}

/* ── Log line component ── */
function LogLine({ entry }: { entry: LogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const time = entry.timestamp instanceof Date
    ? entry.timestamp.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '--:--:--';

  return (
    <div
      className={`px-2 py-1 rounded cursor-pointer hover:bg-white/[0.03] ${
        entry.level === 'error' ? 'bg-red-500/[0.04]' : ''
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-2">
        <span className="text-white/30 shrink-0 w-14">{time}</span>
        <span className="shrink-0">{LEVEL_ICON[entry.level]}</span>
        <span className="text-[9px] uppercase text-white/30 shrink-0 w-12">[{entry.source}]</span>
        <span className={`truncate ${
          entry.level === 'error' ? 'text-red-300' : entry.level === 'warn' ? 'text-yellow-300' : 'text-white/60'
        }`}>
          {entry.message}
        </span>
      </div>
      {expanded && entry.details && (
        <pre className="mt-1 ml-[4.5rem] text-[10px] text-white/40 whitespace-pre-wrap break-all bg-black/30 p-2 rounded-lg">
          {entry.details}
        </pre>
      )}
    </div>
  );
}
