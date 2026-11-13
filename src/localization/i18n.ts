import { Locale, Language } from '../types';
import { TRANSLATION_REGISTRY } from './registry';
import { I18N_DICTIONARY } from '../lib/i18n';

export interface LanguageConfig {
  code: Locale;
  canonicalCode: string;
  nameEn: string;
  nameNative: string;
  churchContext: string;
  direction: 'ltr' | 'rtl';
  symbol: string;
  fontClass: string;
}

export const LANGUAGE_CONFIGS: Record<Locale, LanguageConfig> = {
  ar: {
    code: 'ar',
    canonicalCode: 'ar',
    nameEn: 'Arabic',
    nameNative: 'العربية',
    churchContext: 'عربي (طقس الكنيسة القبطية الأرثوذكسية)',
    direction: 'rtl',
    symbol: '🇪🇬',
    fontClass: 'arabic-ui'
  },
  en: {
    code: 'en',
    canonicalCode: 'en',
    nameEn: 'English',
    nameNative: 'English',
    churchContext: 'English (Coptic Orthodox Liturgical Standard)',
    direction: 'ltr',
    symbol: '🌐',
    fontClass: 'english-ui'
  },
  cop: {
    code: 'cop',
    canonicalCode: 'cop',
    nameEn: 'Bohairic Coptic',
    nameNative: 'Ϯⲁⲥⲡⲓ ⲛ̀ⲣⲉⲙⲛ̀ⲭⲏⲙⲓ',
    churchContext: 'Bohairic Coptic (اللغة القبطية الكنسية البحيرية)',
    direction: 'ltr',
    symbol: '☥',
    fontClass: 'coptic-ui'
  }
};

/**
 * Normalizes any language code ('copt' or 'cop') to canonical Locale
 */
export function normalizeLocale(lang: Language | string): Locale {
  if (lang === 'ar') return 'ar';
  if (lang === 'copt' || lang === 'cop') return 'cop';
  return 'en';
}

/**
 * Returns text direction ('rtl' for Arabic, 'ltr' for English & Bohairic Coptic)
 */
export function getDirection(lang: Language | string): 'ltr' | 'rtl' {
  const norm = normalizeLocale(lang);
  return norm === 'ar' ? 'rtl' : 'ltr';
}

/**
 * Returns font-family CSS class or style for a specific language and role
 */
export function getFontFamilyClass(lang: Language | string, role: 'ui' | 'sacred' = 'ui'): string {
  const norm = normalizeLocale(lang);
  if (norm === 'cop') {
    return role === 'sacred' ? 'coptic-sacred' : 'coptic-ui';
  }
  if (norm === 'ar') {
    return role === 'sacred' ? 'arabic-sacred' : 'arabic-ui';
  }
  return 'english-ui';
}

/**
 * Centralized translation retrieval function
 * Strictly never falls back to English when Arabic or Coptic is selected.
 */
export function t(key: string, lang: Language | string): string {
  const norm = normalizeLocale(lang);

  // 1. Look in the verified Coptic Orthodox Translation Registry
  const registryEntry = TRANSLATION_REGISTRY[key];
  if (registryEntry) {
    if (norm === 'cop' && registryEntry.cop) return registryEntry.cop;
    if (norm === 'ar' && registryEntry.ar) return registryEntry.ar;
    if (norm === 'en' && registryEntry.en) return registryEntry.en;
  }

  // 2. Look in the legacy I18N dictionary for backwards compatibility
  const legacyEntry = I18N_DICTIONARY[key];
  if (legacyEntry) {
    if (norm === 'cop' && (legacyEntry.copt || (legacyEntry as any).cop)) {
      return legacyEntry.copt || (legacyEntry as any).cop;
    }
    if (norm === 'ar' && legacyEntry.ar) return legacyEntry.ar;
    if (norm === 'en' && legacyEntry.en) return legacyEntry.en;
  }

  // 3. Never expose raw translation keys to end users.
  // Arabic uses a friendly Egyptian Arabic notice; English remains clear and complete.
  if (norm === 'ar') return 'النص ده لسه مش مترجم';
  if (norm === 'en') return 'Translation not available';
  return key;
}

/**
 * React hook helper for translations
 */
export function useTranslation(lang: Language | string) {
  const locale = normalizeLocale(lang);
  const dir = getDirection(locale);
  const config = LANGUAGE_CONFIGS[locale];

  return {
    t: (key: string) => t(key, locale),
    locale,
    dir,
    config,
    isRTL: dir === 'rtl',
    isCoptic: locale === 'cop'
  };
}
