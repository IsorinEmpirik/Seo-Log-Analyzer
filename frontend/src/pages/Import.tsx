import { useState, useEffect, useCallback } from 'react';
import { Upload, FileSpreadsheet, Terminal, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import {
  uploadLogs, uploadLogFile, uploadScreamingFrog,
  getImports, deleteImport, subscribeToImportProgress,
  ImportFile, ImportProgress, Client,
} from '@/lib/api';
import { formatDateTime, formatNumber } from '@/lib/utils';
import { ImportProgressBar } from '@/components/ImportProgress';

interface ImportProps {
  client: Client | null;
}

export function Import({ client }: ImportProps) {
  const [imports, setImports] = useState<ImportFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);

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

  const handleUpload = async (file: File, type: 'logs' | 'log_file' | 'screaming_frog') => {
    if (!client) return;

    setUploading(true);
    setMessage(null);

    try {
      if (type === 'log_file') {
        // Streaming import with SSE progress
        const result = await uploadLogFile(client.id, file);
        setUploading(false);

        // Subscribe to progress
        subscribeToImportProgress(
          result.import_id,
          (progress) => {
            setImportProgress(progress);
            if (progress.status === 'completed') {
              setMessage({
                type: 'success',
                text: `Import termine : ${formatNumber(progress.imported)} logs importes`,
              });
              loadImports();
              setTimeout(() => setImportProgress(null), 5000);
            } else if (progress.status === 'error') {
              setMessage({
                type: 'error',
                text: progress.error || 'Erreur lors de l\'import',
              });
              setTimeout(() => setImportProgress(null), 10000);
            }
          },
          (error) => {
            setMessage({ type: 'error', text: error });
            setImportProgress(null);
          },
        );

        return;
      }

      const result =
        type === 'logs'
          ? await uploadLogs(client.id, file)
          : await uploadScreamingFrog(client.id, file);

      setMessage({
        type: 'success',
        text: result.message || 'Import reussi !',
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logs' | 'log_file' | 'screaming_frog') => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file, type);
    }
    e.target.value = '';
  };

  const handleDrop = useCallback(
    (e: React.DragEvent, type: 'logs' | 'log_file' | 'screaming_frog') => {
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
    if (!confirm('Supprimer cet import et ses donnees ?')) return;

    try {
      await deleteImport(fileId);
      setImports(imports.filter((i) => i.id !== fileId));
    } catch (error) {
      console.error('Failed to delete import:', error);
    }
  };

  const getFileTypeLabel = (fileType: string) => {
    switch (fileType) {
      case 'log_file': return 'Fichier .log';
      case 'logs': return 'Excel';
      case 'screaming_frog': return 'Screaming Frog';
      default: return fileType;
    }
  };

  const getFileTypeBadgeClass = (fileType: string) => {
    switch (fileType) {
      case 'log_file': return 'bg-purple-50 text-purple-600';
      case 'logs': return 'bg-primary-50 text-primary';
      case 'screaming_frog': return 'bg-success/10 text-success';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (!client) {
    return (
      <div className="text-center py-12 text-text-muted">
        Selectionnez un client pour importer des fichiers
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

      {/* Import Progress */}
      {importProgress && (
        <ImportProgressBar progress={importProgress} />
      )}

      {/* Upload zones */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Log file upload */}
        <div
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            dragOver === 'log_file'
              ? 'border-purple-500 bg-purple-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver('log_file');
          }}
          onDragLeave={() => setDragOver(null)}
          onDrop={(e) => handleDrop(e, 'log_file')}
        >
          <input
            type="file"
            accept=".log,.txt,.csv"
            onChange={(e) => handleFileChange(e, 'log_file')}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={uploading || importProgress?.status === 'importing'}
          />
          <Terminal className="w-12 h-12 mx-auto text-purple-500 mb-4" />
          <h3 className="font-semibold text-text mb-2">Fichier Log serveur</h3>
          <p className="text-sm text-text-muted mb-4">
            Apache/Nginx (.log, .txt, .csv) - Gros fichiers OK
          </p>
          <span className="inline-block px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium">
            {uploading ? 'Upload en cours...' : 'Choisir un fichier'}
          </span>
        </div>

        {/* Excel logs upload */}
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
          <h3 className="font-semibold text-text mb-2">Logs Excel</h3>
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
                  <th className="pb-3 font-medium">Lignes</th>
                  <th className="pb-3 font-medium">Statut</th>
                  <th className="pb-3 font-medium">Date d'import</th>
                  <th className="pb-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {imports.map((imp) => (
                  <tr key={imp.id} className="hover:bg-gray-50">
                    <td className="py-3 text-text text-sm">{imp.filename}</td>
                    <td className="py-3">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${getFileTypeBadgeClass(imp.file_type)}`}
                      >
                        {getFileTypeLabel(imp.file_type)}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-text-muted">
                      {imp.imported_lines ? (
                        <span title={`Total: ${formatNumber(imp.total_lines || 0)} | Doublons: ${formatNumber(imp.skipped_duplicates || 0)}`}>
                          {formatNumber(imp.imported_lines)}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          imp.status === 'completed'
                            ? 'bg-success/10 text-success'
                            : imp.status === 'error'
                              ? 'bg-error/10 text-error'
                              : imp.status === 'importing'
                                ? 'bg-primary-50 text-primary'
                                : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {imp.status === 'completed' ? 'OK' : imp.status || 'OK'}
                      </span>
                    </td>
                    <td className="py-3 text-text-muted text-sm">
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
