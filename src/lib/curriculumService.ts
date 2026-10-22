import { supabase } from './supabase';
import { 
  Lesson, 
  LessonVersion, 
  LessonSectionItem, 
  LessonSource, 
  QuizQuestion, 
  QuizDraft, 
  QuizQuestionDraft 
} from '../types';

/**
 * Normalized database representation of public.lessons
 */
export interface DbLesson {
  id: string;
  title_en: string;
  title_ar: string;
  category: string;
  grade_level: string;
  summary_en: string | null;
  summary_ar: string | null;
  scripture_verse_en?: string | null;
  scripture_verse_ar?: string | null;
  verse_reference?: string | null;
  audio_url?: string | null;
  pdf_worksheet_url?: string | null;
  points_reward?: number | null;
  quiz_questions?: any[] | null;
  active_version_id: string | null;
  created_by?: string | null;
  created_at: string;
  lesson_status?: string | null;
  status?: string | null;
  approved_servant_name?: string | null;
  approved_at?: string | null;
}

/**
 * Normalized database representation of public.lesson_versions
 */
export interface DbLessonVersion {
  id: string;
  lesson_id: string;
  version_number: number;
  status: 'AI_DRAFT' | 'SERVANT_REVIEW' | 'REVISION_REQUESTED' | 'APPROVED' | 'PUBLISHED';
  created_by: string;
  created_at: string;
  approved_by?: string | null;
  approved_at?: string | null;
  approval_note?: string | null;
  change_reason?: string | null;
  summary_en?: string | null;
  summary_ar?: string | null;
  summary_cop?: string | null;
  big_idea_en?: string | null;
  big_idea_ar?: string | null;
  objectives_en?: string[] | null;
  objectives_ar?: string[] | null;
  recap_en?: string | null;
  recap_ar?: string | null;
  narration_script_en?: string | null;
  narration_script_ar?: string | null;
  tts_audio_url_en?: string | null;
  tts_audio_url_ar?: string | null;
  tts_status?: 'NONE' | 'PENDING' | 'GENERATED' | 'STALE' | null;
  quiz_draft?: QuizDraft | null;
  slides?: any[] | null;
  flashcards?: any[] | null;
}

/**
 * Normalized database representation of public.lesson_sections
 */
export interface DbLessonSection {
  id: string;
  lesson_version_id: string;
  order_index?: number | null;
  order?: number | null;
  title_en: string;
  title_ar: string;
  title_cop?: string | null;
  content_en: string;
  content_ar: string;
  content_cop?: string | null;
  teacher_notes?: string | null;
  created_at?: string;
}

/**
 * Normalized database representation of public.lesson_sources
 */
export interface DbLessonSource {
  id: string;
  lesson_id: string;
  session_id?: string | null;
  uploaded_by: string;
  type: string;
  original_filename: string;
  mime_type: string;
  file_url?: string | null;
  file_size?: number | null;
  description?: string | null;
  teacher_notes?: string | null;
  rights_status?: string | null;
  processing_status?: string | null;
  priority?: string | null;
  transcript?: string | null;
  extracted_content?: string | null;
  created_at: string;
}

/**
 * Normalized database representation of public.lesson_section_sources
 */
export interface DbLessonSectionSource {
  id: string;
  section_id: string;
  source_id: string;
  location?: string | null;
}

/**
 * Teacher version history audit summary
 */
export interface VersionHistoryItem {
  id: string;
  lessonId: string;
  versionNumber: number;
  status: 'AI_DRAFT' | 'SERVANT_REVIEW' | 'REVISION_REQUESTED' | 'APPROVED' | 'PUBLISHED';
  createdBy: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  approvalNote?: string;
  changeReason?: string;
}

/**
 * Adapts normalized DbLessonSource to application LessonSource
 */
export function adaptDbSourceToAppSource(dbSource: DbLessonSource): LessonSource {
  return {
    id: dbSource.id,
    lessonId: dbSource.lesson_id,
    sessionId: dbSource.session_id || undefined,
    uploadedBy: dbSource.uploaded_by,
    type: (dbSource.type as any) || 'TEACHER_TEXT',
    originalFilename: dbSource.original_filename,
    mimeType: dbSource.mime_type,
    fileUrl: dbSource.file_url || undefined,
    fileSize: dbSource.file_size || undefined,
    description: dbSource.description || undefined,
    teacherNotes: dbSource.teacher_notes || undefined,
    rightsStatus: (dbSource.rights_status as any) || 'TEACHER_OWNED',
    processingStatus: (dbSource.processing_status as any) || 'INDEXED',
    priority: (dbSource.priority as any) || 'PRIMARY',
    transcript: dbSource.transcript || undefined,
    extractedContent: dbSource.extracted_content || undefined,
    createdAt: dbSource.created_at
  };
}

/**
 * Adapts a normalized DbLesson and its authoritative active version to the UI's expected Lesson shape.
 * Preserves legacy property names while ensuring active-version content takes precedence.
 */
export function adaptDbLessonToAppLesson(
  dbLesson: DbLesson,
  activeVersion?: LessonVersion | null,
  sources?: LessonSource[]
): Lesson {
  let quizQuestions: QuizQuestion[] | undefined = undefined;

  if (activeVersion?.quizDraft?.questions && activeVersion.quizDraft.questions.length > 0) {
    quizQuestions = activeVersion.quizDraft.questions.map((q: QuizQuestionDraft) => ({
      id: q.id,
      question: q.questionEn,
      options: q.optionsEn,
      correctIndex: q.correctIndex,
      type: q.type === 'multiple_choice' ? 'multiple_choice' : undefined,
      difficulty: q.difficulty || 'EASY',
      points: q.points || (q.difficulty === 'HARD' ? 30 : q.difficulty === 'MEDIUM' ? 20 : 10),
      sourceRef: q.sourceRef ? `${q.sourceRef.sectionTitle} (${q.sourceRef.location})` : undefined
    }));
  } else if (Array.isArray(dbLesson.quiz_questions) && dbLesson.quiz_questions.length > 0) {
    quizQuestions = (dbLesson.quiz_questions as any[]).map((q: any) => ({
      id: q.id,
      question: q.question,
      options: q.options || [],
      correctIndex: q.correctIndex ?? 0,
      type: q.type || 'multiple_choice',
      difficulty: q.difficulty || 'EASY',
      points: q.points || (q.difficulty === 'HARD' ? 30 : q.difficulty === 'MEDIUM' ? 20 : 10),
      sourceRef: q.sourceRef
    }));
  }

  const status = (dbLesson.status as any) || 
                 (dbLesson.lesson_status as any) || 
                 (activeVersion?.status === 'PUBLISHED' ? 'published' : 'draft');

  // Video, slides, and audio from sources or fields
  let videoUrl = (dbLesson as any).video_url || undefined;
  let slidesUrl = dbLesson.pdf_worksheet_url || undefined;
  let audioUrl = dbLesson.audio_url || undefined;
  let teacherNotes = (dbLesson as any).teacher_notes || undefined;

  if (sources && sources.length > 0) {
    if (!videoUrl) {
      const vSrc = sources.find(s => s.type === 'YOUTUBE_VIDEO' || s.type === 'TEACHER_VIDEO');
      if (vSrc) videoUrl = vSrc.fileUrl;
    }
    if (!slidesUrl) {
      const sSrc = sources.find(s => s.type === 'PPTX' || s.type === 'PDF');
      if (sSrc) slidesUrl = sSrc.fileUrl;
    }
    if (!audioUrl) {
      const aSrc = sources.find(s => s.type === 'TEACHER_VOICE');
      if (aSrc) audioUrl = aSrc.fileUrl;
    }
  }

  return {
    id: dbLesson.id,
    title: dbLesson.title_en,
    titleAr: dbLesson.title_ar,
    summary: activeVersion?.summaryEn || dbLesson.summary_en || '',
    summaryAr: activeVersion?.summaryAr || dbLesson.summary_ar || undefined,
    summaryCop: activeVersion?.summaryCop || undefined,
    status,
    date: dbLesson.created_at ? dbLesson.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
    grade: dbLesson.grade_level,
    pointsAvailable: dbLesson.points_reward ?? 100,
    currentVersionId: dbLesson.active_version_id || undefined,
    latestVersion: activeVersion || undefined,
    quiz: quizQuestions,
    sourcesCount: sources?.length ?? 0,
    approvedServantName: dbLesson.approved_servant_name || activeVersion?.approvedBy || undefined,
    approvedAt: dbLesson.approved_at || activeVersion?.approvedAt || undefined,
    scriptureVerseEn: dbLesson.scripture_verse_en || undefined,
    scriptureVerseAr: dbLesson.scripture_verse_ar || undefined,
    verseReference: dbLesson.verse_reference || undefined,
    videoUrl,
    slidesUrl,
    audioUrl,
    teacherNotes
  };
}

/**
 * Assembles a complete LessonVersion from DbLessonVersion, DbLessonSection[], and DbLessonSectionSource[]
 */
function assembleLessonVersion(
  v: DbLessonVersion,
  sections: DbLessonSection[],
  sectionSources: DbLessonSectionSource[] = [],
  sources: DbLessonSource[] = []
): LessonVersion {
  const sectionItems: LessonSectionItem[] = sections.map((s) => {
    const sSources = sectionSources
      .filter((ss) => ss.section_id === s.id)
      .map((ss) => {
        const src = sources.find((src) => src.id === ss.source_id);
        return {
          sourceId: ss.source_id,
          sourceName: src?.original_filename || 'Curriculum Source',
          location: ss.location || 'Classroom Material'
        };
      });

    return {
      id: s.id,
      order: s.order_index ?? s.order ?? 1,
      titleEn: s.title_en,
      titleAr: s.title_ar,
      titleCop: s.title_cop || undefined,
      contentEn: s.content_en,
      contentAr: s.content_ar,
      contentCop: s.content_cop || undefined,
      sourceRefs: sSources,
      teacherNotes: s.teacher_notes || undefined,
      hasUnresolvedComments: false
    };
  });

  sectionItems.sort((a, b) => a.order - b.order);

  let quizDraft: QuizDraft;
  if (v.quiz_draft && typeof v.quiz_draft === 'object') {
    quizDraft = v.quiz_draft as QuizDraft;
  } else {
    quizDraft = {
      id: `quiz-${v.id}`,
      lessonId: v.lesson_id,
      titleEn: `Quiz: ${v.summary_en || 'Sunday School Assessment'}`,
      titleAr: 'تقييم الدرس',
      instructionsEn: 'Test your understanding of what was taught.',
      instructionsAr: 'اختبر فهمك لمحتوى الدرس.',
      questions: [],
      status: 'APPROVED'
    };
  }

  return {
    id: v.id,
    lessonId: v.lesson_id,
    versionNumber: v.version_number,
    status: v.status,
    createdBy: v.created_by,
    createdAt: v.created_at,
    approvedBy: v.approved_by || undefined,
    approvedAt: v.approved_at || undefined,
    approvalNote: v.approval_note || undefined,
    changeReason: v.change_reason || undefined,
    summaryEn: v.summary_en || '',
    summaryAr: v.summary_ar || '',
    summaryCop: v.summary_cop || undefined,
    bigIdeaEn: v.big_idea_en || '',
    bigIdeaAr: v.big_idea_ar || '',
    objectivesEn: Array.isArray(v.objectives_en) ? v.objectives_en : [],
    objectivesAr: Array.isArray(v.objectives_ar) ? v.objectives_ar : [],
    sections: sectionItems,
    recapEn: v.recap_en || '',
    recapAr: v.recap_ar || '',
    flashcards: Array.isArray(v.flashcards) ? v.flashcards : [],
    slides: Array.isArray(v.slides) ? v.slides : [],
    quizDraft,
    narrationScriptEn: v.narration_script_en || '',
    narrationScriptAr: v.narration_script_ar || '',
    ttsAudioUrlEn: v.tts_audio_url_en || undefined,
    ttsAudioUrlAr: v.tts_audio_url_ar || undefined,
    ttsStatus: v.tts_status || 'NONE'
  };
}

// ============================================================================
// STUDENT / PARENT READ PATH
// ============================================================================

/**
 * 1. getPublishedLessonsForCurrentUser()
 * 
 * Retrieves published lessons for the current user under active RLS policies.
 * 
 * Rules:
 * - Reads from public.lessons
 * - Uses lessons.active_version_id as the strictly authoritative version pointer
 * - Joins the corresponding row from public.lesson_versions
 * - Requires status = 'PUBLISHED' on the active version
 * - Never chooses a version simply because it is approved or last in an array
 * - Never returns stale historical versions (e.g. V1 if active is V2)
 * - Returns adapted Lesson objects matching existing UI requirements
 */
export async function getPublishedLessonsForCurrentUser(): Promise<{
  data: Lesson[] | null;
  error: Error | null;
}> {
  if (!supabase) {
    return { data: null, error: new Error('Supabase client is not configured') };
  }

  try {
    // 1. Fetch lessons from public.lessons
    const { data: dbLessons, error: lessonsErr } = await supabase
      .from('lessons')
      .select('*');

    if (lessonsErr) {
      console.warn('Note on lessons query from Supabase:', lessonsErr.message);
      return { data: null, error: null };
    }

    if (!dbLessons || dbLessons.length === 0) {
      return { data: [], error: null };
    }

    // 2. Adapt dbLessons directly
    const adaptedLessons: Lesson[] = dbLessons.map((l: any) => adaptDbLessonToAppLesson(l as DbLesson));
    return { data: adaptedLessons, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Unexpected curriculum query failure') };
  }
}

/**
 * 2. getPublishedLesson(lessonId)
 * 
 * Fetches a single published lesson by ID with its authoritative active version.
 */
export async function getPublishedLesson(lessonId: string): Promise<{
  data: Lesson | null;
  error: Error | null;
}> {
  if (!supabase) {
    return { data: null, error: new Error('Supabase client is not configured') };
  }

  try {
    const { data: dbLesson, error: lessonErr } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .maybeSingle();

    if (lessonErr) {
      return { data: null, error: new Error(`Failed to query lesson: ${lessonErr.message}`) };
    }

    if (!dbLesson) {
      return { data: null, error: null };
    }

    if (!dbLesson.active_version_id) {
      return { data: null, error: new Error(`Lesson ${lessonId} does not have an active published version.`) };
    }

    // Fetch authoritative active version
    const activeVerResult = await getActiveVersionForLesson(lessonId);
    if (activeVerResult.error) {
      return { data: null, error: activeVerResult.error };
    }

    if (!activeVerResult.data) {
      return { data: null, error: new Error(`Active version for lesson ${lessonId} is not published or accessible.`) };
    }

    const sourcesResult = await getLessonSourcesForLesson(lessonId);
    const sources = sourcesResult.data || [];

    const adapted = adaptDbLessonToAppLesson(dbLesson, activeVerResult.data, sources);
    return { data: adapted, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Failed to fetch published lesson') };
  }
}

/**
 * 3. getActiveVersionForLesson(lessonId)
 * 
 * Resolves the single authoritative active published version for a lesson.
 * Enforces lessons.active_version_id = lesson_versions.id AND status = 'PUBLISHED'.
 */
export async function getActiveVersionForLesson(lessonId: string): Promise<{
  data: LessonVersion | null;
  error: Error | null;
}> {
  if (!supabase) {
    return { data: null, error: new Error('Supabase client is not configured') };
  }

  try {
    // Read the active_version_id pointer from public.lessons
    const { data: lessonRow, error: lessonErr } = await supabase
      .from('lessons')
      .select('active_version_id')
      .eq('id', lessonId)
      .maybeSingle();

    if (lessonErr) {
      return { data: null, error: new Error(`Failed to resolve active version pointer: ${lessonErr.message}`) };
    }

    if (!lessonRow?.active_version_id) {
      return { data: null, error: null };
    }

    // Fetch the version pointed to by active_version_id with status = 'PUBLISHED'
    const { data: versionRow, error: versionErr } = await supabase
      .from('lesson_versions')
      .select('*')
      .eq('id', lessonRow.active_version_id)
      .eq('status', 'PUBLISHED')
      .maybeSingle();

    if (versionErr) {
      return { data: null, error: new Error(`Failed to fetch active version: ${versionErr.message}`) };
    }

    if (!versionRow) {
      return { data: null, error: null };
    }

    // Fetch sections and section sources for this version
    const sectionsResult = await getLessonSections(versionRow.id);
    const sections = sectionsResult.data || [];

    // Construct LessonVersion object
    const assembled = assembleLessonVersion(
      versionRow as DbLessonVersion,
      sections.map((s) => ({
        id: s.id,
        lesson_version_id: versionRow.id,
        order_index: s.order,
        title_en: s.titleEn,
        title_ar: s.titleAr,
        title_cop: s.titleCop,
        content_en: s.contentEn,
        content_ar: s.contentAr,
        content_cop: s.contentCop,
        teacher_notes: s.teacherNotes
      }))
    );

    return { data: assembled, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Error fetching active version') };
  }
}

/**
 * 4. getLessonSections(versionId)
 * 
 * Fetches normalized sections and linked source references for a specific version.
 */
export async function getLessonSections(versionId: string): Promise<{
  data: LessonSectionItem[] | null;
  error: Error | null;
}> {
  if (!supabase) {
    return { data: null, error: new Error('Supabase client is not configured') };
  }

  try {
    const { data: dbSections, error: sectionsErr } = await supabase
      .from('lesson_sections')
      .select('*')
      .eq('lesson_version_id', versionId);

    if (sectionsErr) {
      return { data: null, error: new Error(`Failed to query lesson_sections: ${sectionsErr.message}`) };
    }

    if (!dbSections || dbSections.length === 0) {
      return { data: [], error: null };
    }

    const sectionIds = dbSections.map((s: DbLessonSection) => s.id);
    let sectionSources: DbLessonSectionSource[] = [];

    if (sectionIds.length > 0) {
      const { data: ssData, error: ssErr } = await supabase
        .from('lesson_section_sources')
        .select('*')
        .in('section_id', sectionIds);

      if (!ssErr && ssData) {
        sectionSources = ssData;
      }
    }

    const items: LessonSectionItem[] = dbSections.map((s: DbLessonSection) => {
      const refs = sectionSources
        .filter((ss) => ss.section_id === s.id)
        .map((ss) => ({
          sourceId: ss.source_id,
          sourceName: 'Curriculum Source',
          location: ss.location || 'Classroom Material'
        }));

      return {
        id: s.id,
        order: s.order_index ?? s.order ?? 1,
        titleEn: s.title_en,
        titleAr: s.title_ar,
        titleCop: s.title_cop || undefined,
        contentEn: s.content_en,
        contentAr: s.content_ar,
        contentCop: s.content_cop || undefined,
        sourceRefs: refs,
        teacherNotes: s.teacher_notes || undefined,
        hasUnresolvedComments: false
      };
    });

    items.sort((a, b) => a.order - b.order);
    return { data: items, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Failed to fetch lesson sections') };
  }
}

/**
 * 5. getLessonSourcesForLesson(lessonId)
 * 
 * Fetches curriculum sources registered for a lesson.
 */
export async function getLessonSourcesForLesson(lessonId: string): Promise<{
  data: LessonSource[] | null;
  error: Error | null;
}> {
  if (!supabase) {
    return { data: null, error: new Error('Supabase client is not configured') };
  }

  try {
    const { data: dbSources, error: sourcesErr } = await supabase
      .from('lesson_sources')
      .select('*')
      .eq('lesson_id', lessonId);

    if (sourcesErr) {
      return { data: null, error: new Error(`Failed to query lesson_sources: ${sourcesErr.message}`) };
    }

    const sources = (dbSources || []).map((s: DbLessonSource) => adaptDbSourceToAppSource(s));
    return { data: sources, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Failed to fetch lesson sources') };
  }
}

// ============================================================================
// TEACHER READ PATH
// ============================================================================

/**
 * 6. getTeacherLessonVersions(lessonId)
 * 
 * Teacher authoring path: Retrieves all authorized versions for a lesson
 * (including AI_DRAFT, SERVANT_REVIEW, APPROVED, and historical PUBLISHED versions)
 * as permitted under teacher/admin RLS policies.
 */
export async function getTeacherLessonVersions(lessonId: string): Promise<{
  data: LessonVersion[] | null;
  error: Error | null;
}> {
  if (!supabase) {
    return { data: null, error: new Error('Supabase client is not configured') };
  }

  try {
    const { data: dbVersions, error: versionsErr } = await supabase
      .from('lesson_versions')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('version_number', { ascending: false });

    if (versionsErr) {
      return { data: null, error: new Error(`Failed to fetch teacher versions: ${versionsErr.message}`) };
    }

    if (!dbVersions || dbVersions.length === 0) {
      return { data: [], error: null };
    }

    const versionIds = dbVersions.map((v: DbLessonVersion) => v.id);

    // Fetch sections for all returned versions
    const { data: dbSections } = await supabase
      .from('lesson_sections')
      .select('*')
      .in('lesson_version_id', versionIds);

    const assembledList: LessonVersion[] = dbVersions.map((v: DbLessonVersion) => {
      const vSections = (dbSections || []).filter((s: DbLessonSection) => s.lesson_version_id === v.id);
      return assembleLessonVersion(v, vSections);
    });

    return { data: assembledList, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Failed to fetch teacher versions') };
  }
}

/**
 * 7. getTeacherLessonVersionHistory(lessonId)
 * 
 * Fetches lightweight version audit history for servant review diffing and timeline inspection.
 */
export async function getTeacherLessonVersionHistory(lessonId: string): Promise<{
  data: VersionHistoryItem[] | null;
  error: Error | null;
}> {
  if (!supabase) {
    return { data: null, error: new Error('Supabase client is not configured') };
  }

  try {
    const { data, error } = await supabase
      .from('lesson_versions')
      .select('id, lesson_id, version_number, status, created_by, created_at, approved_by, approved_at, approval_note, change_reason')
      .eq('lesson_id', lessonId)
      .order('version_number', { ascending: false });

    if (error) {
      return { data: null, error: new Error(`Failed to fetch version history: ${error.message}`) };
    }

    const history: VersionHistoryItem[] = (data || []).map((row: any) => ({
      id: row.id,
      lessonId: row.lesson_id,
      versionNumber: row.version_number,
      status: row.status,
      createdBy: row.created_by,
      createdAt: row.created_at,
      approvedBy: row.approved_by || undefined,
      approvedAt: row.approved_at || undefined,
      approvalNote: row.approval_note || undefined,
      changeReason: row.change_reason || undefined
    }));

    return { data: history, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Failed to query version history') };
  }
}
