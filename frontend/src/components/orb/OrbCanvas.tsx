'use client';

import { useRef, useEffect, useMemo, useState, startTransition } from 'react';
import { useHermesStore } from '@/store/useHermesStore';

// Simple Three.js orb with particles - no imports, pure canvas fallback
// Uses a lightweight approach with a canvas 2D fallback

function particleNoise(t: number, seed: number): number {
  return Math.sin(t * 0.5 + seed * 6.283) * 0.5 + 0.5;
}

function Orb3DCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const orbState = useHermesStore((s) => s.orbState);
  const [webglSupported, setWebglSupported] = useState(true);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    // Check WebGL support
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
    if (!gl) startTransition(() => setWebglSupported(false));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    // Pre-calc particle positions (3 shells)
    const numParticles = 800;
    const particles: { x: number; y: number; z: number; shell: number; seed: number }[] = [];

    for (let i = 0; i < numParticles; i++) {
      const shell = Math.floor(Math.random() * 3);
      const radius = 0.3 + shell * 0.25 + Math.random() * 0.1;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      particles.push({
        x: radius * Math.sin(phi) * Math.cos(theta),
        y: radius * Math.sin(phi) * Math.sin(theta),
        z: radius * Math.cos(phi),
        shell,
        seed: Math.random() * 100,
      });
    }

    const colors = {
      idle: { r: 0, g: 0.53, b: 1 },
      processing: { r: 0, g: 0.83, b: 1 },
      success: { r: 0.13, g: 0.77, b: 0.34 },
      error: { r: 0.94, g: 0.27, b: 0.27 },
    };

    const stateAnim = { progress: 0, currentState: orbState, targetState: orbState };

    function animate(timestamp: number) {
      if (!canvas || !ctx) return;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const cx = w / 2;
      const cy = h / 2;

      timeRef.current = timestamp * 0.001;
      const t = timeRef.current;

      // Smooth state transition
      if (stateAnim.targetState !== orbState) {
        stateAnim.targetState = orbState;
        stateAnim.progress = 0;
      }
      stateAnim.progress = Math.min(stateAnim.progress + 0.02, 1);
      stateAnim.currentState = stateAnim.progress < 1 ? stateAnim.currentState : orbState;

      const src = colors[stateAnim.currentState as keyof typeof colors] || colors.idle;
      const dst = colors[stateAnim.targetState as keyof typeof colors] || colors.idle;
      const p = easeInOut(stateAnim.progress);
      const cr = src.r + (dst.r - src.r) * p;
      const cg = src.g + (dst.g - src.g) * p;
      const cb = src.b + (dst.b - src.b) * p;

      // Clear
      ctx.clearRect(0, 0, w, h);

      // Glow
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.5);
      gradient.addColorStop(0, `rgba(${cr * 255},${cg * 255},${cb * 255},0.08)`);
      gradient.addColorStop(0.5, `rgba(${cr * 255},${cg * 255},${cb * 255},0.03)`);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      // Draw particles
      const ringSpeed = orbState === 'processing' ? 1.5 : 0.4;
      const scale = Math.min(w, h) * 0.38;

      for (const p of particles) {
        // Simplex-like noise displacement
        const nx = particleNoise(t * 0.3 + p.seed, p.seed + 1);
        const ny = particleNoise(t * 0.3 + p.seed + 10, p.seed + 2);
        const nz = particleNoise(t * 0.3 + p.seed + 20, p.seed + 3);

        const noiseDisp = 0.05;
        const rotY = t * 0.15 * ringSpeed;
        const rotX = Math.sin(t * 0.08) * 0.2;

        let px = p.x + nx * noiseDisp;
        let py = p.y + ny * noiseDisp;
        let pz = p.z + nz * noiseDisp;

        // Rotate Y
        const cosY = Math.cos(rotY);
        const sinY = Math.sin(rotY);
        const rx = px * cosY - pz * sinY;
        const rz = px * sinY + pz * cosY;
        px = rx;
        pz = rz;

        // Rotate X
        const cosX = Math.cos(rotX);
        const sinX = Math.sin(rotX);
        const ry = py * cosX - pz * sinX;
        const rz2 = py * sinX + pz * cosX;
        py = ry;
        pz = rz2;

        const sx = px * scale + cx;
        const sy = py * scale + cy;
        const depth = pz * 0.5 + 0.5;
        const size = 1.5 + depth * 2;
        const alpha = 0.2 + depth * 0.6;

        ctx.beginPath();
        ctx.arc(sx, sy, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cr * 255},${cg * 255},${cb * 255},${alpha})`;
        ctx.fill();

        // Add a subtle glow ring for processing state
        if (orbState === 'processing') {
          ctx.beginPath();
          ctx.arc(sx, sy, size * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${cr * 255},${cg * 255},${cb * 255},${alpha * 0.15})`;
          ctx.fill();
        }
      }

      // Center glow dot
      if (orbState === 'processing') {
        const pulse = Math.sin(t * 3) * 0.5 + 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy, 6 + pulse * 4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 212, 255, ${0.3 + pulse * 0.3})`;
        ctx.fill();
      }

      if (orbState === 'success') {
        // Gold ring flash
        const flash = Math.max(0, 1 - stateAnim.progress * 2);
        ctx.beginPath();
        ctx.arc(cx, cy, Math.min(w, h) * 0.15, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 215, 0, ${flash * 0.6})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      animRef.current = requestAnimationFrame(animate);
    }

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [orbState]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ display: webglSupported ? 'block' : 'none' }}
    />
  );
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

// SVG fallback
function OrbSVGFallback() {
  const orbState = useHermesStore((s) => s.orbState);

  const getColors = () => {
    switch (orbState) {
      case 'processing': return { main: '#00d4ff', glow: '#0088cc' };
      case 'success': return { main: '#22c55e', glow: '#16a34a' };
      case 'error': return { main: '#ef4444', glow: '#dc2626' };
      default: return { main: '#0066cc', glow: '#004080' };
    }
  };

  const colors = getColors();

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <svg width="200" height="200" viewBox="0 0 200 200">
        <defs>
          <radialGradient id="orb-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colors.main} stopOpacity="0.3" />
            <stop offset="100%" stopColor={colors.main} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="80" fill="url(#orb-glow)" />
        <circle cx="100" cy="100" r="30" fill={colors.main} opacity="0.6" />
        <circle cx="100" cy="100" r="15" fill={colors.main} opacity="0.9" />
        {Array.from({ length: 24 }).map((_, i) => (
          <circle
            key={i}
            cx={100 + Math.cos((i / 24) * Math.PI * 2) * 50}
            cy={100 + Math.sin((i / 24) * Math.PI * 2) * 50}
            r="2"
            fill={colors.main}
            opacity="0.4"
          />
        ))}
      </svg>
    </div>
  );
}

export default function OrbCanvas() {
  const [webglOk, setWebglOk] = useState(true);

  useEffect(() => {
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
      if (!gl) startTransition(() => setWebglOk(false));
    } catch {
      startTransition(() => setWebglOk(false));
    }
  }, []);

  return (
    <>
      {webglOk ? <Orb3DCanvas /> : <OrbSVGFallback />}
    </>
  );
}
