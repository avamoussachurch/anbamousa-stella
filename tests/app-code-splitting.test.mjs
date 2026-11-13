import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');

test('role workspaces and feature tabs are split into on-demand chunks', () => {
  const lazyScreens = [
    'HomeTab',
    'LessonsTab',
    'PointsTab',
    'FeedTab',
    'ProfileTab',
    'LessonView',
    'TeacherDashboard',
    'ParentDashboard',
    'CopticCalendarTab',
    'HymnsSchoolTab',
    'CopticTaxisTab',
    'AgpeyaPrayerTab',
    'StudentOnboardingModal',
    'AdminWorkspace',
    'RoleAccountProfile'
  ];

  for (const screen of lazyScreens) {
    assert.match(app, new RegExp(`const ${screen} = React\\.lazy\\(\\(\\) => import\\(`), `${screen} should be lazy-loaded`);
  }

  assert.match(app, /<React\.Suspense fallback=\{<WorkspaceLoadingFallback lang=\{lang\} \/>\}>/);
  assert.match(app, /<React\.Suspense fallback=\{null\}>/);
  assert.match(app, /import \{ LoginScreen \} from '\.\/components\/auth\/LoginScreen';/);
});

test('lazy screen fallback stays localized and accessible', () => {
  assert.match(app, /role="status" aria-live="polite"/);
  assert.match(app, /بنجهّز الصفحة/);
  assert.match(app, /Preparing this page/);
});
