import { useState, useEffect, useRef } from 'react';
import { Calendar, BarChart2 } from 'lucide-react';
import { getBotComparison, getBotDistribution, getDateRange, Client, BotComparisonResult, DateRange } from '@/lib/api';
import { formatNumber, formatDate } from '@/lib/utils';
import Chart from 'chart.js/auto';

interface BotComparisonProps {
  client: Client | null;
}

const BOT_COLORS = [
  '#2563EB', '#DC2626', '#16A34A', '#D97706',
  '#7C3AED', '#DB2777', '#0891B2', '#65A30D',
  '#EA580C', '#0284C7',
];

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-primary" />
    </div>
  );
}

interface MultiLineChartProps {
  result: BotComparisonResult;
  selectedBots: string[];
  botColors: Record<string, string>;
}

function MultiLineChart({ result, selectedBots, botColors }: MultiLineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || result.daily.length === 0) return;

    // Build sorted unique dates
    const allDates = Array.from(new Set(result.daily.map((d) => d.date))).sort();

    // Map: crawler -> date -> count
    const byBot: Record<string, Record<string, number>> = {};
    for (const row of result.daily) {
      if (!byBot[row.crawler]) byBot[row.crawler] = {};
      byBot[row.crawler][row.date] = row.count;
    }

    chartRef.current?.destroy();

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: allDates.map((d) => formatDate(d)),
        datasets: selectedBots.map((bot) => ({
          label: bot,
          data: allDates.map((d) => byBot[bot]?.[d] ?? 0),
          borderColor: botColors[bot] ?? '#888',
          backgroundColor: 'transparent',
          tension: 0.3,
          pointRadius: allDates.length > 40 ? 0 : 3,
          pointHoverRadius: 5,
          borderWidth: 2,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            labels: { usePointStyle: true, padding: 16, font: { size: 12 } },
          },
          tooltip: {
            callbacks: {
              title: (items) => items[0]?.label ?? '',
              label: (item) => ` ${item.dataset.label}: ${item.parsed.y.toLocaleString('fr-FR')}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { maxRotation: 0, maxTicksLimit: 12, font: { size: 11 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: '#f1f5f9' },
            ticks: { font: { size: 11 }, precision: 0 },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [result, selectedBots, botColors]);

  if (result.daily.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-text-muted">
        Aucune donnée disponible
      </div>
    );
  }

  return (
    <div className="relative h-80 w-full">
      <canvas ref={canvasRef} />
    </div>
  );
}

export function BotComparison({ client }: BotComparisonProps) {
  const [availableBots, setAvailableBots] = useState<{ bot: string; family: string; count: number }[]>([]);
  const [selectedBots, setSelectedBots] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [result, setResult] = useState<BotComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [botsLoading, setBotsLoading] = useState(false);

  // Assign stable colors per bot
  const botColors: Record<string, string> = {};
  availableBots.forEach((b, i) => {
    botColors[b.bot] = BOT_COLORS[i % BOT_COLORS.length];
  });

  useEffect(() => {
    if (!client) return;
    setSelectedBots([]);
    setResult(null);
    setStartDate('');
    setEndDate('');
    setBotsLoading(true);
    Promise.all([
      getBotDistribution(client.id),
      getDateRange(client.id),
    ])
      .then(([dist, range]) => {
        setAvailableBots(dist.bots);
        setDateRange(range);
      })
      .catch(() => {})
      .finally(() => setBotsLoading(false));
  }, [client]);

  const toggleBot = (bot: string) => {
    setSelectedBots((prev) =>
      prev.includes(bot) ? prev.filter((b) => b !== bot) : [...prev, bot]
    );
  };

  const handleCompare = async () => {
    if (!client || selectedBots.length === 0) return;
    setLoading(true);
    try {
      const data = await getBotComparison(
        client.id,
        selectedBots,
        startDate || undefined,
        endDate || undefined,
      );
      setResult(data);
    } catch (err) {
      console.error('Failed to compare bots:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!client) {
    return (
      <div className="text-center py-12 text-text-muted">
        Sélectionnez un client pour comparer les bots
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text">Comparatif Bots</h1>
        <p className="text-text-muted mt-1">
          Comparez l'activité de plusieurs user agents sur la même période
        </p>
      </div>

      {/* Bot selector */}
      <div className="bg-surface rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 className="font-semibold text-text">Sélectionner les bots à comparer</h3>

        {botsLoading ? (
          <div className="flex items-center gap-2 text-text-muted text-sm">
            <div className="animate-spin h-4 w-4 rounded-full border-2 border-gray-200 border-t-primary" />
            Chargement des bots...
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {availableBots.map((b) => {
              const isSelected = selectedBots.includes(b.bot);
              const color = botColors[b.bot];
              return (
                <button
                  key={b.bot}
                  onClick={() => toggleBot(b.bot)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    isSelected
                      ? 'text-white border-transparent shadow-sm'
                      : 'bg-white text-text-muted border-gray-200 hover:border-gray-400'
                  }`}
                  style={isSelected ? { backgroundColor: color, borderColor: color } : {}}
                >
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.7)' : color }}
                  />
                  {b.bot}
                  <span className="text-xs opacity-70">({formatNumber(b.count)})</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Date filters */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100">
          <Calendar className="w-4 h-4 text-text-muted" />
          <div className="flex items-center gap-2">
            <label className="text-sm text-text-muted">Du</label>
            <input
              type="date"
              value={startDate}
              min={dateRange?.min_date || undefined}
              max={dateRange?.max_date || undefined}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-text-muted">Au</label>
            <input
              type="date"
              value={endDate}
              min={dateRange?.min_date || undefined}
              max={dateRange?.max_date || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {dateRange?.min_date && dateRange?.max_date && (
            <span className="text-xs text-text-muted">
              Données du {new Date(dateRange.min_date).toLocaleDateString('fr-FR')} au {new Date(dateRange.max_date).toLocaleDateString('fr-FR')}
            </span>
          )}
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="text-xs text-primary hover:underline"
            >
              Réinitialiser
            </button>
          )}

          <button
            onClick={handleCompare}
            disabled={selectedBots.length === 0 || loading}
            className="ml-auto flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="animate-spin h-4 w-4 rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <BarChart2 className="w-4 h-4" />
            )}
            Comparer
          </button>
        </div>
      </div>

      {/* Results */}
      {loading && <Spinner />}

      {!loading && result && (
        <>
          {/* Summary table */}
          <div className="bg-surface rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-text mb-4">Résumé de la comparaison</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-text-muted text-sm border-b border-gray-100">
                    <th className="pb-3 font-medium">Bot</th>
                    <th className="pb-3 font-medium text-right">Requêtes</th>
                    <th className="pb-3 font-medium text-right">Pages Crawlées</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {result.summary
                    .slice()
                    .sort((a, b) => b.requests - a.requests)
                    .map((row) => (
                      <tr key={row.crawler} className="hover:bg-gray-50">
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: botColors[row.crawler] ?? '#888' }}
                            />
                            <span className="font-medium text-text">{row.crawler}</span>
                          </div>
                        </td>
                        <td className="py-3 text-right font-medium">
                          {formatNumber(row.requests)}
                        </td>
                        <td className="py-3 text-right font-medium">
                          {formatNumber(row.pages_crawled)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Activity over time chart */}
          <div className="bg-surface rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-text mb-4">Activité dans le temps</h3>
            <MultiLineChart
              result={result}
              selectedBots={selectedBots}
              botColors={botColors}
            />
          </div>
        </>
      )}

      {!loading && !result && selectedBots.length > 0 && (
        <div className="text-center py-8 text-text-muted text-sm">
          Cliquez sur "Comparer" pour afficher les résultats
        </div>
      )}
    </div>
  );
}
