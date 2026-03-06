import { useState, useEffect } from 'react';
import { BarChart3, FileText, AlertTriangle, TrendingUp, Clock, RefreshCw } from 'lucide-react';
import { getDashboardStats, getBotFamilies, DashboardStats, BotFamily, Client } from '@/lib/api';
import { StatCard } from '@/components/StatCard';
import { BotFilter } from '@/components/BotFilter';
import { PageTypeFilter } from '@/components/PageTypeFilter';
import { CrawlLineChart, HttpCodeChart } from '@/components/Charts';
import { formatNumber, formatDate, getHttpCodeColor, getHttpCodeLabel } from '@/lib/utils';

interface DashboardProps {
  client: Client | null;
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-primary" />
    </div>
  );
}

export function Dashboard({ client }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [botFamilies, setBotFamilies] = useState<BotFamily[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);
  const [selectedBot, setSelectedBot] = useState<string | null>(null);
  const [pageType, setPageType] = useState<string | undefined>(undefined);
  const [hasUnapplied, setHasUnapplied] = useState(false);

  useEffect(() => {
    getBotFamilies().then(setBotFamilies).catch(() => {});
  }, []);

  // Auto-load only on client change
  useEffect(() => {
    if (client) {
      loadStats();
      setHasUnapplied(false);
    }
  }, [client]);

  const loadStats = async () => {
    if (!client) return;
    setLoading(true);
    try {
      const data = await getDashboardStats(
        client.id,
        startDate || undefined,
        endDate || undefined,
        selectedFamily || undefined,
        selectedBot || undefined,
        pageType,
      );
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = () => {
    setHasUnapplied(false);
    loadStats();
  };

  const markUnapplied = () => setHasUnapplied(true);

  if (!client) {
    return (
      <div className="text-center py-12 text-text-muted">
        Selectionnez un client pour voir le dashboard
      </div>
    );
  }

  if (loading && !stats) {
    return <Spinner />;
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-text-muted">
        Aucune donnee disponible. Importez des logs pour commencer.
      </div>
    );
  }

  const errorCodes = stats.http_codes.filter((c) => c.code >= 400);
  const totalErrors = errorCodes.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <BotFilter
          families={botFamilies}
          selectedFamily={selectedFamily}
          selectedBot={selectedBot}
          onFamilyChange={(v) => { setSelectedFamily(v); markUnapplied(); }}
          onBotChange={(v) => { setSelectedBot(v); markUnapplied(); }}
        />
        <PageTypeFilter
          client={client}
          value={pageType}
          onChange={(v) => { setPageType(v); markUnapplied(); }}
        />
        <div className="flex items-center gap-2">
          <label className="text-sm text-text-muted">Du:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); markUnapplied(); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-text-muted">Au:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); markUnapplied(); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        {(startDate || endDate) && (
          <button
            onClick={() => { setStartDate(''); setEndDate(''); markUnapplied(); }}
            className="text-sm text-primary hover:underline"
          >
            Reset dates
          </button>
        )}

        {/* Appliquer button + spinner */}
        <div className="flex items-center gap-2 ml-auto">
          {stats.date_range.start && (
            <span className="text-sm text-text-muted">
              Données: {formatDate(stats.date_range.start)} - {formatDate(stats.date_range.end!)}
            </span>
          )}
          {loading && (
            <div className="animate-spin h-4 w-4 rounded-full border-2 border-gray-200 border-t-primary" />
          )}
          <button
            onClick={handleValidate}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-60 ${
              hasUnapplied
                ? 'bg-primary text-white shadow-md ring-2 ring-primary/20 hover:bg-primary/90'
                : 'bg-primary text-white hover:bg-primary/90'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Appliquer
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Crawls"
          value={formatNumber(stats.total_crawls)}
          icon={<BarChart3 className="w-6 h-6" />}
        />
        <StatCard
          title="Pages Crawlées"
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
          title="Crawlee tous les"
          value={
            stats.avg_crawl_interval != null
              ? `${stats.avg_crawl_interval} j`
              : '-'
          }
          subtitle="Intervalle moyen par page"
          icon={<Clock className="w-6 h-6" />}
        />
        <StatCard
          title="Erreurs (4xx/5xx)"
          value={formatNumber(totalErrors)}
          icon={<AlertTriangle className="w-6 h-6" />}
          className={totalErrors > 0 ? 'border-warning' : ''}
        />
      </div>

      {/* Crawl Frequency - full width */}
      <div className="bg-surface rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-text mb-4">Frequence de Crawl</h3>
        <CrawlLineChart data={stats.daily_crawls} />
      </div>

      {/* HTTP Codes bar chart - full width */}
      <div className="bg-surface rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-text mb-4">Distribution des Codes HTTP</h3>
        <HttpCodeChart data={stats.http_codes} />
      </div>

      {/* HTTP Code Details */}
      <div className="bg-surface rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-text mb-4">Detail des Codes HTTP</h3>
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
        <h3 className="font-semibold text-text mb-4">Top 20 Pages Crawlees</h3>
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
