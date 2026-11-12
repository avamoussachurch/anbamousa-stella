import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const migration = await readFile(new URL('../scripts/migrations/phase22_student_class_change_requests.sql', import.meta.url), 'utf8');
const service = await readFile(new URL('../src/lib/onboardingService.ts', import.meta.url), 'utf8');

test('student class requests are stored in Supabase with student and assigned-teacher read policies', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.student_class_change_requests/);
  assert.match(migration, /student_id = \(SELECT auth\.uid\(\)\)/);
  assert.match(migration, /public\.has_role\('teacher'\)/);
  assert.match(migration, /public\.servant_class_assignments/);
  assert.match(migration, /student_class_change_one_pending_per_year/);
});

test('class request approval updates membership and profile in one database function', () => {
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.review_student_class_change_request/);
  assert.match(migration, /UPDATE public\.class_memberships/);
  assert.match(migration, /INSERT INTO public\.class_memberships/);
  assert.match(migration, /UPDATE public\.profiles\s+SET grade = v_grade/);
  assert.match(migration, /SET status = 'APPROVED'/);
});

test('online onboarding service no longer reports success from server-local request state', () => {
  assert.match(service, /from\('student_class_change_requests'\)/);
  assert.match(service, /review_student_class_change_request/);
  assert.match(service, /if \(isSupabaseConfigured\) \{/);
});
