import { useState, useEffect } from 'react';
import { BarChart3, FileText, AlertTriangle, TrendingUp } from 'lucide-react';
import { getDashboardStats, DashboardStats, Client } from '@/lib/api';
import { StatCard } from '@/components/StatCard';
import { CrawlLineChart, HttpCodeChart } from '@/components/Charts';
import { formatNumber, formatDate, getHttpCodeColor, getHttpCodeLabel } from '@/lib/utils';

interface DashboardProps {
  client: Client | null;
}

export function Dashboard({ client }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (client) {
      loadStats();
    }
  }, [client, startDate, endDate]);

  const loadStats = async () => {
    if (!client) return;
    setLoading(true);
    try {
      const data = await getDashboardStats(
        client.id,
        startDate || undefined,
        endDate || undefined
      );
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!client) {
    return (
      <div className="text-center py-12 text-text-muted">
        Sélectionnez un client pour voir le dashboard
      </div>
    );
  }

  if (loading && !stats) {
    return (
      <div className="text-center py-12 text-text-muted">Chargement...</div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-text-muted">
        Aucune donnée disponible. Importez des logs pour commencer.
      </div>
    );
  }

  const errorCodes = stats.http_codes.filter((c) => c.code >= 400);
  const totalErrors = errorCodes.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="space-y-6">
      {/* Date filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm text-text-muted">Du:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-text-muted">Au:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        {(startDate || endDate) && (
          <button
            onClick={() => {
              setStartDate('');
              setEndDate('');
            }}
            className="text-sm text-primary hover:underline"
          >
            Réinitialiser
          </button>
        )}
        {stats.date_range.start && (
          <span className="text-sm text-text-muted ml-auto">
            Données: {formatDate(stats.date_range.start)} - {formatDate(stats.date_range.end!)}
          </span>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Crawls"
          value={formatNumber(stats.total_crawls)}
          icon={<BarChart3 className="w-6 h-6" />}
        />
        <StatCard
          title="Pages Uniques"
          value={formatNumber(stats.unique_pages)}
          icon={<FileText className="w-6 h-6" />}
        />
        <StatCard
          title="Crawls/Page (moy.)"
          value={
            stats.unique_pages > 0
              ? (stats.total_crawls / stats.unique_pages).toFixed(1)
              : '0'
          }
          icon={<TrendingUp className="w-6 h-6" />}
        />
        <StatCard
          title="Erreurs (4xx/5xx)"
          value={formatNumber(totalErrors)}
          icon={<AlertTriangle className="w-6 h-6" />}
          className={totalErrors > 0 ? 'border-warning' : ''}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Crawl frequency chart */}
        <div className="lg:col-span-2 bg-surface rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-text mb-4">Fréquence de Crawl</h3>
          <CrawlLineChart data={stats.daily_crawls} />
        </div>

        {/* HTTP codes chart */}
        <div className="bg-surface rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-text mb-4">Codes HTTP</h3>
          <HttpCodeChart data={stats.http_codes} />
        </div>
      </div>

      {/* HTTP Code Details */}
      <div className="bg-surface rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-text mb-4">Détail des Codes HTTP</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {stats.http_codes.map((code) => (
            <div
              key={code.code}
              className="p-4 rounded-lg"
              style={{ backgroundColor: `${getHttpCodeColor(code.code)}15` }}
            >
              <div
                className="text-2xl font-bold"
                style={{ color: getHttpCodeColor(code.code) }}
              >
                {code.code}
              </div>
              <div className="text-sm text-text-muted">{getHttpCodeLabel(code.code)}</div>
              <div className="text-sm font-medium mt-1">
                {formatNumber(code.count)} ({code.percentage}%)
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Pages */}
      <div className="bg-surface rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-text mb-4">Top 20 Pages Crawlées</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-text-muted text-sm">
                <th className="pb-3 font-medium">#</th>
                <th className="pb-3 font-medium">URL</th>
                <th className="pb-3 font-medium text-right">Crawls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stats.top_pages.map((page, index) => (
                <tr key={page.url} className="hover:bg-gray-50">
                  <td className="py-3 text-text-muted">{index + 1}</td>
                  <td className="py-3 text-text truncate max-w-md" title={page.url}>
                    {page.url}
                  </td>
                  <td className="py-3 text-right font-medium">
                    {formatNumber(page.count)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
