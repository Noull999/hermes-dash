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
const INACTIVITY_TIMEOUT = 15000; // 15s sin voz válida → pausa
const COOLDOWN_MS = 10000;       // pausa de 10s tras inactividad
const SILENCE_MS = 2000;         // 2s de silencio antes de enviar
const RESTART_BLOCK_MS = 7000;   // 7s sin auto-restart tras enviar (evita duplicados por ruido residual)

function isNoise(text: string): boolean {
  const t = text.trim();
  if (t.length < MIN_LENGTH) return true;
  if (/^[.,!?\s]+$/.test(t)) return true;
  if (FILLER.test(t)) return true;
  if (/^(\S)\1{0,2}$/.test(t)) return true; // "aaa", "bbb"
  return false;
}

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
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const listeningRef = useRef(false);
  const lastSendRef = useRef(0);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasSentRef = useRef(false); // si envió algo válido en este ciclo
  const finalBufferRef = useRef(''); // acumula texto final hasta que haya silencio
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userStoppedRef = useRef(false); // true si el usuario apagó manualmente el mic
  const restartBlockedUntilRef = useRef(0); // timestamp hasta el que se bloquea auto-restart
  const lastSentTextRef = useRef(''); // último texto enviado (para dedup)
  const lastSentTimeRef = useRef(0); // cuándo se envió lastSentText

  // ── Resetear timer de inactividad ──
  const resetInactivity = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => {
      // 15s sin enviar nada válido → pausar auto-start
      if (autoStart && !hasSentRef.current) {
        setCooldown(true);
        cooldownTimerRef.current = setTimeout(() => {
          setCooldown(false);
        }, COOLDOWN_MS);
      }
    }, INACTIVITY_TIMEOUT);
  }, [autoStart]);

  // ── Inicializar SpeechRecognition ──
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

    recognition.onstart = () => {
      listeningRef.current = true;
      setListening(true);
      setInterimText('');
      hasSentRef.current = false;
      onActiveChange?.(true);
      resetInactivity();
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimAccum = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          // Acumular en buffer en vez de enviar inmediatamente
          finalBufferRef.current += transcript;
        } else {
          interimAccum += transcript;
        }
      }

      // Feedback visual con los parciales
      setInterimText(interimAccum);

      // Mostrar el acumulado de forma estable mientras espera
      if (finalBufferRef.current.trim()) {
        setAccumulatedText(finalBufferRef.current.trim());
      }

      // Si hay texto final acumulado, reiniciar timer de silencio
      if (finalBufferRef.current.trim()) {
        const trimmed = finalBufferRef.current.trim();
        if (isNoise(trimmed)) {
          finalBufferRef.current = '';
          setInterimText('');
          setAccumulatedText('');
          return;
        }

        // DEDUP: si el texto es idéntico al último enviado, descartar
        // Chrome a veces reenvía el mismo resultado al reiniciar el reconocimiento
        const lastText = lastSentTextRef.current.toLowerCase();
        const currentText = trimmed.toLowerCase();
        if (lastText && (currentText === lastText || lastText.includes(currentText) || currentText.includes(lastText))
            && Date.now() - lastSentTimeRef.current < 30000) {
          finalBufferRef.current = '';
          setInterimText('');
          setAccumulatedText('');
          return;
        }

        // Si estamos en período de bloqueo post-envío, descartar (ruido residual)
        if (Date.now() < restartBlockedUntilRef.current) {
          finalBufferRef.current = '';
          setInterimText('');
          setAccumulatedText('');
          return;
        }

        // Resetear timer de silencio — solo envía si hay Ns sin nuevo texto final
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          const toSend = finalBufferRef.current.trim();
          if (!toSend || isNoise(toSend)) {
            finalBufferRef.current = '';
            return;
          }

          // Debounce: no más de 1 envío cada 3s
          const now = Date.now();
          if (now - lastSendRef.current < DEBOUNCE_MS) {
            finalBufferRef.current = ''; // descartar buffer, ya se envió algo hace poco
            return;
          }
          lastSendRef.current = now;

          hasSentRef.current = true;
          onResult(toSend);
          lastSentTextRef.current = toSend;
          lastSentTimeRef.current = Date.now();
          finalBufferRef.current = '';
          setInterimText('');
          setAccumulatedText('');
        }, SILENCE_MS); // Ns de silencio → envía
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

      // Si hay texto pendiente en el buffer, enviarlo AHORA antes de que se pierda
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
          // Bloquear auto-restart para evitar que el nuevo ciclo capture ruido residual
          restartBlockedUntilRef.current = now + RESTART_BLOCK_MS;
        }
      }

      // Solo limpiar el display si NO va a auto-reiniciarse
      const willRestart = autoStart && !permissionDenied && !cooldown && !userStoppedRef.current
        && Date.now() >= restartBlockedUntilRef.current;
      if (!willRestart) {
        setInterimText('');
        setAccumulatedText('');
      }
      finalBufferRef.current = '';

      // Auto-start: reiniciar si aplica (solo si no lo apagó el usuario y no acabamos de enviar)
      if (willRestart) {
        setTimeout(() => {
          if (!listeningRef.current) {
            try {
              recognition.start();
            } catch {
              // browser rechazó
            }
          }
        }, 400);
      } else {
        onActiveChange?.(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      try {
        recognition.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    };
  }, [onResult, autoStart, onActiveChange, permissionDenied, cooldown, resetInactivity]);

  // ── Auto-start (se re-evalúa al salir de cooldown) ──
  useEffect(() => {
    if (autoStart && recognitionRef.current && !listeningRef.current && !cooldown && !permissionDenied
        && Date.now() >= restartBlockedUntilRef.current) {
      const delay = setTimeout(() => {
        try {
          recognitionRef.current?.start();
        } catch {
          // puede fallar si falta user gesture
        }
      }, 800);
      return () => clearTimeout(delay);
    }
  }, [autoStart, cooldown, permissionDenied]);

  // ── Toggle manual ──
  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;

    if (listeningRef.current) {
      userStoppedRef.current = true;
      recognitionRef.current.stop();
    } else {
      userStoppedRef.current = false;
      setCooldown(false);
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
      try {
        recognitionRef.current.start();
      } catch {
        // ya corriendo o permisos denegados
      }
    }
  }, []);

  if (!supported) return null;

  return (
    <div className="flex items-center gap-2">
      {/* Texto acumulado (lo capturado hasta ahora) */}
      {accumulatedText && listening && (
        <span className="text-xs text-[var(--cyan)]/80 max-w-[250px] truncate">
          &ldquo;{accumulatedText}&rdquo;
          {!interimText && <span className="animate-pulse ml-0.5">|</span>}
        </span>
      )}
      {/* Parciales en vivo (solo si hay y no hay acumulado) */}
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
