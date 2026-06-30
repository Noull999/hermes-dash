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
  /** Se llama UNA vez con la frase completa cuando el usuario cierra el micro. */
  onResult: (text: string) => void;
  /** Cuando true (Hermès respondiendo), el micro se apaga y se bloquea. */
  disabled?: boolean;
  onActiveChange?: (active: boolean) => void;
}

const MIN_LENGTH = 2;
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

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const listeningRef = useRef(false);
  const finalBufferRef = useRef('');     // transcripción acumulada de este turno
  const stopRequestedRef = useRef(false); // el usuario tocó para enviar
  const disabledRef = useRef(disabled);

  useEffect(() => { disabledRef.current = disabled; }, [disabled]);

  // ── Inicializar SpeechRecognition una sola vez ──
  useEffect(() => {
    const Ctor =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (!Ctor) { setSupported(false); return; }

    const rec = new (Ctor as SpeechRecognitionConstructor)();
    rec.lang = 'es-CL';
    rec.interimResults = true;
    rec.continuous = true;   // sigue escuchando entre pausas hasta que el usuario cierre
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      listeningRef.current = true;
      setListening(true);
      onActiveChange?.(true);
    };

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalBufferRef.current += transcript + ' ';
        } else {
          interim += transcript;
        }
      }
      setInterimText(interim);
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setSupported(false);
      }
      // 'no-speech' / 'aborted' → se maneja en onend
    };

    const finishAndSend = () => {
      listeningRef.current = false;
      setListening(false);
      setInterimText('');
      onActiveChange?.(false);
      const text = finalBufferRef.current.trim();
      finalBufferRef.current = '';
      stopRequestedRef.current = false;
      if (text && !isNoise(text)) onResult(text);
    };

    rec.onend = () => {
      // Si el usuario cerró (o quedó bloqueado por respuesta) → enviar la frase completa.
      if (stopRequestedRef.current || disabledRef.current) {
        finishAndSend();
        return;
      }
      // El navegador cortó solo (pausa larga) pero el usuario sigue en modo escucha →
      // reanudar SIN enviar, conservando lo acumulado.
      try {
        rec.start();
      } catch {
        finishAndSend();
      }
    };

    recognitionRef.current = rec;
    return () => {
      try { rec.abort(); } catch { /* ignore */ }
      recognitionRef.current = null;
    };
  }, [onResult, onActiveChange]);

  // ── Si Hermès empieza a responder mientras el micro está abierto → cerrar ──
  useEffect(() => {
    if (disabled && listeningRef.current) {
      stopRequestedRef.current = true;
      try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    }
  }, [disabled]);

  // ── Tap para hablar / tap para enviar ──
  const toggle = useCallback(() => {
    if (!recognitionRef.current || disabled) return;
    if (listeningRef.current) {
      stopRequestedRef.current = true;     // tap → enviar
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
    } else {
      finalBufferRef.current = '';
      stopRequestedRef.current = false;
      try { recognitionRef.current.start(); } catch { /* ya corriendo */ }
    }
  }, [disabled]);

  if (!supported) return null;

  return (
    <div className="flex items-center gap-2">
      {interimText && listening && (
        <span className="text-[10px] text-[var(--cyan)]/70 italic max-w-[150px] truncate transition-opacity">
          {interimText}
        </span>
      )}

      <button
        onClick={toggle}
        disabled={disabled}
        title={disabled ? 'Hermès respondiendo…' : listening ? 'Tocar para enviar' : 'Tocar para hablar'}
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
