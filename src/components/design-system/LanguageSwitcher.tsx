import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { Language, Locale } from '../../types';
import { LANGUAGE_CONFIGS, normalizeLocale } from '../../localization/i18n';

interface LanguageSwitcherProps {
  lang: Language;
  setLang: (l: Language) => void;
  compact?: boolean;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  lang,
  setLang,
  compact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const currentLocale = normalizeLocale(lang);
  const currentConfig = LANGUAGE_CONFIGS[currentLocale];

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectLanguage = (code: Locale) => {
    setLang(code);
    setIsOpen(false);

    // Apply document-level language & directionality dynamically
    const dir = code === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', code);
  };

  const options: { code: Locale; label: string; sub: string; symbol: string; dialect: string }[] = [
    {
      code: 'ar',
      label: 'العربية',
      sub: 'Arabic',
      symbol: '🇪🇬',
      dialect: 'عربي (طقس الكنيسة القبطية الأرثوذكسية)'
    },
    {
      code: 'en',
      label: 'English',
      sub: 'English',
      symbol: '🌐',
      dialect: 'English (Coptic Orthodox Liturgical Standard)'
    }
  ];

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/25 hover:bg-black/35 text-white border border-white/15 transition-all text-xs font-bold cursor-pointer shadow-xs focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]"
        title="Switch language / اختار اللغة / Ⲥⲱⲧⲡ ⲛ̀ϯⲁⲥⲡⲓ"
      >
        <Globe size={15} className="text-[var(--brand-gold)] shrink-0" />
        <span className="text-sm">{currentConfig.symbol}</span>
        {!compact && (
          <span className="font-semibold hidden sm:inline">{currentConfig.nameNative}</span>
        )}
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Language selection"
          className="absolute right-0 mt-2 w-64 bg-[var(--surface-card)] rounded-2xl shadow-xl border border-[var(--border-stone)] p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-3 py-2 border-b border-[var(--border-stone)] mb-1">
            <p className="text-[11px] font-bold text-[var(--color-neutral)] uppercase tracking-wider">
              Three First-Class Languages
            </p>
            <p className="text-xs font-bold text-[var(--text-ink)]">
              English • العربية • Ⲙⲉⲑⲣⲉⲙⲛ̀ⲭⲏⲙⲓ
            </p>
          </div>

          <div className="space-y-1">
            {options.map((opt) => {
              const isSelected = currentLocale === opt.code;
              return (
                <button
                  key={opt.code}
                  role="menuitem"
                  onClick={() => handleSelectLanguage(opt.code)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-start transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--brand-burgundy)] text-white font-bold shadow-xs'
                      : 'hover:bg-[var(--surface-elevated)] text-[var(--text-ink)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base shrink-0">{opt.symbol}</span>
                    <div>
                      <div className="text-xs font-bold leading-tight">{opt.label}</div>
                      <div
                        className={`text-[10px] ${
                          isSelected ? 'text-white/80' : 'text-[var(--color-neutral)]'
                        }`}
                      >
                        {opt.dialect}
                      </div>
                    </div>
                  </div>
                  {isSelected && <Check size={16} className="text-[var(--brand-gold)] shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
