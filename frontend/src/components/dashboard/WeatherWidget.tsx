'use client';

import { useEffect, useState, startTransition } from 'react';
import { CloudSun, RefreshCw, Thermometer, Droplets, Wind, MapPin } from 'lucide-react';

interface WeatherData {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
  };
}

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
        'https://api.open-meteo.com/v1/forecast?latitude=-41.47&longitude=-72.94&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=America/Santiago'
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

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          <MapPin size={10} className="text-[var(--cyan)]" />
          <span className="hud-label text-[8px]">PTO. MONTT</span>
        </div>
        <button onClick={fetchWeather} className="p-0.5 hover:bg-[rgba(79,227,255,0.08)] transition-colors rounded">
          <RefreshCw size={9} className="text-[var(--text-muted)]" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-2xl leading-none">{emoji}</span>
        <div className="flex items-baseline gap-1.5">
          <span className="hud-readout text-xl font-bold glow-text leading-none">
            {Math.round(current.temperature_2m)}°
          </span>
          <span className="hud-label text-[8px] text-[var(--text-muted)]">
            SENS {Math.round(current.apparent_temperature)}°
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-1.5">
        {[
          { Icon: Thermometer, label: 'HUM', val: `${current.relative_humidity_2m}%` },
          { Icon: Wind, label: 'VIENTO', val: `${Math.round(current.wind_speed_10m)}km/h` },
        ].map(({ Icon, label, val }) => (
          <div key={label} className="flex items-center gap-1">
            <Icon size={9} className="text-[var(--text-faint)]" />
            <span className="hud-readout text-[10px] text-[var(--text)]">{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
