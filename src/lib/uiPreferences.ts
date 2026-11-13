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
  // Keep the app's spatial layout anchored RTL. Switching to English changes copy and
  // language metadata, not the position/order of navigation, panels, or game-world UI.
  root.setAttribute('dir', 'rtl');
  root.setAttribute('lang', lang === 'copt' ? 'cop' : lang);
  root.setAttribute('data-language', lang === 'copt' ? 'cop' : lang);
}

export function applyThemePreference(
  root: ThemeDocumentRoot,
  theme: AppTheme
): void {
  root.classList.toggle('dark', theme === 'dark');
  root.setAttribute('data-theme', theme);
  root.style.colorScheme = theme;
}
