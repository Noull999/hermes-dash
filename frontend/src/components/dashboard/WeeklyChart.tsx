'use client';

import Card from '@/components/ui/Card';
import { useEffect, useRef, useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Filler } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { BarChart3 } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Filler);

export default function WeeklyChart() {
  const [chartData, setChartData] = useState<{
    labels: string[];
    newTokens: number[];
    cachedTokens: number[];
  } | null>(null);

  useEffect(() => {
    // Generate mock data for the weekly chart
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const newTokens = days.map(() => Math.floor(Math.random() * 8000 + 2000));
    const cachedTokens = days.map(() => Math.floor(Math.random() * 12000 + 3000));
    setChartData({ labels: days, newTokens, cachedTokens });
  }, []);

  if (!chartData) {
    return (
      <Card>
        <div className="skeleton h-40 w-full" />
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 size={16} className="text-[var(--accent)]" />
        <h3 className="text-sm font-semibold text-[var(--text)]">Uso semanal</h3>
      </div>
      <div className="h-40">
        <Bar
          data={{
            labels: chartData.labels,
            datasets: [
              {
                label: 'New',
                data: chartData.newTokens,
                backgroundColor: 'rgba(0, 212, 255, 0.7)',
                borderColor: 'rgba(0, 212, 255, 0.9)',
                borderWidth: 1,
                borderRadius: 4,
                barPercentage: 0.6,
              },
              {
                label: 'Cached',
                data: chartData.cachedTokens,
                backgroundColor: 'rgba(0, 212, 255, 0.15)',
                borderColor: 'rgba(0, 212, 255, 0.3)',
                borderWidth: 1,
                borderRadius: 4,
                barPercentage: 0.6,
              },
            ],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: true,
                position: 'top',
                labels: {
                  color: '#64748b',
                  boxWidth: 8,
                  padding: 8,
                  font: { size: 10 },
                },
              },
              tooltip: {
                backgroundColor: '#12121a',
                titleColor: '#e2e8f0',
                bodyColor: '#e2e8f0',
                borderColor: 'rgba(255,255,255,0.06)',
                borderWidth: 1,
                padding: 8,
                cornerRadius: 8,
              },
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: '#64748b', font: { size: 10 } },
              },
              y: {
                grid: { color: 'rgba(255,255,255,0.04)' },
                ticks: {
                  color: '#64748b',
                  font: { size: 10 },
                  callback: (val: number | string) => {
                    const v = typeof val === 'string' ? parseInt(val) : val;
                    return v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toString();
                  },
                },
                beginAtZero: true,
              },
            },
          }}
        />
      </div>
    </Card>
  );
}
