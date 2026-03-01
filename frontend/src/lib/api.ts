const API_BASE = '/api';

// --- Simple in-memory cache to avoid refetching on tab switches ---
const _cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 60_000; // 60 seconds

function getCacheKey(endpoint: string): string {
  return endpoint;
}

function getCached<T>(key: string): T | null {
  const entry = _cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data as T;
  }
  _cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown): void {
  _cache.set(key, { data, timestamp: Date.now() });
}

export function invalidateCache(prefix?: string): void {
  if (prefix) {
    for (const key of _cache.keys()) {
      if (key.startsWith(prefix)) _cache.delete(key);
    }
  } else {
    _cache.clear();
  }
}


async function fetchApi<T>(endpoint: string, options?: RequestInit, retries = 3): Promise<T> {
  // Use cache for GET requests only
  const isGet = !options?.method || options.method === 'GET';
  if (isGet) {
    const cached = getCached<T>(getCacheKey(endpoint));
    if (cached !== null) return cached;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
        // Retry on 500/502/503 (server not ready)
        if (response.status >= 500 && attempt < retries) {
          console.log(`[API] Retry ${attempt}/${retries} for ${endpoint}...`);
          await new Promise((r) => setTimeout(r, attempt * 1000));
          continue;
        }
        throw new Error(error.detail || 'An error occurred');
      }

      const data = await response.json();
      if (isGet) setCache(getCacheKey(endpoint), data);
      return data;
    } catch (error) {
      // Retry on network errors (backend not started yet)
      if (attempt < retries && error instanceof TypeError) {
        console.log(`[API] Backend not ready, retry ${attempt}/${retries}...`);
        await new Promise((r) => setTimeout(r, attempt * 1500));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Server unavailable');
}

// Clients
export const getClients = () => fetchApi<Client[]>('/clients/');
export const createClient = (data: { name: string; domain?: string }) =>
  fetchApi<Client>('/clients/', { method: 'POST', body: JSON.stringify(data) });
export const deleteClient = (id: number) =>
  fetchApi(`/clients/${id}`, { method: 'DELETE' });

// Imports
export const getImports = (clientId: number) =>
  fetchApi<ImportFile[]>(`/imports/${clientId}`);

export const uploadLogs = async (clientId: number, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${API_BASE}/imports/logs/${clientId}`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(error.detail);
  }
  return response.json();
};

export const uploadLogFile = async (clientId: number, file: File): Promise<{ import_id: number; message: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${API_BASE}/imports/log-file/${clientId}`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(error.detail);
  }
  return response.json();
};

export const uploadScreamingFrog = async (clientId: number, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${API_BASE}/imports/screaming-frog/${clientId}`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(error.detail);
  }
  return response.json();
};

export const deleteImport = (fileId: number) => {
  invalidateCache('/stats/');
  return fetchApi(`/imports/${fileId}`, { method: 'DELETE' });
};

export const getBotFamilies = () =>
  fetchApi<BotFamily[]>('/imports/bots/families');

export function subscribeToImportProgress(
  importId: number,
  onProgress: (data: ImportProgress) => void,
  onError: (error: string) => void,
): () => void {
  const eventSource = new EventSource(`${API_BASE}/imports/progress/${importId}`);
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onProgress(data);
    if (data.status === 'completed' || data.status === 'error') {
      eventSource.close();
    }
  };
  eventSource.onerror = () => {
    onError('Connection lost');
    eventSource.close();
  };
  return () => eventSource.close();
}

// Stats
export const getDashboardStats = (
  clientId: number,
  startDate?: string,
  endDate?: string,
  botFamily?: string,
  crawler?: string,
  pageType?: string,
) => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  if (botFamily) params.append('bot_family', botFamily);
  if (crawler) params.append('crawler', crawler);
  if (pageType) params.append('page_type', pageType);
  const query = params.toString() ? `?${params}` : '';
  return fetchApi<DashboardStats>(`/stats/${clientId}/dashboard${query}`);
};

export const getOrphanPages = (clientId: number, options?: {
  botFamily?: string;
  crawler?: string;
  search?: string;
  pageType?: string;
  limit?: number;
  offset?: number;
}) => {
  const params = new URLSearchParams();
  if (options?.botFamily) params.append('bot_family', options.botFamily);
  if (options?.crawler) params.append('crawler', options.crawler);
  if (options?.search) params.append('search', options.search);
  if (options?.pageType) params.append('page_type', options.pageType);
  if (options?.limit) params.append('limit', String(options.limit));
  if (options?.offset) params.append('offset', String(options.offset));
  const query = params.toString() ? `?${params}` : '';
  return fetchApi<{ total: number; orphans: OrphanPage[] }>(`/stats/${clientId}/orphan-pages${query}`);
};

export const getFrequency = (
  clientId: number,
  url?: string,
  groupBy: 'day' | 'week' = 'day',
  botFamily?: string,
  crawler?: string,
  startDate?: string,
  endDate?: string,
) => {
  const params = new URLSearchParams({ group_by: groupBy });
  if (url) params.append('url', url);
  if (botFamily) params.append('bot_family', botFamily);
  if (crawler) params.append('crawler', crawler);
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  return fetchApi<{ period: string; count: number }[]>(`/stats/${clientId}/frequency?${params}`);
};

export const getPages = (clientId: number, options?: {
  httpCode?: number;
  search?: string;
  pageType?: string;
  limit?: number;
  offset?: number;
  botFamily?: string;
  crawler?: string;
  startDate?: string;
  endDate?: string;
}) => {
  const params = new URLSearchParams();
  if (options?.httpCode) params.append('http_code', String(options.httpCode));
  if (options?.search) params.append('search', options.search);
  if (options?.pageType) params.append('page_type', options.pageType);
  if (options?.limit) params.append('limit', String(options.limit));
  if (options?.offset) params.append('offset', String(options.offset));
  if (options?.botFamily) params.append('bot_family', options.botFamily);
  if (options?.crawler) params.append('crawler', options.crawler);
  if (options?.startDate) params.append('start_date', options.startDate);
  if (options?.endDate) params.append('end_date', options.endDate);
  return fetchApi<{ total: number; pages: PageStats[] }>(`/stats/${clientId}/pages?${params}`);
};

export const getDateRange = (clientId: number) =>
  fetchApi<DateRange>(`/stats/${clientId}/date-range`);

export const getPageTypes = (clientId: number) =>
  fetchApi<PageTypeStats[]>(`/stats/${clientId}/page-types`);

export const comparePeriods = (
  clientId: number,
  periodAStart: string,
  periodAEnd: string,
  periodBStart: string,
  periodBEnd: string,
  botFamily?: string,
  crawler?: string,
) => {
  const params = new URLSearchParams({
    period_a_start: periodAStart,
    period_a_end: periodAEnd,
    period_b_start: periodBStart,
    period_b_end: periodBEnd,
  });
  if (botFamily) params.append('bot_family', botFamily);
  if (crawler) params.append('crawler', crawler);
  return fetchApi<PeriodComparison>(`/stats/${clientId}/compare?${params}`);
};

export const getBotDistribution = (clientId: number, startDate?: string, endDate?: string) => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  const query = params.toString() ? `?${params}` : '';
  return fetchApi<BotDistribution>(`/stats/${clientId}/bot-distribution${query}`);
};

// Types
export interface Client {
  id: number;
  name: string;
  domain?: string;
  created_at: string;
}

export interface ImportFile {
  id: number;
  client_id: number;
  filename: string;
  file_type: string;
  imported_at: string;
  total_lines?: number;
  imported_lines?: number;
  skipped_duplicates?: number;
  skipped_filtered?: number;
  status?: string;
  error_message?: string;
}

export interface BotFamily {
  family: string;
  type: string;
  color: string;
  bots: string[];
}

export interface ImportProgress {
  import_id: number;
  status: 'waiting' | 'counting' | 'importing' | 'completed' | 'error';
  total_lines: number;
  processed_lines: number;
  imported: number;
  skipped_duplicates: number;
  skipped_filtered: number;
  percent: number;
  error: string | null;
}

export interface BotDistribution {
  families: { family: string; count: number }[];
  bots: { bot: string; family: string; count: number }[];
}

export interface HttpCodeStats {
  code: number;
  count: number;
  percentage: number;
}

export interface DailyCrawlStats {
  date: string;
  count: number;
}

export interface TopPageStats {
  url: string;
  count: number;
}

export interface DashboardStats {
  total_crawls: number;
  unique_pages: number;
  avg_crawl_interval: number | null;
  date_range: { start: string | null; end: string | null };
  http_codes: HttpCodeStats[];
  daily_crawls: DailyCrawlStats[];
  top_pages: TopPageStats[];
}

export interface OrphanPage {
  url: string;
  crawl_count: number;
  last_crawl?: string;
}

export interface PageStats {
  url: string;
  crawl_count: number;
  last_crawl?: string;
  http_code?: number;
  crawl_interval?: number;
}

export interface PageTypeStats {
  type: string;
  count: number;
}

export interface DateRange {
  min_date: string | null;
  max_date: string | null;
}

export interface PeriodComparison {
  period_a: {
    period: string;
    total_crawls: number;
    unique_pages: number;
    http_codes: HttpCodeStats[];
  };
  period_b: {
    period: string;
    total_crawls: number;
    unique_pages: number;
    http_codes: HttpCodeStats[];
  };
  crawl_delta: number;
  crawl_delta_percent: number;
}
