import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  canInitializeHymnsTaxisLevel,
  filterItemsByHymnsTaxisLevel,
  filterTaxisItemsByLevel,
  isValidHymnsTaxisRegistration,
  parseHymnsTaxisLevel
} from '../src/lib/hymnsTaxisLevel';

assert.equal(isValidHymnsTaxisRegistration('Grade 4', 2), true, 'valid registration grade and level should be accepted');
assert.equal(isValidHymnsTaxisRegistration('Grade 4', ''), false, 'registration requires an explicit level selection');
assert.equal(isValidHymnsTaxisRegistration('unknown grade', 2), false, 'unknown grade should be rejected');
assert.equal(isValidHymnsTaxisRegistration('Grade 4', 4), false, 'unsupported level should be rejected');
assert.equal(parseHymnsTaxisLevel('3'), 3, 'numeric level strings should parse');
assert.equal(parseHymnsTaxisLevel('0'), null, 'out-of-range levels should not parse');

const curriculum = [
  { id: 'hymn-1', level: 1 },
  { id: 'hymn-2', level: 2 },
  { id: 'taxis-2', level: 2 },
  { id: 'unclassified', level: null }
];
assert.deepEqual(
  filterItemsByHymnsTaxisLevel(curriculum.slice(0, 2), 2).map(item => item.id),
  ['hymn-2'],
  'Hymns filtering should return only the assigned level'
);
assert.deepEqual(
  filterTaxisItemsByLevel(curriculum.slice(2), 2).map(item => item.id),
  ['taxis-2'],
  'Taxis filtering should exclude unclassified items and other levels'
);
assert.deepEqual(filterItemsByHymnsTaxisLevel(curriculum, null), [], 'missing level should not expose curriculum items');

assert.equal(canInitializeHymnsTaxisLevel('student', null, 1), true, 'existing students without a level may initialize it');
assert.equal(canInitializeHymnsTaxisLevel('student', 1, 2), false, 'an assigned level cannot be overwritten by the student');
assert.equal(canInitializeHymnsTaxisLevel('teacher', null, 2), false, 'non-students cannot self-assign a level');

const migration = readFileSync(new URL('./migrations/phase7_shared_hymns_taxis_level.sql', import.meta.url), 'utf8');
const authSource = readFileSync(new URL('../src/lib/supabaseAuth.ts', import.meta.url), 'utf8');
const registrationSource = readFileSync(new URL('../src/components/auth/LoginScreen.tsx', import.meta.url), 'utf8');
const serverSource = readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
assert.match(migration, /ADD COLUMN IF NOT EXISTS hymns_taxis_level INTEGER/);
assert.match(migration, /ADD COLUMN IF NOT EXISTS level INTEGER/);
assert.match(migration, /INSERT INTO public\.profiles \(id, name, email, role, grade, hymns_taxis_level\)/);
assert.match(migration, /ON CONFLICT \(id\) DO NOTHING/);
assert.match(migration, /v_level_text !~ '\^\[1-3\]\$'/);
assert.match(migration, /DROP POLICY IF EXISTS "hymns_memberships_insert_student_pending"/);
assert.match(migration, /REVOKE INSERT ON TABLE public\.hymns_memberships FROM PUBLIC, anon, authenticated/);
assert.match(migration, /ALTER TABLE public\.coptic_taxis_items ENABLE ROW LEVEL SECURITY/);
assert.match(migration, /p\.hymns_taxis_level = public\.coptic_taxis_items\.level/);
assert.match(authSource, /hymns_taxis_level: parsedLevel/);
assert.match(authSource, /grade: normalizedGrade/);
assert.match(registrationSource, /registrationLevel === null/);
assert.match(registrationSource, /useState<HymnsTaxisLevel \| ''>\(''\)/);
const setupEndpoint = serverSource.slice(
  serverSource.indexOf('app.put("/api/church/hymns-taxis-level"'),
  serverSource.indexOf("// Helper to get student's approved Hymns School level")
);
assert.match(setupEndpoint, /authContext\.role !== 'student'/);
assert.match(setupEndpoint, /\.eq\('id', authContext\.userId\)/);
assert.match(setupEndpoint, /\.is\('hymns_taxis_level', null\)/);
assert.match(setupEndpoint, /LEVEL_ALREADY_ASSIGNED/);

console.log('Shared Hymns/Taxis level regression checks passed.');
