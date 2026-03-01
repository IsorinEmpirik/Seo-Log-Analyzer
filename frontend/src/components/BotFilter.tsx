import { useState, useRef, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { BotFamily } from '@/lib/api';
import { BotLogo, BOT_FAMILY_COLOR } from './BotLogos';

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
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedFamilyData = families.find((f) => f.family === selectedFamily);
  const searchEngines = families.filter((f) => f.type === 'search_engine');
  const llmBots = families.filter((f) => f.type === 'llm');

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function selectFamily(family: string | null) {
    onFamilyChange(family);
    onBotChange(null);
    setOpen(false);
  }

  const color = selectedFamily ? (BOT_FAMILY_COLOR[selectedFamily] ?? '#64748B') : undefined;

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* Family dropdown trigger */}
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white
                     hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
          style={selectedFamily ? { borderColor: `${color}60` } : undefined}
        >
          {selectedFamily ? (
            <>
              <BotLogo family={selectedFamily} size={16} />
              <span className="font-medium" style={{ color }}>
                {selectedFamily}
              </span>
            </>
          ) : (
            <span className="text-text-muted">Tous les bots</span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute z-50 top-full mt-1 left-0 bg-white border border-gray-200 rounded-xl shadow-lg p-3 min-w-[280px]">
            {/* All bots */}
            <button
              type="button"
              onClick={() => selectFamily(null)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm mb-2 transition-colors
                ${!selectedFamily ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-gray-50 text-text-muted'}`}
            >
              <span className="w-4 h-4 rounded bg-gray-200 flex items-center justify-center text-[9px] font-bold text-gray-500">
                ∀
              </span>
              Tous les bots
            </button>

            {/* Search engines */}
            {searchEngines.length > 0 && (
              <>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 px-2 mb-1.5">
                  Moteurs de recherche
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {searchEngines.map((f) => (
                    <FamilyLogoButton
                      key={f.family}
                      family={f.family}
                      selected={selectedFamily === f.family}
                      onClick={() => selectFamily(f.family)}
                    />
                  ))}
                </div>
              </>
            )}

            {/* LLM / AI */}
            {llmBots.length > 0 && (
              <>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 px-2 mb-1.5">
                  LLM / IA
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {llmBots.map((f) => (
                    <FamilyLogoButton
                      key={f.family}
                      family={f.family}
                      selected={selectedFamily === f.family}
                      onClick={() => selectFamily(f.family)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Sub-bot dropdown (if family selected and has multiple bots) */}
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

      {/* Clear */}
      {(selectedFamily || selectedBot) && (
        <button
          onClick={() => {
            onFamilyChange(null);
            onBotChange(null);
          }}
          className="p-2 text-gray-400 hover:text-error transition-colors"
          title="Réinitialiser les filtres"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

interface FamilyLogoButtonProps {
  family: string;
  selected: boolean;
  onClick: () => void;
}

function FamilyLogoButton({ family, selected, onClick }: FamilyLogoButtonProps) {
  const color = BOT_FAMILY_COLOR[family] ?? '#64748B';
  return (
    <button
      type="button"
      onClick={onClick}
      title={family}
      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-all border
        ${selected
          ? 'border-transparent text-white font-medium shadow-sm'
          : 'border-gray-100 hover:border-gray-200 bg-gray-50 hover:bg-gray-100 text-text'
        }`}
      style={selected ? { backgroundColor: color, borderColor: color } : undefined}
    >
      <BotLogo family={family} size={14} />
      <span>{family}</span>
    </button>
  );
}
