'use client';

import { useRef, useEffect, useState, startTransition } from 'react';
import { useHermesStore } from '@/store/useHermesStore';
import { useActivityStore } from '@/store/useActivityStore';

// Simple Three.js orb with particles - no imports, pure canvas fallback

function particleNoise(t: number, seed: number): number {
  return Math.sin(t * 0.5 + seed * 6.283) * 0.5 + 0.5;
}

function getHourColors(): { r: number; g: number; b: number } {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return { r: 1.0, g: 0.75, b: 0.3 };    // Morning gold
  if (h >= 12 && h < 18) return { r: 0.95, g: 0.18, b: 0.3 };  // Afternoon red
  if (h >= 18 && h < 22) return { r: 0.7, g: 0.12, b: 0.35 };  // Evening crimson
  return { r: 0.25, g: 0.04, b: 0.08 };                           // Night dark red
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function Orb3DCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const orbState = useHermesStore((s) => s.orbState);
  const system = useHermesStore((s) => s.system);
  const events = useActivityStore((s) => s.events);
  const [webglSupported, setWebglSupported] = useState(true);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);
  const errorFlashRef = useRef(0);

  const cpuHigh = (system?.cpu_pct || 0) > 80;
  const gatewayOffline = system?.gateway !== 'online';

  // Detect recent error from activity feed
  useEffect(() => {
    if (events.length > 0 && events[0].type === 'error') {
      errorFlashRef.current = 3.0; // 3 second flash
    }
  }, [events]);

  useEffect(() => {
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

    const stateColors = {
      idle: { r: 0.55, g: 0.0, b: 0.12 },
      processing: { r: 1.0, g: 0.18, b: 0.33 },
      success: { r: 0.13, g: 0.77, b: 0.34 },
      error: { r: 1.0, g: 0.6, b: 0.0 },
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

      // Decay error flash
      if (errorFlashRef.current > 0) {
        errorFlashRef.current -= 1 / 60; // ~60fps decay
      }

      // Hour-based color adjustment
      const hourColor = getHourColors();

      // Smooth state transition
      if (stateAnim.targetState !== orbState) {
        stateAnim.targetState = orbState;
        stateAnim.progress = 0;
      }
      stateAnim.progress = Math.min(stateAnim.progress + 0.02, 1);
      stateAnim.currentState = stateAnim.progress < 1 ? stateAnim.currentState : orbState;

      const src = stateColors[stateAnim.currentState as keyof typeof stateColors] || stateColors.idle;
      const dst = stateColors[stateAnim.targetState as keyof typeof stateColors] || stateColors.idle;
      const p = easeInOut(stateAnim.progress);

      // Blend state color with hour color
      const stateR = src.r + (dst.r - src.r) * p;
      const stateG = src.g + (dst.g - src.g) * p;
      const stateB = src.b + (dst.b - src.b) * p;

      // Hour influence: 30% blend
      const hr = stateR * 0.7 + hourColor.r * 0.3;
      const hg = stateG * 0.7 + hourColor.g * 0.3;
      const hb = stateB * 0.7 + hourColor.b * 0.3;

      // Error flash overlay
      let cr = hr;
      let cg = hg;
      let cb = hb;
      if (errorFlashRef.current > 0) {
        const flashAmount = Math.min(errorFlashRef.current, 1) * 0.5;
        cr = hr + (1 - hr) * flashAmount;
        cg = hg * (1 - flashAmount);
        cb = hb * (1 - flashAmount);
      }

      // Gateway offline: dim the orb
      let brightness = 1.0;
      if (gatewayOffline) {
        brightness = 0.2;
      }

      // Clear
      ctx.clearRect(0, 0, w, h);

      // Glow
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.5);
      gradient.addColorStop(0, `rgba(${cr * 255 * brightness},${cg * 255 * brightness},${cb * 255 * brightness},0.08)`);
      gradient.addColorStop(0.5, `rgba(${cr * 255 * brightness},${cg * 255 * brightness},${cb * 255 * brightness},0.03)`);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      // Draw particles
      const baseSpeed = cpuHigh ? 2.5 : 0.4;
      const ringSpeed = orbState === 'processing' ? 1.5 : baseSpeed;
      const noiseScale = cpuHigh ? 0.12 : 0.05; // More agitation when CPU high
      const scale = Math.min(w, h) * 0.38;

      for (const particle of particles) {
        const nx = particleNoise(t * 0.3 + particle.seed, particle.seed + 1);
        const ny = particleNoise(t * 0.3 + particle.seed + 10, particle.seed + 2);
        const nz = particleNoise(t * 0.3 + particle.seed + 20, particle.seed + 3);

        const rotY = t * 0.15 * ringSpeed;
        const rotX = Math.sin(t * 0.08 * (cpuHigh ? 2 : 1)) * 0.2;

        let px = particle.x + nx * noiseScale;
        let py = particle.y + ny * noiseScale;
        let pz = particle.z + nz * noiseScale;

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
        const size = (1.5 + depth * 2) * (cpuHigh ? 1.8 : 1);
        const alpha = (0.2 + depth * 0.6) * brightness;

        ctx.beginPath();
        ctx.arc(sx, sy, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cr * 255 * brightness},${cg * 255 * brightness},${cb * 255 * brightness},${alpha})`;
        ctx.fill();

        if (orbState === 'processing' || cpuHigh) {
          ctx.beginPath();
          ctx.arc(sx, sy, size * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${cr * 255 * brightness},${cg * 255 * brightness},${cb * 255 * brightness},${alpha * 0.15})`;
          ctx.fill();
        }
      }

      // Center glow dot
      if (orbState === 'processing') {
        const pulse = Math.sin(t * 3) * 0.5 + 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy, 6 + pulse * 4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cr * 255 * brightness}, ${cg * 255 * brightness}, ${cb * 255 * brightness}, ${(0.3 + pulse * 0.3) * brightness})`;
        ctx.fill();
      }

      if (orbState === 'success') {
        const flash = Math.max(0, 1 - stateAnim.progress * 2);
        ctx.beginPath();
        ctx.arc(cx, cy, Math.min(w, h) * 0.15, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 215, 0, ${flash * 0.6})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Error flash ring
      if (errorFlashRef.current > 0) {
        const flashPulse = Math.sin(t * 10) * 0.3 + 0.7;
        ctx.beginPath();
        ctx.arc(cx, cy, Math.min(w, h) * 0.2, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 93, 108, ${errorFlashRef.current * 0.4 * flashPulse})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      animRef.current = requestAnimationFrame(animate);
    }

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [orbState, cpuHigh, gatewayOffline]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ display: webglSupported ? 'block' : 'none' }}
    />
  );
}

// SVG fallback
function OrbSVGFallback() {
  const orbState = useHermesStore((s) => s.orbState);
  const system = useHermesStore((s) => s.system);
  const cpuHigh = (system?.cpu_pct || 0) > 80;
  const gatewayOffline = system?.gateway !== 'online';
  const hourColor = getHourColors();

  const getColors = () => {
    const stateColors: Record<string, { main: string; glow: string }> = {
      processing: { main: '#ff2d55', glow: '#cc1a3d' },
      success: { main: '#22c55e', glow: '#16a34a' },
      error: { main: '#ff9f3d', glow: '#e08020' },
      idle: { main: '#8c1c30', glow: '#661222' },
    };

    // Blend with hour color
    if (orbState === 'idle') {
      const r = Math.round(0.55 * 0.7 + hourColor.r * 0.3 * 255);
      const g = Math.round(0.0 * 0.7 + hourColor.g * 0.3 * 255);
      const b = Math.round(0.12 * 0.7 + hourColor.b * 0.3 * 255);
      return { main: `rgb(${r},${g},${b})`, glow: `rgb(${Math.round(r*0.7)},${Math.round(g*0.7)},${Math.round(b*0.7)})` };
    }

    return stateColors[orbState] || stateColors.idle;
  };

  const colors = getColors();
  const brightness = gatewayOffline ? 0.2 : 1;
  const pulseSpeed = cpuHigh ? '1s' : '3s';

  return (
    <div
      className="absolute inset-0 flex items-center justify-center transition-all duration-1000"
      style={{ opacity: brightness }}
    >
      <svg width="200" height="200" viewBox="0 0 200 200">
        <defs>
          <radialGradient id="orb-glow-svg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colors.main} stopOpacity="0.3" />
            <stop offset="100%" stopColor={colors.main} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="80" fill="url(#orb-glow-svg)" />
        <circle cx="100" cy="100" r="30" fill={colors.main} opacity="0.6">
          <animate attributeName="r" values="28;34;28" dur={pulseSpeed} repeatCount="indefinite" />
        </circle>
        <circle cx="100" cy="100" r="15" fill={colors.main} opacity="0.9" />
        {Array.from({ length: 24 }).map((_, i) => (
          <circle
            key={i}
            cx={100 + Math.cos((i / 24) * Math.PI * 2) * 50}
            cy={100 + Math.sin((i / 24) * Math.PI * 2) * 50}
            r={cpuHigh ? "3" : "2"}
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
