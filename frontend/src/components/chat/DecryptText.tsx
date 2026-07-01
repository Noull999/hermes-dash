'use client';

import { useEffect, useRef, useState } from 'react';

const GLYPHS = '!<>-_\\/[]{}—=+*^?#01αβγδλσπΩ';

interface DecryptTextProps {
  text: string;
  /** ms por carácter revelado */
  speed?: number;
  /** duración total máxima (para textos largos) */
  maxDuration?: number;
  onDone?: () => void;
  className?: string;
}

/**
 * Revela el texto con efecto "desencriptado": cada carácter pasa por glyphs
 * aleatorios antes de fijarse, de izquierda a derecha (Fase 0.5).
 * Trabaja sobre texto plano — el markdown se renderiza al terminar.
 */
export default function DecryptText({
  text,
  speed = 18,
  maxDuration = 1100,
  onDone,
  className = '',
}: DecryptTextProps) {
  const [output, setOutput] = useState('');
  const rafRef = useRef<number>(0);
  const doneRef = useRef(false);

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !text) {
      setOutput(text);
      onDone?.();
      return;
    }

    // cuántos chars revelamos por frame para respetar maxDuration
    const perTick = Math.max(1, Math.ceil((text.length * speed) / maxDuration));
    let revealed = 0;
    let last = performance.now();

    const tick = (now: number) => {
      if (now - last >= speed) {
        revealed = Math.min(text.length, revealed + perTick);
        last = now;
      }
      // parte fijada + parte "scrambleada"
      let out = text.slice(0, revealed);
      for (let i = revealed; i < text.length; i++) {
        const c = text[i];
        out += c === ' ' || c === '\n' ? c : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      setOutput(out);

      if (revealed < text.length) {
        rafRef.current = requestAnimationFrame(tick);
      } else if (!doneRef.current) {
        doneRef.current = true;
        onDone?.();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <p className={`text-sm leading-relaxed whitespace-pre-wrap ${className}`}>
      {output}
    </p>
  );
}
