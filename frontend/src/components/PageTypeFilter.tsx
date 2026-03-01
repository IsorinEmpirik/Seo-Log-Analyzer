import { useEffect, useState } from 'react';
import { getPageTypes, PageTypeStats, Client } from '@/lib/api';
import { getPageTypeLabel } from '@/lib/utils';

interface PageTypeFilterProps {
  client: Client | null;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

export function PageTypeFilter({ client, value, onChange }: PageTypeFilterProps) {
  const [pageTypes, setPageTypes] = useState<PageTypeStats[]>([]);

  useEffect(() => {
    if (client) {
      getPageTypes(client.id).then(setPageTypes).catch(() => {});
    }
  }, [client]);

  if (pageTypes.length === 0) return null;

  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || undefined)}
      className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white
                 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
    >
      <option value="">Tous les types</option>
      {pageTypes.map((pt) => (
        <option key={pt.type} value={pt.type}>
          {getPageTypeLabel(pt.type)} ({pt.count})
        </option>
      ))}
    </select>
  );
}
