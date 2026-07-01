'use client';

import { useEffect, useRef, useState } from 'react';

interface NumberTickerProps {
  value: number;
  /** decimales a mostrar */
  decimals?: number;
  /** duración de la animación en ms */
  duration?: number;
  /** separador de miles (toLocaleString) */
  locale?: boolean;
  suffix?: string;
  className?: string;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Número que anima suavemente desde el valor previo hasta el nuevo (Fase 0.7).
 * tabular-nums para que no "salte" el ancho mientras cuenta.
 */
export default function NumberTicker({
  value,
  decimals = 0,
  duration = 650,
  locale = false,
  suffix = '',
  className = '',
}: NumberTickerProps) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { fromRef.current = to; setDisplay(to); return; }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = easeOutCubic(t);
      setDisplay(from + (to - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  const rounded = Number(display.toFixed(decimals));
  const text = locale
    ? rounded.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : rounded.toFixed(decimals);

  return (
    <span className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {text}{suffix}
    </span>
  );
}
