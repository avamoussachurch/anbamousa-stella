import { supabase } from './supabase';
import { 
  LessonOutline, 
  OutlineSection, 
  LessonVersion, 
  LessonSectionItem, 
  EvidenceMap, 
  LessonSource, 
  QuizDraft, 
  SlideItem, 
  FlashcardItem 
} from '../types';
import { 
  DbLessonVersion, 
  DbLessonSection, 
  DbLessonSectionSource,
  getLessonSections 
} from './curriculumService';
import { listLessonSources } from './lessonSourceService';

/**
 * Normalized database representation of public.lesson_outlines
 */
export interface DbLessonOutline {
  id: string;
  lesson_id: string;
  lesson_version_id?: string | null;
  is_approved_by_teacher: boolean;
  approved_at?: string | null;
  created_by?: string | null;
  created_at: string;
}

/**
 * Normalized database representation of public.lesson_outline_sections
 */
export interface DbLessonOutlineSection {
  id: string;
  outline_id: string;
  order_index: number;
  title_en: string;
  title_ar: string;
  title_cop?: string | null;
  objective_en: string;
  objective_ar: string;
  source_refs?: any[] | null;
  created_at: string;
}

export interface GenerationResult<T> {
  data: T | null;
  error: Error | null;
}

export interface BuildOutlineInput {
  lessonId: string;
  draftVersionId: string;
  evidenceMapId?: string;
  lessonTitle?: string;
  gradeLevel?: string;
  ageGroup?: string;
  objectives?: string;
  evidenceMap: EvidenceMap;
  sources?: LessonSource[];
  allowInternetSearch?: boolean;
}

export interface SaveOutlineInput {
  lessonId: string;
  draftVersionId: string;
  outline: LessonOutline;
}

export interface GenerateLessonDraftInput {
  lessonId: string;
  draftVersionId: string;
  evidenceMapId?: string;
  lessonTitle?: string;
  gradeLevel?: string;
  ageGroup?: string;
  objectives?: string;
  outline: LessonOutline;
  evidenceMap: EvidenceMap;
  sources?: LessonSource[];
  allowInternetSearch?: boolean;
}

export interface SaveLessonDraftInput {
  lessonId: string;
  draftVersionId: string;
  version: LessonVersion;
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
    return { user: null, error: new Error('Authentication required for curriculum generation operations') };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  const finalRole = profile?.role || 'student';
  if (finalRole !== 'teacher' && finalRole !== 'admin') {
    return { user: null, error: new Error('Only servants, teachers, and administrators may generate curriculum drafts') };
  }

  return { user: { id: user.id, role: finalRole }, error: null };
}

/**
 * 1. buildLessonOutline(input)
 *
 * Controlled generation of lesson outline from Evidence Map:
 * - Requires explicit lessonId and draftVersionId (Requirement 1)
 * - Bound strictly to the provided evidenceMap (Requirement 4)
 * - Closed-source guard: allowInternetSearch is false by default
 * - Returns an unapproved outline ready for servant review
 */
export async function buildLessonOutline(
  input: BuildOutlineInput
): Promise<GenerationResult<LessonOutline>> {
  try {
    // 1. Enforce strict version provenance (Requirement 1)
    if (!input.lessonId || !input.lessonId.trim()) {
      return { data: null, error: new Error('lessonId is required to build a lesson outline') };
    }
    if (!input.draftVersionId || !input.draftVersionId.trim()) {
      return { data: null, error: new Error('draftVersionId is required to build a lesson outline. Ambiguous version provenance rejected.') };
    }
    const effectiveEvidenceMapId = input.evidenceMapId || input.evidenceMap?.id;
    if (!effectiveEvidenceMapId || !effectiveEvidenceMapId.trim()) {
      return { data: null, error: new Error('evidenceMapId is required to build a lesson outline. Ambiguous evidence provenance rejected.') };
    }
    if (!input.evidenceMap) {
      return { data: null, error: new Error('Evidence map is required to synthesize lesson outline') };
    }

    // Verify evidence map belongs to the same lesson and draft version
    if (input.evidenceMap.lessonId && input.evidenceMap.lessonId !== input.lessonId) {
      return { data: null, error: new Error('Evidence map belongs to another lesson') };
    }
    if (input.evidenceMap.lessonVersionId && input.evidenceMap.lessonVersionId !== input.draftVersionId) {
      return { data: null, error: new Error('Evidence map belongs to another version') };
    }

    // Database verification if online
    if (supabase) {
      const servantCheck = await getAuthenticatedServant();
      if (servantCheck.user) {
        const { data: verRow } = await supabase
          .from('lesson_versions')
          .select('id, lesson_id, version_number, status, created_by')
          .eq('id', input.draftVersionId)
          .maybeSingle();

        if (verRow) {
          if (verRow.lesson_id !== input.lessonId) {
            return { data: null, error: new Error('Draft version belongs to another lesson') };
          }
          if (verRow.status === 'PUBLISHED' || verRow.status === 'APPROVED') {
            return { data: null, error: new Error(`Cannot generate outline for version ${verRow.version_number}: It is ${verRow.status}. Published versions are immutable.`) };
          }
          if (verRow.created_by && verRow.created_by !== servantCheck.user.id && servantCheck.user.role !== 'admin') {
            return { data: null, error: new Error('Cannot generate into another teacher\'s draft lesson') };
          }
        }

        const { data: dbMap } = await supabase
          .from('evidence_maps')
          .select('id, lesson_id, lesson_version_id')
          .eq('id', effectiveEvidenceMapId)
          .maybeSingle();

        if (dbMap) {
          if (dbMap.lesson_id !== input.lessonId) {
            return { data: null, error: new Error('Evidence map belongs to another lesson') };
          }
          if (dbMap.lesson_version_id && dbMap.lesson_version_id !== input.draftVersionId) {
            return { data: null, error: new Error('Evidence map belongs to another version') };
          }
        }
      }
    }

    // 2. Resolve sources if not supplied
    let sources = input.sources;
    if (!sources || sources.length === 0) {
      const srcRes = await listLessonSources(input.lessonId);
      sources = srcRes.data || [];
    }

    // 3. Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      } catch {}
    }

    const payload = {
      lessonId: input.lessonId,
      draftVersionId: input.draftVersionId,
      evidenceMapId: effectiveEvidenceMapId,
      lessonTitle: input.lessonTitle,
      grade: input.gradeLevel,
      ageGroup: input.ageGroup,
      objectives: input.objectives,
      evidenceMap: input.evidenceMap,
      sources: (sources || []).map(s => ({
        id: s.id,
        type: s.type,
        originalFilename: s.originalFilename,
        priority: s.priority || 'PRIMARY',
        content: s.extractedContent || s.transcript || s.teacherNotes || ''
      })),
      allowInternetSearch: Boolean(input.allowInternetSearch)
    };

    const res = await fetch('/api/church/create-outline', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      return {
        data: null,
        error: new Error(errJson?.message || errJson?.error || `Failed to create outline: Server returned ${res.status}`)
      };
    }

    const data = await res.json();
    const rawSections = Array.isArray(data.sections) ? data.sections : [];

    const outlineSections: OutlineSection[] = rawSections.map((s: any, idx: number) => ({
      id: s.id || `sec-${idx + 1}`,
      order: s.order ?? (idx + 1),
      titleEn: s.titleEn || `Section ${idx + 1}`,
      titleAr: s.titleAr || `القسم ${idx + 1}`,
      titleCop: s.titleCop || undefined,
      objectiveEn: s.objectiveEn || '',
      objectiveAr: s.objectiveAr || '',
      sourceRefs: Array.isArray(s.sourceRefs) ? s.sourceRefs : []
    }));

    const outline: LessonOutline = {
      id: generateUuid(),
      lessonId: input.lessonId,
      draftVersionId: input.draftVersionId,
      sections: outlineSections,
      isApprovedByTeacher: false, // Mandatory: Must start unapproved
      approvedAt: undefined
    };

    // Auto-save outline if online
    if (supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await saveLessonOutline({
            lessonId: input.lessonId,
            draftVersionId: input.draftVersionId,
            outline
          });
        }
      } catch (err) {
        console.warn('Note on online outline auto-save:', err);
      }
    }

    return { data: outline, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Failed to build lesson outline') };
  }
}

/**
 * 2. saveLessonOutline(input)
 *
 * Persists outline into public.lesson_outlines and public.lesson_outline_sections
 */
export async function saveLessonOutline(
  input: SaveOutlineInput
): Promise<GenerationResult<LessonOutline>> {
  if (!supabase) {
    return { data: input.outline, error: null };
  }

  try {
    if (!input.lessonId || !input.draftVersionId) {
      return { data: null, error: new Error('lessonId and draftVersionId are required to save an outline') };
    }

    const servantCheck = await getAuthenticatedServant();
    if (servantCheck.error || !servantCheck.user) {
      return { data: null, error: servantCheck.error };
    }
    const currentUserId = servantCheck.user.id;

    // Verify target lesson exists and check teacher ownership
    const { data: lessonRow, error: lessonErr } = await supabase
      .from('lessons')
      .select('id, created_by')
      .eq('id', input.lessonId)
      .maybeSingle();

    if (lessonErr || !lessonRow) {
      return { data: null, error: new Error('Target lesson not found') };
    }

    if (lessonRow.created_by && lessonRow.created_by !== currentUserId && servantCheck.user.role !== 'admin') {
      return { data: null, error: new Error('Cannot save outline for another teacher\'s draft lesson') };
    }

    const outlineId = input.outline.id || generateUuid();
    const nowIso = new Date().toISOString();

    const outlinePayload = {
      id: outlineId,
      lesson_id: input.lessonId,
      lesson_version_id: input.draftVersionId,
      is_approved_by_teacher: Boolean(input.outline.isApprovedByTeacher),
      approved_at: input.outline.approvedAt || null,
      created_by: currentUserId,
      created_at: nowIso
    };

    const { error: outlineErr } = await supabase
      .from('lesson_outlines')
      .insert(outlinePayload);

    if (outlineErr) {
      return { data: null, error: new Error(`Failed to save lesson outline: ${outlineErr.message}`) };
    }

    // Insert sections into public.lesson_outline_sections
    const sections = input.outline.sections || [];
    if (sections.length > 0) {
      const sectionPayloads = sections.map((s, idx) => ({
        id: s.id || generateUuid(),
        outline_id: outlineId,
        order_index: s.order ?? (idx + 1),
        title_en: s.titleEn,
        title_ar: s.titleAr,
        title_cop: s.titleCop || null,
        objective_en: s.objectiveEn,
        objective_ar: s.objectiveAr,
        source_refs: s.sourceRefs || [],
        created_at: nowIso
      }));

      const { error: secErr } = await supabase
        .from('lesson_outline_sections')
        .insert(sectionPayloads);

      if (secErr) {
        return { data: null, error: new Error(`Failed to save outline sections: ${secErr.message}`) };
      }
    }

    return { 
      data: {
        ...input.outline,
        id: outlineId,
        lessonId: input.lessonId,
        draftVersionId: input.draftVersionId
      }, 
      error: null 
    };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Error saving outline') };
  }
}

/**
 * 3. getLessonOutline(lessonId, draftVersionId?)
 *
 * Retrieves the stored outline for a lesson/version.
 */
export async function getLessonOutline(
  lessonId: string,
  draftVersionId?: string
): Promise<GenerationResult<LessonOutline | null>> {
  if (!supabase) {
    return { data: null, error: null };
  }

  try {
    let query = supabase
      .from('lesson_outlines')
      .select('*')
      .eq('lesson_id', lessonId);

    if (draftVersionId) {
      query = query.eq('lesson_version_id', draftVersionId);
    }

    const { data: outlines, error: outErr } = await query
      .order('created_at', { ascending: false })
      .limit(1);

    if (outErr) {
      return { data: null, error: new Error(`Failed to fetch lesson outlines: ${outErr.message}`) };
    }

    if (!outlines || outlines.length === 0) {
      return { data: null, error: null };
    }

    const dbOutline = outlines[0] as DbLessonOutline;

    // Fetch outline sections
    const { data: dbSections, error: secErr } = await supabase
      .from('lesson_outline_sections')
      .select('*')
      .eq('outline_id', dbOutline.id)
      .order('order_index', { ascending: true });

    if (secErr) {
      return { data: null, error: new Error(`Failed to fetch outline sections: ${secErr.message}`) };
    }

    const sections: OutlineSection[] = (dbSections || []).map((s: DbLessonOutlineSection) => ({
      id: s.id,
      order: s.order_index,
      titleEn: s.title_en,
      titleAr: s.title_ar,
      titleCop: s.title_cop || undefined,
      objectiveEn: s.objective_en,
      objectiveAr: s.objective_ar,
      sourceRefs: Array.isArray(s.source_refs) ? s.source_refs : []
    }));

    return {
      data: {
        id: dbOutline.id,
        lessonId: dbOutline.lesson_id,
        draftVersionId: dbOutline.lesson_version_id || undefined,
        sections,
        isApprovedByTeacher: Boolean(dbOutline.is_approved_by_teacher),
        approvedAt: dbOutline.approved_at || undefined
      },
      error: null
    };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Error fetching outline') };
  }
}

/**
 * 4. generateLessonDraft(input)
 *
 * Executes the full controlled draft synthesis pipeline:
 * Teacher Sources -> Evidence Map -> Outline -> Lesson Version Draft -> Normalized Sections.
 *
 * Safety Guarantees:
 * - Requires explicit lessonId and draftVersionId (Requirement 1)
 * - Status is strictly AI_DRAFT (Requirement 7)
 * - active_version_id is NEVER modified (Requirement 7)
 * - Approved/published status is NEVER set (Requirement 7 & 10)
 * - Preserves provenance and citations in each section (Requirement 9)
 * - Does not fabricate pseudo-Coptic words (Requirement 8 & 11)
 * - Idempotently saves to database if online (Requirement 13)
 */
export async function generateLessonDraft(
  input: GenerateLessonDraftInput
): Promise<GenerationResult<LessonVersion>> {
  try {
    // 1. Strict version provenance checks (Requirement 1)
    if (!input.lessonId || !input.lessonId.trim()) {
      return { data: null, error: new Error('lessonId is required to generate curriculum draft') };
    }
    if (!input.draftVersionId || !input.draftVersionId.trim()) {
      return { data: null, error: new Error('draftVersionId is required to generate curriculum draft. Ambiguous version provenance rejected.') };
    }
    if (!input.outline || !Array.isArray(input.outline.sections) || input.outline.sections.length === 0) {
      return { data: null, error: new Error('Lesson outline with sections is required before generating curriculum draft') };
    }
    if (input.outline.lessonId && input.outline.lessonId !== input.lessonId) {
      return { data: null, error: new Error('Lesson outline belongs to another lesson') };
    }
    if (input.outline.draftVersionId && input.outline.draftVersionId !== input.draftVersionId) {
      return { data: null, error: new Error('Lesson outline belongs to another version') };
    }

    const effectiveEvidenceMapId = input.evidenceMapId || input.evidenceMap?.id;
    if (!effectiveEvidenceMapId || !effectiveEvidenceMapId.trim()) {
      return { data: null, error: new Error('evidenceMapId is required to generate curriculum draft. Ambiguous evidence provenance rejected.') };
    }
    if (!input.evidenceMap) {
      return { data: null, error: new Error('Evidence map is required to generate curriculum draft') };
    }

    // Verify evidence map belongs to the same lesson and draft version
    if (input.evidenceMap.lessonId && input.evidenceMap.lessonId !== input.lessonId) {
      return { data: null, error: new Error('Evidence map belongs to another lesson') };
    }
    if (input.evidenceMap.lessonVersionId && input.evidenceMap.lessonVersionId !== input.draftVersionId) {
      return { data: null, error: new Error('Evidence map belongs to another version') };
    }

    // Database verification if online
    if (supabase) {
      const servantCheck = await getAuthenticatedServant();
      if (servantCheck.user) {
        const { data: verRow } = await supabase
          .from('lesson_versions')
          .select('id, lesson_id, version_number, status, created_by')
          .eq('id', input.draftVersionId)
          .maybeSingle();

        if (verRow) {
          if (verRow.lesson_id !== input.lessonId) {
            return { data: null, error: new Error('Draft version belongs to another lesson') };
          }
          if (verRow.status === 'PUBLISHED' || verRow.status === 'APPROVED') {
            return { data: null, error: new Error(`Cannot generate into version ${verRow.version_number}: It is ${verRow.status}. Published versions are immutable.`) };
          }
          if (verRow.created_by && verRow.created_by !== servantCheck.user.id && servantCheck.user.role !== 'admin') {
            return { data: null, error: new Error('Cannot generate into another teacher\'s draft lesson') };
          }
        }

        const { data: dbMap } = await supabase
          .from('evidence_maps')
          .select('id, lesson_id, lesson_version_id')
          .eq('id', effectiveEvidenceMapId)
          .maybeSingle();

        if (dbMap) {
          if (dbMap.lesson_id !== input.lessonId) {
            return { data: null, error: new Error('Evidence map belongs to another lesson') };
          }
          if (dbMap.lesson_version_id && dbMap.lesson_version_id !== input.draftVersionId) {
            return { data: null, error: new Error('Evidence map belongs to another version') };
          }
        }
      }
    }

    // 2. Resolve sources
    let sources = input.sources;
    if (!sources || sources.length === 0) {
      const srcRes = await listLessonSources(input.lessonId);
      sources = srcRes.data || [];
    }

    // 3. Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      } catch {}
    }

    const payload = {
      lessonId: input.lessonId,
      draftVersionId: input.draftVersionId,
      evidenceMapId: effectiveEvidenceMapId,
      lessonTitle: input.lessonTitle,
      grade: input.gradeLevel,
      ageGroup: input.ageGroup,
      objectives: input.objectives,
      outline: input.outline,
      evidenceMap: input.evidenceMap,
      sources: (sources || []).map(s => ({
        id: s.id,
        type: s.type,
        originalFilename: s.originalFilename,
        priority: s.priority || 'PRIMARY',
        content: s.extractedContent || s.transcript || s.teacherNotes || ''
      })),
      allowInternetSearch: Boolean(input.allowInternetSearch)
    };

    const res = await fetch('/api/church/generate-lesson-pipeline', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      return {
        data: null,
        error: new Error(errJson?.message || errJson?.error || `Failed to generate lesson draft: Server returned ${res.status}`)
      };
    }

    const data = await res.json();
    const lessonData = data.lessonData || data;

    // 4. Assemble normalized sections preserving citations (Requirement 8 & 9)
    const rawSections = Array.isArray(lessonData.sections) ? lessonData.sections : [];
    const normalizedSections: LessonSectionItem[] = rawSections.map((s: any, idx: number) => ({
      id: s.id || `sec-${idx + 1}`,
      order: s.order ?? (idx + 1),
      titleEn: s.titleEn || `Section ${idx + 1}`,
      titleAr: s.titleAr || `القسم ${idx + 1}`,
      titleCop: s.titleCop || undefined,
      contentEn: s.contentEn || '',
      contentAr: s.contentAr || '',
      contentCop: s.contentCop || undefined,
      sourceRefs: Array.isArray(s.sourceRefs) ? s.sourceRefs : [],
      teacherNotes: s.teacherNotes || undefined,
      hasUnresolvedComments: false
    }));

    // 5. Build assembled LessonVersion object
    // MANDATORY: status is strictly AI_DRAFT. Never APPROVED or PUBLISHED.
    const assembledVersion: LessonVersion = {
      id: input.draftVersionId,
      lessonId: input.lessonId,
      versionNumber: 1, // Will be preserved by saveLessonDraft from database row
      status: 'AI_DRAFT', // STRICT REQUIREMENT: AI generation only produces draft
      createdBy: '', // Will be preserved or set to authenticated user
      createdAt: new Date().toISOString(),
      summaryEn: lessonData.summaryEn || '',
      summaryAr: lessonData.summaryAr || '',
      summaryCop: lessonData.summaryCop || undefined,
      bigIdeaEn: lessonData.bigIdeaEn || '',
      bigIdeaAr: lessonData.bigIdeaAr || '',
      objectivesEn: Array.isArray(lessonData.objectivesEn) ? lessonData.objectivesEn : [],
      objectivesAr: Array.isArray(lessonData.objectivesAr) ? lessonData.objectivesAr : [],
      sections: normalizedSections,
      recapEn: lessonData.recapEn || '',
      recapAr: lessonData.recapAr || '',
      flashcards: Array.isArray(lessonData.flashcards) ? lessonData.flashcards : [],
      slides: Array.isArray(lessonData.slides) ? lessonData.slides : [],
      quizDraft: (lessonData.quizDraft as QuizDraft) || {
        id: `quiz-${input.draftVersionId}`,
        lessonId: input.lessonId,
        titleEn: `Quiz: ${input.lessonTitle || 'Lesson Assessment'}`,
        titleAr: 'تقييم الدرس',
        instructionsEn: 'Answer the questions based on the lesson.',
        instructionsAr: 'أجب عن الأسئلة بناء على ما تم شرحه.',
        questions: [],
        status: 'DRAFT'
      },
      narrationScriptEn: lessonData.narrationScriptEn || '',
      narrationScriptAr: lessonData.narrationScriptAr || '',
      ttsStatus: 'NONE'
    };

    // 6. Idempotently persist to database if online (Requirement 13)
    if (supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const saveRes = await saveLessonDraft({
            lessonId: input.lessonId,
            draftVersionId: input.draftVersionId,
            version: assembledVersion
          });

          if (saveRes.error) {
            console.warn('Note on online draft save:', saveRes.error.message);
            return { data: assembledVersion, error: saveRes.error };
          }

          if (saveRes.data) {
            return { data: saveRes.data, error: null };
          }
        }
      } catch (err) {
        console.warn('Online draft save error:', err);
      }
    }

    return { data: assembledVersion, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Failed to generate lesson draft') };
  }
}

/**
 * 5. saveLessonDraft(input)
 *
 * Persists generated lesson draft into public.lesson_versions and public.lesson_sections.
 *
 * Safety & Immutability Rules:
 * - Refuses to overwrite PUBLISHED or APPROVED versions (Requirement 7 & 13)
 * - Refuses to modify another teacher's draft (Requirement 1)
 * - Replaces lesson_sections idempotently for this draftVersionId
 * - Strictly keeps status = 'AI_DRAFT' (or existing draft status)
 * - Never touches active_version_id or approved_by/approved_at
 */
export async function saveLessonDraft(
  input: SaveLessonDraftInput
): Promise<GenerationResult<LessonVersion>> {
  if (!supabase) {
    return { data: input.version, error: null };
  }

  try {
    const servantCheck = await getAuthenticatedServant();
    if (servantCheck.error || !servantCheck.user) {
      return { data: null, error: servantCheck.error };
    }
    const currentUserId = servantCheck.user.id;
    const currentUserRole = servantCheck.user.role;

    // 1. Fetch current draft version record to verify editable state & immutability
    const { data: verRow, error: verErr } = await supabase
      .from('lesson_versions')
      .select('*')
      .eq('id', input.draftVersionId)
      .maybeSingle();

    if (verErr) {
      return { data: null, error: new Error(`Failed to query target draft version: ${verErr.message}`) };
    }

    if (!verRow) {
      return { data: null, error: new Error('Target draft version not found in database') };
    }

    // Immutability Protection: Cannot overwrite PUBLISHED or APPROVED version!
    if (verRow.status === 'PUBLISHED' || verRow.status === 'APPROVED') {
      return { 
        data: null, 
        error: new Error(`Cannot overwrite version ${verRow.version_number}: It is ${verRow.status}. Published versions are immutable.`) 
      };
    }

    // Ownership check: Teacher cannot edit another teacher's draft
    if (verRow.created_by !== currentUserId && currentUserRole !== 'admin') {
      return { data: null, error: new Error('Cannot modify another teacher\'s draft version') };
    }

    const nowIso = new Date().toISOString();

    // 2. Update public.lesson_versions row
    // STRICT: Maintain status as AI_DRAFT. Never set APPROVED or PUBLISHED.
    const versionUpdatePayload: Record<string, any> = {
      summary_en: input.version.summaryEn || '',
      summary_ar: input.version.summaryAr || '',
      summary_cop: input.version.summaryCop || null,
      big_idea_en: input.version.bigIdeaEn || '',
      big_idea_ar: input.version.bigIdeaAr || '',
      objectives_en: input.version.objectivesEn || [],
      objectives_ar: input.version.objectivesAr || [],
      recap_en: input.version.recapEn || '',
      recap_ar: input.version.recapAr || '',
      narration_script_en: input.version.narrationScriptEn || '',
      narration_script_ar: input.version.narrationScriptAr || '',
      quiz_draft: input.version.quizDraft || null,
      slides: input.version.slides || [],
      flashcards: input.version.flashcards || [],
      status: 'AI_DRAFT' // Enforce draft status
    };

    const { error: updateVerErr } = await supabase
      .from('lesson_versions')
      .update(versionUpdatePayload)
      .eq('id', input.draftVersionId);

    if (updateVerErr) {
      return { data: null, error: new Error(`Failed to update lesson version: ${updateVerErr.message}`) };
    }

    // 3. Idempotently replace lesson_sections (Requirement 13)
    // Find existing sections for this draftVersionId to clean up section source links first
    const { data: existingSecs } = await supabase
      .from('lesson_sections')
      .select('id')
      .eq('lesson_version_id', input.draftVersionId);

    if (existingSecs && existingSecs.length > 0) {
      const existingSecIds = existingSecs.map((s: any) => s.id);
      try {
        await supabase
          .from('lesson_section_sources')
          .delete()
          .in('section_id', existingSecIds);
      } catch (err: any) {
        console.warn('Note on clearing previous section sources:', err);
      }
    }

    // Delete existing sections for this draftVersionId to prevent duplicates
    await supabase
      .from('lesson_sections')
      .delete()
      .eq('lesson_version_id', input.draftVersionId);

    const sections = input.version.sections || [];
    const insertedSections: LessonSectionItem[] = [];

    if (sections.length > 0) {
      const sectionRows = sections.map((s, idx) => ({
        id: s.id || generateUuid(),
        lesson_version_id: input.draftVersionId,
        order_index: s.order ?? (idx + 1),
        title_en: s.titleEn,
        title_ar: s.titleAr || s.titleEn,
        title_cop: s.titleCop || null,
        content_en: s.contentEn,
        content_ar: s.contentAr || '',
        content_cop: s.contentCop || null,
        teacher_notes: s.teacherNotes || null,
        created_at: nowIso
      }));

      const { data: insertedSecData, error: secInsertErr } = await supabase
        .from('lesson_sections')
        .insert(sectionRows)
        .select('*');

      if (secInsertErr) {
        return { data: null, error: new Error(`Failed to persist lesson sections: ${secInsertErr.message}`) };
      }

      // 4. Insert section source citations into public.lesson_section_sources (Requirement 9)
      const sectionSourceRows: any[] = [];
      sections.forEach((s, idx) => {
        const secId = insertedSecData?.[idx]?.id || s.id;
        if (s.sourceRefs && s.sourceRefs.length > 0) {
          s.sourceRefs.forEach(sr => {
            sectionSourceRows.push({
              id: generateUuid(),
              section_id: secId,
              source_id: sr.sourceId,
              location: sr.location || null
            });
          });
        }
      });

      if (sectionSourceRows.length > 0) {
        try {
          await supabase
            .from('lesson_section_sources')
            .insert(sectionSourceRows);
        } catch (err: any) {
          console.warn('Note on section source citations persistence:', err);
        }
      }

      if (insertedSecData) {
        for (let i = 0; i < insertedSecData.length; i++) {
          const s = insertedSecData[i] as DbLessonSection;
          insertedSections.push({
            id: s.id,
            order: s.order_index ?? s.order ?? (i + 1),
            titleEn: s.title_en,
            titleAr: s.title_ar,
            titleCop: s.title_cop || undefined,
            contentEn: s.content_en,
            contentAr: s.content_ar,
            contentCop: s.content_cop || undefined,
            sourceRefs: sections[i]?.sourceRefs || [],
            teacherNotes: s.teacher_notes || undefined,
            hasUnresolvedComments: false
          });
        }
      }
    }

    const assembledVersion: LessonVersion = {
      ...input.version,
      id: input.draftVersionId,
      lessonId: input.lessonId,
      versionNumber: verRow.version_number,
      status: 'AI_DRAFT',
      createdBy: verRow.created_by,
      createdAt: verRow.created_at,
      sections: insertedSections.length > 0 ? insertedSections : input.version.sections
    };

    return { data: assembledVersion, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Error saving lesson draft') };
  }
}

/**
 * 6. getLessonDraft(lessonId, draftVersionId)
 *
 * Retrieves a specific draft version and its sections.
 */
export async function getLessonDraft(
  lessonId: string,
  draftVersionId: string
): Promise<GenerationResult<LessonVersion | null>> {
  if (!supabase) {
    return { data: null, error: null };
  }

  try {
    const { data: verRow, error: verErr } = await supabase
      .from('lesson_versions')
      .select('*')
      .eq('id', draftVersionId)
      .eq('lesson_id', lessonId)
      .maybeSingle();

    if (verErr || !verRow) {
      return { data: null, error: verErr ? new Error(verErr.message) : null };
    }

    const sectionsRes = await getLessonSections(draftVersionId);
    const sections = sectionsRes.data || [];

    const version: LessonVersion = {
      id: verRow.id,
      lessonId: verRow.lesson_id,
      versionNumber: verRow.version_number,
      status: verRow.status,
      createdBy: verRow.created_by,
      createdAt: verRow.created_at,
      summaryEn: verRow.summary_en || '',
      summaryAr: verRow.summary_ar || '',
      summaryCop: verRow.summary_cop || undefined,
      bigIdeaEn: verRow.big_idea_en || '',
      bigIdeaAr: verRow.big_idea_ar || '',
      objectivesEn: verRow.objectives_en || [],
      objectivesAr: verRow.objectives_ar || [],
      sections,
      recapEn: verRow.recap_en || '',
      recapAr: verRow.recap_ar || '',
      slides: verRow.slides || [],
      flashcards: verRow.flashcards || [],
      quizDraft: verRow.quiz_draft || undefined,
      narrationScriptEn: verRow.narration_script_en || '',
      narrationScriptAr: verRow.narration_script_ar || '',
      ttsStatus: verRow.tts_status || 'NONE'
    };

    return { data: version, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Error getting lesson draft') };
  }
}
