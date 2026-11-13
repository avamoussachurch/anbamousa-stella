#!/usr/bin/env node
/**
 * Authenticated production smoke test for Hymns + Coptic Taxis.
 *
 * Required environment:
 *   STELLA_BASE_URL
 *   STELLA_TEACHER_TOKEN
 *   STELLA_ADMIN_TOKEN
 *   STELLA_STUDENT_TOKEN
 *   SUPABASE_URL (or STELLA_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY (cleanup only; never logged)
 *
 * The teacher creates the records, the admin reviews/publishes Taxis,
 * and a real student at their assigned curriculum level retrieves both.
 * Unique test rows are removed through the service-role REST API in finally.
 */
import { randomUUID } from 'node:crypto';

const required = [
  'STELLA_BASE_URL',
  'STELLA_TEACHER_TOKEN',
  'STELLA_ADMIN_TOKEN',
  'STELLA_STUDENT_TOKEN',
  'SUPABASE_SERVICE_ROLE_KEY'
];
const missing = required.filter(key => !process.env[key]);
const supabaseUrl = process.env.STELLA_SUPABASE_URL || process.env.SUPABASE_URL;
if (!supabaseUrl) missing.push('STELLA_SUPABASE_URL (or SUPABASE_URL)');
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(2);
}

const baseUrl = process.env.STELLA_BASE_URL.replace(/\/$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const teacherToken = process.env.STELLA_TEACHER_TOKEN;
const adminToken = process.env.STELLA_ADMIN_TOKEN;
const studentToken = process.env.STELLA_STUDENT_TOKEN;
const supabaseHeaders = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  'Content-Type': 'application/json'
};
const suffix = randomUUID().replaceAll('-', '').slice(0, 16);
const hymnId = `qa_hymn_${suffix}`;
const taxisId = `qa_taxis_${suffix}`;
let failures = 0;

function assert(condition, message, detail = '') {
  if (condition) {
    console.log(`PASS ${message}`);
    return;
  }
  failures += 1;
  console.error(`FAIL ${message}${detail ? `: ${detail}` : ''}`);
}

function userIdFromJwt(token) {
  const payload = token.split('.')[1];
  if (!payload) throw new Error('Student token is not a JWT.');
  const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  if (!parsed.sub) throw new Error('Student JWT does not contain a subject.');
  return parsed.sub;
}

async function api(path, token, method = 'GET', body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const text = await response.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch {}
  return { status: response.status, json, text };
}

async function cleanup(table, id) {
  const response = await fetch(
    `${supabaseUrl.replace(/\/$/, '')}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`,
    { method: 'DELETE', headers: supabaseHeaders }
  );
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Could not clean QA row from ${table} (${response.status}): ${detail}`);
  }
}

async function main() {
  const studentId = userIdFromJwt(studentToken);
  const profileResponse = await fetch(
    `${supabaseUrl.replace(/\/$/, '')}/rest/v1/profiles?id=eq.${encodeURIComponent(studentId)}&select=hymns_taxis_level`,
    { headers: supabaseHeaders }
  );
  if (!profileResponse.ok) throw new Error(`Could not read student curriculum level (${profileResponse.status}).`);
  const profiles = await profileResponse.json();
  const level = Number(profiles?.[0]?.hymns_taxis_level);
  if (![1, 2, 3].includes(level)) {
    throw new Error('The supplied student must have a Hymns/Taxis level (1, 2, or 3) assigned before this smoke test.');
  }

  try {
    // Hymns: authenticated teacher create -> database read -> publish -> student read.
    const createHymn = await api('/api/church/hymns', teacherToken, 'POST', {
      id: hymnId,
      titleAr: `اختبار نشر مؤقت ${suffix}`,
      titleEn: `Temporary publishing smoke test ${suffix}`,
      titleCoptic: 'Ⲡⲓⲧⲁⲝⲓⲥ',
      seasonAr: 'اختبار تقني - لا يستخدم كمحتوى تعليمي',
      seasonEn: 'Technical test - not instructional content',
      occasionTag: 'annual',
      difficulty: 'easy',
      level,
      durationSec: 1,
      lines: [],
      status: 'draft'
    });
    assert(createHymn.status === 201 && createHymn.json?.hymn?.id === hymnId, 'Teacher creates Hymn draft in Supabase', JSON.stringify(createHymn.json));
    if (createHymn.status !== 201) throw new Error('Hymn create failed; stopping dependent checks.');

    const teacherReadHymn = await api(`/api/church/hymns/${encodeURIComponent(hymnId)}`, teacherToken);
    assert(teacherReadHymn.status === 200 && teacherReadHymn.json?.hymn?.status === 'draft', 'Teacher retrieves persisted Hymn draft');

    const publishHymn = await api(`/api/church/hymns/${encodeURIComponent(hymnId)}`, teacherToken, 'PUT', { status: 'published' });
    assert(publishHymn.status === 200 && publishHymn.json?.hymn?.status === 'published', 'Teacher publishes Hymn and receives confirmed database row', JSON.stringify(publishHymn.json));

    const studentReadHymn = await api(`/api/church/hymns/${encodeURIComponent(hymnId)}`, studentToken);
    assert(studentReadHymn.status === 200 && studentReadHymn.json?.hymn?.id === hymnId, 'Student at assigned level retrieves published Hymn', JSON.stringify(studentReadHymn.json));

    // Taxis: teacher create -> submit -> admin review/publish -> student read.
    const createTaxis = await api('/api/church/taxis', teacherToken, 'POST', {
      id: taxisId,
      titleAr: `اختبار طقس مؤقت ${suffix}`,
      titleEn: `Temporary Taxis smoke test ${suffix}`,
      titleCopt: 'Ⲡⲓⲧⲁⲝⲓⲥ',
      category: 'liturgy',
      season: 'annual',
      level,
      audience: 'all',
      summaryAr: 'سجل اختبار تقني مؤقت وسيتم حذفه تلقائياً.',
      summaryEn: 'Temporary technical QA record; automatically deleted.',
      sections: [],
      references: [],
      documents: []
    });
    assert(createTaxis.status === 201 && createTaxis.json?.item?.id === taxisId, 'Teacher creates Taxis draft in Supabase', JSON.stringify(createTaxis.json));
    if (createTaxis.status !== 201) throw new Error('Taxis create failed; stopping dependent checks.');

    const submit = await api(`/api/church/taxis/${encodeURIComponent(taxisId)}/submit-review`, teacherToken, 'POST', {});
    assert(submit.status === 200 && submit.json?.item?.status === 'under_review', 'Teacher submits Taxis draft for review', JSON.stringify(submit.json));

    const approve = await api(`/api/church/taxis/${encodeURIComponent(taxisId)}/review`, adminToken, 'POST', { action: 'APPROVE', notes: 'Automated production smoke test only.' });
    assert(approve.status === 200 && approve.json?.item?.status === 'approved', 'Admin approves Taxis draft', JSON.stringify(approve.json));

    const publish = await api(`/api/church/taxis/${encodeURIComponent(taxisId)}/publish`, adminToken, 'POST', {});
    assert(publish.status === 200 && publish.json?.item?.status === 'published', 'Admin publishes approved Taxis item', JSON.stringify(publish.json));

    const studentReadTaxis = await api('/api/church/taxis', studentToken);
    assert(studentReadTaxis.status === 200 && studentReadTaxis.json?.items?.some(item => item.id === taxisId), 'Student at assigned level retrieves published Taxis item', JSON.stringify(studentReadTaxis.json));
  } finally {
    const results = await Promise.allSettled([
      cleanup('hymns', hymnId),
      cleanup('coptic_taxis_items', taxisId)
    ]);
    for (const result of results) {
      if (result.status === 'rejected') {
        failures += 1;
        console.error(`FAIL cleanup: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
      }
    }
  }

  console.log(`\nPublishing smoke test: ${failures === 0 ? 'PASS' : 'FAIL'} (${failures} failed checks)`);
  if (failures > 0) process.exitCode = 1;
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
