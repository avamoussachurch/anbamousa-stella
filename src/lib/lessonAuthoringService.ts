import { supabase } from './supabase';
import { 
  Lesson, 
  LessonVersion, 
  LessonSectionItem, 
  QuizDraft, 
  QuizQuestionDraft 
} from '../types';
import { 
  DbLesson, 
  DbLessonVersion, 
  DbLessonSection, 
  adaptDbLessonToAppLesson,
  getLessonSections,
  getLessonSourcesForLesson
} from './curriculumService';

export interface CreateLessonDraftInput {
  titleEn: string;
  titleAr?: string;
  category?: 'bible' | 'hymns' | 'history' | 'virtues';
  gradeLevel?: string;
  summaryEn?: string;
  summaryAr?: string;
  summaryCop?: string;
  bigIdeaEn?: string;
  bigIdeaAr?: string;
  objectivesEn?: string[];
  objectivesAr?: string[];
  recapEn?: string;
  recapAr?: string;
  scriptureVerseEn?: string;
  scriptureVerseAr?: string;
  verseReference?: string;
  sections?: Array<{
    id?: string;
    titleEn: string;
    titleAr?: string;
    titleCop?: string;
    contentEn: string;
    contentAr?: string;
    contentCop?: string;
    order?: number;
    teacherNotes?: string;
  }>;
  quizDraft?: QuizDraft;
  slides?: any[];
  flashcards?: any[];
  narrationScriptEn?: string;
  narrationScriptAr?: string;
}

export interface UpdateLessonDraftInput {
  // Draft metadata (stored on root lesson)
  titleEn?: string;
  titleAr?: string;
  category?: 'bible' | 'hymns' | 'history' | 'virtues';
  gradeLevel?: string;
  scriptureVerseEn?: string;
  scriptureVerseAr?: string;
  verseReference?: string;

  // Versioned curriculum content (stored on editable version)
  versionId?: string;
  summaryEn?: string;
  summaryAr?: string;
  summaryCop?: string;
  bigIdeaEn?: string;
  bigIdeaAr?: string;
  objectivesEn?: string[];
  objectivesAr?: string[];
  recapEn?: string;
  recapAr?: string;
  quizDraft?: QuizDraft;
  slides?: any[];
  flashcards?: any[];
  narrationScriptEn?: string;
  narrationScriptAr?: string;
  sections?: Array<{
    id?: string;
    titleEn: string;
    titleAr?: string;
    titleCop?: string;
    contentEn: string;
    contentAr?: string;
    contentCop?: string;
    order?: number;
    teacherNotes?: string;
  }>;
}

export interface LessonSectionInput {
  id?: string;
  titleEn: string;
  titleAr?: string;
  titleCop?: string;
  contentEn: string;
  contentAr?: string;
  contentCop?: string;
  order?: number;
  teacherNotes?: string;
}

export interface AuthoringResult<T> {
  data: T | null;
  error: Error | null;
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
    return { user: null, error: new Error('Authentication required for online lesson authoring') };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  const finalRole = profile?.role || 'student';
  if (finalRole !== 'teacher' && finalRole !== 'admin') {
    return { user: null, error: new Error('Only servants, teachers, and administrators may author curriculum lessons') };
  }

  return { user: { id: user.id, role: finalRole }, error: null };
}

/**
 * 1. createLessonDraft(input)
 *
 * When a servant creates a new curriculum lesson online:
 * - Creates the root public.lessons record in its initial safe draft state:
 *     - lesson_status = 'draft'
 *     - active_version_id = null (DO NOT SET!)
 *     - points_reward = 100 (publication-controlled default)
 *     - approved_by / approved_at = null
 * - Creates the initial public.lesson_versions record:
 *     - status = 'AI_DRAFT'
 *     - version_number = 1
 *     - created_by = authenticated servant ID
 *     - lesson_id = root lesson ID
 * - Inserts any initial lesson_sections.
 * - The lesson is NOT student-visible (active_version_id is null, status is AI_DRAFT).
 */
export async function createLessonDraft(
  input: CreateLessonDraftInput
): Promise<AuthoringResult<{ lesson: Lesson; version: LessonVersion }>> {
  try {
    const servantCheck = await getAuthenticatedServant();
    if (servantCheck.error || !servantCheck.user) {
      return { data: null, error: servantCheck.error };
    }
    const currentUserId = servantCheck.user.id;

    if (!input.titleEn || !input.titleEn.trim()) {
      return { data: null, error: new Error('Lesson title in English is required') };
    }

    const titleEn = input.titleEn.trim();
    const titleAr = (input.titleAr && input.titleAr.trim()) ? input.titleAr.trim() : titleEn;
    const category = input.category || 'bible';
    const gradeLevel = input.gradeLevel || '4th Grade';
    const nowIso = new Date().toISOString();
    const lessonId = generateUuid();
    const versionId = generateUuid();

    // 1. Insert root public.lessons record in safe draft state
    // Note: Do NOT set active_version_id or publication fields
    const rootLessonPayload = {
      id: lessonId,
      title_en: titleEn,
      title_ar: titleAr,
      category,
      grade_level: gradeLevel,
      summary_en: input.summaryEn || null,
      summary_ar: input.summaryAr || null,
      scripture_verse_en: input.scriptureVerseEn || null,
      scripture_verse_ar: input.scriptureVerseAr || null,
      verse_reference: input.verseReference || null,
      points_reward: 100, // Frozen publication-controlled default
      active_version_id: null, // STRICT: Must NOT point to unapproved draft
      lesson_status: 'draft',
      status: 'draft',
      created_by: currentUserId,
      created_at: nowIso
    };

    const { error: rootErr } = await supabase!
      .from('lessons')
      .insert(rootLessonPayload);

    if (rootErr) {
      return { data: null, error: new Error(`Failed to create lesson draft: ${rootErr.message}`) };
    }

    // 2. Insert first public.lesson_versions record with status = 'AI_DRAFT'
    const versionPayload = {
      id: versionId,
      lesson_id: lessonId,
      version_number: 1,
      status: 'AI_DRAFT',
      created_by: currentUserId,
      created_at: nowIso,
      summary_en: input.summaryEn || '',
      summary_ar: input.summaryAr || '',
      summary_cop: input.summaryCop || null,
      big_idea_en: input.bigIdeaEn || '',
      big_idea_ar: input.bigIdeaAr || '',
      objectives_en: Array.isArray(input.objectivesEn) ? input.objectivesEn : [],
      objectives_ar: Array.isArray(input.objectivesAr) ? input.objectivesAr : [],
      recap_en: input.recapEn || '',
      recap_ar: input.recapAr || '',
      narration_script_en: input.narrationScriptEn || '',
      narration_script_ar: input.narrationScriptAr || '',
      quiz_draft: input.quizDraft || null,
      slides: Array.isArray(input.slides) ? input.slides : [],
      flashcards: Array.isArray(input.flashcards) ? input.flashcards : [],
      tts_status: 'NONE'
    };

    const { error: verErr } = await supabase!
      .from('lesson_versions')
      .insert(versionPayload);

    if (verErr) {
      // Rollback root lesson if version insert failed
      await supabase!.from('lessons').delete().eq('id', lessonId);
      return { data: null, error: new Error(`Failed to create version 1 draft: ${verErr.message}`) };
    }

    // 3. Insert sections if provided
    const insertedSections: LessonSectionItem[] = [];
    if (input.sections && input.sections.length > 0) {
      const sectionRows = input.sections.map((s, idx) => ({
        id: s.id || generateUuid(),
        lesson_version_id: versionId,
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

      const { data: secData, error: secErr } = await supabase!
        .from('lesson_sections')
        .insert(sectionRows)
        .select('*');

      if (!secErr && secData) {
        for (const s of secData as DbLessonSection[]) {
          insertedSections.push({
            id: s.id,
            order: s.order_index ?? s.order ?? 1,
            titleEn: s.title_en,
            titleAr: s.title_ar,
            titleCop: s.title_cop || undefined,
            contentEn: s.content_en,
            contentAr: s.content_ar,
            contentCop: s.content_cop || undefined,
            sourceRefs: [],
            teacherNotes: s.teacher_notes || undefined,
            hasUnresolvedComments: false
          });
        }
      }
    }

    // 4. Assemble constructed Version and Lesson objects
    const assembledVersion: LessonVersion = {
      id: versionId,
      lessonId,
      versionNumber: 1,
      status: 'AI_DRAFT',
      createdBy: currentUserId,
      createdAt: nowIso,
      summaryEn: input.summaryEn || '',
      summaryAr: input.summaryAr || '',
      summaryCop: input.summaryCop || undefined,
      bigIdeaEn: input.bigIdeaEn || '',
      bigIdeaAr: input.bigIdeaAr || '',
      objectivesEn: input.objectivesEn || [],
      objectivesAr: input.objectivesAr || [],
      sections: insertedSections,
      recapEn: input.recapEn || '',
      recapAr: input.recapAr || '',
      flashcards: input.flashcards || [],
      slides: input.slides || [],
      quizDraft: input.quizDraft || {
        id: `quiz-${versionId}`,
        lessonId,
        titleEn: `Quiz: ${titleEn}`,
        titleAr: `تقييم: ${titleAr}`,
        instructionsEn: 'Test your understanding of what was taught.',
        instructionsAr: 'اختبر فهمك لمحتوى الدرس.',
        questions: [],
        status: 'DRAFT'
      },
      narrationScriptEn: input.narrationScriptEn || '',
      narrationScriptAr: input.narrationScriptAr || '',
      ttsStatus: 'NONE'
    };

    const assembledLesson: Lesson = adaptDbLessonToAppLesson(
      rootLessonPayload as any,
      assembledVersion,
      []
    );

    return {
      data: {
        lesson: assembledLesson,
        version: assembledVersion
      },
      error: null
    };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Unexpected failure creating lesson draft') };
  }
}

/**
 * 2. getEditableLessonVersion(lessonId)
 *
 * Resolves or creates an authorized editable draft version for a lesson.
 *
 * Rules:
 * - Checks existing versions for the lesson.
 * - If an editable draft exists (status IN ('AI_DRAFT', 'SERVANT_REVIEW', 'REVISION_REQUESTED')):
 *     - Verifies servant authorization: Teacher cannot edit another teacher's draft (unless admin).
 *     - Loads its sections and returns the editable version.
 * - If only published or approved versions exist (or no draft version exists):
 *     - Does NOT mutate the published version (published content remains immutable!).
 *     - Automatically creates a new revision draft (version_number = highest + 1) with status = 'AI_DRAFT',
 *       carrying over the content and sections from the current version.
 *     - Returns the new editable version.
 */
export async function getEditableLessonVersion(
  lessonId: string
): Promise<AuthoringResult<LessonVersion>> {
  try {
    const servantCheck = await getAuthenticatedServant();
    if (servantCheck.error || !servantCheck.user) {
      return { data: null, error: servantCheck.error };
    }
    const currentUserId = servantCheck.user.id;
    const currentUserRole = servantCheck.user.role;

    // Fetch all versions for this lesson
    const { data: dbVersions, error: verErr } = await supabase!
      .from('lesson_versions')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('version_number', { ascending: false });

    if (verErr) {
      return { data: null, error: new Error(`Failed to query lesson versions: ${verErr.message}`) };
    }

    const versions = (dbVersions || []) as DbLessonVersion[];

    // Check for an existing editable draft version
    const editableDraft = versions.find(
      (v) => v.status === 'AI_DRAFT' || v.status === 'SERVANT_REVIEW' || v.status === 'REVISION_REQUESTED'
    );

    if (editableDraft) {
      // Check authoring authorization (Requirement 10.F)
      if (editableDraft.created_by !== currentUserId && currentUserRole !== 'admin') {
        return {
          data: null,
          error: new Error('Teacher cannot edit another teacher\'s draft')
        };
      }

      // Fetch sections for this draft
      const sectionsResult = await getLessonSections(editableDraft.id);
      const sections = sectionsResult.data || [];

      const assembled: LessonVersion = {
        id: editableDraft.id,
        lessonId: editableDraft.lesson_id,
        versionNumber: editableDraft.version_number,
        status: editableDraft.status,
        createdBy: editableDraft.created_by,
        createdAt: editableDraft.created_at,
        approvedBy: editableDraft.approved_by || undefined,
        approvedAt: editableDraft.approved_at || undefined,
        approvalNote: editableDraft.approval_note || undefined,
        changeReason: editableDraft.change_reason || undefined,
        summaryEn: editableDraft.summary_en || '',
        summaryAr: editableDraft.summary_ar || '',
        summaryCop: editableDraft.summary_cop || undefined,
        bigIdeaEn: editableDraft.big_idea_en || '',
        bigIdeaAr: editableDraft.big_idea_ar || '',
        objectivesEn: Array.isArray(editableDraft.objectives_en) ? editableDraft.objectives_en : [],
        objectivesAr: Array.isArray(editableDraft.objectives_ar) ? editableDraft.objectives_ar : [],
        sections,
        recapEn: editableDraft.recap_en || '',
        recapAr: editableDraft.recap_ar || '',
        flashcards: Array.isArray(editableDraft.flashcards) ? editableDraft.flashcards : [],
        slides: Array.isArray(editableDraft.slides) ? editableDraft.slides : [],
        quizDraft: (editableDraft.quiz_draft as QuizDraft) || {
          id: `quiz-${editableDraft.id}`,
          lessonId,
          titleEn: `Quiz: Draft V${editableDraft.version_number}`,
          titleAr: 'تقييم الدرس',
          instructionsEn: 'Test your understanding of what was taught.',
          instructionsAr: 'اختبر فهمك لمحتوى الدرس.',
          questions: [],
          status: 'DRAFT'
        },
        narrationScriptEn: editableDraft.narration_script_en || '',
        narrationScriptAr: editableDraft.narration_script_ar || '',
        ttsAudioUrlEn: editableDraft.tts_audio_url_en || undefined,
        ttsAudioUrlAr: editableDraft.tts_audio_url_ar || undefined,
        ttsStatus: editableDraft.tts_status || 'NONE'
      };

      return { data: assembled, error: null };
    }

    // No existing editable draft found.
    // If published/approved versions exist, create a new revision version (IMMUTABILITY OF PUBLISHED CONTENT)
    const highestVersion = versions[0];
    const newVersionNumber = highestVersion ? highestVersion.version_number + 1 : 1;
    const nowIso = new Date().toISOString();
    const newVersionId = generateUuid();

    // Copy content from highest version or initialize
    const newVersionPayload = {
      id: newVersionId,
      lesson_id: lessonId,
      version_number: newVersionNumber,
      status: 'AI_DRAFT',
      created_by: currentUserId,
      created_at: nowIso,
      change_reason: highestVersion ? `Draft revision of V${highestVersion.version_number}` : 'Initial draft version',
      summary_en: highestVersion?.summary_en || '',
      summary_ar: highestVersion?.summary_ar || '',
      summary_cop: highestVersion?.summary_cop || null,
      big_idea_en: highestVersion?.big_idea_en || '',
      big_idea_ar: highestVersion?.big_idea_ar || '',
      objectives_en: highestVersion?.objectives_en || [],
      objectives_ar: highestVersion?.objectives_ar || [],
      recap_en: highestVersion?.recap_en || '',
      recap_ar: highestVersion?.recap_ar || '',
      narration_script_en: highestVersion?.narration_script_en || '',
      narration_script_ar: highestVersion?.narration_script_ar || '',
      quiz_draft: highestVersion?.quiz_draft || null,
      slides: highestVersion?.slides || [],
      flashcards: highestVersion?.flashcards || [],
      tts_status: 'NONE'
    };

    const { error: createVerErr } = await supabase!
      .from('lesson_versions')
      .insert(newVersionPayload);

    if (createVerErr) {
      return { data: null, error: new Error(`Failed to initialize editable revision draft: ${createVerErr.message}`) };
    }

    // If previous version had sections, duplicate them for the new revision version
    let clonedSections: LessonSectionItem[] = [];
    if (highestVersion) {
      const prevSectionsResult = await getLessonSections(highestVersion.id);
      const prevSections = prevSectionsResult.data || [];

      if (prevSections.length > 0) {
        const sectionRows = prevSections.map((s, idx) => ({
          id: generateUuid(),
          lesson_version_id: newVersionId,
          order_index: s.order ?? (idx + 1),
          title_en: s.titleEn,
          title_ar: s.titleAr,
          title_cop: s.titleCop || null,
          content_en: s.contentEn,
          content_ar: s.contentAr,
          content_cop: s.contentCop || null,
          teacher_notes: s.teacherNotes || null,
          created_at: nowIso
        }));

        const { data: inserted, error: secErr } = await supabase!
          .from('lesson_sections')
          .insert(sectionRows)
          .select('*');

        if (!secErr && inserted) {
          clonedSections = (inserted as DbLessonSection[]).map((s) => ({
            id: s.id,
            order: s.order_index ?? s.order ?? 1,
            titleEn: s.title_en,
            titleAr: s.title_ar,
            titleCop: s.title_cop || undefined,
            contentEn: s.content_en,
            contentAr: s.content_ar,
            contentCop: s.content_cop || undefined,
            sourceRefs: [],
            teacherNotes: s.teacher_notes || undefined,
            hasUnresolvedComments: false
          }));
        }
      }
    }

    const assembledNewDraft: LessonVersion = {
      id: newVersionId,
      lessonId,
      versionNumber: newVersionNumber,
      status: 'AI_DRAFT',
      createdBy: currentUserId,
      createdAt: nowIso,
      changeReason: newVersionPayload.change_reason,
      summaryEn: newVersionPayload.summary_en,
      summaryAr: newVersionPayload.summary_ar,
      summaryCop: newVersionPayload.summary_cop || undefined,
      bigIdeaEn: newVersionPayload.big_idea_en,
      bigIdeaAr: newVersionPayload.big_idea_ar,
      objectivesEn: newVersionPayload.objectives_en,
      objectivesAr: newVersionPayload.objectives_ar,
      sections: clonedSections,
      recapEn: newVersionPayload.recap_en,
      recapAr: newVersionPayload.recap_ar,
      flashcards: newVersionPayload.flashcards,
      slides: newVersionPayload.slides,
      quizDraft: (newVersionPayload.quiz_draft as QuizDraft) || {
        id: `quiz-${newVersionId}`,
        lessonId,
        titleEn: `Quiz: Draft V${newVersionNumber}`,
        titleAr: 'تقييم الدرس',
        instructionsEn: 'Test your understanding of what was taught.',
        instructionsAr: 'اختبر فهمك لمحتوى الدرس.',
        questions: [],
        status: 'DRAFT'
      },
      narrationScriptEn: newVersionPayload.narration_script_en,
      narrationScriptAr: newVersionPayload.narration_script_ar,
      ttsStatus: 'NONE'
    };

    return { data: assembledNewDraft, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Error resolving editable version') };
  }
}

/**
 * 3. updateLessonDraft(lessonId, updates)
 *
 * Saves updates to an existing draft lesson.
 *
 * Protection rules:
 * - Reject any attempt to set lesson_status = 'published'.
 * - Reject any attempt to set active_version_id.
 * - Reject any attempt to set approved_by / approved_at / points_reward.
 * - Target version MUST be in an editable draft state ('AI_DRAFT', 'SERVANT_REVIEW', 'REVISION_REQUESTED').
 * - Verifies teacher authorization: Teacher cannot edit another teacher's draft.
 * - Published versions remain 100% immutable.
 */
export async function updateLessonDraft(
  lessonId: string,
  updates: UpdateLessonDraftInput
): Promise<AuthoringResult<LessonVersion>> {
  try {
    const servantCheck = await getAuthenticatedServant();
    if (servantCheck.error || !servantCheck.user) {
      return { data: null, error: servantCheck.error };
    }
    const currentUserId = servantCheck.user.id;
    const currentUserRole = servantCheck.user.role;

    // PUBLICATION PROTECTION: Reject direct publishing
    if ((updates as any).status === 'published' || (updates as any).lesson_status === 'published') {
      return {
        data: null,
        error: new Error('Publication protection: Direct publishing is prohibited in the draft authoring service')
      };
    }

    if ((updates as any).active_version_id !== undefined) {
      return {
        data: null,
        error: new Error('Publication protection: active_version_id is authoritative and publication-controlled')
      };
    }

    if ((updates as any).approved_by !== undefined || (updates as any).approved_at !== undefined) {
      return {
        data: null,
        error: new Error('Publication protection: Approval fields are publication-controlled')
      };
    }

    if ((updates as any).points_reward !== undefined) {
      return {
        data: null,
        error: new Error('Publication protection: points_reward is publication-controlled')
      };
    }

    // Resolve target editable version
    let targetVersionId = updates.versionId;
    let targetVersion: DbLessonVersion | null = null;

    if (targetVersionId) {
      const { data, error } = await supabase!
        .from('lesson_versions')
        .select('*')
        .eq('id', targetVersionId)
        .maybeSingle();

      if (error || !data) {
        return { data: null, error: new Error('Specified version not found') };
      }
      targetVersion = data as DbLessonVersion;
    } else {
      // Find current editable draft for this lesson
      const editableRes = await getEditableLessonVersion(lessonId);
      if (editableRes.error || !editableRes.data) {
        return { data: null, error: editableRes.error || new Error('Could not find or create editable draft') };
      }
      targetVersionId = editableRes.data.id;
      const { data } = await supabase!
        .from('lesson_versions')
        .select('*')
        .eq('id', targetVersionId)
        .maybeSingle();
      targetVersion = data as DbLessonVersion;
    }

    if (!targetVersion) {
      return { data: null, error: new Error('Target draft version could not be found') };
    }

    // IMMUTABILITY CHECK
    if (targetVersion.status === 'PUBLISHED' || targetVersion.status === 'APPROVED') {
      return {
        data: null,
        error: new Error('Cannot mutate a published or approved version. You must edit an active draft version.')
      };
    }

    // AUTHORIZATION CHECK (Requirement 10.F)
    if (targetVersion.created_by !== currentUserId && currentUserRole !== 'admin') {
      return {
        data: null,
        error: new Error('Teacher cannot edit another teacher\'s draft')
      };
    }

    // 1. Update root lesson metadata if provided
    const rootUpdates: Record<string, any> = {};
    if (updates.titleEn !== undefined && updates.titleEn.trim()) {
      rootUpdates.title_en = updates.titleEn.trim();
    }
    if (updates.titleAr !== undefined && updates.titleAr.trim()) {
      rootUpdates.title_ar = updates.titleAr.trim();
    }
    if (updates.category !== undefined) {
      rootUpdates.category = updates.category;
    }
    if (updates.gradeLevel !== undefined) {
      rootUpdates.grade_level = updates.gradeLevel;
    }
    if (updates.scriptureVerseEn !== undefined) {
      rootUpdates.scripture_verse_en = updates.scriptureVerseEn || null;
    }
    if (updates.scriptureVerseAr !== undefined) {
      rootUpdates.scripture_verse_ar = updates.scriptureVerseAr || null;
    }
    if (updates.verseReference !== undefined) {
      rootUpdates.verse_reference = updates.verseReference || null;
    }

    if (Object.keys(rootUpdates).length > 0) {
      const { error: rootUpErr } = await supabase!
        .from('lessons')
        .update(rootUpdates)
        .eq('id', lessonId);

      if (rootUpErr) {
        return { data: null, error: new Error(`Failed to update lesson metadata: ${rootUpErr.message}`) };
      }
    }

    // 2. Update version fields
    const versionUpdates: Record<string, any> = {};
    if (updates.summaryEn !== undefined) versionUpdates.summary_en = updates.summaryEn;
    if (updates.summaryAr !== undefined) versionUpdates.summary_ar = updates.summaryAr;
    if (updates.summaryCop !== undefined) versionUpdates.summary_cop = updates.summaryCop || null;
    if (updates.bigIdeaEn !== undefined) versionUpdates.big_idea_en = updates.bigIdeaEn;
    if (updates.bigIdeaAr !== undefined) versionUpdates.big_idea_ar = updates.bigIdeaAr;
    if (updates.objectivesEn !== undefined) versionUpdates.objectives_en = updates.objectivesEn;
    if (updates.objectivesAr !== undefined) versionUpdates.objectives_ar = updates.objectivesAr;
    if (updates.recapEn !== undefined) versionUpdates.recap_en = updates.recapEn;
    if (updates.recapAr !== undefined) versionUpdates.recap_ar = updates.recapAr;
    if (updates.narrationScriptEn !== undefined) versionUpdates.narration_script_en = updates.narrationScriptEn;
    if (updates.narrationScriptAr !== undefined) versionUpdates.narration_script_ar = updates.narrationScriptAr;
    if (updates.quizDraft !== undefined) versionUpdates.quiz_draft = updates.quizDraft;
    if (updates.slides !== undefined) versionUpdates.slides = updates.slides;
    if (updates.flashcards !== undefined) versionUpdates.flashcards = updates.flashcards;

    if (Object.keys(versionUpdates).length > 0) {
      const { error: verUpErr } = await supabase!
        .from('lesson_versions')
        .update(versionUpdates)
        .eq('id', targetVersion.id);

      if (verUpErr) {
        return { data: null, error: new Error(`Failed to update draft version: ${verUpErr.message}`) };
      }
    }

    // 3. Update sections if provided
    if (updates.sections !== undefined) {
      const secResult = await saveLessonSections(targetVersion.id, updates.sections);
      if (secResult.error) {
        return { data: null, error: secResult.error };
      }
    }

    // Fetch updated version representation
    const updatedDraftRes = await getEditableLessonVersion(lessonId);
    return updatedDraftRes;
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Unexpected failure updating draft') };
  }
}

/**
 * 4. saveLessonSections(versionId, sections)
 *
 * Saves or updates sections for an editable draft version.
 * - Preserves Coptic content where present.
 * - Does not permit updating sections on published/approved versions.
 * - Enforces teacher authorization.
 */
export async function saveLessonSections(
  versionId: string,
  sections: LessonSectionInput[]
): Promise<AuthoringResult<LessonSectionItem[]>> {
  try {
    const servantCheck = await getAuthenticatedServant();
    if (servantCheck.error || !servantCheck.user) {
      return { data: null, error: servantCheck.error };
    }
    const currentUserId = servantCheck.user.id;
    const currentUserRole = servantCheck.user.role;

    // Verify version status & ownership
    const { data: versionRow, error: verErr } = await supabase!
      .from('lesson_versions')
      .select('*')
      .eq('id', versionId)
      .maybeSingle();

    if (verErr || !versionRow) {
      return { data: null, error: new Error('Version not found') };
    }

    if (versionRow.status === 'PUBLISHED' || versionRow.status === 'APPROVED') {
      return {
        data: null,
        error: new Error('Published and approved version sections are immutable')
      };
    }

    if (versionRow.created_by !== currentUserId && currentUserRole !== 'admin') {
      return {
        data: null,
        error: new Error('Teacher cannot edit another teacher\'s draft sections')
      };
    }

    // Fetch existing sections in DB
    const { data: existingRows } = await supabase!
      .from('lesson_sections')
      .select('id')
      .eq('lesson_version_id', versionId);

    const existingIds = new Set((existingRows || []).map((r: any) => r.id));
    const incomingIds = new Set(sections.map((s) => s.id).filter(Boolean));

    // Upsert provided sections
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      const sectionId = s.id || generateUuid();

      const payload = {
        id: sectionId,
        lesson_version_id: versionId,
        order_index: s.order ?? (i + 1),
        title_en: s.titleEn,
        title_ar: s.titleAr || s.titleEn,
        title_cop: s.titleCop || null,
        content_en: s.contentEn,
        content_ar: s.contentAr || '',
        content_cop: s.contentCop || null,
        teacher_notes: s.teacherNotes || null
      };

      if (existingIds.has(sectionId)) {
        await supabase!.from('lesson_sections').update(payload).eq('id', sectionId);
      } else {
        await supabase!.from('lesson_sections').insert(payload);
      }
    }

    // Delete any sections that were removed in authoring
    const toDelete = Array.from(existingIds).filter((id) => !incomingIds.has(id));
    if (toDelete.length > 0) {
      await supabase!.from('lesson_sections').delete().in('id', toDelete);
    }

    const refreshedSections = await getLessonSections(versionId);
    return { data: refreshedSections.data || [], error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Failed to save sections') };
  }
}

/**
 * 5. updateLessonSection(sectionId, updates)
 *
 * Updates a single section within an authorized draft version.
 */
export async function updateLessonSection(
  sectionId: string,
  updates: Partial<LessonSectionInput>
): Promise<AuthoringResult<LessonSectionItem>> {
  try {
    const servantCheck = await getAuthenticatedServant();
    if (servantCheck.error || !servantCheck.user) {
      return { data: null, error: servantCheck.error };
    }
    const currentUserId = servantCheck.user.id;
    const currentUserRole = servantCheck.user.role;

    // Fetch section to verify parent version
    const { data: sectionRow, error: secErr } = await supabase!
      .from('lesson_sections')
      .select('*')
      .eq('id', sectionId)
      .maybeSingle();

    if (secErr || !sectionRow) {
      return { data: null, error: new Error('Section not found') };
    }

    // Fetch version
    const { data: versionRow, error: verErr } = await supabase!
      .from('lesson_versions')
      .select('*')
      .eq('id', sectionRow.lesson_version_id)
      .maybeSingle();

    if (verErr || !versionRow) {
      return { data: null, error: new Error('Parent version not found') };
    }

    if (versionRow.status === 'PUBLISHED' || versionRow.status === 'APPROVED') {
      return {
        data: null,
        error: new Error('Cannot edit section of a published or approved version')
      };
    }

    if (versionRow.created_by !== currentUserId && currentUserRole !== 'admin') {
      return {
        data: null,
        error: new Error('Teacher cannot edit another teacher\'s draft section')
      };
    }

    const payload: Record<string, any> = {};
    if (updates.titleEn !== undefined) payload.title_en = updates.titleEn;
    if (updates.titleAr !== undefined) payload.title_ar = updates.titleAr;
    if (updates.titleCop !== undefined) payload.title_cop = updates.titleCop || null;
    if (updates.contentEn !== undefined) payload.content_en = updates.contentEn;
    if (updates.contentAr !== undefined) payload.content_ar = updates.contentAr;
    if (updates.contentCop !== undefined) payload.content_cop = updates.contentCop || null;
    if (updates.order !== undefined) payload.order_index = updates.order;
    if (updates.teacherNotes !== undefined) payload.teacher_notes = updates.teacherNotes || null;

    const { data: updatedData, error: upErr } = await supabase!
      .from('lesson_sections')
      .update(payload)
      .eq('id', sectionId)
      .select('*')
      .maybeSingle();

    if (upErr || !updatedData) {
      return { data: null, error: new Error(`Failed to update section: ${upErr?.message}`) };
    }

    const item: LessonSectionItem = {
      id: updatedData.id,
      order: updatedData.order_index ?? updatedData.order ?? 1,
      titleEn: updatedData.title_en,
      titleAr: updatedData.title_ar,
      titleCop: updatedData.title_cop || undefined,
      contentEn: updatedData.content_en,
      contentAr: updatedData.content_ar,
      contentCop: updatedData.content_cop || undefined,
      sourceRefs: [],
      teacherNotes: updatedData.teacher_notes || undefined,
      hasUnresolvedComments: false
    };

    return { data: item, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Error updating lesson section') };
  }
}

/**
 * 6. getTeacherCurriculumLessons()
 *
 * Teacher view of all curriculum lessons under servant RLS:
 * - Includes draft lessons (active_version_id is null) authored by servants.
 * - Includes published lessons (authoritative active_version_id).
 * - Excludes non-published draft lessons from student views.
 */
export async function getTeacherCurriculumLessons(): Promise<AuthoringResult<Lesson[]>> {
  if (!supabase) {
    return { data: null, error: new Error('Supabase client is not configured') };
  }

  try {
    const servantCheck = await getAuthenticatedServant();
    if (servantCheck.error || !servantCheck.user) {
      return { data: null, error: servantCheck.error };
    }

    // Query all lessons visible to this servant under RLS
    const { data: dbLessons, error: lessonsErr } = await supabase
      .from('lessons')
      .select('*')
      .order('created_at', { ascending: false });

    if (lessonsErr) {
      return { data: null, error: new Error(`Failed to query teacher lessons: ${lessonsErr.message}`) };
    }

    if (!dbLessons || dbLessons.length === 0) {
      return { data: [], error: null };
    }

    const adaptedLessons: Lesson[] = [];

    for (const l of dbLessons as DbLesson[]) {
      // For each lesson, resolve its authoritative active version or its latest draft version
      let versionToUse: LessonVersion | null = null;

      if (l.active_version_id) {
        // Fetch active published version
        const { data: verRow } = await supabase
          .from('lesson_versions')
          .select('*')
          .eq('id', l.active_version_id)
          .maybeSingle();

        if (verRow) {
          const secRes = await getLessonSections(verRow.id);
          versionToUse = {
            id: verRow.id,
            lessonId: l.id,
            versionNumber: verRow.version_number,
            status: verRow.status,
            createdBy: verRow.created_by,
            createdAt: verRow.created_at,
            approvedBy: verRow.approved_by || undefined,
            approvedAt: verRow.approved_at || undefined,
            summaryEn: verRow.summary_en || '',
            summaryAr: verRow.summary_ar || '',
            summaryCop: verRow.summary_cop || undefined,
            bigIdeaEn: verRow.big_idea_en || '',
            bigIdeaAr: verRow.big_idea_ar || '',
            objectivesEn: verRow.objectives_en || [],
            objectivesAr: verRow.objectives_ar || [],
            sections: secRes.data || [],
            recapEn: verRow.recap_en || '',
            recapAr: verRow.recap_ar || '',
            flashcards: verRow.flashcards || [],
            slides: verRow.slides || [],
            quizDraft: verRow.quiz_draft || null,
            narrationScriptEn: verRow.narration_script_en || '',
            narrationScriptAr: verRow.narration_script_ar || '',
            ttsStatus: verRow.tts_status || 'NONE'
          };
        }
      }

      if (!versionToUse) {
        // Fall back to latest version (e.g. AI_DRAFT) for this lesson
        const { data: latestVer } = await supabase
          .from('lesson_versions')
          .select('*')
          .eq('lesson_id', l.id)
          .order('version_number', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestVer) {
          const secRes = await getLessonSections(latestVer.id);
          versionToUse = {
            id: latestVer.id,
            lessonId: l.id,
            versionNumber: latestVer.version_number,
            status: latestVer.status,
            createdBy: latestVer.created_by,
            createdAt: latestVer.created_at,
            approvedBy: latestVer.approved_by || undefined,
            approvedAt: latestVer.approved_at || undefined,
            summaryEn: latestVer.summary_en || '',
            summaryAr: latestVer.summary_ar || '',
            summaryCop: latestVer.summary_cop || undefined,
            bigIdeaEn: latestVer.big_idea_en || '',
            bigIdeaAr: latestVer.big_idea_ar || '',
            objectivesEn: latestVer.objectives_en || [],
            objectivesAr: latestVer.objectives_ar || [],
            sections: secRes.data || [],
            recapEn: latestVer.recap_en || '',
            recapAr: latestVer.recap_ar || '',
            flashcards: latestVer.flashcards || [],
            slides: latestVer.slides || [],
            quizDraft: latestVer.quiz_draft || null,
            narrationScriptEn: latestVer.narration_script_en || '',
            narrationScriptAr: latestVer.narration_script_ar || '',
            ttsStatus: latestVer.tts_status || 'NONE'
          };
        }
      }

      const sourcesRes = await getLessonSourcesForLesson(l.id);
      const sources = sourcesRes.data || [];

      adaptedLessons.push(adaptDbLessonToAppLesson(l, versionToUse, sources));
    }

    return { data: adaptedLessons, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Unexpected failure fetching teacher lessons') };
  }
}

export interface PublishExpressLessonInput {
  titleEn: string;
  titleAr?: string;
  category?: 'bible' | 'hymns' | 'history' | 'virtues';
  gradeLevel?: string;
  summaryEn?: string;
  summaryAr?: string;
  scriptureVerseEn?: string;
  scriptureVerseAr?: string;
  verseReference?: string;
  videoUrl?: string;
  slidesUrl?: string;
  audioUrl?: string;
  teacherNotes?: string;
  publishDirectly?: boolean;
  quiz?: Array<{
    question: string;
    options: string[];
    correctIndex: number;
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
    points?: number;
  }>;
  slides?: Array<{
    number: number;
    titleEn: string;
    titleAr?: string;
    imageUrl?: string;
    bulletsEn?: string[];
  }>;
}

/**
 * Publishes or saves an express lesson directly to Supabase without AI dependency.
 * Creates the root public.lessons, public.lesson_versions, and public.lesson_sources.
 */
export async function publishExpressLesson(
  input: PublishExpressLessonInput
): Promise<AuthoringResult<{ lesson: Lesson; version: LessonVersion }>> {
  try {
    const servantCheck = await getAuthenticatedServant();
    if (servantCheck.error || !servantCheck.user) {
      return { data: null, error: servantCheck.error };
    }
    const currentUserId = servantCheck.user.id;

    if (!input.titleEn || !input.titleEn.trim()) {
      return { data: null, error: new Error('Lesson title is required') };
    }

    const titleEn = input.titleEn.trim();
    const titleAr = (input.titleAr && input.titleAr.trim()) ? input.titleAr.trim() : titleEn;
    const category = input.category || 'bible';
    const gradeLevel = input.gradeLevel || '4th Grade';
    const nowIso = new Date().toISOString();
    const lessonId = generateUuid();
    const versionId = generateUuid();
    const isPublished = input.publishDirectly !== false;

    // Calculate total points available from quiz difficulty multipliers
    const formattedQuizQuestions = (input.quiz || []).map((q, idx) => {
      const diff = q.difficulty || 'EASY';
      const pts = q.points || (diff === 'HARD' ? 30 : diff === 'MEDIUM' ? 20 : 10);
      return {
        id: `q-${idx + 1}`,
        type: 'multiple_choice' as const,
        questionEn: q.question,
        questionAr: q.question,
        optionsEn: q.options,
        optionsAr: q.options,
        correctIndex: q.correctIndex,
        explanationEn: `Correct answer is option ${q.correctIndex + 1}`,
        explanationAr: `الإجابة الصحيحة هي الخيار رقم ${q.correctIndex + 1}`,
        difficulty: diff,
        points: pts,
        sourceRef: {
          sectionId: 'sec-1',
          sectionTitle: titleEn,
          sourceId: 'src-teacher',
          location: 'Teacher Class Lesson'
        }
      };
    });

    const totalQuizPoints = formattedQuizQuestions.reduce((sum, q) => sum + (q.points || 10), 0);
    const totalLessonPoints = 100 + totalQuizPoints;

    const quizDraft: QuizDraft = {
      id: `quiz-${versionId}`,
      lessonId,
      titleEn: `Quiz: ${titleEn}`,
      titleAr: `تقييم: ${titleAr}`,
      instructionsEn: 'Complete this Sunday School quiz to test your comprehension.',
      instructionsAr: 'أكمل التقييم لاختبار فهمك لمحتوى الدرس ونيل النقاط.',
      status: isPublished ? 'APPROVED' : 'DRAFT',
      questions: formattedQuizQuestions
    };

    // 1. Root lesson record
    const rootLessonPayload = {
      id: lessonId,
      title_en: titleEn,
      title_ar: titleAr,
      category,
      grade_level: gradeLevel,
      summary_en: input.summaryEn || input.teacherNotes || '',
      summary_ar: input.summaryAr || input.teacherNotes || '',
      scripture_verse_en: input.scriptureVerseEn || null,
      scripture_verse_ar: input.scriptureVerseAr || null,
      verse_reference: input.verseReference || null,
      audio_url: input.audioUrl || null,
      pdf_worksheet_url: input.slidesUrl || null,
      points_reward: totalLessonPoints,
      active_version_id: isPublished ? versionId : null,
      lesson_status: isPublished ? 'published' : 'draft',
      status: isPublished ? 'published' : 'draft',
      approved_servant_name: isPublished ? (servantCheck.user.role || 'Servant') : null,
      approved_at: isPublished ? nowIso : null,
      created_by: currentUserId,
      created_at: nowIso
    };

    const { error: rootErr } = await supabase!
      .from('lessons')
      .insert(rootLessonPayload);

    if (rootErr) {
      return { data: null, error: new Error(`Failed to save lesson: ${rootErr.message}`) };
    }

    // 2. Version record
    const formattedSlides = (input.slides || []).map((s, idx) => ({
      number: s.number || (idx + 1),
      titleEn: s.titleEn,
      titleAr: s.titleAr || s.titleEn,
      bulletsEn: s.bulletsEn || [],
      bulletsAr: [],
      sourceRefs: [],
      imageUrl: s.imageUrl
    }));

    const versionPayload = {
      id: versionId,
      lesson_id: lessonId,
      version_number: 1,
      status: isPublished ? 'PUBLISHED' : 'AI_DRAFT',
      approved_by: isPublished ? (servantCheck.user.role || 'Servant') : null,
      approved_at: isPublished ? nowIso : null,
      approval_note: isPublished ? 'Directly authored and approved by Sunday School servant' : null,
      created_by: currentUserId,
      created_at: nowIso,
      summary_en: input.summaryEn || '',
      summary_ar: input.summaryAr || '',
      big_idea_en: input.teacherNotes || input.summaryEn || titleEn,
      big_idea_ar: input.summaryAr || titleAr,
      objectives_en: [input.summaryEn || 'Understand and apply church teachings'],
      objectives_ar: [input.summaryAr || 'استيعاب وتطبيق تعاليم الكنيسة في الحياة اليومية'],
      recap_en: input.summaryEn || '',
      recap_ar: input.summaryAr || '',
      quiz_draft: quizDraft,
      slides: formattedSlides,
      flashcards: [],
      tts_status: 'NONE'
    };

    const { error: verErr } = await supabase!
      .from('lesson_versions')
      .insert(versionPayload);

    if (verErr) {
      await supabase!.from('lessons').delete().eq('id', lessonId);
      return { data: null, error: new Error(`Failed to save version: ${verErr.message}`) };
    }

    // 3. Sections record
    const sectionRow = {
      id: generateUuid(),
      lesson_version_id: versionId,
      order_index: 1,
      title_en: titleEn,
      title_ar: titleAr,
      content_en: input.summaryEn || input.teacherNotes || titleEn,
      content_ar: input.summaryAr || input.teacherNotes || titleAr,
      teacher_notes: input.teacherNotes || null,
      created_at: nowIso
    };

    await supabase!.from('lesson_sections').insert([sectionRow]);

    // 4. Register media as lesson sources for student viewers
    const sourcesToInsert: any[] = [];
    if (input.videoUrl) {
      const isYoutube = input.videoUrl.includes('youtube.com') || input.videoUrl.includes('youtu.be');
      sourcesToInsert.push({
        id: generateUuid(),
        lesson_id: lessonId,
        uploaded_by: currentUserId,
        type: isYoutube ? 'YOUTUBE_VIDEO' : 'TEACHER_VIDEO',
        original_filename: `${titleEn} - Video`,
        mime_type: isYoutube ? 'video/youtube' : 'video/mp4',
        file_url: input.videoUrl,
        rights_status: 'CHURCH_OWNED',
        processing_status: 'INDEXED',
        priority: 'PRIMARY',
        created_at: nowIso
      });
    }

    if (input.slidesUrl) {
      const isPptx = input.slidesUrl.endsWith('.pptx') || input.slidesUrl.endsWith('.ppt');
      sourcesToInsert.push({
        id: generateUuid(),
        lesson_id: lessonId,
        uploaded_by: currentUserId,
        type: isPptx ? 'PPTX' : 'PDF',
        original_filename: `${titleEn} - Slides`,
        mime_type: isPptx ? 'application/vnd.ms-powerpoint' : 'application/pdf',
        file_url: input.slidesUrl,
        rights_status: 'CHURCH_OWNED',
        processing_status: 'INDEXED',
        priority: 'PRIMARY',
        created_at: nowIso
      });
    }

    if (input.audioUrl) {
      sourcesToInsert.push({
        id: generateUuid(),
        lesson_id: lessonId,
        uploaded_by: currentUserId,
        type: 'TEACHER_VOICE',
        original_filename: `${titleEn} - Sermon Audio`,
        mime_type: 'audio/mp4',
        file_url: input.audioUrl,
        rights_status: 'TEACHER_OWNED',
        processing_status: 'INDEXED',
        priority: 'PRIMARY',
        created_at: nowIso
      });
    }

    if (sourcesToInsert.length > 0) {
      await supabase!.from('lesson_sources').insert(sourcesToInsert);
    }

    const appLesson: Lesson = {
      id: lessonId,
      title: titleEn,
      titleAr: titleAr,
      summary: input.summaryEn || input.teacherNotes || '',
      summaryAr: input.summaryAr || '',
      status: isPublished ? 'published' : 'draft',
      date: nowIso.split('T')[0],
      grade: gradeLevel,
      pointsAvailable: totalLessonPoints,
      currentVersionId: versionId,
      videoUrl: input.videoUrl,
      slidesUrl: input.slidesUrl,
      audioUrl: input.audioUrl,
      teacherNotes: input.teacherNotes,
      quiz: (input.quiz || []).map((q, idx) => ({
        id: `q-${idx + 1}`,
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        difficulty: q.difficulty || 'EASY',
        points: q.points || (q.difficulty === 'HARD' ? 30 : q.difficulty === 'MEDIUM' ? 20 : 10)
      }))
    };

    const appVersion: LessonVersion = {
      id: versionId,
      lessonId,
      versionNumber: 1,
      status: isPublished ? 'PUBLISHED' : 'AI_DRAFT',
      createdBy: currentUserId,
      createdAt: nowIso,
      approvedBy: isPublished ? 'Servant' : undefined,
      approvedAt: isPublished ? nowIso : undefined,
      summaryEn: input.summaryEn || '',
      summaryAr: input.summaryAr || '',
      bigIdeaEn: input.teacherNotes || titleEn,
      bigIdeaAr: titleAr,
      objectivesEn: [input.summaryEn || 'Understand and apply church teachings'],
      objectivesAr: [input.summaryAr || 'استيعاب وتطبيق تعاليم الكنيسة في الحياة اليومية'],
      sections: [{
        id: sectionRow.id,
        order: 1,
        titleEn,
        titleAr,
        contentEn: sectionRow.content_en,
        contentAr: sectionRow.content_ar,
        sourceRefs: []
      }],
      recapEn: input.summaryEn || '',
      recapAr: input.summaryAr || '',
      flashcards: [],
      slides: formattedSlides,
      quizDraft,
      narrationScriptEn: '',
      narrationScriptAr: '',
      ttsStatus: 'NONE'
    };

    return { data: { lesson: appLesson, version: appVersion }, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Failed to publish express lesson') };
  }
}
