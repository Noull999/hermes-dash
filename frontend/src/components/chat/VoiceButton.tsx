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
const DEDUP_WINDOW_MS = 15000;
const RESTART_DELAY_MS = 1500;

function isNoise(text: string): boolean {
  const t = text.trim();
  if (t.length < MIN_LENGTH) return true;
  if (/^[.,!?\s]+$/.test(t)) return true;
  if (FILLER.test(t)) return true;
  if (/^(\S)\1{0,2}$/.test(t)) return true;
  return false;
}

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition || w.webkitSpeechRecognition) as SpeechRecognitionConstructor | null;
}

/**
 * VoiceButton — reconocimiento de voz continuo con instancias descartables.
 *
 * Chrome corrompe SpeechRecognition si se llama .start() en una instancia
 * que ya disparó onend. Cada ciclo usa una instancia NUEVA.
 *
 * Estado:
 *  - wantListening: intención del usuario (quiere el mic activo)
 *  - instanceId: contador para identificar cada instancia y evitar race conditions
 *
 * Flujo:
 *  1. Usuario activa → wantListening=true → createAndStart()
 *  2. Chrome emite onresult → acumular texto final + mostrar interim
 *  3. Silencio 2s → flush (enviar texto acumulado con dedup)
 *  4. onend → instancia muerta, SI wantListening: setTimeout → createAndStart()
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

  // Estado de intención — persiste entre instancias
  const wantListeningRef = useRef(false);
  const permissionDeniedRef = useRef(false);

  // Instancia actual — NUNCA reusar después de onend
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // ID de instancia — evita que callbacks de instancias muertas afecten el estado
  const instanceIdRef = useRef(0);

  // Timers
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dedup por contenido
  const lastSentTextRef = useRef('');
  const lastSentTimeRef = useRef(0);

  // Buffer de sesión
  const sessionBufferRef = useRef('');

  // Flag para evitar doble flush (silence timer vs onend)
  const flushedBySilenceRef = useRef(false);

  // Callbacks frescos
  const onResultRef = useRef(onResult);
  const onActiveChangeRef = useRef(onActiveChange);
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { onActiveChangeRef.current = onActiveChange; }, [onActiveChange]);

  // ── Limpia todos los timers ──
  const clearTimers = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  // ── Envía el buffer acumulado ──
  const flush = useCallback((fromSilenceTimer = false) => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    // Si el silence timer ya hizo flush, onend no debe repetir
    if (!fromSilenceTimer && flushedBySilenceRef.current) {
      flushedBySilenceRef.current = false;
      return;
    }

    if (fromSilenceTimer) {
      flushedBySilenceRef.current = true;
    }

    const toSend = sessionBufferRef.current.trim();
    sessionBufferRef.current = '';
    setInterimText('');
    setAccumulatedText('');

    if (!toSend || isNoise(toSend)) return;

    const now = Date.now();
    const a = toSend.trim().toLowerCase();
    const b = lastSentTextRef.current.trim().toLowerCase();

    // Dedup: solo igualdad exacta (no substring, pierde input válido)
    if (now - lastSentTimeRef.current < DEDUP_WINDOW_MS && a === b) {
      return;
    }

    lastSentTextRef.current = toSend;
    lastSentTimeRef.current = now;
    onResultRef.current(toSend);
  }, []);

  // ── Crea y arranca una NUEVA instancia ──
  const createAndStart = useCallback(() => {
    // Validaciones
    if (!wantListeningRef.current) return;
    if (permissionDeniedRef.current) return;

    // Si hay instancia activa, matarla primero
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignorar
      }
      recognitionRef.current = null;
    }

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setSupported(false);
      return;
    }

    // Nueva instancia con ID único
    const myId = ++instanceIdRef.current;
    const recognition = new Ctor();
    recognition.lang = 'es-CL';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = true;

    // Track de resultados finales procesados en ESTA sesión
    let processedFinalIndex = 0;

    recognition.onstart = () => {
      // Verificar que soy la instancia actual
      if (instanceIdRef.current !== myId) return;

      sessionBufferRef.current = '';
      processedFinalIndex = 0;
      flushedBySilenceRef.current = false;
      setListening(true);
      setInterimText('');
      setAccumulatedText('');
      onActiveChangeRef.current?.(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (instanceIdRef.current !== myId) return;

      let newFinalText = '';
      let interim = '';

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          if (i >= processedFinalIndex) {
            newFinalText += transcript + ' ';
            processedFinalIndex = i + 1;
          }
        } else {
          interim += transcript;
        }
      }

      if (newFinalText) {
        sessionBufferRef.current += newFinalText;
        setAccumulatedText(sessionBufferRef.current.trim());
      }

      setInterimText(interim);

      // Reiniciar timer de silencio
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => flush(true), SILENCE_MS);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (instanceIdRef.current !== myId) return;

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        permissionDeniedRef.current = true;
        wantListeningRef.current = false;
        setPermissionDenied(true);
        setSupported(false);
      }
      // Otros errores: onend maneja el reinicio
    };

    recognition.onend = () => {
      // Esta instancia MURIÓ — nunca más usarla
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }

      // Solo procesar si soy la instancia actual
      if (instanceIdRef.current !== myId) return;

      setListening(false);

      if (wantListeningRef.current && !permissionDeniedRef.current) {
        // Usuario quiere seguir escuchando
        flush(false);
        // Reiniciar con NUEVA instancia después de delay
        restartTimerRef.current = setTimeout(() => {
          if (wantListeningRef.current && !permissionDeniedRef.current) {
            createAndStart();
          }
        }, RESTART_DELAY_MS);
      } else {
        // Usuario apagó — enviar texto acumulado antes de limpiar
        const finalText = sessionBufferRef.current.trim();
        if (finalText && !isNoise(finalText)) {
          const now = Date.now();
          const a = finalText.toLowerCase();
          const b = lastSentTextRef.current.trim().toLowerCase();
          const isDup = now - lastSentTimeRef.current < DEDUP_WINDOW_MS && a === b;
          if (!isDup) {
            lastSentTextRef.current = finalText;
            lastSentTimeRef.current = now;
            onResultRef.current(finalText);
          }
        }
        clearTimers();
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
      recognitionRef.current = null;
      setListening(false);
    }
  }, [flush, clearTimers]);

  // ── Detener escucha ──
  const stop = useCallback(() => {
    // Marcar intención ANTES de detener
    wantListeningRef.current = false;
    clearTimers();

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignorar
      }
      // NO limpiar recognitionRef aquí — onend lo hace
    }
  }, [clearTimers]);

  // ── Toggle del botón ──
  const toggleListening = useCallback(() => {
    if (wantListeningRef.current || recognitionRef.current) {
      stop();
    } else {
      permissionDeniedRef.current = false;
      setPermissionDenied(false);
      setSupported(true);
      wantListeningRef.current = true;
      createAndStart();
    }
  }, [createAndStart, stop]);

  // ── Auto-start ──
  useEffect(() => {
    if (!autoStart) return;

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setSupported(false);
      return;
    }

    wantListeningRef.current = true;
    const timer = setTimeout(() => {
      if (wantListeningRef.current) {
        createAndStart();
      }
    }, 600);

    return () => {
      clearTimeout(timer);
    };
  }, [autoStart, createAndStart]);

  // ── Cleanup al desmontar ──
  useEffect(() => {
    return () => {
      wantListeningRef.current = false;
      clearTimers();

      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignorar
        }
        recognitionRef.current = null;
      }
    };
  }, [clearTimers]);

  if (!supported) return null;

  return (
    <div className="flex items-center gap-2">
      {(accumulatedText || interimText) && listening && (
        <span className="text-xs text-[var(--cyan)]/80 max-w-[250px] truncate">
          {accumulatedText && <>&ldquo;{accumulatedText}</>}
          {interimText && (
            <span className="text-[var(--text-faint)] italic">
              {accumulatedText ? ' ' : ''}{interimText}
            </span>
          )}
          {accumulatedText && <>&rdquo;</>}
          {!interimText && <span className="animate-pulse ml-0.5">|</span>}
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
