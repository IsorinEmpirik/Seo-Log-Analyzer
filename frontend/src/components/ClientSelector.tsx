import { useState, useEffect } from 'react';
import { Plus, Trash2, Building2 } from 'lucide-react';
import { getClients, createClient, deleteClient, Client } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ClientSelectorProps {
  selectedClient: Client | null;
  onSelectClient: (client: Client | null) => void;
}

export function ClientSelector({ selectedClient, onSelectClient }: ClientSelectorProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientDomain, setNewClientDomain] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const data = await getClients();
      setClients(data);
      if (data.length > 0 && !selectedClient) {
        onSelectClient(data[0]);
      }
    } catch (error) {
      console.error('Failed to load clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    try {
      const client = await createClient({
        name: newClientName.trim(),
        domain: newClientDomain.trim() || undefined,
      });
      setClients([...clients, client]);
      onSelectClient(client);
      setNewClientName('');
      setNewClientDomain('');
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to create client:', error);
    }
  };

  const handleDeleteClient = async (id: number) => {
    if (!confirm('Supprimer ce client et toutes ses données ?')) return;

    try {
      await deleteClient(id);
      const updatedClients = clients.filter((c) => c.id !== id);
      setClients(updatedClients);
      if (selectedClient?.id === id) {
        onSelectClient(updatedClients[0] || null);
      }
    } catch (error) {
      console.error('Failed to delete client:', error);
    }
  };

  if (loading) {
    return <div className="text-text-muted">Chargement...</div>;
  }

  return (
    <div className="bg-surface rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-text flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Client
        </h2>
        <button
          onClick={() => setIsCreating(true)}
          className="text-primary hover:text-primary-600 p-1"
          title="Ajouter un client"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Client list */}
      <div className="space-y-1">
        {clients.map((client) => (
          <div
            key={client.id}
            className={cn(
              'flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors',
              selectedClient?.id === client.id
                ? 'bg-primary-50 text-primary'
                : 'hover:bg-gray-50'
            )}
            onClick={() => onSelectClient(client)}
          >
            <div>
              <div className="font-medium">{client.name}</div>
              {client.domain && (
                <div className="text-xs text-text-muted">{client.domain}</div>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClient(client.id);
              }}
              className="text-gray-400 hover:text-error p-1"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {clients.length === 0 && !isCreating && (
          <p className="text-text-muted text-sm text-center py-4">
            Aucun client. Créez-en un pour commencer.
          </p>
        )}
      </div>

      {/* Create form */}
      {isCreating && (
        <form onSubmit={handleCreateClient} className="mt-4 space-y-3">
          <input
            type="text"
            placeholder="Nom du client"
            value={newClientName}
            onChange={(e) => setNewClientName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            autoFocus
          />
          <input
            type="text"
            placeholder="Domaine (optionnel)"
            value={newClientDomain}
            onChange={(e) => setNewClientDomain(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
            >
              Créer
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setNewClientName('');
                setNewClientDomain('');
              }}
              className="px-4 py-2 text-text-muted hover:bg-gray-100 rounded-lg text-sm"
            >
              Annuler
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
