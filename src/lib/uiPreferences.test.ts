import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  applyLanguagePreference,
  applyThemePreference,
  getLanguageDirection,
  resolveInitialTheme
} from './uiPreferences';

function createRoot() {
  const attributes = new Map<string, string>();
  const classes = new Set<string>();
  return {
    attributes,
    classes,
    style: { colorScheme: '' },
    classList: {
      toggle(name: string, enabled?: boolean) {
        const shouldEnable = enabled ?? !classes.has(name);
        if (shouldEnable) classes.add(name);
        else classes.delete(name);
        return shouldEnable;
      }
    },
    setAttribute(name: string, value: string) {
      attributes.set(name, value);
    }
  };
}

test('theme preference defaults to dark and preserves an explicit saved choice', () => {
  assert.equal(resolveInitialTheme(null), 'dark');
  assert.equal(resolveInitialTheme('unrecognized'), 'dark');
  assert.equal(resolveInitialTheme('light'), 'light');
  assert.equal(resolveInitialTheme('dark'), 'dark');
});

test('theme switching synchronizes the theme attribute, color scheme, and dark utility class', () => {
  const root = createRoot();
  applyThemePreference(root, 'dark');
  assert.equal(root.attributes.get('data-theme'), 'dark');
  assert.equal(root.style.colorScheme, 'dark');
  assert.equal(root.classes.has('dark'), true);

  applyThemePreference(root, 'light');
  assert.equal(root.attributes.get('data-theme'), 'light');
  assert.equal(root.style.colorScheme, 'light');
  assert.equal(root.classes.has('dark'), false);
});

test('direction follows Arabic, English, and Coptic language selections', () => {
  assert.equal(getLanguageDirection('ar'), 'rtl');
  assert.equal(getLanguageDirection('en'), 'ltr');
  assert.equal(getLanguageDirection('cop'), 'ltr');
  assert.equal(getLanguageDirection('copt'), 'ltr');

  const root = createRoot();
  applyLanguagePreference(root, 'ar');
  assert.equal(root.attributes.get('dir'), 'rtl');
  assert.equal(root.attributes.get('lang'), 'ar');
  applyLanguagePreference(root, 'en');
  assert.equal(root.attributes.get('dir'), 'ltr');
  assert.equal(root.attributes.get('lang'), 'en');
  applyLanguagePreference(root, 'copt');
  assert.equal(root.attributes.get('dir'), 'ltr');
  assert.equal(root.attributes.get('lang'), 'cop');
});

test('main and quick navigation expose localized landmarks and selected destinations', async () => {
  const [bottomNav, topBar, styles] = await Promise.all([
    readFile(new URL('../components/layout/BottomNav.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/layout/TopBar.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../index.css', import.meta.url), 'utf8')
  ]);
  assert.match(bottomNav, /aria-label=\{lang === 'ar' \? 'التنقل الرئيسي' : 'Main navigation'\}/);
  assert.match(bottomNav, /aria-current=\{isActive \? 'page' : undefined\}/);
  assert.match(topBar, /aria-label=\{lang === 'ar' \? 'روابط سريعة' : 'Quick links'\}/);
  assert.match(topBar, /aria-expanded=\{showLangMenu\}/);
  assert.match(styles, /--state-selected:/);
  assert.match(styles, /:focus-visible/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
});
