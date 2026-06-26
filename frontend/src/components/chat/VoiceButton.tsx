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

export default function VoiceButton({
  onResult,
  autoStart = false,
  onActiveChange,
}: VoiceButtonProps) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const autoStartedRef = useRef(false);
  const listeningRef = useRef(false); // ref espejo para callbacks

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
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false; // se reinicia manualmente

    recognition.onstart = () => {
      listeningRef.current = true;
      setListening(true);
      onActiveChange?.(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      if (transcript.trim()) {
        onResult(transcript.trim());
      }
      // No paramos acá — onend maneja el reinicio si corresponde
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed') {
        setPermissionDenied(true);
        setSupported(false);
      }
      listeningRef.current = false;
      setListening(false);
      onActiveChange?.(false);
    };

    recognition.onend = () => {
      listeningRef.current = false;
      setListening(false);
      onActiveChange?.(false);

      // Si estaba en autoStart y no es permanentemente fallido, reiniciar
      // para seguir escuchando (ciclo continuo)
      if (autoStart && !permissionDenied) {
        setTimeout(() => {
          if (!listeningRef.current) {
            try {
              recognition.start();
            } catch {
              // browser rechazó, silencioso
            }
          }
        }, 400);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    };
  }, [onResult, autoStart, onActiveChange, permissionDenied]);

  // ── Auto-start ──
  useEffect(() => {
    if (autoStart && recognitionRef.current && !autoStartedRef.current) {
      autoStartedRef.current = true;
      const delay = setTimeout(() => {
        try {
          recognitionRef.current?.start();
        } catch {
          // puede fallar si falta user gesture
        }
      }, 800);
      return () => clearTimeout(delay);
    }
  }, [autoStart]);

  // ── Toggle manual ──
  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;

    if (listeningRef.current) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch {
        // ya corriendo o permisos denegados
      }
    }
  }, []);

  if (!supported) return null;

  return (
    <button
      onClick={toggleListening}
      className={classNames(
        'p-2 rounded-xl transition-all duration-200',
        listening
          ? 'bg-[var(--error)]/20 text-[var(--error)] shadow-[0_0_12px_rgba(239,68,68,0.3)] animate-pulse'
          : 'text-[var(--text-muted)] hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--text)]'
      )}
      title={listening ? 'Detener' : 'Hablar'}
    >
      {listening ? <MicOff size={18} /> : <Mic size={18} />}
    </button>
  );
}
