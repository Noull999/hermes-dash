'use client';

import { useEffect, useState, useCallback } from 'react';
import { getMonitor, runMonitorAction, MonitorData, MonitorAction } from '@/lib/api';
import { Wifi, WifiOff, AlertTriangle, Clock, RefreshCw, Play, CheckCircle, XCircle } from 'lucide-react';

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

const ACTION_MAP: Record<string, string> = {
  cloudflare_tunnel: 'restart_tunnel',
  vps_backend: 'restart_backend',
  vercel_frontend: 'redeploy_vercel',
};

const ACTION_HINTS: Record<string, string> = {
  google_calendar: 'Token revocado — necesitas re-autenticar. Dame el archivo client_secret.json de Google Cloud y te ayudo con el flujo OAuth',
  github_api: 'Rate limit OK — espera al reset si se acaba',
  ssl_certs: 'Si un cert está por vencer, renueva con certbot',
};

function ServiceCard({
  svc,
  onRefresh,
  onAction,
  actionRunning,
}: {
  svc: MonitorData['services'][0];
  onRefresh: () => void;
  onAction: (actionId: string) => void;
  actionRunning: string | null;
}) {
  const color = STATUS_COLORS[svc.status] || 'var(--text-faint)';
  const label = STATUS_LABELS[svc.status] || '?';
  const hint = svc.status !== 'up' ? ACTION_HINTS[svc.key] : null;
  const actionId = ACTION_MAP[svc.key];
  const isRunning = actionRunning === actionId;

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
        <div className="shrink-0 flex gap-1">
          {actionId && (
            <button
              onClick={() => onAction(actionId)}
              disabled={isRunning}
              className="w-5 h-5 flex items-center justify-center rounded-[2px] border border-[var(--amber)] text-[var(--amber)] hover:bg-[rgba(255,183,77,0.1)] transition-colors disabled:opacity-40"
              title={isRunning ? 'Ejecutando...' : 'Fix'}
            >
              {isRunning ? <RefreshCw size={7} className="animate-spin" /> : <Play size={7} />}
            </button>
          )}
          <button
            onClick={onRefresh}
            className="w-5 h-5 flex items-center justify-center rounded-[2px] border border-[var(--hairline)] hover:bg-[rgba(79,227,255,0.06)] transition-colors"
            title="Re-check"
          >
            <RefreshCw size={8} className="text-[var(--text-faint)]" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function ServiceMonitor() {
  const [data, setData] = useState<MonitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionRunning, setActionRunning] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ success: boolean; text: string } | null>(null);

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

  const handleAction = useCallback(async (actionId: string) => {
    setActionRunning(actionId);
    setActionMsg(null);
    try {
      const result = await runMonitorAction(actionId);
      setActionMsg({ success: result.success, text: result.message || result.error || '' });
      // Re-check after action completes
      setTimeout(() => fetchData(), 1500);
    } catch (e) {
      setActionMsg({ success: false, text: e instanceof Error ? e.message : 'Error' });
    } finally {
      setActionRunning(null);
    }
  }, [fetchData]);

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

      {/* Action result message */}
      {actionMsg && (
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] border text-[9px] font-mono ${
            actionMsg.success
              ? 'border-[rgba(93,255,176,0.2)] text-[var(--success)] bg-[rgba(93,255,176,0.04)]'
              : 'border-[rgba(255,93,108,0.2)] text-[var(--error)] bg-[rgba(255,93,108,0.04)]'
          }`}
        >
          {actionMsg.success ? <CheckCircle size={8} /> : <XCircle size={8} />}
          <span>{actionMsg.text}</span>
        </div>
      )}

      {/* Services grid */}
      <div className="grid grid-cols-1 gap-1">
        {data.services.map((svc) => (
          <ServiceCard key={svc.key} svc={svc} onRefresh={fetchData} onAction={handleAction} actionRunning={actionRunning} />
        ))}
      </div>
    </div>
  );
}
