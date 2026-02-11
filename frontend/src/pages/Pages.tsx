import { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { getPages, getBotFamilies, PageStats, BotFamily, Client } from '@/lib/api';
import { formatNumber, formatDateTime, getHttpCodeColor } from '@/lib/utils';
import { BotFilter } from '@/components/BotFilter';

interface PagesProps {
  client: Client | null;
}

const HTTP_CODE_FILTERS = [
  { value: undefined, label: 'Tous' },
  { value: 200, label: '200 OK' },
  { value: 301, label: '301 Redirect' },
  { value: 302, label: '302 Redirect' },
  { value: 404, label: '404 Not Found' },
  { value: 500, label: '5xx Server Error' },
];

export function Pages({ client }: PagesProps) {
  const [pages, setPages] = useState<PageStats[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [httpCode, setHttpCode] = useState<number | undefined>(undefined);
  const [offset, setOffset] = useState(0);
  const [botFamilies, setBotFamilies] = useState<BotFamily[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);
  const [selectedBot, setSelectedBot] = useState<string | null>(null);
  const limit = 50;

  useEffect(() => {
    getBotFamilies().then(setBotFamilies).catch(() => {});
  }, []);

  useEffect(() => {
    if (client) {
      setOffset(0);
      loadPages();
    }
  }, [client, search, httpCode, selectedFamily, selectedBot]);

  useEffect(() => {
    if (client) {
      loadPages();
    }
  }, [offset]);

  const loadPages = async () => {
    if (!client) return;
    setLoading(true);
    try {
      const data = await getPages(client.id, {
        search: search || undefined,
        httpCode,
        limit,
        offset,
        botFamily: selectedFamily || undefined,
        crawler: selectedBot || undefined,
      });
      setPages(data.pages);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to load pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  if (!client) {
    return (
      <div className="text-center py-12 text-text-muted">
        Sélectionnez un client pour voir les pages crawlées
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text">Pages Crawlées</h1>
        <p className="text-text-muted mt-1">
          Liste de toutes les pages visitées par les crawlers
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Rechercher une URL..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Bot filter */}
        <BotFilter
          families={botFamilies}
          selectedFamily={selectedFamily}
          selectedBot={selectedBot}
          onFamilyChange={setSelectedFamily}
          onBotChange={setSelectedBot}
        />

        {/* HTTP Code filter */}
        <select
          value={httpCode ?? ''}
          onChange={(e) => setHttpCode(e.target.value ? Number(e.target.value) : undefined)}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {HTTP_CODE_FILTERS.map((filter) => (
            <option key={filter.label} value={filter.value ?? ''}>
              {filter.label}
            </option>
          ))}
        </select>
      </div>

      {/* Results */}
      <div className="bg-surface rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm text-text-muted">
            {formatNumber(total)} page(s) trouvée(s)
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-text-muted">
                Page {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={currentPage >= totalPages}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-text-muted">Chargement...</div>
        ) : pages.length === 0 ? (
          <div className="text-center py-12 text-text-muted">
            Aucune page trouvée
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-text-muted text-sm bg-gray-50">
                  <th className="px-4 py-3 font-medium">URL</th>
                  <th className="px-4 py-3 font-medium text-center">Code HTTP</th>
                  <th className="px-4 py-3 font-medium text-right">Crawls</th>
                  <th className="px-4 py-3 font-medium text-right">Crawlée tous les</th>
                  <th className="px-4 py-3 font-medium">Dernier crawl</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pages.map((page) => (
                  <tr key={page.url} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="text-text truncate block max-w-lg" title={page.url}>
                        {page.url}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {page.http_code && (
                        <span
                          className="inline-block px-2 py-1 rounded text-xs font-medium"
                          style={{
                            backgroundColor: `${getHttpCodeColor(page.http_code)}20`,
                            color: getHttpCodeColor(page.http_code),
                          }}
                        >
                          {page.http_code}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatNumber(page.crawl_count)}
                    </td>
                    <td className="px-4 py-3 text-right text-text-muted">
                      {page.crawl_interval != null
                        ? `${page.crawl_interval} j`
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {page.last_crawl ? formatDateTime(page.last_crawl) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
