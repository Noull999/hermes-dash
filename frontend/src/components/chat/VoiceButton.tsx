'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, VolumeX } from 'lucide-react';
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
const DEBOUNCE_MS = 3000;       // max 1 envío cada 3s
const SILENCE_MS = 2000;         // 2s de silencio antes de enviar
const DEDUP_WINDOW_MS = 30000;   // ventana para dedup (30s)

function isNoise(text: string): boolean {
  const t = text.trim();
  if (t.length < MIN_LENGTH) return true;
  if (/^[.,!?\s]+$/.test(t)) return true;
  if (FILLER.test(t)) return true;
  if (/^(\S)\1{0,2}$/.test(t)) return true; // "aaa", "bbb"
  return false;
}

/**
 * VoiceButton con soporte de auto-start.
 *
 * REGLA DE ORO: NUNCA llamar .start() en la misma instancia de SpeechRecognition
 * después de que haya disparado onend. Chrome corrompe el estado interno.
 * Cada ciclo de escucha usa una instancia NUEVA (vía restartKey).
 */
export default function VoiceButton({
  onResult,
  autoStart = false,
  onActiveChange,
}: VoiceButtonProps) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [accumulatedText, setAccumulatedText] = useState('');
  const [restartKey, setRestartKey] = useState(0); // cada cambio → nueva instancia
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const listeningRef = useRef(false);
  const lastSendRef = useRef(0);
  const hasSentRef = useRef(false); // si envió algo válido en este ciclo
  const finalBufferRef = useRef(''); // acumula texto final hasta que haya silencio
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userStoppedRef = useRef(false); // true si el usuario apagó manualmente el mic
  const lastSentTextRef = useRef(''); // último texto enviado (para dedup)
  const lastSentTimeRef = useRef(0); // cuándo se envió lastSentText

  // ── Programa un reinicio con instancia nueva ──
  const scheduleRestart = useCallback((delayMs = 400) => {
    setTimeout(() => setRestartKey(k => k + 1), delayMs);
  }, []);

  // ── Crear instancia NUEVA de SpeechRecognition ──
  //    Se ejecuta al montar y cada vez que restartKey cambia.
  useEffect(() => {
    const SpeechRecognitionCtor =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setSupported(false);
      return;
    }

    const recognition = new (SpeechRecognitionCtor as SpeechRecognitionConstructor)();
    recognition.lang = 'es-CL';
    recognition.interimResults = true;     // feedback visual
    recognition.maxAlternatives = 1;
    recognition.continuous = true;         // no se corta en pausas

    // ── Handlers (cierran sobre refs para evitar re-crear el effect) ──
    recognition.onstart = () => {
      listeningRef.current = true;
      setListening(true);
      setInterimText('');
      setAccumulatedText('');
      hasSentRef.current = false;
      onActiveChange?.(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimAccum = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          // Acumular en buffer
          finalBufferRef.current += transcript;
        } else {
          interimAccum += transcript;
        }
      }

      setInterimText(interimAccum);

      if (finalBufferRef.current.trim()) {
        setAccumulatedText(finalBufferRef.current.trim());
      }

      // ── Procesar buffer si hay contenido ──
      if (finalBufferRef.current.trim()) {
        const trimmed = finalBufferRef.current.trim();
        if (isNoise(trimmed)) {
          finalBufferRef.current = '';
          setInterimText('');
          setAccumulatedText('');
          return;
        }

        // DEDUP: si es igual/parecido al último envío, descartar
        const lastText = lastSentTextRef.current.toLowerCase();
        const currentText = trimmed.toLowerCase();
        if (lastText && Date.now() - lastSentTimeRef.current < DEDUP_WINDOW_MS
            && (currentText === lastText || lastText.includes(currentText) || currentText.includes(lastText))) {
          finalBufferRef.current = '';
          setInterimText('');
          setAccumulatedText('');
          return;
        }

        // Resetear timer de silencio
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          const toSend = finalBufferRef.current.trim();
          if (!toSend || isNoise(toSend)) {
            finalBufferRef.current = '';
            return;
          }

          const now = Date.now();
          if (now - lastSendRef.current < DEBOUNCE_MS) {
            finalBufferRef.current = '';
            return;
          }
          lastSendRef.current = now;
          hasSentRef.current = true;

          onResult(toSend);
          lastSentTextRef.current = toSend;
          lastSentTimeRef.current = now;
          finalBufferRef.current = '';
          setInterimText('');
          setAccumulatedText('');
        }, SILENCE_MS);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed') {
        setPermissionDenied(true);
        setSupported(false);
      }
      listeningRef.current = false;
      setListening(false);
      setInterimText('');
      setAccumulatedText('');
      finalBufferRef.current = '';
      onActiveChange?.(false);
    };

    recognition.onend = () => {
      listeningRef.current = false;
      setListening(false);

      // Enviar texto pendiente antes de que se pierda
      const pendingText = finalBufferRef.current.trim();
      const didSend = pendingText && !isNoise(pendingText) && !userStoppedRef.current;
      if (didSend) {
        const now = Date.now();
        if (now - lastSendRef.current >= DEBOUNCE_MS) {
          lastSendRef.current = now;
          hasSentRef.current = true;
          onResult(pendingText);
          lastSentTextRef.current = pendingText;
          lastSentTimeRef.current = now;
        }
      }

      setInterimText('');
      setAccumulatedText('');
      finalBufferRef.current = '';

      // Auto-restart si aplica (SOLO si no lo apagó el usuario)
      if (autoStart && !permissionDenied && !cooldown && !userStoppedRef.current) {
        scheduleRestart(400);
      } else {
        onActiveChange?.(false);
      }
    };

    recognitionRef.current = recognition;

    // ── Iniciar escucha si aplica ──
    const shouldStart = autoStart && !cooldown && !permissionDenied;
    if (shouldStart) {
      // Necesita user gesture en Chrome, así que intentamos con un pequeño delay
      setTimeout(() => {
        try {
          recognition.start();
        } catch {
          // browser rechazó (falta user gesture)
        }
      }, 600);
    }

    // ── Cleanup: destruir esta instancia ──
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      try {
        recognition.abort();
      } catch {
        // ignore
      }
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onResult, autoStart, onActiveChange, permissionDenied, cooldown, restartKey]);

  // ── Toggle manual ──
  const toggleListening = useCallback(() => {
    if (listeningRef.current) {
      // Apagar: detener la instancia actual
      userStoppedRef.current = true;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    } else {
      // Encender: crear instancia NUEVA (nunca reusar la misma)
      userStoppedRef.current = false;
      setCooldown(false);
      scheduleRestart(0); // restartKey++ → effect crea nueva instancia
    }
  }, [scheduleRestart]);

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

      {cooldown && (
        <span className="text-[9px] text-[var(--text-faint)] flex items-center gap-1">
          <VolumeX size={10} />
          PAUSA
        </span>
      )}

      <button
        onClick={toggleListening}
        title={cooldown ? 'En pausa temporal' : listening ? 'Detener' : 'Hablar'}
        disabled={cooldown}
        className={classNames(
          'p-2 rounded-xl transition-all duration-200',
          listening
            ? 'bg-[var(--error)]/20 text-[var(--error)] shadow-[0_0_12px_rgba(239,68,68,0.3)] animate-pulse'
            : cooldown
            ? 'text-[var(--text-faint)] opacity-50 cursor-not-allowed'
            : 'text-[var(--text-muted)] hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--text)]'
        )}
      >
        {listening ? <MicOff size={18} /> : <Mic size={18} />}
      </button>
    </div>
  );
}
