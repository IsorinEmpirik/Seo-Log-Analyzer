import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { DailyCrawlStats, HttpCodeStats } from '@/lib/api';
import { getHttpCodeColor, formatDate } from '@/lib/utils';

interface LineChartProps {
  data: DailyCrawlStats[];
  title?: string;
}

export function CrawlLineChart({ data, title }: LineChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    chartInstance.current = new Chart(chartRef.current, {
      type: 'line',
      data: {
        labels: data.map((d) => formatDate(d.date)),
        datasets: [
          {
            label: 'Crawls',
            data: data.map((d) => d.count),
            borderColor: '#2563EB',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 3,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          title: {
            display: !!title,
            text: title,
            font: { weight: 'bold' },
          },
        },
        scales: {
          x: {
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            grid: { color: '#f1f1f1' },
          },
        },
      },
    });

    return () => {
      chartInstance.current?.destroy();
    };
  }, [data, title]);

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-text-muted">
        Aucune donnée disponible
      </div>
    );
  }

  return <canvas ref={chartRef} className="w-full h-64" />;
}

interface HttpCodeChartProps {
  data: HttpCodeStats[];
}

export function HttpCodeChart({ data }: HttpCodeChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    chartInstance.current = new Chart(chartRef.current, {
      type: 'doughnut',
      data: {
        labels: data.map((d) => `${d.code}`),
        datasets: [
          {
            data: data.map((d) => d.count),
            backgroundColor: data.map((d) => getHttpCodeColor(d.code)),
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              usePointStyle: true,
              padding: 15,
            },
          },
        },
      },
    });

    return () => {
      chartInstance.current?.destroy();
    };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-text-muted">
        Aucune donnée disponible
      </div>
    );
  }

  return <canvas ref={chartRef} className="w-full h-64" />;
}

interface BarChartProps {
  data: { label: string; value: number }[];
  title?: string;
  horizontal?: boolean;
}

export function BarChart({ data, title, horizontal = false }: BarChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    chartInstance.current = new Chart(chartRef.current, {
      type: 'bar',
      data: {
        labels: data.map((d) => d.label),
        datasets: [
          {
            data: data.map((d) => d.value),
            backgroundColor: '#2563EB',
            borderRadius: 4,
          },
        ],
      },
      options: {
        indexAxis: horizontal ? 'y' : 'x',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: {
            display: !!title,
            text: title,
            font: { weight: 'bold' },
          },
        },
        scales: {
          x: {
            grid: { display: horizontal },
          },
          y: {
            beginAtZero: true,
            grid: { display: !horizontal, color: '#f1f1f1' },
          },
        },
      },
    });

    return () => {
      chartInstance.current?.destroy();
    };
  }, [data, title, horizontal]);

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-text-muted">
        Aucune donnée disponible
      </div>
    );
  }

  return <canvas ref={chartRef} className="w-full h-64" />;
}
