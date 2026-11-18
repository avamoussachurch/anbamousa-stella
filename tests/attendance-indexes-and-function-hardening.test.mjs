import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('attendance and visitation actor foreign keys have covering indexes', async () => {
  const migration = await read('../supabase/migrations/20261118180615_index_attendance_actor_foreign_keys_and_pin_helpers.sql');
  assert.match(migration, /idx_class_attendance_records_marked_by_fk[\s\S]*ON public\.class_attendance_records \(marked_by\)/);
  assert.match(migration, /idx_class_attendance_sessions_created_by_fk[\s\S]*ON public\.class_attendance_sessions \(created_by\)/);
  assert.match(migration, /idx_class_visitation_logs_created_by_fk[\s\S]*ON public\.class_visitation_logs \(created_by\)/);
});

test('server-only lesson progress and publishing helpers pin their search path', async () => {
  const migration = await read('../supabase/migrations/20261118180615_index_attendance_actor_foreign_keys_and_pin_helpers.sql');
  assert.match(migration, /ALTER FUNCTION public\.publish_lesson_version\(uuid, uuid\)\s+SET search_path = ''/);
  assert.match(migration, /ALTER FUNCTION public\.set_lesson_section_read\(uuid, text, text, text, boolean, integer\)\s+SET search_path = ''/);
});
