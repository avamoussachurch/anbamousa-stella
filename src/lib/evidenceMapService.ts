import { supabase } from './supabase';
import { 
  EvidenceMap, 
  ClaimEvidence, 
  SourceConflict, 
  LessonSource, 
  ServantReviewStatus 
} from '../types';
import { listLessonSources } from './lessonSourceService';

/**
 * Normalized database representation of public.evidence_maps
 */
export interface DbEvidenceMap {
  id: string;
  lesson_id: string;
  lesson_version_id?: string | null;
  main_topics_en: string[];
  main_topics_ar: string[];
  bible_references: any[];
  teacher_explanations: string[];
  unsupported_claims: string[];
  review_status: 'PENDING_REVIEW' | 'IN_REVIEW' | 'SERVANT_APPROVED';
  last_reviewed_by?: string | null;
  last_reviewed_at?: string | null;
  allow_internet_search?: boolean;
  created_by?: string | null;
  created_at: string;
}

/**
 * Normalized database representation of public.claim_evidence
 */
export interface DbClaimEvidence {
  id: string;
  evidence_map_id: string;
  source_id: string;
  source_name: string;
  source_location: string;
  statement_en: string;
  statement_ar: string;
  quote_en?: string | null;
  quote_ar?: string | null;
  category?: string | null;
  is_verified: boolean;
  servant_review_status: ServantReviewStatus;
  servant_review_note?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
}

/**
 * Normalized database representation of public.source_conflicts
 */
export interface DbSourceConflict {
  id: string;
  evidence_map_id: string;
  source_a_id: string;
  source_a_name: string;
  source_a_location?: string | null;
  source_a_quote?: string | null;
  source_b_id: string;
  source_b_name: string;
  source_b_location?: string | null;
  source_b_quote?: string | null;
  conflict_description_en: string;
  conflict_description_ar: string;
  status: 'UNRESOLVED' | 'RESOLVED';
  resolution_note?: string | null;
  resolved_by?: string | null;
  resolved_at?: string | null;
  created_at: string;
}

export interface EvidenceServiceResult<T> {
  data: T | null;
  error: Error | null;
}

export interface BuildEvidenceMapInput {
  lessonId: string;
  lessonTitle?: string;
  grade?: string;
  ageGroup?: string;
  sessionId?: string;
  versionId?: string;
  sources?: LessonSource[];
  allowInternetSearch?: boolean; // STRICT: defaults to false (Closed-Source Guard)
}

export interface SaveEvidenceMapInput {
  lessonId: string;
  versionId?: string;
  evidenceMap: EvidenceMap;
  contextNote?: string;
}

export interface DraftEvidencePacket {
  lessonId: string;
  draftVersionId?: string;
  evidenceMap: EvidenceMap | null;
  sources: LessonSource[];
  claims: ClaimEvidence[];
  conflicts: SourceConflict[];
  unverifiedClaimsCount: number;
  verifiedClaimsCount: number;
  unresolvedConflictsCount: number;
}

export interface UpdateClaimVerificationInput {
  claimId: string;
  isVerified: boolean;
  servantReviewStatus?: ServantReviewStatus;
  servantReviewNote?: string;
  evidenceMapId?: string;
}

export interface ResolveConflictInput {
  conflictId: string;
  resolutionNote: string;
  evidenceMapId?: string;
}

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Validates the current authenticated user and ensures they possess teacher or admin privileges.
 */
async function getAuthenticatedServant(): Promise<{
  user: { id: string; role?: string } | null;
  error: Error | null;
}> {
  if (!supabase) {
    return { user: null, error: new Error('Supabase client is not configured') };
  }

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return { user: null, error: new Error('Authentication required for curriculum evidence operations') };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  const finalRole = profile?.role || 'student';
  if (finalRole !== 'teacher' && finalRole !== 'admin') {
    return { user: null, error: new Error('Only servants, teachers, and administrators may manage curriculum evidence') };
  }

  return { user: { id: user.id, role: finalRole }, error: null };
}

/**
 * Adapts DbClaimEvidence to application ClaimEvidence
 */
export function adaptDbClaimToAppClaim(dbClaim: DbClaimEvidence): ClaimEvidence {
  return {
    claimId: dbClaim.id,
    statementEn: dbClaim.statement_en,
    statementAr: dbClaim.statement_ar,
    sourceId: dbClaim.source_id,
    sourceName: dbClaim.source_name,
    sourceLocation: dbClaim.source_location,
    quoteEn: dbClaim.quote_en || undefined,
    quoteAr: dbClaim.quote_ar || undefined,
    category: (dbClaim.category as any) || 'general',
    verified: Boolean(dbClaim.is_verified),
    servantReviewStatus: dbClaim.servant_review_status || 'PENDING',
    servantReviewNote: dbClaim.servant_review_note || undefined,
    reviewedBy: dbClaim.reviewed_by || undefined,
    reviewedAt: dbClaim.reviewed_at || undefined
  };
}

/**
 * Adapts DbSourceConflict to application SourceConflict
 */
export function adaptDbConflictToAppConflict(dbConflict: DbSourceConflict): SourceConflict {
  return {
    id: dbConflict.id,
    sourceAId: dbConflict.source_a_id,
    sourceAName: dbConflict.source_a_name,
    sourceALocation: dbConflict.source_a_location || undefined,
    sourceAQuote: dbConflict.source_a_quote || undefined,
    sourceBId: dbConflict.source_b_id,
    sourceBName: dbConflict.source_b_name,
    sourceBLocation: dbConflict.source_b_location || undefined,
    sourceBQuote: dbConflict.source_b_quote || undefined,
    conflictDescriptionEn: dbConflict.conflict_description_en,
    conflictDescriptionAr: dbConflict.conflict_description_ar,
    status: dbConflict.status || 'UNRESOLVED',
    resolutionNote: dbConflict.resolution_note || undefined,
    resolvedBy: dbConflict.resolved_by || undefined,
    resolvedAt: dbConflict.resolved_at || undefined
  };
}

/**
 * Adapts DbEvidenceMap and associated claims/conflicts to application EvidenceMap
 */
export function adaptDbEvidenceMapToApp(
  dbMap: DbEvidenceMap,
  claims: DbClaimEvidence[] = [],
  conflicts: DbSourceConflict[] = []
): EvidenceMap {
  return {
    id: dbMap.id,
    lessonId: dbMap.lesson_id,
    lessonVersionId: dbMap.lesson_version_id || undefined,
    mainTopicsEn: Array.isArray(dbMap.main_topics_en) ? dbMap.main_topics_en : [],
    mainTopicsAr: Array.isArray(dbMap.main_topics_ar) ? dbMap.main_topics_ar : [],
    importantClaims: claims.map(adaptDbClaimToAppClaim),
    bibleReferences: Array.isArray(dbMap.bible_references) ? dbMap.bible_references : [],
    teacherExplanations: Array.isArray(dbMap.teacher_explanations) ? dbMap.teacher_explanations : [],
    conflicts: conflicts.map(adaptDbConflictToAppConflict),
    unsupportedClaims: Array.isArray(dbMap.unsupported_claims) ? dbMap.unsupported_claims : [],
    reviewStatus: dbMap.review_status || 'PENDING_REVIEW',
    lastReviewedBy: dbMap.last_reviewed_by || undefined,
    lastReviewedAt: dbMap.last_reviewed_at || undefined,
    allowInternetSearch: Boolean(dbMap.allow_internet_search),
    createdAt: dbMap.created_at
  };
}

/**
 * 1. buildEvidenceMap(input)
 *
 * Runs the closed-source evidence analysis pipeline:
 * - Scoped strictly to teacher-provided sources for the current lesson/draft
 * - allowInternetSearch is strictly OFF by default
 * - Enforces that ALL returned claims start with is_verified = false and servantReviewStatus = 'PENDING'
 * - Enforces that ALL returned conflicts start with status = 'UNRESOLVED'
 * - Persists to normalized database tables (evidence_maps, claim_evidence, source_conflicts) if authenticated online
 */
export async function buildEvidenceMap(
  input: BuildEvidenceMapInput
): Promise<EvidenceServiceResult<EvidenceMap>> {
  try {
    // 1. Resolve lesson sources strictly scoped to this lesson
    let sourcesToAnalyze = input.sources;
    if (!sourcesToAnalyze || sourcesToAnalyze.length === 0) {
      const sourcesRes = await listLessonSources(input.lessonId);
      if (sourcesRes.data && sourcesRes.data.length > 0) {
        sourcesToAnalyze = sourcesRes.data;
      }
    }

    if (!sourcesToAnalyze || sourcesToAnalyze.length === 0) {
      return { 
        data: null, 
        error: new Error('Cannot build evidence map: No teacher sources attached to this lesson.') 
      };
    }

    // 2. Prepare auth headers if online
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    let servantId: string | null = null;
    if (supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        if (session?.user?.id) {
          servantId = session.user.id;
        }
      } catch {}
    }

    // 3. Call closed-source server endpoint
    // Strict Guard: allowInternetSearch is false by default
    const allowInternetSearch = Boolean(input.allowInternetSearch);

    const payload = {
      sessionId: input.sessionId,
      lessonId: input.lessonId,
      lessonTitle: input.lessonTitle,
      ageGroup: input.ageGroup,
      grade: input.grade,
      sources: sourcesToAnalyze.map(s => ({
        id: s.id,
        type: s.type,
        originalFilename: s.originalFilename,
        priority: s.priority || 'PRIMARY',
        teacherNotes: s.teacherNotes || '',
        content: s.extractedContent || s.transcript || s.teacherNotes || ''
      })),
      allowInternetSearch
    };

    const res = await fetch('/api/church/build-evidence-map', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      return {
        data: null,
        error: new Error(errJson?.message || errJson?.error || `Server failed with status ${res.status}`)
      };
    }

    const rawResult = await res.json();
    if (rawResult.success === false) {
      return {
        data: null,
        error: new Error(rawResult.message || 'Evidence mapping failed')
      };
    }

    // 4. Verification Discipline (Requirement 5 & 9):
    // MANDATORY: AI generation alone CANNOT create a verified claim.
    // Every newly generated claim MUST start with is_verified = false, verified = false, servantReviewStatus = 'PENDING'.
    const rawClaims = Array.isArray(rawResult.importantClaims) ? rawResult.importantClaims : [];
    const normalizedClaims: ClaimEvidence[] = rawClaims.map((c: any, idx: number) => {
      // Find matching source to preserve cleanest identifier without fabricating locations
      const matchingSrc = sourcesToAnalyze?.find(s => s.id === c.sourceId) || sourcesToAnalyze?.[0];
      const sourceId = matchingSrc?.id || c.sourceId || `src-${idx + 1}`;
      const sourceName = matchingSrc?.originalFilename || c.sourceName || 'Curriculum Source';
      const sourceLocation = c.sourceLocation || (matchingSrc ? `Source: ${matchingSrc.originalFilename}` : 'Classroom Material');

      return {
        claimId: c.claimId || `cl-${generateUuid().substring(0, 8)}`,
        statementEn: c.statementEn || '',
        statementAr: c.statementAr || c.statementEn || '',
        sourceId,
        sourceName,
        sourceLocation,
        quoteEn: c.quoteEn || undefined,
        quoteAr: c.quoteAr || undefined,
        category: (c.category as any) || 'general',
        verified: false, // MANDATORY: AI claims start unverified
        servantReviewStatus: 'PENDING',
        servantReviewNote: '',
        reviewedBy: undefined,
        reviewedAt: undefined
      };
    });

    // 5. Conflict Discipline (Requirement 8):
    // Source conflicts start strictly UNRESOLVED.
    const rawConflicts = Array.isArray(rawResult.conflicts) ? rawResult.conflicts : [];
    const normalizedConflicts: SourceConflict[] = rawConflicts.map((conf: any, idx: number) => ({
      id: conf.id || `conf-${generateUuid().substring(0, 8)}`,
      sourceAId: conf.sourceAId || sourcesToAnalyze?.[0]?.id || 'src-1',
      sourceAName: conf.sourceAName || sourcesToAnalyze?.[0]?.originalFilename || 'Source A',
      sourceALocation: conf.sourceALocation || undefined,
      sourceAQuote: conf.sourceAQuote || undefined,
      sourceBId: conf.sourceBId || sourcesToAnalyze?.[1]?.id || sourcesToAnalyze?.[0]?.id || 'src-2',
      sourceBName: conf.sourceBName || sourcesToAnalyze?.[1]?.originalFilename || 'Source B',
      sourceBLocation: conf.sourceBLocation || undefined,
      sourceBQuote: conf.sourceBQuote || undefined,
      conflictDescriptionEn: conf.conflictDescriptionEn || 'Discrepancy identified between sources',
      conflictDescriptionAr: conf.conflictDescriptionAr || 'اختلاف مرصود بين مصادر الدرس',
      status: 'UNRESOLVED',
      resolutionNote: '',
      resolvedBy: undefined,
      resolvedAt: undefined
    }));

    const appEvidenceMap: EvidenceMap = {
      id: generateUuid(),
      lessonId: input.lessonId,
      lessonVersionId: input.versionId,
      mainTopicsEn: Array.isArray(rawResult.mainTopicsEn) ? rawResult.mainTopicsEn : [],
      mainTopicsAr: Array.isArray(rawResult.mainTopicsAr) ? rawResult.mainTopicsAr : [],
      importantClaims: normalizedClaims,
      bibleReferences: Array.isArray(rawResult.bibleReferences) ? rawResult.bibleReferences : [],
      teacherExplanations: Array.isArray(rawResult.teacherExplanations) ? rawResult.teacherExplanations : [],
      conflicts: normalizedConflicts,
      unsupportedClaims: Array.isArray(rawResult.unsupportedClaims) ? rawResult.unsupportedClaims : [],
      reviewStatus: 'PENDING_REVIEW',
      allowInternetSearch,
      createdAt: new Date().toISOString()
    };

    // 6. If servant is authenticated online, persist into database (Requirement 4, 5, 8)
    if (servantId && supabase) {
      const saveRes = await saveEvidenceMap({
        lessonId: input.lessonId,
        versionId: input.versionId,
        evidenceMap: appEvidenceMap
      });

      if (saveRes.error) {
        console.warn('Online persistence notice for evidence map:', saveRes.error.message);
        // Requirement 13: surface database error if caller is online
        return { data: appEvidenceMap, error: saveRes.error };
      }

      if (saveRes.data) {
        return { data: saveRes.data, error: null };
      }
    }

    return { data: appEvidenceMap, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Failed to build evidence map') };
  }
}

/**
 * 2. saveEvidenceMap(input)
 *
 * Persists an evidence map, its traceable claims, and source conflicts into the normalized schema:
 * - public.evidence_maps
 * - public.claim_evidence
 * - public.source_conflicts
 *
 * Regeneration Safety (Requirement 11):
 * - Creates a distinct record for each evidence generation
 * - Preserves historical evidence maps and verifications
 */
export async function saveEvidenceMap(
  input: SaveEvidenceMapInput
): Promise<EvidenceServiceResult<EvidenceMap>> {
  if (!supabase) {
    return { data: input.evidenceMap, error: null };
  }

  try {
    const servantCheck = await getAuthenticatedServant();
    if (servantCheck.error || !servantCheck.user) {
      return { data: null, error: servantCheck.error };
    }
    const currentUserId = servantCheck.user.id;

    // Verify lesson exists & check teacher authorization (Requirement 10 & 14)
    const { data: lessonRow, error: lessonErr } = await supabase
      .from('lessons')
      .select('id, created_by, active_version_id')
      .eq('id', input.lessonId)
      .maybeSingle();

    if (lessonErr || !lessonRow) {
      return { data: null, error: new Error('Target lesson not found') };
    }

    if (lessonRow.created_by && lessonRow.created_by !== currentUserId && servantCheck.user.role !== 'admin') {
      return { data: null, error: new Error('Cannot attach evidence to another teacher\'s draft lesson') };
    }

    const mapId = input.evidenceMap.id || generateUuid();
    const nowIso = new Date().toISOString();

    // 1. Insert into public.evidence_maps (using only existing frozen columns)
    const mapPayload: Record<string, any> = {
      id: mapId,
      lesson_id: input.lessonId,
      lesson_version_id: input.versionId || input.evidenceMap.lessonVersionId || null,
      main_topics_en: input.evidenceMap.mainTopicsEn || [],
      main_topics_ar: input.evidenceMap.mainTopicsAr || [],
      bible_references: input.evidenceMap.bibleReferences || [],
      teacher_explanations: input.evidenceMap.teacherExplanations || [],
      unsupported_claims: input.evidenceMap.unsupportedClaims || [],
      review_status: input.evidenceMap.reviewStatus || 'PENDING_REVIEW',
      last_reviewed_by: input.evidenceMap.lastReviewedBy || null,
      last_reviewed_at: input.evidenceMap.lastReviewedAt || null,
      allow_internet_search: Boolean(input.evidenceMap.allowInternetSearch),
      created_by: currentUserId,
      created_at: input.evidenceMap.createdAt || nowIso
    };

    const { error: mapInsertErr } = await supabase
      .from('evidence_maps')
      .insert(mapPayload);

    if (mapInsertErr) {
      return { data: null, error: new Error(`Failed to save evidence map: ${mapInsertErr.message}`) };
    }

    // 2. Insert into public.claim_evidence (Requirement 5)
    const claims = input.evidenceMap.importantClaims || [];
    if (claims.length > 0) {
      const claimPayloads = claims.map(c => ({
        id: c.claimId || generateUuid(),
        evidence_map_id: mapId,
        source_id: c.sourceId,
        source_name: c.sourceName,
        source_location: c.sourceLocation,
        statement_en: c.statementEn,
        statement_ar: c.statementAr,
        quote_en: c.quoteEn || null,
        quote_ar: c.quoteAr || null,
        category: c.category || 'general',
        is_verified: Boolean(c.verified),
        servant_review_status: c.servantReviewStatus || 'PENDING',
        servant_review_note: c.servantReviewNote || null,
        reviewed_by: c.reviewedBy || null,
        reviewed_at: c.reviewedAt || null,
        created_at: nowIso
      }));

      const { error: claimsInsertErr } = await supabase
        .from('claim_evidence')
        .insert(claimPayloads);

      if (claimsInsertErr) {
        return { data: null, error: new Error(`Failed to persist claims: ${claimsInsertErr.message}`) };
      }
    }

    // 3. Insert into public.source_conflicts (Requirement 8)
    const conflicts = input.evidenceMap.conflicts || [];
    if (conflicts.length > 0) {
      const conflictPayloads = conflicts.map(conf => ({
        id: conf.id || generateUuid(),
        evidence_map_id: mapId,
        source_a_id: conf.sourceAId,
        source_a_name: conf.sourceAName,
        source_a_location: conf.sourceALocation || null,
        source_a_quote: conf.sourceAQuote || null,
        source_b_id: conf.sourceBId,
        source_b_name: conf.sourceBName,
        source_b_location: conf.sourceBLocation || null,
        source_b_quote: conf.sourceBQuote || null,
        conflict_description_en: conf.conflictDescriptionEn,
        conflict_description_ar: conf.conflictDescriptionAr,
        status: conf.status || 'UNRESOLVED',
        resolution_note: conf.resolutionNote || null,
        resolved_by: conf.resolvedBy || null,
        resolved_at: conf.resolvedAt || null,
        created_at: nowIso
      }));

      const { error: confInsertErr } = await supabase
        .from('source_conflicts')
        .insert(conflictPayloads);

      if (confInsertErr) {
        return { data: null, error: new Error(`Failed to persist conflicts: ${confInsertErr.message}`) };
      }
    }

    const result: EvidenceMap = {
      ...input.evidenceMap,
      id: mapId,
      lessonId: input.lessonId,
      lessonVersionId: input.versionId || input.evidenceMap.lessonVersionId,
      createdAt: nowIso
    };

    return { data: result, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Error saving evidence map') };
  }
}

/**
 * 3. getEvidenceMap(lessonId, versionId?)
 *
 * Retrieves the evidence map record associated with a lesson / version.
 */
export async function getEvidenceMap(
  lessonId: string,
  versionId?: string
): Promise<EvidenceServiceResult<EvidenceMap | null>> {
  if (!supabase) {
    return { data: null, error: null };
  }

  try {
    let query = supabase
      .from('evidence_maps')
      .select('*')
      .eq('lesson_id', lessonId);

    if (versionId) {
      query = query.eq('lesson_version_id', versionId);
    }

    const { data: maps, error: mapErr } = await query
      .order('created_at', { ascending: false })
      .limit(1);

    if (mapErr) {
      return { data: null, error: new Error(`Failed to query evidence_maps: ${mapErr.message}`) };
    }

    if (!maps || maps.length === 0) {
      return { data: null, error: null };
    }

    const dbMap = maps[0] as DbEvidenceMap;

    // Fetch claims
    const { data: dbClaims, error: claimsErr } = await supabase
      .from('claim_evidence')
      .select('*')
      .eq('evidence_map_id', dbMap.id)
      .order('created_at', { ascending: true });

    if (claimsErr) {
      return { data: null, error: new Error(`Failed to query claim_evidence: ${claimsErr.message}`) };
    }

    // Fetch conflicts
    const { data: dbConflicts, error: confErr } = await supabase
      .from('source_conflicts')
      .select('*')
      .eq('evidence_map_id', dbMap.id)
      .order('created_at', { ascending: true });

    if (confErr) {
      return { data: null, error: new Error(`Failed to query source_conflicts: ${confErr.message}`) };
    }

    const appMap = adaptDbEvidenceMapToApp(
      dbMap,
      (dbClaims as DbClaimEvidence[]) || [],
      (dbConflicts as DbSourceConflict[]) || []
    );

    return { data: appMap, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Error retrieving evidence map') };
  }
}

/**
 * 4. getClaimsForEvidenceMap(evidenceMapId)
 *
 * Lists all claims attached to a specific evidence map record.
 */
export async function getClaimsForEvidenceMap(
  evidenceMapId: string
): Promise<EvidenceServiceResult<ClaimEvidence[]>> {
  if (!supabase) {
    return { data: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from('claim_evidence')
      .select('*')
      .eq('evidence_map_id', evidenceMapId)
      .order('created_at', { ascending: true });

    if (error) {
      return { data: null, error: new Error(`Failed to fetch claims: ${error.message}`) };
    }

    const claims = (data || []).map((c: DbClaimEvidence) => adaptDbClaimToAppClaim(c));
    return { data: claims, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Error fetching claims') };
  }
}

/**
 * 5. getSourceConflicts(evidenceMapId)
 *
 * Lists all source discrepancies attached to a specific evidence map record.
 */
export async function getSourceConflicts(
  evidenceMapId: string
): Promise<EvidenceServiceResult<SourceConflict[]>> {
  if (!supabase) {
    return { data: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from('source_conflicts')
      .select('*')
      .eq('evidence_map_id', evidenceMapId)
      .order('created_at', { ascending: true });

    if (error) {
      return { data: null, error: new Error(`Failed to fetch source conflicts: ${error.message}`) };
    }

    const conflicts = (data || []).map((conf: DbSourceConflict) => adaptDbConflictToAppConflict(conf));
    return { data: conflicts, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Error fetching source conflicts') };
  }
}

/**
 * 6. getDraftEvidencePacket(lessonId, versionId?)
 *
 * Assembles the full draft evidence packet for servant review:
 * - Ingested sources
 * - Current evidence map
 * - Traceable claims
 * - Source conflicts
 * - Verification & unresolved conflict counts
 */
export async function getDraftEvidencePacket(
  lessonId: string,
  versionId?: string
): Promise<EvidenceServiceResult<DraftEvidencePacket>> {
  try {
    // 1. Get attached sources
    const sourcesRes = await listLessonSources(lessonId);
    const sources = sourcesRes.data || [];

    // 2. Get evidence map
    const mapRes = await getEvidenceMap(lessonId, versionId);
    const evidenceMap = mapRes.data;

    const claims = evidenceMap?.importantClaims || [];
    const conflicts = evidenceMap?.conflicts || [];

    const verifiedClaimsCount = claims.filter(c => c.verified).length;
    const unverifiedClaimsCount = claims.length - verifiedClaimsCount;
    const unresolvedConflictsCount = conflicts.filter(c => c.status === 'UNRESOLVED').length;

    return {
      data: {
        lessonId,
        draftVersionId: versionId,
        evidenceMap,
        sources,
        claims,
        conflicts,
        unverifiedClaimsCount,
        verifiedClaimsCount,
        unresolvedConflictsCount
      },
      error: mapRes.error || sourcesRes.error
    };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Failed to assemble draft evidence packet') };
  }
}

/**
 * 7. updateClaimVerification(input)
 *
 * Explicit servant verification action (Requirement 5 & 9):
 * Marks a claim verified or unverified with servant identity and notes.
 */
export async function updateClaimVerification(
  input: UpdateClaimVerificationInput
): Promise<EvidenceServiceResult<ClaimEvidence>> {
  if (!supabase) {
    return {
      data: {
        claimId: input.claimId,
        statementEn: '',
        statementAr: '',
        sourceId: '',
        sourceName: '',
        sourceLocation: '',
        verified: input.isVerified,
        servantReviewStatus: input.servantReviewStatus || (input.isVerified ? 'APPROVED' : 'PENDING'),
        servantReviewNote: input.servantReviewNote
      },
      error: null
    };
  }

  try {
    const servantCheck = await getAuthenticatedServant();
    if (servantCheck.error || !servantCheck.user) {
      return { data: null, error: servantCheck.error };
    }
    const currentUserId = servantCheck.user.id;
    const nowIso = new Date().toISOString();

    const updates: Record<string, any> = {
      is_verified: input.isVerified,
      servant_review_status: input.servantReviewStatus || (input.isVerified ? 'APPROVED' : 'PENDING'),
      servant_review_note: input.servantReviewNote || null,
      reviewed_by: currentUserId,
      reviewed_at: nowIso
    };

    const { data, error } = await supabase
      .from('claim_evidence')
      .update(updates)
      .eq('id', input.claimId)
      .select('*')
      .single();

    if (error || !data) {
      return { data: null, error: new Error(`Failed to update claim verification: ${error?.message}`) };
    }

    return { data: adaptDbClaimToAppClaim(data as DbClaimEvidence), error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Error updating claim verification') };
  }
}

/**
 * 8. resolveSourceConflict(input)
 *
 * Explicit servant resolution action (Requirement 8):
 * Marks a conflict resolved with theological explanation note and servant identity.
 */
export async function resolveSourceConflict(
  input: ResolveConflictInput
): Promise<EvidenceServiceResult<SourceConflict>> {
  if (!supabase) {
    return {
      data: {
        id: input.conflictId,
        sourceAId: '',
        sourceAName: '',
        sourceBId: '',
        sourceBName: '',
        conflictDescriptionEn: '',
        conflictDescriptionAr: '',
        status: 'RESOLVED',
        resolutionNote: input.resolutionNote
      },
      error: null
    };
  }

  try {
    const servantCheck = await getAuthenticatedServant();
    if (servantCheck.error || !servantCheck.user) {
      return { data: null, error: servantCheck.error };
    }
    const currentUserId = servantCheck.user.id;
    const nowIso = new Date().toISOString();

    const updates: Record<string, any> = {
      status: 'RESOLVED',
      resolution_note: input.resolutionNote,
      resolved_by: currentUserId,
      resolved_at: nowIso
    };

    const { data, error } = await supabase
      .from('source_conflicts')
      .update(updates)
      .eq('id', input.conflictId)
      .select('*')
      .single();

    if (error || !data) {
      return { data: null, error: new Error(`Failed to resolve source conflict: ${error?.message}`) };
    }

    return { data: adaptDbConflictToAppConflict(data as DbSourceConflict), error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Error resolving source conflict') };
  }
}
