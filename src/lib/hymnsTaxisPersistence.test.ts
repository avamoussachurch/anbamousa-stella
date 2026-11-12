import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { CopticHymnItem } from '../data/hymnsData';
import type { TaxisItem } from '../types';
import {
  hymnFromDatabase,
  hymnToDatabase,
  taxisFromDatabase,
  taxisToDatabase
} from './hymnsTaxisPersistence';
import {
  canEditOwnedTaxisItem,
  canManageHymnsTaxis,
  canPublishOwnedTaxisItem,
  canReadHymnsTaxis,
  canReviewTaxisItem
} from './hymnsTaxisAuthorization';

const phase18Migration = readFileSync(
  new URL('../../scripts/migrations/phase18_hymns_taxis_supabase_persistence.sql', import.meta.url),
  'utf8'
);

test('Hymn database mapping round-trips multilingual lyrics, season, and media references', () => {
  const hymn: Partial<CopticHymnItem> = {
    titleAr: 'لحن قبطي',
    titleEn: 'Coptic hymn',
    titleCoptic: 'Ⲁ̀ⲅⲓⲟⲥ',
    seasonAr: 'الصوم الكبير',
    seasonEn: 'Great Lent',
    occasionTag: 'lent',
    difficulty: 'advanced',
    level: 3,
    audioUrl: 'storage://hymns/audio',
    pdfUrl: 'storage://hymns/pdf',
    sheetMusicUrl: 'storage://hymns/sheet',
    durationSec: 83,
    hazatExplanationAr: 'شرح عربي',
    hazatExplanationEn: 'English explanation',
    lines: [{ id: 1, coptic: 'Ⲁ̀ⲅⲓⲟⲥ', arabized: 'أجيوس', arabic: 'قدوس' }],
    status: 'published'
  };
  const stored = hymnToDatabase(hymn);
  const restored = hymnFromDatabase({
    id: 'hymn-1',
    title_ar: String(stored.title_ar),
    title_en: String(stored.title_en),
    title_coptic: String(stored.title_coptic),
    season_ar: String(stored.season_ar),
    season_en: String(stored.season_en),
    occasion_tag: stored.occasion_tag as CopticHymnItem['occasionTag'],
    difficulty: stored.difficulty as CopticHymnItem['difficulty'],
    level: 3,
    audio_url: String(stored.audio_url),
    pdf_url: String(stored.pdf_url),
    sheet_music_url: String(stored.sheet_music_url),
    duration_sec: Number(stored.duration_sec),
    hazat_explanation_ar: String(stored.hazat_explanation_ar),
    hazat_explanation_en: String(stored.hazat_explanation_en),
    lines: stored.lines as CopticHymnItem['lines'],
    status: 'published',
    version: 2,
    history: [],
    published_at: '2026-11-10T00:00:00Z',
    created_by: 'teacher-1',
    created_at: '2026-11-09T00:00:00Z',
    updated_at: '2026-11-10T00:00:00Z'
  });

  assert.equal(restored.titleAr, hymn.titleAr);
  assert.equal(restored.titleCoptic, hymn.titleCoptic);
  assert.equal(restored.seasonEn, hymn.seasonEn);
  assert.equal(restored.audioUrl, hymn.audioUrl);
  assert.equal(restored.pdfUrl, hymn.pdfUrl);
  assert.equal(restored.sheetMusicUrl, hymn.sheetMusicUrl);
  assert.deepEqual(restored.lines, hymn.lines);
});

test('Taxis database mapping preserves category, audience, seasons, explanations, sources, and attachments', () => {
  const item: Partial<TaxisItem> = {
    titleAr: 'ترتيب طقسي',
    titleEn: 'Liturgical order',
    titleCopt: 'Ⲡⲓⲧⲁⲝⲓⲥ',
    category: 'incense',
    season: 'Great Lent',
    level: 2,
    audience: 'preparatory',
    summaryAr: 'شرح عربي',
    summaryEn: 'English explanation',
    sections: [{ id: 's1', order: 1, titleAr: 'عنوان', titleEn: 'Title', contentAr: 'نص' }],
    references: ['كتاب الطقس'],
    documents: [{ id: 'd1', title: 'PDF', fileUrl: 'storage://taxis/rite.pdf', fileType: 'pdf' }]
  };
  const stored = taxisToDatabase(item);
  const restored = taxisFromDatabase({
    id: 'taxis-1',
    title_ar: String(stored.title_ar),
    title_en: String(stored.title_en),
    title_coptic: String(stored.title_coptic),
    category: String(stored.category),
    season: String(stored.season),
    level: 2,
    target_audience: String(stored.target_audience),
    audience_detail: 'preparatory',
    status: 'draft',
    summary_ar: String(stored.summary_ar),
    summary_en: String(stored.summary_en),
    sections: stored.sections as TaxisItem['sections'],
    attachments: stored.attachments as TaxisItem['documents'],
    source_references: stored.source_references as string[],
    version: 1,
    history: [],
    created_by: 'teacher-1',
    reviewed_by: null,
    approved_by: null,
    published_by: null,
    published_at: null,
    unpublished_by: null,
    unpublished_at: null,
    created_at: '2026-11-09T00:00:00Z',
    updated_at: '2026-11-10T00:00:00Z'
  });

  assert.equal(restored.category, item.category);
  assert.equal(restored.audience, item.audience);
  assert.equal(restored.season, item.season);
  assert.equal(restored.summaryAr, item.summaryAr);
  assert.deepEqual(restored.sections, item.sections);
  assert.deepEqual(restored.references, item.references);
  assert.deepEqual(restored.documents, item.documents);
});

test('Taxis mapping preserves the existing clergy category', () => {
  const restored = taxisFromDatabase({
    id: 'taxis-clergy',
    title_ar: 'خدمة كهنوتية',
    title_en: 'Clergy service',
    title_coptic: null,
    category: 'CLERICAL',
    season: 'annual',
    level: 3,
    target_audience: 'SERVANTS',
    audience_detail: 'clergy',
    status: 'published',
    summary_ar: null,
    summary_en: null,
    sections: [],
    attachments: [],
    source_references: [],
    version: 1,
    history: [],
    created_by: 'teacher-1',
    reviewed_by: null,
    approved_by: null,
    published_by: null,
    published_at: null,
    unpublished_by: null,
    unpublished_at: null,
    created_at: '2026-11-09T00:00:00Z',
    updated_at: '2026-11-10T00:00:00Z'
  });

  assert.equal(restored.category, 'clergy');
  assert.equal(restored.audience, 'clergy');
});

test('Hymns and Taxis writes require a verified teacher/admin role and enforce owner publishing limits', () => {
  assert.equal(canReadHymnsTaxis(['student']), true);
  assert.equal(canManageHymnsTaxis(['student']), false);
  assert.equal(canManageHymnsTaxis(['parent']), false);
  assert.equal(canEditOwnedTaxisItem(['teacher'], true), true);
  assert.equal(canEditOwnedTaxisItem(['teacher'], false), false);
  assert.equal(canEditOwnedTaxisItem(['student'], true), false);
  assert.equal(canReviewTaxisItem(['teacher'], false), true);
  assert.equal(canReviewTaxisItem(['teacher'], true), false);
  assert.equal(canReviewTaxisItem(['admin'], true), true);
  assert.equal(canPublishOwnedTaxisItem(['teacher'], true, 'Head Servant'), true);
  assert.equal(canPublishOwnedTaxisItem(['teacher'], true, 'Servant'), false);
  assert.equal(canPublishOwnedTaxisItem(['admin'], false, null), true);
});

test('Phase 18 revokes inherited and column-level write grants before restoring payload-only grants', () => {
  const revokePosition = phase18Migration.indexOf('DO $write_privileges$');
  const grantPosition = phase18Migration.indexOf('GRANT INSERT (', revokePosition);

  assert.notEqual(revokePosition, -1);
  assert.ok(grantPosition > revokePosition);
  const privilegeBlock = phase18Migration.slice(revokePosition, grantPosition);
  assert.match(privilegeBlock, /REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public\.%I FROM PUBLIC, anon, authenticated/);
  assert.match(privilegeBlock, /REVOKE INSERT \(%1\$I\), UPDATE \(%1\$I\) ON TABLE public\.%2\$I FROM PUBLIC, anon, authenticated/);
  assert.match(phase18Migration, /GRANT ALL ON TABLE public\.hymns, public\.coptic_taxis_items TO service_role/);
  assert.match(phase18Migration, /GRANT INSERT \([\s\S]*?history\s*\) ON TABLE public\.hymns TO authenticated/);
  assert.match(phase18Migration, /GRANT INSERT \([\s\S]*?source_references, version, history\s*\) ON TABLE public\.coptic_taxis_items TO authenticated/);
  assert.doesNotMatch(phase18Migration, /GRANT (?:INSERT|UPDATE) ON TABLE public\.(?:hymns|coptic_taxis_items) TO authenticated/);
  assert.match(phase18Migration, /GRANT DELETE ON TABLE public\.hymns TO authenticated/);
  assert.match(phase18Migration, /GRANT DELETE ON TABLE public\.coptic_taxis_items TO authenticated/);
  assert.doesNotMatch(phase18Migration, /GRANT (?:INSERT|UPDATE) \([^)]*\bcreated_by\b[^)]*\) ON TABLE public\.(?:hymns|coptic_taxis_items)/);
});

test('Phase 18 replaces legacy Hymns and Taxis policies with the complete scoped policy set', () => {
  for (const policy of [
    'phase18_hymns_select',
    'phase18_hymns_insert',
    'phase18_hymns_update',
    'phase18_hymns_delete',
    'phase18_taxis_select',
    'phase18_taxis_insert',
    'phase18_taxis_update',
    'phase18_taxis_delete'
  ]) {
    assert.match(phase18Migration, new RegExp(`CREATE POLICY ${policy}\\b`));
  }

  assert.match(phase18Migration, /FROM pg_catalog\.pg_policies[\s\S]*?tablename IN \('hymns', 'coptic_taxis_items'\)[\s\S]*?policyname NOT IN \([\s\S]*?'phase18_taxis_delete'[\s\S]*?DROP POLICY %I ON %I\.%I/);
  assert.match(phase18Migration, /public\.has_role\('student'\)[\s\S]*?p\.hymns_taxis_level = public\.coptic_taxis_items\.level/);
  assert.match(phase18Migration, /public\.has_role\('teacher'\)[\s\S]*?public\.has_role\('admin'\)/);
});

test('Phase 18 Taxis trigger protects ownership and workflow metadata and rejects invalid transitions', () => {
  const functionStart = phase18Migration.indexOf('CREATE OR REPLACE FUNCTION public.guard_coptic_taxis_workflow_update()');
  const functionEnd = phase18Migration.indexOf('$function$;', functionStart);
  assert.notEqual(functionStart, -1);
  assert.ok(functionEnd > functionStart);
  const guard = phase18Migration.slice(functionStart, functionEnd);

  assert.match(guard, /NEW\.created_by IS DISTINCT FROM OLD\.created_by/);
  assert.match(guard, /Taxis item ownership cannot be changed after creation/);
  assert.match(guard, /OLD\.created_by = v_actor/);
  assert.match(guard, /OLD\.status = 'under_review' AND NEW\.status = 'approved'/);
  assert.match(guard, /OLD\.status = 'approved' AND NEW\.status = 'published'/);
  assert.match(guard, /OLD\.status = 'published' AND NEW\.status = 'unpublished'/);
  assert.match(guard, /NEW\.reviewed_by IS DISTINCT FROM v_actor/);
  assert.match(guard, /NEW\.approved_by IS DISTINCT FROM v_actor/);
  assert.match(guard, /NEW\.published_by IS DISTINCT FROM v_actor/);
  assert.match(guard, /NEW\.unpublished_by IS DISTINCT FROM v_actor/);
  assert.match(guard, /Taxis content can only be edited while draft or unpublished/);
  assert.match(guard, /Invalid Taxis workflow transition from % to %/);
});

test('Phase 18 reports incompatible audience_detail values before validating its constraint', () => {
  const compatibilityCheck = phase18Migration.indexOf('Inspect these existing values before proceeding');
  const validateConstraint = phase18Migration.indexOf('VALIDATE CONSTRAINT coptic_taxis_items_audience_detail_valid');

  assert.ok(compatibilityCheck >= 0);
  assert.ok(validateConstraint > compatibilityCheck);
  assert.match(phase18Migration, /audience_detail NOT IN \('preparatory', 'clergy'\)/);
  assert.match(phase18Migration, /pg_catalog\.format\('%L \(%s rows\)'/);
});
