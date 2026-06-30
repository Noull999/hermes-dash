'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { classNames } from '@/lib/utils';

// ── Web Speech API types ──
interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}
interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
  item(index: number): SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

type VoiceMode = 'tap' | 'auto';

interface VoiceButtonProps {
  /** Se llama con la frase completa (en 'tap' al cerrar; en 'auto' tras un silencio). */
  onResult: (text: string) => void;
  /** Cuando true (Hermès respondiendo), el micro se apaga y se bloquea. */
  disabled?: boolean;
  onActiveChange?: (active: boolean) => void;
}

const MIN_LENGTH = 2;
const SILENCE_MS = 2500; // 'auto': tras este silencio sin hablar, envía

function isNoise(text: string): boolean {
  const t = text.trim();
  if (t.length < MIN_LENGTH) return true;
  if (/^[.,!?\s]+$/.test(t)) return true;
  return false;
}

export default function VoiceButton({ onResult, disabled = false, onActiveChange }: VoiceButtonProps) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [interimText, setInterimText] = useState('');
  const [mode, setMode] = useState<VoiceMode>('tap');

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const listeningRef = useRef(false);
  const finalBufferRef = useRef('');       // transcripción acumulada
  const stopRequestedRef = useRef(false);  // el usuario tocó para cerrar
  const wantListeningRef = useRef(false);   // intención de seguir escuchando ('auto')
  const disabledRef = useRef(disabled);
  const modeRef = useRef<VoiceMode>('tap');
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { disabledRef.current = disabled; }, [disabled]);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  // cargar modo guardado
  useEffect(() => {
    try {
      const saved = localStorage.getItem('hermes_voice_mode');
      if (saved === 'auto' || saved === 'tap') setMode(saved);
    } catch { /* ignore */ }
  }, []);

  const clearSilence = () => {
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
  };

  // Envía lo acumulado (si vale) — usado por 'auto' (silencio) y 'tap' (cierre)
  const flushBuffer = useCallback(() => {
    const text = finalBufferRef.current.trim();
    finalBufferRef.current = '';
    if (text && !isNoise(text)) onResult(text);
  }, [onResult]);

  // ── Inicializar SpeechRecognition una sola vez ──
  useEffect(() => {
    const Ctor =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (!Ctor) { setSupported(false); return; }

    const rec = new (Ctor as SpeechRecognitionConstructor)();
    rec.lang = 'es-CL';
    rec.interimResults = true;
    rec.continuous = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      listeningRef.current = true;
      setListening(true);
      onActiveChange?.(true);
    };

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let gotFinal = false;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalBufferRef.current += transcript + ' ';
          gotFinal = true;
        } else {
          interim += transcript;
        }
      }
      setInterimText(interim);

      // 'auto': cada vez que hay voz, reinicia el reloj de silencio
      if (modeRef.current === 'auto' && (gotFinal || interim)) {
        clearSilence();
        silenceTimerRef.current = setTimeout(() => {
          // silencio tras hablar → enviar, pero seguir escuchando
          flushBuffer();
          setInterimText('');
        }, SILENCE_MS);
      }
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setSupported(false);
      }
    };

    const stopFully = () => {
      clearSilence();
      listeningRef.current = false;
      wantListeningRef.current = false;
      setListening(false);
      setInterimText('');
      onActiveChange?.(false);
    };

    rec.onend = () => {
      // Cierre intencional (tap) o bloqueo por respuesta → enviar lo que quede y parar
      if (stopRequestedRef.current || disabledRef.current) {
        stopRequestedRef.current = false;
        const wasDisabled = disabledRef.current;
        clearSilence();
        listeningRef.current = false;
        setListening(false);
        setInterimText('');
        onActiveChange?.(false);
        flushBuffer();
        // en 'auto', si solo fue pausa por respuesta, recordamos la intención
        if (!wasDisabled) wantListeningRef.current = false;
        return;
      }
      // El navegador cortó solo pero seguimos en modo escucha → reanudar sin enviar
      try {
        rec.start();
      } catch {
        stopFully();
      }
    };

    recognitionRef.current = rec;
    return () => {
      clearSilence();
      try { rec.abort(); } catch { /* ignore */ }
      recognitionRef.current = null;
    };
  }, [flushBuffer, onActiveChange]);

  // ── Pausar al responder Hermès; reanudar después si estaba en 'auto' ──
  useEffect(() => {
    if (disabled && listeningRef.current) {
      stopRequestedRef.current = true;
      try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    } else if (!disabled && modeRef.current === 'auto' && wantListeningRef.current && !listeningRef.current) {
      // Hermès terminó → reanudar escucha en modo conversación
      finalBufferRef.current = '';
      try { recognitionRef.current?.start(); } catch { /* ignore */ }
    }
  }, [disabled]);

  // ── Tap ──
  const toggle = useCallback(() => {
    if (!recognitionRef.current || disabled) return;
    if (listeningRef.current) {
      stopRequestedRef.current = true;
      wantListeningRef.current = false;
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
    } else {
      finalBufferRef.current = '';
      stopRequestedRef.current = false;
      wantListeningRef.current = true;
      try { recognitionRef.current.start(); } catch { /* ya corriendo */ }
    }
  }, [disabled]);

  const switchMode = useCallback(() => {
    setMode((m) => {
      const next: VoiceMode = m === 'tap' ? 'auto' : 'tap';
      try { localStorage.setItem('hermes_voice_mode', next); } catch { /* ignore */ }
      return next;
    });
  }, []);

  if (!supported) return null;

  return (
    <div className="flex items-center gap-2">
      {interimText && listening && (
        <span className="text-[10px] text-[var(--cyan)]/70 italic max-w-[140px] truncate transition-opacity">
          {interimText}
        </span>
      )}

      {/* Switch de modo TAP / AUTO (para probar ambos) */}
      <button
        onClick={switchMode}
        title={mode === 'tap' ? 'Modo: tocar para hablar/enviar' : 'Modo: manos libres (envía tras silencio)'}
        className={classNames(
          'hud-label text-[8px] px-1.5 py-0.5 rounded border transition-all',
          mode === 'auto'
            ? 'border-[var(--cyan)]/40 text-[var(--cyan)]'
            : 'border-[var(--hairline)] text-[var(--text-faint)] hover:text-[var(--text-muted)]'
        )}
      >
        {mode === 'auto' ? 'AUTO' : 'TAP'}
      </button>

      <button
        onClick={toggle}
        disabled={disabled}
        title={disabled ? 'Hermès respondiendo…' : listening ? (mode === 'auto' ? 'Escuchando — toca para parar' : 'Tocar para enviar') : 'Tocar para hablar'}
        className={classNames(
          'p-2 rounded-xl transition-all duration-200',
          disabled
            ? 'opacity-40 cursor-not-allowed text-[var(--text-faint)]'
            : listening
            ? 'bg-[var(--error)]/20 text-[var(--error)] shadow-[0_0_12px_rgba(239,68,68,0.3)] animate-pulse'
            : 'text-[var(--text-muted)] hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--text)]'
        )}
      >
        {listening ? <MicOff size={18} /> : <Mic size={18} />}
      </button>
    </div>
  );
}
