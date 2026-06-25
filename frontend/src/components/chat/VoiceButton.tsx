'use client';

import { useState, useRef, useEffect, startTransition } from 'react';
import { Mic } from 'lucide-react';
import { classNames } from '@/lib/utils';

// Type declarations for Web Speech API
declare const SpeechRecognition: new () => SpeechRecognitionInstance;

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
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
}

export default function VoiceButton({ onResult }: VoiceButtonProps) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const SpeechRecognition =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      startTransition(() => setSupported(false));
      return;
    }

    const recognition = new (SpeechRecognition as SpeechRecognitionConstructor)();
    recognition.lang = 'es-CL';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
      setListening(false);
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
  }, [onResult]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      recognitionRef.current.start();
      setListening(true);
    }
  };

  if (!supported) return null;

  return (
    <button
      onClick={toggleListening}
      className={classNames(
        'p-2.5 rounded-xl transition-all duration-200',
        listening
          ? 'bg-[var(--error)]/20 text-[var(--error)] shadow-[0_0_12px_rgba(239,68,68,0.3)]'
          : 'text-[var(--text-muted)] hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--text)]'
      )}
      title={listening ? 'Detener grabación' : 'Grabar voz'}
    >
      <Mic size={18} className={listening ? 'animate-pulse' : ''} />
    </button>
  );
}
