'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { classNames } from '@/lib/utils';

// ── Web Speech API types ──
declare const SpeechRecognition: new () => SpeechRecognitionInstance;

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
  /** Si true, arranca automáticamente al montar el componente */
  autoStart?: boolean;
  /** Callback cuando cambia el estado de escucha */
  onActiveChange?: (active: boolean) => void;
}

// ── Filtro de ruido ──
const FILLER = /^(uh|ah|mm|hm|eh|ok|sí|si|no|a|e|o|u|)$/i;
const MIN_LENGTH = 3;
const SILENCE_MS = 1500;         // silencio antes de enviar el buffer acumulado
const DEDUP_WINDOW_MS = 10000;   // ventana para descartar un envío idéntico
const RESTART_DELAY_MS = 300;    // pausa entre el fin de una sesión y la siguiente

function isNoise(text: string): boolean {
  const t = text.trim();
  if (t.length < MIN_LENGTH) return true;
  if (/^[.,!?\s]+$/.test(t)) return true;
  if (FILLER.test(t)) return true;
  if (/^(\S)\1{0,2}$/.test(t)) return true; // "aaa", "bbb"
  return false;
}

/**
 * VoiceButton — reconocimiento de voz continuo con auto-restart.
 *
 * Modelo de ciclo de vida:
 *  - `wantListeningRef` es la ÚNICA fuente de verdad de la intención (encendido/apagado).
 *  - `onend` sólo reinicia si seguimos queriendo escuchar; un abort intencional
 *    (cleanup / stop manual) apaga la intención ANTES de abortar, evitando la
 *    cascada abort → onend → restart que rompía el micrófono.
 *  - El transcript se reconstruye desde `baseIndexRef` (offset por sesión), nunca
 *    se concatena de forma incremental, así Chrome no puede duplicar palabras al
 *    re-emitir resultados ya finalizados.
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
  const [finalText, setFinalText] = useState('');

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const wantListeningRef = useRef(false);   // intención del usuario / autoStart
  const permissionDeniedRef = useRef(false);
  const baseIndexRef = useRef(0);            // primer índice "vivo" de la sesión
  const finalEndRef = useRef(0);             // fin (exclusivo) de los resultados finales
  const finalBufferRef = useRef('');         // texto final acumulado desde baseIndex
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentTextRef = useRef('');        // último texto enviado (dedup)
  const lastSentTimeRef = useRef(0);
  const startRef = useRef<() => void>(() => {}); // referencia estable para reiniciar

  // Mantener callbacks frescos sin re-crear la instancia de reconocimiento
  const onResultRef = useRef(onResult);
  const onActiveChangeRef = useRef(onActiveChange);
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { onActiveChangeRef.current = onActiveChange; }, [onActiveChange]);

  // ── Envía el buffer acumulado (con dedup y filtro de ruido) ──
  const flush = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    const toSend = finalBufferRef.current.trim();
    finalBufferRef.current = '';
    // Descartar los resultados ya consumidos para no reenviarlos.
    baseIndexRef.current = finalEndRef.current;
    setInterimText('');
    setFinalText('');

    if (!toSend || isNoise(toSend)) return;

    // Dedup: descartar si es idéntico a lo último enviado dentro de la ventana
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

  // ── Crea una instancia NUEVA de SpeechRecognition con sus handlers ──
  const buildRecognition = useCallback((): SpeechRecognitionInstance | null => {
    const Ctor =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;

    if (!Ctor) {
      setSupported(false);
      return null;
    }

    const recognition = new (Ctor as SpeechRecognitionConstructor)();
    recognition.lang = 'es-CL';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = true;

    recognition.onstart = () => {
      baseIndexRef.current = 0;
      finalBufferRef.current = '';
      setListening(true);
      setInterimText('');
      setFinalText('');
      onActiveChangeRef.current?.(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Reconstruir desde baseIndex: nunca concatenar incrementalmente.
      let finalText = '';
      let interim = '';
      let finalEnd = baseIndexRef.current;

      for (let i = baseIndexRef.current; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript + ' ';
          finalEnd = i + 1;
        } else {
          interim += transcript;
        }
      }

      finalBufferRef.current = finalText.trim();
      finalEndRef.current = finalEnd;
      setFinalText(finalText.trim());
      setInterimText(interim);

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
      // 'no-speech' / 'aborted' / 'network': onend se encarga del reinicio.
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;

      const keepGoing = wantListeningRef.current && !permissionDeniedRef.current;

      if (keepGoing) {
        // Enviar lo que quedó pendiente antes de abrir la siguiente sesión.
        flush();
        setTimeout(() => {
          if (wantListeningRef.current) startRef.current();
        }, RESTART_DELAY_MS);
      } else {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        finalBufferRef.current = '';
        setInterimText('');
        setFinalText('');
        onActiveChangeRef.current?.(false);
      }
    };

    return recognition;
  }, [flush]);

  // ── Iniciar escucha (idempotente) ──
  const start = useCallback(() => {
    if (recognitionRef.current) return;          // ya hay una sesión activa
    if (permissionDeniedRef.current) return;
    const recognition = buildRecognition();
    if (!recognition) return;
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      // Chrome rechaza si falta gesto de usuario; el botón permite reintentar.
      recognitionRef.current = null;
    }
  }, [buildRecognition]);
  startRef.current = start;

  // ── Detener escucha manualmente ──
  const stop = useCallback(() => {
    wantListeningRef.current = false;            // apaga la intención ANTES de cortar
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
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

  // ── Auto-start al montar + cleanup ──
  useEffect(() => {
    let startTimer: ReturnType<typeof setTimeout> | null = null;
    if (autoStart) {
      wantListeningRef.current = true;
      // Pequeño delay: Chrome puede requerir gesto de usuario al inicio.
      startTimer = setTimeout(() => {
        if (wantListeningRef.current) startRef.current();
      }, 600);
    }
    return () => {
      // Apagar la intención ANTES de abortar evita la cascada abort→onend→restart.
      wantListeningRef.current = false;
      if (startTimer) clearTimeout(startTimer);
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
        recognitionRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  if (!supported) return null;

  return (
    <div className="flex items-center gap-2">
      {/* Texto acumulado */}
      {finalText && listening && (
        <span className="text-xs text-[var(--cyan)]/80 max-w-[250px] truncate">
          &ldquo;{finalText}&rdquo;
          {!interimText && <span className="animate-pulse ml-0.5">|</span>}
        </span>
      )}
      {/* Parciales en vivo */}
      {interimText && listening && !finalText && (
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
