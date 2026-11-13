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

test('language changes preserve the Arabic-first app layout while updating content language metadata', () => {
  assert.equal(getLanguageDirection('ar'), 'rtl');
  assert.equal(getLanguageDirection('en'), 'ltr');
  assert.equal(getLanguageDirection('cop'), 'ltr');
  assert.equal(getLanguageDirection('copt'), 'ltr');

  const root = createRoot();
  applyLanguagePreference(root, 'ar');
  assert.equal(root.attributes.get('dir'), 'rtl');
  assert.equal(root.attributes.get('lang'), 'ar');
  assert.equal(root.attributes.get('data-language'), 'ar');
  applyLanguagePreference(root, 'en');
  assert.equal(root.attributes.get('dir'), 'rtl');
  assert.equal(root.attributes.get('lang'), 'en');
  assert.equal(root.attributes.get('data-language'), 'en');
  applyLanguagePreference(root, 'copt');
  assert.equal(root.attributes.get('dir'), 'rtl');
  assert.equal(root.attributes.get('lang'), 'cop');
  assert.equal(root.attributes.get('data-language'), 'cop');
});

test('main and quick navigation expose localized landmarks and selected destinations', async () => {
  const [bottomNav, topBar, languageSettings, profileTab, roleProfile, roleProfileShared, app, styles] = await Promise.all([
    readFile(new URL('../components/layout/BottomNav.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/layout/TopBar.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/shared/LanguageSettings.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/student/ProfileTab.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/profile/RoleAccountProfile.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/profile/RoleProfileShared.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../App.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../index.css', import.meta.url), 'utf8')
  ]);
  assert.match(bottomNav, /aria-label=\{lang === 'ar' \? 'القائمة الرئيسية' : 'Main navigation'\}/);
  assert.match(bottomNav, /aria-current=\{isActive \? 'page' : undefined\}/);
  assert.match(topBar, /aria-label=\{lang === 'ar' \? 'ارجع للرئيسية' : 'Go to home'\}/);
  assert.match(topBar, /Church notifications, \$\{unreadCount\} unread/);
  assert.doesNotMatch(topBar, /LANGUAGE_OPTIONS|showLangMenu|Choose language/);
  assert.match(languageSettings, /setLang\('ar'\)/);
  assert.match(languageSettings, /setLang\('en'\)/);
  assert.match(profileTab, /<LanguageSettings lang=\{lang\} setLang=\{setLang\} \/>/);
  assert.match(roleProfileShared, /<LanguageSettings lang=\{lang\} setLang=\{setLang\} \/>/);
  assert.match(app, /localStorage\.setItem\('church_app_lang', newLang\)/);
  assert.match(app, /applyLanguagePreference\(document\.documentElement, newLang\)/);
  assert.match(app, /<div\s+dir="rtl"\s+className="min-h-screen relative isolate/);
  assert.doesNotMatch(app, /dir=\{getLanguageDirection\(lang\)\}/);
  assert.match(styles, /--state-selected:/);
  assert.match(styles, /:focus-visible/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
});
