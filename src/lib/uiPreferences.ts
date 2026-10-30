import { Language } from '../types';

export type AppTheme = 'light' | 'dark';

export interface ThemeDocumentRoot {
  classList: Pick<DOMTokenList, 'toggle'>;
  setAttribute(name: string, value: string): void;
  style: Pick<CSSStyleDeclaration, 'colorScheme'>;
}

export function resolveInitialTheme(savedTheme: string | null): AppTheme {
  return savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'dark';
}

export function getLanguageDirection(lang: Language): 'ltr' | 'rtl' {
  return lang === 'ar' ? 'rtl' : 'ltr';
}

export function applyLanguagePreference(
  root: Pick<HTMLElement, 'setAttribute'>,
  lang: Language
): void {
  root.setAttribute('dir', getLanguageDirection(lang));
  root.setAttribute('lang', lang === 'copt' ? 'cop' : lang);
}

export function applyThemePreference(
  root: ThemeDocumentRoot,
  theme: AppTheme
): void {
  root.classList.toggle('dark', theme === 'dark');
  root.setAttribute('data-theme', theme);
  root.style.colorScheme = theme;
}
