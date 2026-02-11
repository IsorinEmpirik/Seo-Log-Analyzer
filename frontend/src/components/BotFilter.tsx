import { X } from 'lucide-react';
import { BotFamily } from '@/lib/api';

interface BotFilterProps {
  families: BotFamily[];
  selectedFamily: string | null;
  selectedBot: string | null;
  onFamilyChange: (family: string | null) => void;
  onBotChange: (bot: string | null) => void;
}

export function BotFilter({
  families,
  selectedFamily,
  selectedBot,
  onFamilyChange,
  onBotChange,
}: BotFilterProps) {
  const selectedFamilyData = families.find((f) => f.family === selectedFamily);

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <select
        value={selectedFamily ?? ''}
        onChange={(e) => {
          const val = e.target.value || null;
          onFamilyChange(val);
          onBotChange(null);
        }}
        className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white
                   focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
      >
        <option value="">Tous les bots</option>
        <optgroup label="Moteurs de recherche">
          {families
            .filter((f) => f.type === 'search_engine')
            .map((f) => (
              <option key={f.family} value={f.family}>
                {f.family}
              </option>
            ))}
        </optgroup>
        <optgroup label="LLM / IA">
          {families
            .filter((f) => f.type === 'llm')
            .map((f) => (
              <option key={f.family} value={f.family}>
                {f.family}
              </option>
            ))}
        </optgroup>
      </select>

      {selectedFamily && selectedFamilyData && selectedFamilyData.bots.length > 1 && (
        <select
          value={selectedBot ?? ''}
          onChange={(e) => onBotChange(e.target.value || null)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white
                     focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="">Tous ({selectedFamily})</option>
          {selectedFamilyData.bots.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      )}

      {(selectedFamily || selectedBot) && (
        <button
          onClick={() => {
            onFamilyChange(null);
            onBotChange(null);
          }}
          className="p-2 text-gray-400 hover:text-error transition-colors"
          title="Reinitialiser les filtres"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
