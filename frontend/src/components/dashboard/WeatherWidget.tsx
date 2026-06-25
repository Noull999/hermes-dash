'use client';

import Card from '@/components/ui/Card';
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
      <Card>
        <div className="flex items-center gap-3">
          <div className="skeleton w-10 h-10 rounded-full" />
          <div className="space-y-1">
            <div className="skeleton h-4 w-20" />
            <div className="skeleton h-3 w-32" />
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CloudSun size={16} className="text-[var(--text-muted)]" />
            <span className="text-xs text-[var(--text-muted)]">Clima no disponible</span>
          </div>
          <button onClick={fetchWeather} className="p-1 rounded-lg hover:bg-[rgba(255,255,255,0.06)]">
            <RefreshCw size={12} className="text-[var(--accent)]" />
          </button>
        </div>
      </Card>
    );
  }

  if (!weather) return null;

  const { current } = weather;
  const emoji = weatherEmoji[current.weather_code] || '🌤️';

  return (
    <Card padding="sm">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <MapPin size={11} className="text-[var(--cyan)]" />
          <span className="hud-label text-[9px]">PUERTO&nbsp;MONTT · CL</span>
        </div>
        <button onClick={fetchWeather} className="p-1 hover:bg-[rgba(79,227,255,0.08)] transition-colors">
          <RefreshCw size={11} className="text-[var(--text-muted)]" />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-3xl leading-none">{emoji}</span>
        <div className="flex items-baseline gap-2">
          <span className="hud-readout text-3xl font-bold glow-text leading-none">
            {Math.round(current.temperature_2m)}°
          </span>
          <span className="hud-label text-[9px]">
            SENS&nbsp;{Math.round(current.apparent_temperature)}°
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3">
        {[
          { Icon: Thermometer, label: 'TEMP', val: `${Math.round(current.temperature_2m)}°C` },
          { Icon: Droplets, label: 'HUM', val: `${current.relative_humidity_2m}%` },
          { Icon: Wind, label: 'VIENTO', val: `${Math.round(current.wind_speed_10m)}km/h` },
        ].map(({ Icon, label, val }) => (
          <div key={label} className="flex items-center gap-1.5 border-l border-[var(--hairline)] pl-2">
            <Icon size={11} className="text-[var(--text-faint)]" />
            <div className="leading-tight">
              <div className="hud-label text-[7px]">{label}</div>
              <div className="hud-readout text-[11px] text-[var(--text)]">{val}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
