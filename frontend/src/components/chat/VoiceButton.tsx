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

interface VoiceButtonProps {
  onResult: (text: string) => void;
  autoStart?: boolean;
  onActiveChange?: (active: boolean) => void;
}

// ── Configuración ──
const FILLER = /^(uh|ah|mm|hm|eh|ok|sí|si|no|a|e|o|u|)$/i;
const MIN_LENGTH = 3;
const SILENCE_MS = 2000;
const DEDUP_WINDOW_MS = 10000;
const RESTART_DELAY_MS = 300;

function isNoise(text: string): boolean {
  const t = text.trim();
  if (t.length < MIN_LENGTH) return true;
  if (/^[.,!?\s]+$/.test(t)) return true;
  if (FILLER.test(t)) return true;
  if (/^(\S)\1{0,2}$/.test(t)) return true;
  return false;
}

/**
 * VoiceButton — reconocimiento de voz continuo.
 *
 * REGLA CRÍTICA: Chrome corrompe SpeechRecognition si se llama .start() más de
 * una vez en la misma instancia. Cada ciclo DEBE usar una instancia nueva.
 *
 * Flujo:
 *  1. Usuario activa → wantListening=true → crear instancia → .start()
 *  2. Chrome emite onresult → acumular texto final + mostrar interim
 *  3. Silencio de 2s → flush (enviar texto acumulado con dedup)
 *  4. onend dispara → SI wantListening: crear NUEVA instancia → .start()
 *  5. Usuario desactiva → wantListening=false → .stop() → onend NO reinicia
 */
export default function VoiceButton({
  onResult,
  autoStart = false,
  onActiveChange,
}: VoiceButtonProps) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [accumulatedText, setAccumulatedText] = useState('');

  // Refs estables
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const wantListeningRef = useRef(false);
  const permissionDeniedRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dedup por contenido
  const lastSentTextRef = useRef('');
  const lastSentTimeRef = useRef(0);

  // Buffer de texto final acumulado (persiste entre eventos onresult de la misma sesión)
  const sessionBufferRef = useRef('');

  // Callbacks frescos
  const onResultRef = useRef(onResult);
  const onActiveChangeRef = useRef(onActiveChange);
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { onActiveChangeRef.current = onActiveChange; }, [onActiveChange]);

  // Ref para acceder a start() desde onend sin causar re-renders
  const startRef = useRef<() => void>(() => {});

  // ── Envía el buffer acumulado ──
  const flush = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    const toSend = sessionBufferRef.current.trim();
    sessionBufferRef.current = '';
    setInterimText('');
    setAccumulatedText('');

    if (!toSend || isNoise(toSend)) return;

    // Dedup: descartar si es idéntico al último envío reciente
    const now = Date.now();
    if (
      lastSentTextRef.current.toLowerCase() === toSend.toLowerCase() &&
      now - lastSentTimeRef.current < DEDUP_WINDOW_MS
    ) {
      return;
    }

    lastSentTextRef.current = toSend;
    lastSentTimeRef.current = now;
    onResultRef.current(toSend);
  }, []);

  // ── Crea y arranca una NUEVA instancia de SpeechRecognition ──
  const start = useCallback(() => {
    // Si ya hay una instancia activa, no crear otra
    if (recognitionRef.current) return;
    if (permissionDeniedRef.current) return;

    const Ctor =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;

    if (!Ctor) {
      setSupported(false);
      return;
    }

    // ── INSTANCIA NUEVA ──
    const recognition = new (Ctor as SpeechRecognitionConstructor)();
    recognition.lang = 'es-CL';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = true;

    // Track de índices para esta sesión
    let processedFinalIndex = 0;

    recognition.onstart = () => {
      sessionBufferRef.current = '';
      processedFinalIndex = 0;
      setListening(true);
      setInterimText('');
      setAccumulatedText('');
      onActiveChangeRef.current?.(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let newFinalText = '';
      let interim = '';

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          // Solo agregar si no lo hemos procesado antes
          if (i >= processedFinalIndex) {
            newFinalText += transcript + ' ';
            processedFinalIndex = i + 1;
          }
        } else {
          interim += transcript;
        }
      }

      // Acumular nuevo texto final al buffer de sesión
      if (newFinalText) {
        sessionBufferRef.current += newFinalText;
        setAccumulatedText(sessionBufferRef.current.trim());
      }

      setInterimText(interim);

      // Reiniciar timer de silencio
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(flush, SILENCE_MS);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        permissionDeniedRef.current = true;
        wantListeningRef.current = false;
        setPermissionDenied(true);
        setSupported(false);
      }
      // Otros errores: onend se encarga
    };

    recognition.onend = () => {
      // Esta instancia ya murió — NUNCA volver a usarla
      recognitionRef.current = null;
      setListening(false);

      if (wantListeningRef.current && !permissionDeniedRef.current) {
        // Enviar lo pendiente antes de reiniciar
        flush();
        // Crear NUEVA instancia después de un breve delay
        setTimeout(() => {
          if (wantListeningRef.current) startRef.current();
        }, RESTART_DELAY_MS);
      } else {
        // Usuario apagó manualmente — limpiar todo
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        sessionBufferRef.current = '';
        setInterimText('');
        setAccumulatedText('');
        onActiveChangeRef.current?.(false);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      // Chrome puede rechazar sin gesto de usuario
      recognitionRef.current = null;
    }
  }, [flush]);

  // Mantener startRef actualizado (en effect, no durante render)
  useEffect(() => { startRef.current = start; }, [start]);

  // ── Detener escucha ──
  const stop = useCallback(() => {
    // Apagar intención ANTES de detener (evita que onend reinicie)
    wantListeningRef.current = false;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignorar errores al detener
      }
    }
  }, []);

  // ── Toggle del botón ──
  const toggleListening = useCallback(() => {
    if (wantListeningRef.current || recognitionRef.current) {
      stop();
    } else {
      permissionDeniedRef.current = false;
      setPermissionDenied(false);
      setSupported(true);
      wantListeningRef.current = true;
      start();
    }
  }, [start, stop]);

  // ── Auto-start + cleanup ──
  useEffect(() => {
    let startTimer: ReturnType<typeof setTimeout> | null = null;

    if (autoStart) {
      wantListeningRef.current = true;
      startTimer = setTimeout(() => {
        if (wantListeningRef.current) startRef.current();
      }, 600);
    }

    return () => {
      // Apagar intención ANTES de abortar
      wantListeningRef.current = false;

      if (startTimer) clearTimeout(startTimer);

      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignorar
        }
        recognitionRef.current = null;
      }
    };
  }, [autoStart]);

  if (!supported) return null;

  return (
    <div className="flex items-center gap-2">
      {/* Texto acumulado */}
      {accumulatedText && listening && (
        <span className="text-xs text-[var(--cyan)]/80 max-w-[250px] truncate">
          &ldquo;{accumulatedText}&rdquo;
          {!interimText && <span className="animate-pulse ml-0.5">|</span>}
        </span>
      )}
      {/* Parciales en vivo */}
      {interimText && listening && !accumulatedText && (
        <span className="text-[10px] text-[var(--text-faint)] italic max-w-[180px] truncate">
          {interimText}
        </span>
      )}

      <button
        onClick={toggleListening}
        title={listening ? 'Detener' : 'Hablar'}
        className={classNames(
          'p-2 rounded-xl transition-all duration-200',
          listening
            ? 'bg-[var(--error)]/20 text-[var(--error)] shadow-[0_0_12px_rgba(239,68,68,0.3)] animate-pulse'
            : 'text-[var(--text-muted)] hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--text)]'
        )}
      >
        {listening ? <MicOff size={18} /> : <Mic size={18} />}
      </button>
    </div>
  );
}
