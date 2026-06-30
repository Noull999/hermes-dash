'use client';

import { useEffect, useState, useCallback } from 'react';
import { getMonitor, MonitorData } from '@/lib/api';
import { Wifi, WifiOff, AlertTriangle, Clock, RefreshCw, ExternalLink } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  up: 'var(--success)',
  degraded: 'var(--amber)',
  down: 'var(--error)',
  unknown: 'var(--text-faint)',
};

const STATUS_LABELS: Record<string, string> = {
  up: 'OK',
  degraded: 'LENTO',
  down: 'CAÍDO',
  unknown: '?',
};

const ACTION_HINTS: Record<string, string> = {
  google_calendar: 'Token expirado → ejecuta "hermes google auth" en la terminal',
  github_api: 'Si el rate limit se acaba, espera al reset',
  vercel_frontend: 'Haz "vercel --prod" para desplegar',
  cloudflare_tunnel: 'Revisa que cloudflared esté corriendo en el VPS',
  ssl_certs: 'Si un cert está por vencer, renueva con Let\'s Encrypt',
};

function ServiceCard({ svc, onRefresh }: { svc: MonitorData['services'][0]; onRefresh: () => void }) {
  const color = STATUS_COLORS[svc.status] || 'var(--text-faint)';
  const label = STATUS_LABELS[svc.status] || '?';
  const hint = svc.status !== 'up' ? ACTION_HINTS[svc.key] : null;

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded-[2px] border border-[var(--hairline)] bg-[rgba(0,0,0,0.2)]">
      <span className="text-[12px] w-4 text-center">{svc.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="hud-label text-[8px] text-[var(--text-muted)] truncate">{svc.name}</span>
          <span
            className="hud-readout text-[9px] font-mono tracking-wider ml-1 shrink-0"
            style={{ color }}
          >
            {label}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {svc.latency_ms != null && (
            <span className="text-[8px] text-[var(--text-faint)] flex items-center gap-1">
              <Clock size={7} />
              {svc.latency_ms}ms
            </span>
          )}
          {svc.http_status != null && (
            <span className="text-[8px] text-[var(--text-faint)]">HTTP {svc.http_status}</span>
          )}
          {svc.details?.remaining != null && (
            <span className="text-[8px] text-[var(--text-faint)]">
              {svc.details.remaining as number}/{svc.details.limit as number} req
            </span>
          )}
        </div>
        {svc.error && (
          <div className="text-[7px] text-[var(--error)] mt-0.5 truncate">{svc.error}</div>
        )}
        {hint && (
          <div className="text-[7px] text-[var(--amber)] mt-0.5 flex items-center gap-1">
            <AlertTriangle size={6} />
            {hint}
          </div>
        )}
      </div>
      {svc.status !== 'up' && (
        <button
          onClick={onRefresh}
          className="shrink-0 w-5 h-5 flex items-center justify-center rounded-[2px] border border-[var(--hairline)] hover:bg-[rgba(79,227,255,0.06)] transition-colors"
          title="Re-check"
        >
          <RefreshCw size={8} className="text-[var(--text-faint)]" />
        </button>
      )}
    </div>
  );
}

export default function ServiceMonitor() {
  const [data, setData] = useState<MonitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const result = await getMonitor();
      setData(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al obtener monitoreo');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (error && !data) {
    return (
      <div className="flex items-center gap-2 text-[10px] text-[var(--error)]">
        <WifiOff size={10} />
        <span>{error}</span>
      </div>
    );
  }

  if (loading && !data) {
    return <div className="text-[10px] text-[var(--text-faint)]">Monitoreando servicios…</div>;
  }

  if (!data) return null;

  const allOk = data.overall === 'all_ok';
  const issues = data.services.filter((s) => s.status !== 'up');
  const checkedTime = new Date(data.checked_at).toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className="space-y-2">
      {/* Overall status bar */}
      <div
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-[2px] border text-[10px] font-mono ${
          allOk
            ? 'border-[rgba(93,255,176,0.2)] text-[var(--success)] bg-[rgba(93,255,176,0.04)]'
            : 'border-[rgba(255,93,108,0.2)] text-[var(--error)] bg-[rgba(255,93,108,0.04)]'
        }`}
      >
        {allOk ? <Wifi size={10} /> : <AlertTriangle size={10} />}
        <span className="font-semibold tracking-[0.12em]">
          {allOk ? 'TODOS LOS SERVICIOS OK' : `${issues.length} SERVICIO(S) CON PROBLEMAS`}
        </span>
        <span className="ml-auto text-[8px] text-[var(--text-faint)]">{checkedTime}</span>
        <button
          onClick={fetchData}
          className="shrink-0 w-5 h-5 flex items-center justify-center rounded-[2px] border border-[var(--hairline)] hover:bg-[rgba(79,227,255,0.06)] transition-colors"
          title="Re-check ahora"
        >
          <RefreshCw size={8} className="text-[var(--text-faint)]" />
        </button>
      </div>

      {/* Services grid */}
      <div className="grid grid-cols-1 gap-1">
        {data.services.map((svc) => (
          <ServiceCard key={svc.key} svc={svc} onRefresh={fetchData} />
        ))}
      </div>
    </div>
  );
}
