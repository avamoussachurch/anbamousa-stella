import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const auth = readFileSync(new URL('../src/context/AuthContext.tsx', import.meta.url), 'utf8');
const server = readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
const parent = readFileSync(new URL('../src/components/parent/ParentDashboard.tsx', import.meta.url), 'utf8');
const parentHome = readFileSync(new URL('../src/components/parent/ParentHomeDashboard.tsx', import.meta.url), 'utf8');

test('active learning time pauses for hidden tabs and unattended sessions', () => {
  assert.match(auth, /document\.hidden/);
  assert.match(auth, /lastScreenActivityAtRef/);
  assert.match(auth, /Date\.now\(\) - lastScreenActivityAtRef\.current <= 120000/);
  assert.match(auth, /pointerdown/);
  assert.match(auth, /keydown/);
  assert.match(auth, /touchstart/);
  assert.match(auth, /wheel/);
  assert.match(auth, /!element\.paused && !element\.ended/);
});

test('active learning time persists with the Cairo date and is reset on a new day', () => {
  assert.match(auth, /const cairoDate = getCairoDateString\(\)/);
  assert.match(auth, /screen_time_today_seconds: nextDailySeconds/);
  assert.match(auth, /screen_time_date: cairoDate/);
  assert.match(auth, /prev\.screenTimeDate === cairoDate/);
});

test('parent workspace reads only the linked child active-time field for today', () => {
  assert.match(server, /screen_time_today_seconds, screen_time_date/);
  assert.match(server, /profile\.screen_time_date === todayCairo \? Math\.floor/);
  assert.match(parent, /child\.screenTimeTodayMinutes/);
  assert.match(parentHome, /child\.screenTimeTodayMinutes/);
});
