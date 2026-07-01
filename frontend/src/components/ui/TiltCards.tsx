'use client';

import { useEffect } from 'react';

/**
 * Tilt 3D en las tarjetas al pasar el cursor — solo desktop (Fase desktop).
 * Usa delegación global sobre `.glass`, así cubre tarjetas dinámicas sin tocar
 * cada componente. Se limita a elementos tamaño-tarjeta (no contenedores grandes).
 */
const MAX_DEG = 7;
const MAX_W = 640;
const MAX_H = 520;

export default function TiltCards() {
  useEffect(() => {
    const fine = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduce) return;

    let current: HTMLElement | null = null;

    const reset = (el: HTMLElement) => {
      el.style.transition = 'transform 0.35s ease';
      el.style.transform = '';
    };

    const onMove = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.('.glass') as HTMLElement | null;

      if (el !== current) {
        if (current) reset(current);
        current = el;
        if (current) current.style.transition = 'transform 0.08s ease-out';
      }
      if (!current) return;

      const r = current.getBoundingClientRect();
      if (r.width > MAX_W || r.height > MAX_H) { // demasiado grande → no inclinar
        reset(current);
        current = null;
        return;
      }
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      current.style.transform =
        `perspective(800px) rotateX(${(-py * MAX_DEG).toFixed(2)}deg) rotateY(${(px * MAX_DEG).toFixed(2)}deg)`;
    };

    document.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      document.removeEventListener('mousemove', onMove);
      if (current) reset(current);
    };
  }, []);

  return null;
}
