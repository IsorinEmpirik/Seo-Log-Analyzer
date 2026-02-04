import { useState, useEffect, useCallback } from 'react';
import { Upload, FileSpreadsheet, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { uploadLogs, uploadScreamingFrog, getImports, deleteImport, ImportFile, Client } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';

interface ImportProps {
  client: Client | null;
}

export function Import({ client }: ImportProps) {
  const [imports, setImports] = useState<ImportFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  useEffect(() => {
    if (client) {
      loadImports();
    }
  }, [client]);

  const loadImports = async () => {
    if (!client) return;
    try {
      const data = await getImports(client.id);
      setImports(data);
    } catch (error) {
      console.error('Failed to load imports:', error);
    }
  };

  const handleUpload = async (file: File, type: 'logs' | 'screaming_frog') => {
    if (!client) return;

    setUploading(true);
    setMessage(null);

    try {
      const result =
        type === 'logs'
          ? await uploadLogs(client.id, file)
          : await uploadScreamingFrog(client.id, file);

      setMessage({
        type: 'success',
        text: result.message || 'Import réussi !',
      });
      loadImports();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Erreur lors de l\'import',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logs' | 'screaming_frog') => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file, type);
    }
    e.target.value = '';
  };

  const handleDrop = useCallback(
    (e: React.DragEvent, type: 'logs' | 'screaming_frog') => {
      e.preventDefault();
      setDragOver(null);
      const file = e.dataTransfer.files[0];
      if (file) {
        handleUpload(file, type);
      }
    },
    [client]
  );

  const handleDeleteImport = async (fileId: number) => {
    if (!confirm('Supprimer cet import et ses données ?')) return;

    try {
      await deleteImport(fileId);
      setImports(imports.filter((i) => i.id !== fileId));
    } catch (error) {
      console.error('Failed to delete import:', error);
    }
  };

  if (!client) {
    return (
      <div className="text-center py-12 text-text-muted">
        Sélectionnez un client pour importer des fichiers
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Message */}
      {message && (
        <div
          className={`flex items-center gap-2 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-success/10 text-success'
              : 'bg-error/10 text-error'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {message.text}
        </div>
      )}

      {/* Upload zones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Logs upload */}
        <div
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            dragOver === 'logs'
              ? 'border-primary bg-primary-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver('logs');
          }}
          onDragLeave={() => setDragOver(null)}
          onDrop={(e) => handleDrop(e, 'logs')}
        >
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => handleFileChange(e, 'logs')}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={uploading}
          />
          <Upload className="w-12 h-12 mx-auto text-primary mb-4" />
          <h3 className="font-semibold text-text mb-2">Logs Googlebot</h3>
          <p className="text-sm text-text-muted mb-4">
            Fichier Excel (.xlsx) avec un onglet par jour
          </p>
          <span className="inline-block px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium">
            {uploading ? 'Import en cours...' : 'Choisir un fichier'}
          </span>
        </div>

        {/* Screaming Frog upload */}
        <div
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            dragOver === 'sf'
              ? 'border-primary bg-primary-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver('sf');
          }}
          onDragLeave={() => setDragOver(null)}
          onDrop={(e) => handleDrop(e, 'screaming_frog')}
        >
          <input
            type="file"
            accept=".csv"
            onChange={(e) => handleFileChange(e, 'screaming_frog')}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={uploading}
          />
          <FileSpreadsheet className="w-12 h-12 mx-auto text-success mb-4" />
          <h3 className="font-semibold text-text mb-2">Export Screaming Frog</h3>
          <p className="text-sm text-text-muted mb-4">
            Fichier CSV avec colonne "Adresse" (URLs)
          </p>
          <span className="inline-block px-4 py-2 bg-success text-white rounded-lg text-sm font-medium">
            {uploading ? 'Import en cours...' : 'Choisir un fichier'}
          </span>
        </div>
      </div>

      {/* Import history */}
      <div className="bg-surface rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-text mb-4">Historique des imports</h3>
        {imports.length === 0 ? (
          <p className="text-text-muted text-center py-8">
            Aucun import pour ce client
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-text-muted text-sm">
                  <th className="pb-3 font-medium">Fichier</th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Date d'import</th>
                  <th className="pb-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {imports.map((imp) => (
                  <tr key={imp.id} className="hover:bg-gray-50">
                    <td className="py-3 text-text">{imp.filename}</td>
                    <td className="py-3">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          imp.file_type === 'logs'
                            ? 'bg-primary-50 text-primary'
                            : 'bg-success/10 text-success'
                        }`}
                      >
                        {imp.file_type === 'logs' ? 'Logs' : 'Screaming Frog'}
                      </span>
                    </td>
                    <td className="py-3 text-text-muted">
                      {formatDateTime(imp.imported_at)}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleDeleteImport(imp.id)}
                        className="p-2 text-gray-400 hover:text-error transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
