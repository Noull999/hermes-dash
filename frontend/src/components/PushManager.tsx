'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import Card from '@/components/ui/Card';

const API = '/api/proxy';

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export default function PushManager() {
  const [supported, setSupported] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setSupported(false);
      return;
    }
    // Check existing subscription
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setSubscribed(!!sub);
      });
    });
  }, []);

  const subscribe = useCallback(async () => {
    setLoading(true);
    setStatus('idle');
    try {
      // Get VAPID key from backend
      const resp = await fetch(`${API}/api/push/vapid-key`);
      const { public_key } = await resp.json();

      // Register service worker
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Subscribe
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(public_key),
      });

      // Send subscription to backend
      const subResp = await fetch(`${API}/api/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: sub.toJSON().keys,
          platform: 'web',
        }),
      });

      const data = await subResp.json();
      if (data.status === 'subscribed' || data.status === 'already_subscribed') {
        setSubscribed(true);
        setStatus('success');
        setStatusMsg('Notificaciones activadas ✅');
      }
    } catch (err) {
      setStatus('error');
      setStatusMsg(`Error: ${(err as Error).message}`);
    } finally {
      setLoading(false);
      setTimeout(() => { setStatus('idle'); setStatusMsg(''); }, 4000);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch(`${API}/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`, {
          method: 'DELETE',
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
      setStatus('success');
      setStatusMsg('Notificaciones desactivadas');
    } catch (err) {
      setStatus('error');
      setStatusMsg(`Error: ${(err as Error).message}`);
    } finally {
      setLoading(false);
      setTimeout(() => { setStatus('idle'); setStatusMsg(''); }, 4000);
    }
  }, []);

  const testPush = useCallback(async () => {
    setLoading(true);
    setStatus('idle');
    try {
      const resp = await fetch(`${API}/api/push/test`, { method: 'POST' });
      const data = await resp.json();
      if (data.success > 0) {
        setStatus('success');
        setStatusMsg(`Notificación enviada a ${data.success} dispositivo(s)`);
      } else {
        setStatus('error');
        setStatusMsg(data.message || 'Error al enviar');
      }
    } catch (err) {
      setStatus('error');
      setStatusMsg(`Error: ${(err as Error).message}`);
    } finally {
      setLoading(false);
      setTimeout(() => { setStatus('idle'); setStatusMsg(''); }, 4000);
    }
  }, []);

  if (!supported) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <BellOff size={20} className="text-[var(--text-faint)]" />
          <div>
            <p className="text-sm text-[var(--text-muted)]">Push no soportado</p>
            <p className="text-[11px] text-[var(--text-faint)]">Tu navegador no soporta notificaciones push</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {statusMsg && (
        <div className={`text-[11px] px-3 py-2 rounded-lg ${
          status === 'success'
            ? 'bg-[rgba(93,255,176,0.06)] text-[var(--success)]'
            : 'bg-[rgba(255,93,108,0.06)] text-[var(--error)]'
        }`}>
          {status === 'success' ? <CheckCircle2 size={12} className="inline mr-1" /> : <XCircle size={12} className="inline mr-1" />}
          {statusMsg}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={subscribed ? unsubscribe : subscribe}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all bg-[var(--accent)]/20 text-[var(--accent)] border border-[rgba(0,212,255,0.2)] hover:bg-[var(--accent)]/30 disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : subscribed ? <BellOff size={14} /> : <Bell size={14} />}
          {loading ? 'Procesando...' : subscribed ? 'Desactivar Push' : 'Activar Push'}
        </button>

        {subscribed && (
          <button
            onClick={testPush}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-[var(--text-muted)] border border-[var(--hairline)] hover:text-[var(--text)] transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Bell size={12} />}
            Probar
          </button>
        )}
      </div>

      {subscribed && (
        <p className="text-[10px] text-[var(--text-faint)]">
          ✅ Recibirás notificaciones incluso con el dashboard cerrado
        </p>
      )}
    </div>
  );
}
