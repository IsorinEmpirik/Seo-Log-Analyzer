import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { ImportProgress as ImportProgressType } from '@/lib/api';
import { formatNumber } from '@/lib/utils';

interface ImportProgressProps {
  progress: ImportProgressType;
}

export function ImportProgressBar({ progress }: ImportProgressProps) {
  const isCompleted = progress.status === 'completed';
  const isError = progress.status === 'error';
  const isCounting = progress.status === 'counting';

  return (
    <div
      className={`rounded-xl border p-6 space-y-4 ${
        isCompleted
          ? 'bg-success/5 border-success/30'
          : isError
            ? 'bg-error/5 border-error/30'
            : 'bg-surface border-gray-200'
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-text flex items-center gap-2">
          {isCompleted ? (
            <CheckCircle className="w-5 h-5 text-success" />
          ) : isError ? (
            <AlertCircle className="w-5 h-5 text-error" />
          ) : (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          )}
          {isCompleted
            ? 'Import termine !'
            : isError
              ? 'Erreur lors de l\'import'
              : isCounting
                ? 'Comptage des lignes...'
                : 'Import en cours...'}
        </h3>
        <span className="text-lg font-bold text-primary">
          {progress.percent}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className={`h-3 rounded-full transition-all duration-500 ${
            isCompleted ? 'bg-success' : isError ? 'bg-error' : 'bg-primary'
          }`}
          style={{ width: `${progress.percent}%` }}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <span className="text-text-muted">Lignes traitees</span>
          <div className="font-semibold text-text">
            {formatNumber(progress.processed_lines)} / {formatNumber(progress.total_lines)}
          </div>
        </div>
        <div>
          <span className="text-text-muted">Importees (bots)</span>
          <div className="font-semibold text-success">
            {formatNumber(progress.imported)}
          </div>
        </div>
        <div>
          <span className="text-text-muted">Doublons ignores</span>
          <div className="font-semibold text-warning">
            {formatNumber(progress.skipped_duplicates)}
          </div>
        </div>
        <div>
          <span className="text-text-muted">Filtrees (non-bot)</span>
          <div className="font-semibold text-text-muted">
            {formatNumber(progress.skipped_filtered)}
          </div>
        </div>
      </div>

      {isError && progress.error && (
        <div className="text-sm text-error bg-error/10 p-3 rounded-lg">
          {progress.error}
        </div>
      )}
    </div>
  );
}
