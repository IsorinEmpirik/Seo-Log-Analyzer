const API_BASE = '/api';

async function fetchApi<T>(endpoint: string, options?: RequestInit, retries = 3): Promise<T> {
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

      return response.json();
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

export const deleteImport = (fileId: number) =>
  fetchApi(`/imports/${fileId}`, { method: 'DELETE' });

// Stats
export const getDashboardStats = (clientId: number, startDate?: string, endDate?: string) => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  const query = params.toString() ? `?${params}` : '';
  return fetchApi<DashboardStats>(`/stats/${clientId}/dashboard${query}`);
};

export const getOrphanPages = (clientId: number) =>
  fetchApi<OrphanPage[]>(`/stats/${clientId}/orphan-pages`);

export const getFrequency = (clientId: number, url?: string, groupBy: 'day' | 'week' = 'day') => {
  const params = new URLSearchParams({ group_by: groupBy });
  if (url) params.append('url', url);
  return fetchApi<{ period: string; count: number }[]>(`/stats/${clientId}/frequency?${params}`);
};

export const getPages = (clientId: number, options?: {
  httpCode?: number;
  search?: string;
  limit?: number;
  offset?: number;
}) => {
  const params = new URLSearchParams();
  if (options?.httpCode) params.append('http_code', String(options.httpCode));
  if (options?.search) params.append('search', options.search);
  if (options?.limit) params.append('limit', String(options.limit));
  if (options?.offset) params.append('offset', String(options.offset));
  return fetchApi<{ total: number; pages: PageStats[] }>(`/stats/${clientId}/pages?${params}`);
};

export const comparePeriods = (
  clientId: number,
  periodAStart: string,
  periodAEnd: string,
  periodBStart: string,
  periodBEnd: string
) => {
  const params = new URLSearchParams({
    period_a_start: periodAStart,
    period_a_end: periodAEnd,
    period_b_start: periodBStart,
    period_b_end: periodBEnd,
  });
  return fetchApi<PeriodComparison>(`/stats/${clientId}/compare?${params}`);
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
