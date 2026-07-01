'use client';

// Sonidos UI sintetizados con Web Audio — sin archivos (Fase 0.8).
// Off por defecto; toggle en localStorage 'hermes_sound_enabled'.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    } catch { return null; }
  }
  return ctx;
}

export function isSoundEnabled(): boolean {
  try { return localStorage.getItem('hermes_sound_enabled') === '1'; } catch { return false; }
}

export function setSoundEnabled(on: boolean) {
  try { localStorage.setItem('hermes_sound_enabled', on ? '1' : '0'); } catch { /* ignore */ }
}

type Tone = { freq: number; dur: number; type?: OscillatorType; gain?: number; delay?: number };

function playTones(tones: Tone[]) {
  if (!isSoundEnabled()) return;
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  const now = c.currentTime;

  for (const t of tones) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    const start = now + (t.delay || 0);
    osc.type = t.type || 'sine';
    osc.frequency.setValueAtTime(t.freq, start);
    const peak = t.gain ?? 0.06;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + t.dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(start);
    osc.stop(start + t.dur + 0.02);
  }
}

export const uiSound = {
  send: () => playTones([{ freq: 660, dur: 0.09, type: 'triangle' }, { freq: 990, dur: 0.11, type: 'triangle', delay: 0.05 }]),
  receive: () => playTones([{ freq: 880, dur: 0.10, type: 'sine' }, { freq: 587, dur: 0.12, type: 'sine', delay: 0.06 }]),
  open: () => playTones([{ freq: 440, dur: 0.07, type: 'sine' }, { freq: 660, dur: 0.09, type: 'sine', delay: 0.04 }]),
  nav: () => playTones([{ freq: 520, dur: 0.05, type: 'square', gain: 0.03 }]),
  error: () => playTones([{ freq: 220, dur: 0.18, type: 'sawtooth', gain: 0.05 }]),
};
