import { useState, useEffect } from 'react';
import { Search, ExternalLink, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { getOrphanPages, getBotFamilies, OrphanPage, BotFamily, Client } from '@/lib/api';
import { formatNumber, formatDateTime } from '@/lib/utils';
import { BotFilter } from '@/components/BotFilter';
import { PageTypeFilter } from '@/components/PageTypeFilter';
import { useDebounce } from '@/hooks/useDebounce';

interface OrphanPagesProps {
  client: Client | null;
}

export function OrphanPages({ client }: OrphanPagesProps) {
  const [pages, setPages] = useState<OrphanPage[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [pageType, setPageType] = useState<string | undefined>(undefined);
  const [offset, setOffset] = useState(0);
  const [botFamilies, setBotFamilies] = useState<BotFamily[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);
  const [selectedBot, setSelectedBot] = useState<string | null>(null);
  const limit = 50;

  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    getBotFamilies().then(setBotFamilies).catch(() => {});
  }, []);

  useEffect(() => {
    if (client) {
      setOffset(0);
      loadPages();
    }
  }, [client, debouncedSearch, pageType, selectedFamily, selectedBot]);

  useEffect(() => {
    if (client) {
      loadPages();
    }
  }, [offset]);

  const loadPages = async () => {
    if (!client) return;
    setLoading(true);
    try {
      const data = await getOrphanPages(client.id, {
        botFamily: selectedFamily || undefined,
        crawler: selectedBot || undefined,
        search: debouncedSearch || undefined,
        pageType,
        limit,
        offset,
      });
      setPages(data.orphans);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to load orphan pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  if (!client) {
    return (
      <div className="text-center py-12 text-text-muted">
        Sélectionnez un client pour voir les pages orphelines
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Pages Orphelines</h1>
          <p className="text-text-muted mt-1">
            Pages crawlées par les bots mais absentes de l'export Screaming Frog
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Bot filter */}
          <BotFilter
            families={botFamilies}
            selectedFamily={selectedFamily}
            selectedBot={selectedBot}
            onFamilyChange={setSelectedFamily}
            onBotChange={setSelectedBot}
          />

          {/* Page type filter */}
          <PageTypeFilter
            client={client}
            value={pageType}
            onChange={setPageType}
          />

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Filtrer par URL..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Info box */}
      <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-text">Qu'est-ce qu'une page orpheline ?</p>
          <p className="text-sm text-text-muted mt-1">
            Ce sont des pages qui sont crawlées par Google mais qui ne sont pas liées depuis
            d'autres pages de votre site. Elles peuvent être importantes pour le SEO car elles
            ne reçoivent pas de "link juice" interne.
          </p>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-12 text-text-muted">Chargement...</div>
      ) : total === 0 ? (
        <div className="bg-surface rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-success" />
          </div>
          <h3 className="font-semibold text-text mb-2">
            {!debouncedSearch && !pageType
              ? 'Aucune page orpheline détectée'
              : 'Aucun résultat pour ces filtres'}
          </h3>
          <p className="text-text-muted">
            {!debouncedSearch && !pageType
              ? "Importez un export Screaming Frog pour détecter les pages orphelines."
              : "Essayez d'autres filtres."}
          </p>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm text-text-muted">
              {formatNumber(total)} page(s) orpheline(s) trouvée(s)
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-text-muted text-sm bg-gray-50">
                  <th className="px-4 py-3 font-medium">URL</th>
                  <th className="px-4 py-3 font-medium text-right">Crawls</th>
                  <th className="px-4 py-3 font-medium">Dernier crawl</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pages.map((page) => (
                  <tr key={page.url} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-text truncate max-w-lg" title={page.url}>
                          {page.url}
                        </span>
                        <a
                          href={page.url.startsWith('http') ? page.url : `https://${client.domain}${page.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary-600"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatNumber(page.crawl_count)}
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {page.last_crawl ? formatDateTime(page.last_crawl) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
