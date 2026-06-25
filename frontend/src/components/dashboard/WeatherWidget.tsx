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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{emoji}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-[var(--text)]">
                {Math.round(current.temperature_2m)}°C
              </span>
              <span className="text-xs text-[var(--text-muted)]">
                Sensación {Math.round(current.apparent_temperature)}°C
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                <MapPin size={10} />
                Puerto Montt
              </span>
              <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                <Droplets size={10} />
                {current.relative_humidity_2m}%
              </span>
              <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                <Wind size={10} />
                {Math.round(current.wind_speed_10m)} km/h
              </span>
            </div>
          </div>
        </div>
        <button onClick={fetchWeather} className="p-1 rounded-lg hover:bg-[rgba(255,255,255,0.06)] transition-colors">
          <RefreshCw size={12} className="text-[var(--text-muted)]" />
        </button>
      </div>
    </Card>
  );
}
