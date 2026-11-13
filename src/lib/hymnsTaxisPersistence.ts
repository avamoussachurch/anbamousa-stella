import type { CopticHymnItem } from '../data/hymnsData';
import type { TaxisAudience, TaxisCategory, TaxisItem, TaxisStatus } from '../types';

export interface HymnDatabaseRow {
  id: string;
  title_ar: string;
  title_en: string;
  title_coptic: string;
  season_ar: string;
  season_en: string;
  occasion_tag: CopticHymnItem['occasionTag'];
  difficulty: CopticHymnItem['difficulty'];
  level: 1 | 2 | 3;
  audio_url: string | null;
  pdf_url: string | null;
  sheet_music_url: string | null;
  duration_sec: number;
  hazat_explanation_ar: string | null;
  hazat_explanation_en: string | null;
  lines: CopticHymnItem['lines'];
  status: NonNullable<CopticHymnItem['status']>;
  version: number;
  history: NonNullable<CopticHymnItem['history']>;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaxisDatabaseRow {
  id: string;
  title_ar: string;
  title_en: string;
  title_coptic: string | null;
  category: string;
  season: string;
  level: 1 | 2 | 3 | null;
  target_audience: string;
  audience_detail: 'preparatory' | 'clergy' | null;
  status: TaxisStatus;
  summary_ar: string | null;
  summary_en: string | null;
  sections: TaxisItem['sections'];
  attachments: TaxisItem['documents'];
  source_references: string[];
  version: number;
  history: NonNullable<TaxisItem['history']>;
  created_by: string | null;
  reviewed_by: string | null;
  approved_by: string | null;
  published_by: string | null;
  published_at: string | null;
  unpublished_by: string | null;
  unpublished_at: string | null;
  created_at: string;
  updated_at: string;
}

export function hymnFromDatabase(row: HymnDatabaseRow): CopticHymnItem {
  return {
    id: row.id,
    createdBy: row.created_by || undefined,
    titleAr: row.title_ar,
    titleEn: row.title_en,
    titleCoptic: row.title_coptic,
    seasonAr: row.season_ar,
    seasonEn: row.season_en,
    occasionTag: row.occasion_tag,
    difficulty: row.difficulty,
    level: row.level,
    audioUrl: row.audio_url || '',
    pdfUrl: row.pdf_url || '',
    sheetMusicUrl: row.sheet_music_url || '',
    durationSec: row.duration_sec,
    hazatExplanationAr: row.hazat_explanation_ar || '',
    hazatExplanationEn: row.hazat_explanation_en || '',
    lines: row.lines || [],
    status: row.status,
    version: row.version,
    history: row.history || [],
    publishedAt: row.published_at || undefined,
    updatedAt: row.updated_at
  };
}

export function hymnToDatabase(input: Partial<CopticHymnItem>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const fields: Array<[keyof CopticHymnItem, string]> = [
    ['titleAr', 'title_ar'],
    ['titleEn', 'title_en'],
    ['titleCoptic', 'title_coptic'],
    ['seasonAr', 'season_ar'],
    ['seasonEn', 'season_en'],
    ['occasionTag', 'occasion_tag'],
    ['difficulty', 'difficulty'],
    ['level', 'level'],
    ['audioUrl', 'audio_url'],
    ['pdfUrl', 'pdf_url'],
    ['sheetMusicUrl', 'sheet_music_url'],
    ['durationSec', 'duration_sec'],
    ['hazatExplanationAr', 'hazat_explanation_ar'],
    ['hazatExplanationEn', 'hazat_explanation_en'],
    ['lines', 'lines'],
    ['status', 'status'],
    ['createdBy', 'created_by']
  ];
  for (const [source, target] of fields) {
    if (input[source] !== undefined) result[target] = input[source];
  }
  return result;
}

const taxisCategoryToDatabase: Record<TaxisCategory, string> = {
  liturgy: 'LITURGY',
  incense: 'DEACON_SERVICE',
  sacraments: 'SACRAMENT',
  feasts: 'FEAST',
  pascha: 'FASTING',
  occasions: 'PRAYER_CANON',
  clergy: 'CLERICAL'
};

const taxisAudienceToDatabase: Record<TaxisAudience, string> = {
  all: 'ALL',
  deacons: 'DEACONS',
  preparatory: 'CONGREGATION',
  servants: 'SERVANTS',
  clergy: 'SERVANTS'
};

function taxisCategoryFromDatabase(category: string): TaxisCategory {
  const entry = Object.entries(taxisCategoryToDatabase)
    .find(([, databaseValue]) => databaseValue === category);
  if (!entry) throw new Error(`Unsupported Taxis category from Supabase: ${category}`);
  return entry[0] as TaxisCategory;
}

export function taxisFromDatabase(row: TaxisDatabaseRow): TaxisItem {
  const audience = row.audience_detail ||
    (row.target_audience === 'DEACONS' ? 'deacons' :
      row.target_audience === 'SERVANTS' ? 'servants' : 'all');
  return {
    id: row.id,
    titleAr: row.title_ar,
    titleEn: row.title_en,
    titleCopt: row.title_coptic || '',
    category: taxisCategoryFromDatabase(row.category),
    season: row.season,
    level: row.level,
    audience,
    status: row.status,
    summaryAr: row.summary_ar || '',
    summaryEn: row.summary_en || '',
    sections: row.sections || [],
    references: row.source_references || [],
    documents: row.attachments || [],
    version: row.version,
    history: row.history || [],
    createdBy: row.created_by || '',
    createdByName: 'الخادم المسؤول',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reviewedBy: row.reviewed_by || undefined,
    approvedBy: row.approved_by || undefined,
    publishedBy: row.published_by || undefined,
    publishedAt: row.published_at || undefined,
    unpublishedBy: row.unpublished_by || undefined,
    unpublishedAt: row.unpublished_at || undefined
  };
}

export function taxisToDatabase(input: Partial<TaxisItem>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (input.createdBy !== undefined) result.created_by = input.createdBy;
  if (input.titleAr !== undefined) result.title_ar = input.titleAr;
  if (input.titleEn !== undefined) result.title_en = input.titleEn;
  if (input.titleCopt !== undefined) result.title_coptic = input.titleCopt;
  if (input.category !== undefined) result.category = taxisCategoryToDatabase[input.category];
  if (input.season !== undefined) result.season = input.season;
  if (input.level !== undefined) result.level = input.level;
  if (input.audience !== undefined) {
    result.target_audience = taxisAudienceToDatabase[input.audience];
    result.audience_detail = input.audience === 'preparatory' || input.audience === 'clergy'
      ? input.audience
      : null;
  }
  if (input.summaryAr !== undefined) result.summary_ar = input.summaryAr;
  if (input.summaryEn !== undefined) result.summary_en = input.summaryEn;
  if (input.sections !== undefined) result.sections = input.sections;
  if (input.references !== undefined) result.source_references = input.references;
  if (input.documents !== undefined) result.attachments = input.documents;
  return result;
}
