import { useState } from 'react';
import { Check, Sprout, ChevronRight } from 'lucide-react';
import { useApp } from '../AppContext';
import { LANGUAGES } from '../data/languages';
import { Button } from './ui/Button';
import type { LanguageCode } from '../types';

export function LanguageSelect() {
  const { setLanguage, setAuthenticated } = useApp();
  const [selected, setSelected] = useState<LanguageCode | null>(null);

  const handleContinue = () => {
    if (selected) {
      setLanguage(selected);
      setAuthenticated(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-tint via-surface to-surface flex flex-col">
      {/* Brand header */}
      <div className="px-6 pt-16 pb-8 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-brand-deep shadow-brand-glow mb-4">
          <Sprout size={40} className="text-white" strokeWidth={2.2} />
        </div>
        <h1 className="text-3xl font-extrabold text-brand-deep tracking-tight">KisanLink</h1>
        <p className="text-sm text-ink-soft mt-1">Market Intelligence for Farmers</p>
      </div>

      {/* Language grid */}
      <div className="flex-1 px-5 pb-32">
        <div className="max-w-md mx-auto">
          <h2 className="text-base font-bold text-ink mb-1">Select Your Language</h2>
          <p className="text-sm text-ink-soft mb-4">तुमची भाषा निवडा · अपनी भाषा चुनें</p>

          <div className="grid grid-cols-2 gap-2.5">
            {LANGUAGES.map(lang => {
              const isSelected = selected === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => setSelected(lang.code)}
                  className={`relative flex items-center justify-between px-4 py-3.5 rounded-2xl border transition-all duration-200 ${
                    isSelected
                      ? 'border-brand-deep bg-brand-soft shadow-sm'
                      : 'border-line bg-surface-card hover:border-ink-faint'
                  }`}
                >
                  <div className="text-left">
                    <div className="text-base font-bold text-ink">{lang.nativeName}</div>
                    <div className="text-xs text-ink-soft">{lang.name}</div>
                  </div>
                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-brand-deep flex items-center justify-center shrink-0">
                      <Check size={14} className="text-white" strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Continue button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-surface via-surface to-transparent pt-8">
        <div className="max-w-md mx-auto">
          <Button
            size="lg"
            fullWidth
            disabled={!selected}
            onClick={handleContinue}
            className="shadow-brand-glow"
          >
            Continue
            <ChevronRight size={20} />
          </Button>
        </div>
      </div>
    </div>
  );
}
