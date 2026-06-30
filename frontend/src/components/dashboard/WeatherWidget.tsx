'use client';

import { useEffect, useState, startTransition } from 'react';
import { CloudSun, RefreshCw, Thermometer, Droplets, Wind, MapPin, Eye, Sun } from 'lucide-react';

interface WeatherData {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
    precipitation: number;
    pressure_msl: number;
    visibility: number;
    uv_index: number;
  };
}

const WEATHER_LABELS: Record<number, string> = {
  0: 'Despejado', 1: 'Mayormente despejado', 2: 'Parcialmente nublado', 3: 'Nublado',
  45: 'Niebla', 48: 'Niebla con escarcha',
  51: 'Llovizna ligera', 53: 'Llovizna moderada', 55: 'Llovizna densa',
  56: 'Llovizna helada ligera', 57: 'Llovizna helada densa',
  61: 'Lluvia ligera', 63: 'Lluvia moderada', 65: 'Lluvia fuerte',
  66: 'Lluvia helada ligera', 67: 'Lluvia helada fuerte',
  71: 'Nevada ligera', 73: 'Nevada moderada', 75: 'Nevada fuerte',
  77: 'Granos de nieve',
  80: 'Chubascos ligeros', 81: 'Chubascos moderados', 82: 'Chubascos violentos',
  85: 'Chubascos de nieve ligeros', 86: 'Chubascos de nieve fuertes',
  95: 'Tormenta', 96: 'Tormenta con granizo ligero', 99: 'Tormenta con granizo fuerte',
};

const weatherEmoji: Record<number, string> = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌦️',
  61: '🌧️', 63: '🌧️', 65: '🌧️',
  71: '🌨️', 73: '🌨️', 75: '🌨️',
  80: '🌦️', 81: '🌦️', 82: '🌦️',
  95: '⛈️', 96: '⛈️', 99: '⛈️',
};

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=-41.47&longitude=-72.94&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation,pressure_msl,visibility,uv_index&timezone=America/Santiago'
      );
      if (!res.ok) throw new Error('Weather API error');
      const data = await res.json();
      setWeather(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    startTransition(() => { fetchWeather(); });
    const interval = setInterval(() => startTransition(() => { fetchWeather(); }), 600000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !weather) {
    return (
      <div className="flex items-center gap-2">
        <div className="skeleton w-8 h-8 rounded-full" />
        <div className="space-y-1 flex-1">
          <div className="skeleton h-3 w-16" />
          <div className="skeleton h-2 w-24" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CloudSun size={14} className="text-[var(--text-muted)]" />
          <span className="text-[10px] text-[var(--text-muted)]">Clima no disponible</span>
        </div>
        <button onClick={fetchWeather} className="p-1 hover:bg-[rgba(255,255,255,0.06)]">
          <RefreshCw size={10} className="text-[var(--accent)]" />
        </button>
      </div>
    );
  }

  if (!weather) return null;

  const { current } = weather;
  const emoji = weatherEmoji[current.weather_code] || '🌤️';
  const label = WEATHER_LABELS[current.weather_code] || '';

  return (
    <div className="space-y-2.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <MapPin size={10} className="text-[var(--cyan)]" />
          <span className="hud-label text-[8px]">PTO. MONTT</span>
        </div>
        <button onClick={fetchWeather} className="p-0.5 hover:bg-[rgba(79,227,255,0.08)] transition-colors rounded">
          <RefreshCw size={9} className="text-[var(--text-muted)]" />
        </button>
      </div>

      {/* Main temp + condition */}
      <div className="flex items-center gap-2.5">
        <span className="text-2xl leading-none">{emoji}</span>
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="hud-readout text-xl font-bold glow-text leading-none">
              {Math.round(current.temperature_2m)}°
            </span>
            <span className="hud-label text-[8px] text-[var(--text-muted)]">
              SENS {Math.round(current.apparent_temperature)}°
            </span>
          </div>
          <div className="hud-label text-[8px] text-[var(--text-faint)] mt-0.5">{label}</div>
        </div>
      </div>

      {/* Extra stats in a 2x2 grid */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        <div className="flex items-center gap-1.5">
          <Droplets size={8} className="text-[var(--cyan)] shrink-0" />
          <div>
            <div className="hud-readout text-[10px] text-[var(--text)]">{current.relative_humidity_2m}%</div>
            <div className="hud-label text-[7px] text-[var(--text-faint)]">HUMEDAD</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Wind size={8} className="text-[var(--cyan)] shrink-0" />
          <div>
            <div className="hud-readout text-[10px] text-[var(--text)]">{Math.round(current.wind_speed_10m)} km/h</div>
            <div className="hud-label text-[7px] text-[var(--text-faint)]">VIENTO</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Sun size={8} className="text-[var(--amber)] shrink-0" />
          <div>
            <div className="hud-readout text-[10px] text-[var(--text)]">{current.uv_index.toFixed(1)}</div>
            <div className="hud-label text-[7px] text-[var(--text-faint)]">UV</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Eye size={8} className="text-[var(--text-faint)] shrink-0" />
          <div>
            <div className="hud-readout text-[10px] text-[var(--text)]">{(current.visibility / 1000).toFixed(1)} km</div>
            <div className="hud-label text-[7px] text-[var(--text-faint)]">VISIB.</div>
          </div>
        </div>
      </div>

      {/* Precipitation & Pressure row */}
      <div className="flex items-center justify-between px-2 py-1.5 rounded border border-[var(--hairline)] bg-[rgba(0,0,0,0.12)]">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px]">💧</span>
          <div>
            <div className="hud-readout text-[9px] text-[var(--text)]">{current.precipitation || 0} mm</div>
            <div className="hud-label text-[7px] text-[var(--text-faint)]">PRECIP.</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Thermometer size={8} className="text-[var(--text-faint)]" />
          <div>
            <div className="hud-readout text-[9px] text-[var(--text)]">{Math.round(current.pressure_msl)} hPa</div>
            <div className="hud-label text-[7px] text-[var(--text-faint)]">PRESIÓN</div>
          </div>
        </div>
      </div>
    </div>
  );
}
