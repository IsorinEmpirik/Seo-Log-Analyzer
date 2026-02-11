import { useState, useEffect } from 'react';
import { ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { comparePeriods, getBotFamilies, PeriodComparison, BotFamily, Client } from '@/lib/api';
import { formatNumber, getHttpCodeColor } from '@/lib/utils';
import { BotFilter } from '@/components/BotFilter';

interface CompareProps {
  client: Client | null;
}

export function Compare({ client }: CompareProps) {
  const [periodAStart, setPeriodAStart] = useState('');
  const [periodAEnd, setPeriodAEnd] = useState('');
  const [periodBStart, setPeriodBStart] = useState('');
  const [periodBEnd, setPeriodBEnd] = useState('');
  const [comparison, setComparison] = useState<PeriodComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [botFamilies, setBotFamilies] = useState<BotFamily[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);
  const [selectedBot, setSelectedBot] = useState<string | null>(null);

  useEffect(() => {
    getBotFamilies().then(setBotFamilies).catch(() => {});
  }, []);

  const handleCompare = async () => {
    if (!client || !periodAStart || !periodAEnd || !periodBStart || !periodBEnd) {
      setError('Veuillez remplir toutes les dates');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await comparePeriods(
        client.id,
        periodAStart,
        periodAEnd,
        periodBStart,
        periodBEnd,
        selectedFamily || undefined,
        selectedBot || undefined,
      );
      setComparison(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la comparaison');
    } finally {
      setLoading(false);
    }
  };

  if (!client) {
    return (
      <div className="text-center py-12 text-text-muted">
        Sélectionnez un client pour comparer des périodes
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text">Comparer des Périodes</h1>
        <p className="text-text-muted mt-1">
          Analysez l'évolution du crawl entre deux périodes
        </p>
      </div>

      {/* Period selection */}
      <div className="bg-surface rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Period A */}
          <div>
            <h3 className="font-semibold text-text mb-4">Période A</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm text-text-muted mb-1">Du</label>
                <input
                  type="date"
                  value={periodAStart}
                  onChange={(e) => setPeriodAStart(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm text-text-muted mb-1">Au</label>
                <input
                  type="date"
                  value={periodAEnd}
                  onChange={(e) => setPeriodAEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Period B */}
          <div>
            <h3 className="font-semibold text-text mb-4">Période B</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm text-text-muted mb-1">Du</label>
                <input
                  type="date"
                  value={periodBStart}
                  onChange={(e) => setPeriodBStart(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm text-text-muted mb-1">Au</label>
                <input
                  type="date"
                  value={periodBEnd}
                  onChange={(e) => setPeriodBEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bot filter */}
        <div className="mt-6">
          <BotFilter
            families={botFamilies}
            selectedFamily={selectedFamily}
            selectedBot={selectedBot}
            onFamilyChange={setSelectedFamily}
            onBotChange={setSelectedBot}
          />
        </div>

        {error && <p className="text-error text-sm mt-4">{error}</p>}

        <button
          onClick={handleCompare}
          disabled={loading}
          className="mt-6 px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-600 transition-colors disabled:opacity-50"
        >
          {loading ? 'Chargement...' : 'Comparer'}
        </button>
      </div>

      {/* Results */}
      {comparison && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Period A stats */}
            <div className="bg-surface rounded-xl border border-gray-200 p-6">
              <h4 className="text-sm text-text-muted mb-2">Période A</h4>
              <p className="text-2xl font-bold text-text">
                {formatNumber(comparison.period_a.total_crawls)}
              </p>
              <p className="text-sm text-text-muted">crawls</p>
              <p className="text-sm mt-2">
                {formatNumber(comparison.period_a.unique_pages)} pages uniques
              </p>
            </div>

            {/* Delta */}
            <div className="bg-surface rounded-xl border border-gray-200 p-6 flex flex-col items-center justify-center">
              <div className="flex items-center gap-2 mb-2">
                <ArrowRight className="w-5 h-5 text-text-muted" />
              </div>
              <div
                className={`flex items-center gap-2 text-2xl font-bold ${
                  comparison.crawl_delta > 0
                    ? 'text-success'
                    : comparison.crawl_delta < 0
                    ? 'text-error'
                    : 'text-text-muted'
                }`}
              >
                {comparison.crawl_delta > 0 ? (
                  <TrendingUp className="w-6 h-6" />
                ) : comparison.crawl_delta < 0 ? (
                  <TrendingDown className="w-6 h-6" />
                ) : (
                  <Minus className="w-6 h-6" />
                )}
                {comparison.crawl_delta > 0 ? '+' : ''}
                {comparison.crawl_delta_percent}%
              </div>
              <p className="text-sm text-text-muted">
                {comparison.crawl_delta > 0 ? '+' : ''}
                {formatNumber(comparison.crawl_delta)} crawls
              </p>
            </div>

            {/* Period B stats */}
            <div className="bg-surface rounded-xl border border-gray-200 p-6">
              <h4 className="text-sm text-text-muted mb-2">Période B</h4>
              <p className="text-2xl font-bold text-text">
                {formatNumber(comparison.period_b.total_crawls)}
              </p>
              <p className="text-sm text-text-muted">crawls</p>
              <p className="text-sm mt-2">
                {formatNumber(comparison.period_b.unique_pages)} pages uniques
              </p>
            </div>
          </div>

          {/* HTTP Codes comparison */}
          <div className="bg-surface rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-text mb-4">Comparaison des Codes HTTP</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Period A codes */}
              <div>
                <h4 className="text-sm text-text-muted mb-3">Période A</h4>
                <div className="space-y-2">
                  {comparison.period_a.http_codes.map((code) => (
                    <div key={code.code} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getHttpCodeColor(code.code) }}
                        />
                        <span className="text-sm font-medium">{code.code}</span>
                      </div>
                      <span className="text-sm text-text-muted">
                        {formatNumber(code.count)} ({code.percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Period B codes */}
              <div>
                <h4 className="text-sm text-text-muted mb-3">Période B</h4>
                <div className="space-y-2">
                  {comparison.period_b.http_codes.map((code) => (
                    <div key={code.code} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getHttpCodeColor(code.code) }}
                        />
                        <span className="text-sm font-medium">{code.code}</span>
                      </div>
                      <span className="text-sm text-text-muted">
                        {formatNumber(code.count)} ({code.percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
