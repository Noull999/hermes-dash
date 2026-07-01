'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Spotlight que sigue al cursor — solo desktop con puntero fino (Fase desktop).
 * No renderiza en touch. pointer-events:none, no interfiere con nada.
 */
export default function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduce) return;
    setEnabled(true);

    let raf = 0;
    let tx = window.innerWidth / 2, ty = window.innerHeight / 2;
    let rx = tx, ry = ty;

    const onMove = (e: MouseEvent) => { tx = e.clientX; ty = e.clientY; };
    window.addEventListener('mousemove', onMove, { passive: true });

    const loop = () => {
      // el glow sigue directo; el anillo va con leve retraso (lerp) = sensación de "tracking"
      if (ref.current) ref.current.style.transform = `translate(${tx}px, ${ty}px)`;
      rx += (tx - rx) * 0.14;
      ry += (ty - ry) * 0.14;
      if (ringRef.current) ringRef.current.style.transform = `translate(${rx}px, ${ry}px)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => { cancelAnimationFrame(raf); window.removeEventListener('mousemove', onMove); };
  }, []);

  if (!enabled) return null;

  return (
    <>
      {/* halo suave */}
      <div
        ref={ref}
        aria-hidden
        className="cursor-glow"
      />
      {/* retícula de tracking */}
      <div
        ref={ringRef}
        aria-hidden
        className="cursor-ring"
      />
    </>
  );
}
