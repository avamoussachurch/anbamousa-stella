import type { Language } from '../../types';

interface LanguageSettingsProps {
  lang: Language;
  setLang: (lang: Language) => void;
}

export function LanguageSettings({ lang, setLang }: LanguageSettingsProps) {
  const isArabic = lang === 'ar';

  return (
    <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-secondary)]/50 p-4">
      <div className="mb-3">
        <h3 className="font-black text-[var(--text-primary)]">{isArabic ? 'اللغة' : 'Language'}</h3>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          {isArabic ? 'اختار اللغة اللي تحب تستخدمها. شكل وترتيب الموقع هيفضل زي ما هو.' : 'Choose your language. The app layout and navigation stay in the same place.'}
        </p>
      </div>
      <div role="group" aria-label={isArabic ? 'اختيار اللغة' : 'Choose language'} className="grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-pressed={lang === 'ar'}
          onClick={() => setLang('ar')}
          className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-black transition-colors ${lang === 'ar' ? 'border-[var(--action-primary)] bg-[var(--state-selected)] text-[var(--action-primary)]' : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--state-hover)]'}`}
        >
          العربية
        </button>
        <button
          type="button"
          aria-pressed={lang === 'en'}
          onClick={() => setLang('en')}
          className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-black transition-colors ${lang === 'en' ? 'border-[var(--action-primary)] bg-[var(--state-selected)] text-[var(--action-primary)]' : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--state-hover)]'}`}
        >
          English
        </button>
      </div>
    </section>
  );
}
