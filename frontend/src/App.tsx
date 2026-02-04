import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { ClientSelector } from '@/components/ClientSelector';
import { Dashboard } from '@/pages/Dashboard';
import { Pages } from '@/pages/Pages';
import { OrphanPages } from '@/pages/OrphanPages';
import { Compare } from '@/pages/Compare';
import { Import } from '@/pages/Import';
import { Client } from '@/lib/api';

export default function App() {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  return (
    <Layout>
      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0">
          <ClientSelector
            selectedClient={selectedClient}
            onSelectClient={setSelectedClient}
          />
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <Routes>
            <Route path="/" element={<Dashboard client={selectedClient} />} />
            <Route path="/pages" element={<Pages client={selectedClient} />} />
            <Route path="/orphans" element={<OrphanPages client={selectedClient} />} />
            <Route path="/compare" element={<Compare client={selectedClient} />} />
            <Route path="/import" element={<Import client={selectedClient} />} />
          </Routes>
        </div>
      </div>
    </Layout>
  );
}
