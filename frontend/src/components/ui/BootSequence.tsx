'use client';

import { useEffect, useRef, useState } from 'react';

const LINES = [
  '> INIT SYS.HERMES // v2',
  '> LINK GATEWAY :8642 ......... OK',
  '> LOAD MODULES [chat·mail·cal·repos] OK',
  '> AUTH SESSION ............... OK',
  '> HUD ONLINE',
];

const LINE_DELAY = 220; // ms entre líneas
const HOLD_AFTER = 420; // ms tras la última línea antes de cerrar

/**
 * Overlay de arranque estilo terminal JARVIS. Se muestra solo en la primera
 * carga de la sesión (flag en sessionStorage) — no reaparece al navegar.
 */
export default function BootSequence() {
  const [visible, setVisible] = useState(false);
  const [done, setDone] = useState(false);
  const [shownLines, setShownLines] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    // ¿Ya se mostró en esta sesión?
    let already = false;
    try {
      already = sessionStorage.getItem('hermes_booted') === '1';
    } catch { /* ignore */ }

    // Respeta reduce-motion: no mostrar la secuencia
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (already || reduce) return;

    setVisible(true);

    // revelar líneas escalonadas
    LINES.forEach((_, i) => {
      timers.current.push(
        setTimeout(() => setShownLines(i + 1), i * LINE_DELAY),
      );
    });

    const total = LINES.length * LINE_DELAY + HOLD_AFTER;
    timers.current.push(
      setTimeout(() => {
        setDone(true);
        try { sessionStorage.setItem('hermes_booted', '1'); } catch { /* ignore */ }
      }, total),
    );
    // desmontar tras la transición de cierre
    timers.current.push(setTimeout(() => setVisible(false), total + 700));

    return () => { timers.current.forEach(clearTimeout); };
  }, []);

  if (!visible) return null;

  const totalDuration = LINES.length * LINE_DELAY + HOLD_AFTER;

  return (
    <div className={`boot-overlay ${done ? 'boot-done' : ''}`} aria-hidden>
      <div className="w-full max-w-sm px-8">
        {/* marca */}
        <div className="flex items-center gap-2 mb-5">
          <span className="w-2 h-2 rounded-full bg-[var(--cyan)] pulse-glow" />
          <span className="hud-label text-[10px] text-[var(--cyan)]">SYS.HERMES // BOOT</span>
        </div>

        {/* líneas de log */}
        <div className="font-mono text-[11px] leading-relaxed text-[var(--text-muted)] space-y-1 min-h-[110px]">
          {LINES.slice(0, shownLines).map((line, i) => (
            <div
              key={i}
              className="boot-line"
              style={{
                color: i === LINES.length - 1 ? 'var(--cyan-bright)' : undefined,
                textShadow: i === LINES.length - 1 ? '0 0 12px rgba(79,227,255,0.5)' : undefined,
              }}
            >
              {line}
            </div>
          ))}
        </div>

        {/* barra de progreso */}
        <div className="mt-5 h-[3px] w-full bg-[rgba(79,227,255,0.12)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--cyan)]"
            style={{
              boxShadow: '0 0 10px var(--cyan)',
              animation: `bootBarFill ${totalDuration}ms linear forwards`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
