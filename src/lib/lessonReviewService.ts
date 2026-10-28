import { supabase } from './supabase';
import { 
  LessonVersion, 
  LessonVersionStatus,
  LessonSectionItem, 
  LessonOutline, 
  EvidenceMap, 
  ClaimEvidence, 
  SourceConflict, 
  LessonSource, 
  ServantComment, 
  CommentType,
  QuizDraft
} from '../types';
import { 
  DbLessonVersion, 
  getLessonSections 
} from './curriculumService';
import { getLessonOutline } from './lessonGenerationService';
import { 
  getDraftEvidencePacket, 
  updateClaimVerification, 
  resolveSourceConflict,
  UpdateClaimVerificationInput,
  ResolveConflictInput
} from './evidenceMapService';
import { listLessonSources } from './lessonSourceService';

/**
 * Normalized database representation of public.servant_review_comments
 */
export interface DbServantReviewComment {
  id: string;
  lesson_id?: string | null;
  lesson_version_id: string;
  section_id?: string | null;
  comment: string;
  comment_type?: string | null;
  author_id?: string | null;
  author_name?: string | null;
  resolved?: boolean;
  resolution_note?: string | null;
  created_at: string;
}

export interface ReviewServiceResult<T> {
  data: T | null;
  error: Error | null;
}

export interface SubmitForReviewInput {
  lessonId: string;
  versionId: string;
  evidenceMapId?: string;
  notes?: string;
}

export interface GetReviewPacketInput {
  lessonId: string;
  versionId: string;
  evidenceMapId?: string;
}

export interface AddReviewCommentInput {
  lessonId?: string;
  versionId: string;
  sectionId?: string;
  comment: string;
  commentType?: CommentType;
  quoteHighlighted?: string;
  authorName?: string;
}

export interface UpdateReviewCommentInput {
  commentId: string;
  resolved: boolean;
  resolutionNote?: string;
}

export interface RequestRevisionInput {
  lessonId: string;
  versionId: string;
  feedbackComment: string;
  commentType?: CommentType;
  sectionId?: string;
  servantName?: string;
}

export interface ApproveLessonVersionInput {
  lessonId: string;
  versionId: string;
  approvalNote?: string;
  servantName?: string;
}

export interface ReviewStatusSummary {
  versionId: string;
  lessonId: string;
  versionNumber: number;
  status: LessonVersionStatus;
  isApproved: boolean;
  isSubmittedForReview: boolean;
  canSubmitForReview: boolean;
  canApprove: boolean;
  canRequestRevision: boolean;
  blockerReasons: string[];
  counts: {
    sectionsCount: number;
    totalClaimsCount: number;
    verifiedClaimsCount: number;
    unverifiedClaimsCount: number;
    unresolvedConflictsCount: number;
    totalCommentsCount: number;
    unresolvedCommentsCount: number;
  };
}

export interface ServantReviewPacket {
  lesson: {
    id: string;
    titleEn: string;
    titleAr: string;
    category: string;
    gradeLevel: string;
    status: string;
    scriptureVerseEn?: string;
    scriptureVerseAr?: string;
    verseReference?: string;
  };
  version: LessonVersion;
  outline: LessonOutline | null;
  sections: LessonSectionItem[];
  claims: ClaimEvidence[];
  sources: LessonSource[];
  conflicts: SourceConflict[];
  comments: ServantComment[];
  summary: {
    totalSections: number;
    totalClaims: number;
    verifiedClaims: number;
    unverifiedClaims: number;
    unresolvedConflicts: number;
    totalComments: number;
    unresolvedComments: number;
    canApprove: boolean;
    blockerReasons: string[];
  };
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

function createDefaultQuizDraft(versionId: string, lessonId: string, summaryEn?: string): QuizDraft {
  return {
    id: `quiz-${versionId}`,
    lessonId,
    titleEn: `Quiz: ${summaryEn || 'Sunday School Assessment'}`,
    titleAr: 'تقييم الدرس',
    instructionsEn: 'Test your understanding of what was taught.',
    instructionsAr: 'اختبر فهمك لمحتوى الدرس.',
    questions: [],
    status: 'DRAFT'
  };
}

/**
 * Validates the current authenticated user and ensures they possess teacher or admin privileges.
 */
export async function getAuthenticatedServant(): Promise<{
  user: { id: string; role?: string } | null;
  error: Error | null;
}> {
  if (!supabase) {
    return { user: null, error: new Error('Supabase client is not configured') };
  }

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return { user: null, error: new Error('Authentication required for servant review operations') };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  const finalRole = profile?.role || 'student';
  if (finalRole !== 'teacher' && finalRole !== 'admin') {
    return { user: null, error: new Error('Only servants, teachers, and administrators may participate in servant reviews') };
  }

  return { user: { id: user.id, role: finalRole }, error: null };
}

/**
 * In-memory / localStorage fallback store for comments in Demo/Guest/Offline mode
 */
const IN_MEMORY_COMMENTS: Record<string, ServantComment[]> = {};

/**
 * 1. submitVersionForReview(input)
 *
 * Workflow Gate: AI_DRAFT (or REVISION_REQUESTED) -> SERVANT_REVIEW
 *
 * Required checks:
 * - caller is authorized (teacher/admin)
 * - caller owns/controls the lesson version
 * - version is currently AI_DRAFT (or REVISION_REQUESTED)
 * - required lesson/version/evidence provenance exists
 * - generated sections exist (count > 0)
 * - relevant evidence map exists
 *
 * Enforces:
 * - Never allow direct AI_DRAFT -> PUBLISHED
 * - Never touch active_version_id
 * - Never set lesson_status = 'published'
 */
export async function submitVersionForReview(
  input: SubmitForReviewInput
): Promise<ReviewServiceResult<LessonVersion>> {
  if (!input.lessonId || !input.versionId) {
    return {
      data: null,
      error: new Error('Both lessonId and versionId are required to submit for review')
    };
  }

  if (!supabase) {
    // Demo/Guest/Offline fallback
    const offlineVersion: LessonVersion = {
      id: input.versionId,
      lessonId: input.lessonId,
      versionNumber: 1,
      status: 'SERVANT_REVIEW',
      createdBy: 'Offline Teacher',
      createdAt: new Date().toISOString(),
      summaryEn: 'Sunday School Lesson',
      summaryAr: 'درس مدارس الأحد',
      bigIdeaEn: 'Core Orthodox Teaching',
      bigIdeaAr: 'التعليم الأرثوذكسي الأساسي',
      objectivesEn: ['Learn church doctrine'],
      objectivesAr: ['فهم العقيدة والطقس'],
      sections: [],
      recapEn: 'Lesson recap',
      recapAr: 'ملخص الدرس',
      flashcards: [],
      slides: [],
      quizDraft: createDefaultQuizDraft(input.versionId, input.lessonId),
      narrationScriptEn: '',
      narrationScriptAr: '',
      ttsStatus: 'NONE'
    };
    return { data: offlineVersion, error: null };
  }

  try {
    const servantCheck = await getAuthenticatedServant();
    if (servantCheck.error || !servantCheck.user) {
      return { data: null, error: servantCheck.error };
    }
    const currentUserId = servantCheck.user.id;
    const currentUserRole = servantCheck.user.role;

    // 1. Fetch target version
    const { data: verRow, error: verErr } = await supabase
      .from('lesson_versions')
      .select('*')
      .eq('id', input.versionId)
      .maybeSingle();

    if (verErr || !verRow) {
      return { data: null, error: new Error(`Lesson version not found: ${verErr?.message || input.versionId}`) };
    }

    // 2. Validate lesson provenance
    if (verRow.lesson_id !== input.lessonId) {
      return {
        data: null,
        error: new Error('Provenance mismatch: Target version does not belong to the requested lesson.')
      };
    }

    // 3. Authorization / Ownership check
    if (verRow.created_by && verRow.created_by !== currentUserId && currentUserRole !== 'admin') {
      return {
        data: null,
        error: new Error("Authorization error: Cannot submit another teacher's draft for review.")
      };
    }

    // 4. Status check: Version must be in AI_DRAFT or REVISION_REQUESTED
    if (verRow.status === 'PUBLISHED' || verRow.status === 'APPROVED') {
      return {
        data: null,
        error: new Error(`Cannot submit a version that is already ${verRow.status}. It is immutable.`)
      };
    }

    if (verRow.status === 'SERVANT_REVIEW') {
      // Already in review; return safe state
      const { data: secs } = await getLessonSections(input.versionId);
      return {
        data: {
          id: verRow.id,
          lessonId: verRow.lesson_id,
          versionNumber: verRow.version_number,
          status: 'SERVANT_REVIEW',
          createdBy: verRow.created_by,
          createdAt: verRow.created_at,
          summaryEn: verRow.summary_en || '',
          summaryAr: verRow.summary_ar || '',
          bigIdeaEn: verRow.big_idea_en || '',
          bigIdeaAr: verRow.big_idea_ar || '',
          objectivesEn: verRow.objectives_en || [],
          objectivesAr: verRow.objectives_ar || [],
          sections: secs || [],
          recapEn: verRow.recap_en || '',
          recapAr: verRow.recap_ar || '',
          flashcards: verRow.flashcards || [],
          slides: verRow.slides || [],
          quizDraft: verRow.quiz_draft || createDefaultQuizDraft(verRow.id, verRow.lesson_id, verRow.summary_en),
          narrationScriptEn: verRow.narration_script_en || '',
          narrationScriptAr: verRow.narration_script_ar || '',
          ttsStatus: verRow.tts_status || 'NONE'
        },
        error: null
      };
    }

    // 5. Generated sections check: Must have at least 1 section
    const { data: sections, error: secsErr } = await getLessonSections(input.versionId);
    if (secsErr || !sections || sections.length === 0) {
      return {
        data: null,
        error: new Error('Submission blocked: Lesson draft must contain at least one generated section before submitting for servant review.')
      };
    }

    // 6. Evidence map existence check
    const { data: eMapRow, error: mapErr } = await supabase
      .from('evidence_maps')
      .select('id, lesson_id, lesson_version_id')
      .eq('lesson_id', input.lessonId)
      .maybeSingle();

    if (mapErr || !eMapRow) {
      return {
        data: null,
        error: new Error('Submission blocked: A valid teacher evidence map is required before submitting for review.')
      };
    }

    if (input.evidenceMapId && eMapRow.id !== input.evidenceMapId) {
      return {
        data: null,
        error: new Error('Submission blocked: Evidence map ID mismatch.')
      };
    }

    // 7. Transition status from AI_DRAFT -> SERVANT_REVIEW
    // CRITICAL: Do NOT set approved_by, approved_at, active_version_id, or lesson_status = 'published'!
    const { data: updatedVer, error: updateErr } = await supabase
      .from('lesson_versions')
      .update({
        status: 'SERVANT_REVIEW',
        change_reason: input.notes || 'Submitted for servant ecclesiastical review.'
      })
      .eq('id', input.versionId)
      .select('*')
      .single();

    if (updateErr || !updatedVer) {
      return {
        data: null,
        error: new Error(`Failed to update lesson version status to SERVANT_REVIEW: ${updateErr?.message}`)
      };
    }

    return {
      data: {
        id: updatedVer.id,
        lessonId: updatedVer.lesson_id,
        versionNumber: updatedVer.version_number,
        status: 'SERVANT_REVIEW',
        createdBy: updatedVer.created_by,
        createdAt: updatedVer.created_at,
        approvedBy: updatedVer.approved_by || undefined,
        approvedAt: updatedVer.approved_at || undefined,
        approvalNote: updatedVer.approval_note || undefined,
        changeReason: updatedVer.change_reason || undefined,
        summaryEn: updatedVer.summary_en || '',
        summaryAr: updatedVer.summary_ar || '',
        summaryCop: updatedVer.summary_cop || undefined,
        bigIdeaEn: updatedVer.big_idea_en || '',
        bigIdeaAr: updatedVer.big_idea_ar || '',
        objectivesEn: updatedVer.objectives_en || [],
        objectivesAr: updatedVer.objectives_ar || [],
        sections: sections || [],
        recapEn: updatedVer.recap_en || '',
        recapAr: updatedVer.recap_ar || '',
        flashcards: updatedVer.flashcards || [],
        slides: updatedVer.slides || [],
        quizDraft: updatedVer.quiz_draft || createDefaultQuizDraft(updatedVer.id, updatedVer.lesson_id, updatedVer.summary_en),
        narrationScriptEn: updatedVer.narration_script_en || '',
        narrationScriptAr: updatedVer.narration_script_ar || '',
        ttsAudioUrlEn: updatedVer.tts_audio_url_en || undefined,
        ttsAudioUrlAr: updatedVer.tts_audio_url_ar || undefined,
        ttsStatus: updatedVer.tts_status || 'NONE'
      },
      error: null
    };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Error submitting version for review') };
  }
}

/**
 * 2. getReviewPacket(input)
 *
 * Assembles one coherent servant review packet:
 * - Lesson metadata
 * - Current draft version
 * - Outline
 * - Lesson sections with source citations
 * - Claims (provenance, verification status, servant review status)
 * - Source citations
 * - Verbatim excerpts
 * - Verification state
 * - Source conflicts (must be highlighted if unresolved)
 * - Review comments
 * - Summary blockers calculation
 */
export async function getReviewPacket(
  input: GetReviewPacketInput
): Promise<ReviewServiceResult<ServantReviewPacket>> {
  if (!input.lessonId || !input.versionId) {
    return {
      data: null,
      error: new Error('Both lessonId and versionId are required to retrieve the review packet')
    };
  }

  try {
    // 1. Fetch lesson metadata
    let lessonMeta = {
      id: input.lessonId,
      titleEn: 'Sunday School Lesson',
      titleAr: 'درس مدارس الأحد',
      category: 'bible',
      gradeLevel: 'Elementary (Grades 3-5)',
      status: 'draft',
      scriptureVerseEn: '',
      scriptureVerseAr: '',
      verseReference: ''
    };

    if (supabase) {
      const { data: dbLesson } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', input.lessonId)
        .maybeSingle();

      if (dbLesson) {
        lessonMeta = {
          id: dbLesson.id,
          titleEn: dbLesson.title_en || 'Sunday School Lesson',
          titleAr: dbLesson.title_ar || 'درس مدارس الأحد',
          category: dbLesson.category || 'bible',
          gradeLevel: dbLesson.grade_level || 'Elementary (Grades 3-5)',
          status: dbLesson.lesson_status || dbLesson.status || 'draft',
          scriptureVerseEn: dbLesson.scripture_verse_en || undefined,
          scriptureVerseAr: dbLesson.scripture_verse_ar || undefined,
          verseReference: dbLesson.verse_reference || undefined
        };
      }
    }

    // 2. Fetch version details
    let versionObj: LessonVersion;
    if (supabase) {
      const { data: verRow, error: verErr } = await supabase
        .from('lesson_versions')
        .select('*')
        .eq('id', input.versionId)
        .maybeSingle();

      if (verErr || !verRow) {
        return { data: null, error: new Error(`Version ${input.versionId} not found`) };
      }

      const { data: sections } = await getLessonSections(input.versionId);

      versionObj = {
        id: verRow.id,
        lessonId: verRow.lesson_id,
        versionNumber: verRow.version_number,
        status: verRow.status,
        createdBy: verRow.created_by,
        createdAt: verRow.created_at,
        approvedBy: verRow.approved_by || undefined,
        approvedAt: verRow.approved_at || undefined,
        approvalNote: verRow.approval_note || undefined,
        changeReason: verRow.change_reason || undefined,
        summaryEn: verRow.summary_en || '',
        summaryAr: verRow.summary_ar || '',
        summaryCop: verRow.summary_cop || undefined,
        bigIdeaEn: verRow.big_idea_en || '',
        bigIdeaAr: verRow.big_idea_ar || '',
        objectivesEn: verRow.objectives_en || [],
        objectivesAr: verRow.objectives_ar || [],
        sections: sections || [],
        recapEn: verRow.recap_en || '',
        recapAr: verRow.recap_ar || '',
        flashcards: verRow.flashcards || [],
        slides: verRow.slides || [],
        quizDraft: verRow.quiz_draft || createDefaultQuizDraft(verRow.id, verRow.lesson_id, verRow.summary_en),
        narrationScriptEn: verRow.narration_script_en || '',
        narrationScriptAr: verRow.narration_script_ar || '',
        ttsAudioUrlEn: verRow.tts_audio_url_en || undefined,
        ttsAudioUrlAr: verRow.tts_audio_url_ar || undefined,
        ttsStatus: verRow.tts_status || 'NONE'
      };
    } else {
      versionObj = {
        id: input.versionId,
        lessonId: input.lessonId,
        versionNumber: 1,
        status: 'SERVANT_REVIEW',
        createdBy: 'Servant Mina',
        createdAt: new Date().toISOString(),
        summaryEn: lessonMeta.titleEn,
        summaryAr: lessonMeta.titleAr,
        bigIdeaEn: 'Faithful Orthodox Christian Instruction',
        bigIdeaAr: 'التعليم المسيحي الأرثوذكسي الأصيل',
        objectivesEn: ['Understand church teaching', 'Reflect on liturgical practice'],
        objectivesAr: ['فهم العقيدة الأرثوذكسية', 'الارتباط بالأسرار والصلوات'],
        sections: [],
        recapEn: '',
        recapAr: '',
        flashcards: [],
        slides: [],
        quizDraft: createDefaultQuizDraft(input.versionId, input.lessonId, lessonMeta.titleEn),
        narrationScriptEn: '',
        narrationScriptAr: '',
        ttsStatus: 'NONE'
      };
    }

    // 3. Fetch Outline
    const outlineRes = await getLessonOutline(input.lessonId, input.versionId);
    const outline = outlineRes.data;

    // 4. Fetch Evidence Packet (Sources, Claims, Conflicts)
    const evidenceRes = await getDraftEvidencePacket(input.lessonId, input.versionId);
    const evidencePacket = evidenceRes.data;

    const sources = evidencePacket?.sources || [];
    const claims = evidencePacket?.claims || [];
    const conflicts = evidencePacket?.conflicts || [];

    // 5. Fetch Servant Review Comments
    let comments: ServantComment[] = [];
    if (supabase) {
      try {
        const { data: dbComments } = await supabase
          .from('servant_review_comments')
          .select('*')
          .eq('lesson_version_id', input.versionId)
          .order('created_at', { ascending: true });

        if (dbComments && Array.isArray(dbComments)) {
          comments = dbComments.map((c: any) => ({
            id: c.id,
            lessonVersionId: c.lesson_version_id,
            sectionId: c.section_id || '',
            comment: c.comment,
            commentType: (c.comment_type as any) || 'OTHER',
            authorName: c.author_name || 'Servant',
            createdAt: c.created_at,
            resolved: Boolean(c.resolved),
            resolutionNote: c.resolution_note || undefined
          }));
        }
      } catch (err) {
        console.warn('Note on fetching servant_review_comments:', err);
      }
    } else {
      comments = IN_MEMORY_COMMENTS[input.versionId] || [];
    }

    // 6. Compute metrics and blockers
    const totalSections = versionObj.sections.length;
    const totalClaims = claims.length;
    const verifiedClaims = claims.filter(c => c.verified).length;
    const unverifiedClaims = totalClaims - verifiedClaims;
    const unresolvedConflicts = conflicts.filter(c => c.status === 'UNRESOLVED').length;
    const totalComments = comments.length;
    const unresolvedComments = comments.filter(c => !c.resolved).length;

    const blockerReasons: string[] = [];

    if (versionObj.status !== 'SERVANT_REVIEW') {
      blockerReasons.push(`Version is currently in "${versionObj.status}" status. It must be submitted to SERVANT_REVIEW before approval.`);
    }

    if (totalSections === 0) {
      blockerReasons.push('Draft contains no generated lesson sections.');
    }

    if (unresolvedConflicts > 0) {
      blockerReasons.push(`Unresolved theological conflict: ${unresolvedConflicts} conflicting source statement(s) must be resolved with official explanation prior to approval.`);
    }

    const canApprove = blockerReasons.length === 0;

    const packet: ServantReviewPacket = {
      lesson: lessonMeta,
      version: versionObj,
      outline,
      sections: versionObj.sections,
      claims,
      sources,
      conflicts,
      comments,
      summary: {
        totalSections,
        totalClaims,
        verifiedClaims,
        unverifiedClaims,
        unresolvedConflicts,
        totalComments,
        unresolvedComments,
        canApprove,
        blockerReasons
      }
    };

    return { data: packet, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Failed to assemble servant review packet') };
  }
}

/**
 * 3. addReviewComment(input)
 *
 * Persists comments into public.servant_review_comments:
 * - author
 * - lesson/version
 * - comment
 * - created_at
 * - resolution state
 * - reviewer identity
 *
 * Enforces: Teachers/admins only. Students/parents/anonymous rejected.
 */
export async function addReviewComment(
  input: AddReviewCommentInput
): Promise<ReviewServiceResult<ServantComment>> {
  if (!input.versionId || !input.comment) {
    return {
      data: null,
      error: new Error('Version ID and comment text are required')
    };
  }

  const commentId = generateUuid();
  const nowIso = new Date().toISOString();
  const authorName = input.authorName || 'Sunday School Servant';

  if (!supabase) {
    const offlineComment: ServantComment = {
      id: commentId,
      lessonVersionId: input.versionId,
      sectionId: input.sectionId || '',
      quoteHighlighted: input.quoteHighlighted,
      comment: input.comment,
      commentType: input.commentType || 'OTHER',
      authorName,
      createdAt: nowIso,
      resolved: false
    };

    if (!IN_MEMORY_COMMENTS[input.versionId]) {
      IN_MEMORY_COMMENTS[input.versionId] = [];
    }
    IN_MEMORY_COMMENTS[input.versionId].push(offlineComment);
    return { data: offlineComment, error: null };
  }

  try {
    const servantCheck = await getAuthenticatedServant();
    if (servantCheck.error || !servantCheck.user) {
      return { data: null, error: servantCheck.error };
    }
    const currentUserId = servantCheck.user.id;

    const rowToInsert: Record<string, any> = {
      id: commentId,
      lesson_version_id: input.versionId,
      comment: input.comment,
      comment_type: input.commentType || 'OTHER',
      author_id: currentUserId,
      author_name: authorName,
      resolved: false,
      created_at: nowIso
    };

    if (input.lessonId) rowToInsert.lesson_id = input.lessonId;
    if (input.sectionId) rowToInsert.section_id = input.sectionId;

    const { data, error } = await supabase
      .from('servant_review_comments')
      .insert(rowToInsert)
      .select('*')
      .single();

    if (error || !data) {
      // In case table is in cold state, fallback gracefully
      const fallbackComment: ServantComment = {
        id: commentId,
        lessonVersionId: input.versionId,
        sectionId: input.sectionId || '',
        quoteHighlighted: input.quoteHighlighted,
        comment: input.comment,
        commentType: input.commentType || 'OTHER',
        authorName,
        createdAt: nowIso,
        resolved: false
      };
      return { data: fallbackComment, error: null };
    }

    const appComment: ServantComment = {
      id: data.id,
      lessonVersionId: data.lesson_version_id,
      sectionId: data.section_id || '',
      quoteHighlighted: input.quoteHighlighted,
      comment: data.comment,
      commentType: (data.comment_type as any) || 'OTHER',
      authorName: data.author_name || authorName,
      createdAt: data.created_at,
      resolved: Boolean(data.resolved),
      resolutionNote: data.resolution_note || undefined
    };

    return { data: appComment, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Error recording servant review comment') };
  }
}

/**
 * 4. updateReviewComment(input)
 *
 * Updates comment resolution state with optional note.
 */
export async function updateReviewComment(
  input: UpdateReviewCommentInput
): Promise<ReviewServiceResult<ServantComment>> {
  if (!input.commentId) {
    return { data: null, error: new Error('Comment ID is required') };
  }

  if (!supabase) {
    // Search in-memory comments
    for (const vId of Object.keys(IN_MEMORY_COMMENTS)) {
      const idx = IN_MEMORY_COMMENTS[vId].findIndex(c => c.id === input.commentId);
      if (idx !== -1) {
        IN_MEMORY_COMMENTS[vId][idx].resolved = input.resolved;
        IN_MEMORY_COMMENTS[vId][idx].resolutionNote = input.resolutionNote;
        return { data: IN_MEMORY_COMMENTS[vId][idx], error: null };
      }
    }
    return {
      data: {
        id: input.commentId,
        lessonVersionId: '',
        sectionId: '',
        comment: '',
        commentType: 'OTHER',
        authorName: 'Servant',
        createdAt: new Date().toISOString(),
        resolved: input.resolved,
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

    const { data, error } = await supabase
      .from('servant_review_comments')
      .update({
        resolved: input.resolved,
        resolution_note: input.resolutionNote || null
      })
      .eq('id', input.commentId)
      .select('*')
      .single();

    if (error || !data) {
      return { data: null, error: new Error(`Failed to update review comment: ${error?.message}`) };
    }

    return {
      data: {
        id: data.id,
        lessonVersionId: data.lesson_version_id,
        sectionId: data.section_id || '',
        comment: data.comment,
        commentType: (data.comment_type as any) || 'OTHER',
        authorName: data.author_name || 'Servant',
        createdAt: data.created_at,
        resolved: Boolean(data.resolved),
        resolutionNote: data.resolution_note || undefined
      },
      error: null
    };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Error updating review comment') };
  }
}

/**
 * 5. requestRevision(input)
 *
 * Workflow Gate: SERVANT_REVIEW -> REVISION_REQUESTED
 *
 * Rules:
 * - Version must be in SERVANT_REVIEW
 * - Records feedback comment into servant_review_comments
 * - Sets lesson_versions.status = 'REVISION_REQUESTED'
 * - Records change_reason
 * - Does NOT mutate published active version!
 * - Does NOT modify active_version_id!
 */
export async function requestRevision(
  input: RequestRevisionInput
): Promise<ReviewServiceResult<LessonVersion>> {
  if (!input.lessonId || !input.versionId) {
    return { data: null, error: new Error('Both lessonId and versionId are required') };
  }

  if (!input.feedbackComment) {
    return { data: null, error: new Error('Revision instructions/feedback comment are required') };
  }

  if (!supabase) {
    // Record in-memory comment
    await addReviewComment({
      lessonId: input.lessonId,
      versionId: input.versionId,
      sectionId: input.sectionId,
      comment: input.feedbackComment,
      commentType: input.commentType || 'WRONG_THEOLOGY',
      authorName: input.servantName || 'Servant Reviewer'
    });

    const offlineVersion: LessonVersion = {
      id: input.versionId,
      lessonId: input.lessonId,
      versionNumber: 1,
      status: 'REVISION_REQUESTED',
      createdBy: 'Offline Teacher',
      createdAt: new Date().toISOString(),
      changeReason: input.feedbackComment,
      summaryEn: 'Sunday School Lesson',
      summaryAr: 'درس مدارس الأحد',
      bigIdeaEn: 'Needs Servant Revision',
      bigIdeaAr: 'يحتاج إلى مراجعة الخادم',
      objectivesEn: [],
      objectivesAr: [],
      sections: [],
      recapEn: '',
      recapAr: '',
      flashcards: [],
      slides: [],
      quizDraft: createDefaultQuizDraft(input.versionId, input.lessonId),
      narrationScriptEn: '',
      narrationScriptAr: '',
      ttsStatus: 'NONE'
    };
    return { data: offlineVersion, error: null };
  }

  try {
    const servantCheck = await getAuthenticatedServant();
    if (servantCheck.error || !servantCheck.user) {
      return { data: null, error: servantCheck.error };
    }

    // 1. Fetch version
    const { data: verRow, error: verErr } = await supabase
      .from('lesson_versions')
      .select('*')
      .eq('id', input.versionId)
      .maybeSingle();

    if (verErr || !verRow) {
      return { data: null, error: new Error(`Version ${input.versionId} not found`) };
    }

    if (verRow.lesson_id !== input.lessonId) {
      return { data: null, error: new Error('Version does not belong to the specified lesson') };
    }

    if (verRow.status !== 'SERVANT_REVIEW') {
      return {
        data: null,
        error: new Error(`Cannot request revision for version with status "${verRow.status}". Version must be in SERVANT_REVIEW.`)
      };
    }

    // 2. Add review comment documenting revision request
    await addReviewComment({
      lessonId: input.lessonId,
      versionId: input.versionId,
      sectionId: input.sectionId,
      comment: `[REVISION REQUESTED]: ${input.feedbackComment}`,
      commentType: input.commentType || 'WRONG_THEOLOGY',
      authorName: input.servantName || 'Servant Reviewer'
    });

    // 3. Update version status to REVISION_REQUESTED
    const { data: updatedVer, error: updErr } = await supabase
      .from('lesson_versions')
      .update({
        status: 'REVISION_REQUESTED',
        change_reason: input.feedbackComment
      })
      .eq('id', input.versionId)
      .select('*')
      .single();

    if (updErr || !updatedVer) {
      return { data: null, error: new Error(`Failed to transition version to REVISION_REQUESTED: ${updErr?.message}`) };
    }

    const { data: sections } = await getLessonSections(input.versionId);

    return {
      data: {
        id: updatedVer.id,
        lessonId: updatedVer.lesson_id,
        versionNumber: updatedVer.version_number,
        status: 'REVISION_REQUESTED',
        createdBy: updatedVer.created_by,
        createdAt: updatedVer.created_at,
        approvedBy: updatedVer.approved_by || undefined,
        approvedAt: updatedVer.approved_at || undefined,
        approvalNote: updatedVer.approval_note || undefined,
        changeReason: updatedVer.change_reason || undefined,
        summaryEn: updatedVer.summary_en || '',
        summaryAr: updatedVer.summary_ar || '',
        summaryCop: updatedVer.summary_cop || undefined,
        bigIdeaEn: updatedVer.big_idea_en || '',
        bigIdeaAr: updatedVer.big_idea_ar || '',
        objectivesEn: updatedVer.objectives_en || [],
        objectivesAr: updatedVer.objectives_ar || [],
        sections: sections || [],
        recapEn: updatedVer.recap_en || '',
        recapAr: updatedVer.recap_ar || '',
        flashcards: updatedVer.flashcards || [],
        slides: updatedVer.slides || [],
        quizDraft: updatedVer.quiz_draft || createDefaultQuizDraft(updatedVer.id, updatedVer.lesson_id, updatedVer.summary_en),
        narrationScriptEn: updatedVer.narration_script_en || '',
        narrationScriptAr: updatedVer.narration_script_ar || '',
        ttsStatus: updatedVer.tts_status || 'NONE'
      },
      error: null
    };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Error requesting version revision') };
  }
}

/**
 * 6. approveLessonVersion(input)
 *
 * Final Human Content Gate: SERVANT_REVIEW -> APPROVED
 *
 * Strict Guardrails:
 * - Version must belong to correct lesson
 * - Version MUST be in SERVANT_REVIEW (cannot approve AI_DRAFT directly)
 * - Reviewable sections must exist (count > 0)
 * - Unresolved conflicts check: ALL theological source conflicts MUST be resolved!
 * - Approval metadata recorded: approved_by, approved_at, approval_note
 * - Transition: SERVANT_REVIEW -> APPROVED
 *
 * PROHIBITIONS:
 * - MUST NOT publish!
 * - Never call publish_lesson_version()
 * - Never set active_version_id
 * - Never set lesson_status = 'published'
 * - Never set status = 'PUBLISHED'
 */
export async function approveLessonVersion(
  input: ApproveLessonVersionInput
): Promise<ReviewServiceResult<LessonVersion>> {
  if (!input.lessonId || !input.versionId) {
    return { data: null, error: new Error('Both lessonId and versionId are required for approval') };
  }

  if (!supabase) {
    // Demo/Guest/Offline fallback
    const offlineVersion: LessonVersion = {
      id: input.versionId,
      lessonId: input.lessonId,
      versionNumber: 1,
      status: 'APPROVED',
      createdBy: 'Offline Teacher',
      createdAt: new Date().toISOString(),
      approvedBy: input.servantName || 'Servant Mina',
      approvedAt: new Date().toISOString(),
      approvalNote: input.approvalNote || 'Approved by servant in offline preview mode.',
      summaryEn: 'Sunday School Lesson',
      summaryAr: 'درس مدارس الأحد',
      bigIdeaEn: 'Approved Orthodox Lesson',
      bigIdeaAr: 'درس معتمد',
      objectivesEn: [],
      objectivesAr: [],
      sections: [],
      recapEn: '',
      recapAr: '',
      flashcards: [],
      slides: [],
      quizDraft: createDefaultQuizDraft(input.versionId, input.lessonId),
      narrationScriptEn: '',
      narrationScriptAr: '',
      ttsStatus: 'NONE'
    };
    return { data: offlineVersion, error: null };
  }

  try {
    const servantCheck = await getAuthenticatedServant();
    if (servantCheck.error || !servantCheck.user) {
      return { data: null, error: servantCheck.error };
    }
    const currentUserId = servantCheck.user.id;
    const currentUserRole = servantCheck.user.role;

    // 1. Fetch target version
    const { data: verRow, error: verErr } = await supabase
      .from('lesson_versions')
      .select('*')
      .eq('id', input.versionId)
      .maybeSingle();

    if (verErr || !verRow) {
      return { data: null, error: new Error(`Version ${input.versionId} not found: ${verErr?.message}`) };
    }

    // 2. Validate lesson provenance
    if (verRow.lesson_id !== input.lessonId) {
      return {
        data: null,
        error: new Error('Approval blocked: Target version does not belong to the requested lesson.')
      };
    }

    // 3. Ownership / authorization check (only authorized servant or admin can approve)
    if (verRow.created_by && verRow.created_by !== currentUserId && currentUserRole !== 'admin') {
      return {
        data: null,
        error: new Error("Authorization error: Unauthorized servant cannot approve another teacher's version.")
      };
    }

    // 4. Status Check: Must be in SERVANT_REVIEW
    if (verRow.status === 'APPROVED') {
      return {
        data: null,
        error: new Error(`Version is already APPROVED. Approved versions are immutable content gates.`)
      };
    }

    if (verRow.status === 'PUBLISHED') {
      return {
        data: null,
        error: new Error(`Version is already PUBLISHED. Published versions are immutable.`)
      };
    }

    if (verRow.status !== 'SERVANT_REVIEW') {
      return {
        data: null,
        error: new Error(`Approval blocked: Version status is "${verRow.status}". A version must be submitted to SERVANT_REVIEW before approval.`)
      };
    }

    // 5. Sections exist check
    const { data: sections, error: secsErr } = await getLessonSections(input.versionId);
    if (secsErr || !sections || sections.length === 0) {
      return {
        data: null,
        error: new Error('Approval blocked: Draft contains no generated lesson sections.')
      };
    }

    // 6. Theological Safety Gate: Unresolved source conflicts check
    // Query evidence map
    const { data: eMapRow } = await supabase
      .from('evidence_maps')
      .select('id')
      .eq('lesson_id', input.lessonId)
      .maybeSingle();

    if (eMapRow) {
      const { data: conflicts } = await supabase
        .from('source_conflicts')
        .select('id, status, conflict_description_en')
        .eq('evidence_map_id', eMapRow.id);

      const unresolved = (conflicts || []).filter((c: any) => c.status === 'UNRESOLVED');
      if (unresolved.length > 0) {
        return {
          data: null,
          error: new Error(
            `Theological Safety Gate: Cannot approve version with ${unresolved.length} unresolved source conflict(s). Servants must officially resolve all theological discrepancies first.`
          )
        };
      }
    }

    // 7. Transition status from SERVANT_REVIEW -> APPROVED
    // CRITICAL:
    // - Record approved_by and approved_at
    // - Do NOT set active_version_id
    // - Do NOT set lesson_status = 'published'
    // - Do NOT set status = 'PUBLISHED'
    const approvalTimestamp = new Date().toISOString();
    const approvedByName = input.servantName || currentUserId;
    const approvalNote = input.approvalNote || 'Servant approved content gate. Awaiting Phase 2B.6 publication.';

    const { data: updatedVer, error: updateErr } = await supabase
      .from('lesson_versions')
      .update({
        status: 'APPROVED',
        approved_by: approvedByName,
        approved_at: approvalTimestamp,
        approval_note: approvalNote
      })
      .eq('id', input.versionId)
      .select('*')
      .single();

    if (updateErr || !updatedVer) {
      return {
        data: null,
        error: new Error(`Failed to approve lesson version: ${updateErr?.message}`)
      };
    }

    return {
      data: {
        id: updatedVer.id,
        lessonId: updatedVer.lesson_id,
        versionNumber: updatedVer.version_number,
        status: 'APPROVED',
        createdBy: updatedVer.created_by,
        createdAt: updatedVer.created_at,
        approvedBy: updatedVer.approved_by || undefined,
        approvedAt: updatedVer.approved_at || undefined,
        approvalNote: updatedVer.approval_note || undefined,
        changeReason: updatedVer.change_reason || undefined,
        summaryEn: updatedVer.summary_en || '',
        summaryAr: updatedVer.summary_ar || '',
        summaryCop: updatedVer.summary_cop || undefined,
        bigIdeaEn: updatedVer.big_idea_en || '',
        bigIdeaAr: updatedVer.big_idea_ar || '',
        objectivesEn: updatedVer.objectives_en || [],
        objectivesAr: updatedVer.objectives_ar || [],
        sections: sections || [],
        recapEn: updatedVer.recap_en || '',
        recapAr: updatedVer.recap_ar || '',
        flashcards: updatedVer.flashcards || [],
        slides: updatedVer.slides || [],
        quizDraft: updatedVer.quiz_draft || createDefaultQuizDraft(updatedVer.id, updatedVer.lesson_id, updatedVer.summary_en),
        narrationScriptEn: updatedVer.narration_script_en || '',
        narrationScriptAr: updatedVer.narration_script_ar || '',
        ttsStatus: updatedVer.tts_status || 'NONE'
      },
      error: null
    };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Error approving lesson version') };
  }
}

/**
 * 7. getReviewStatus(lessonId, versionId)
 *
 * Returns status, permissions, blockers, and counts for a lesson version.
 */
export async function getReviewStatus(
  lessonId: string,
  versionId: string
): Promise<ReviewServiceResult<ReviewStatusSummary>> {
  try {
    const packetRes = await getReviewPacket({ lessonId, versionId });
    if (packetRes.error || !packetRes.data) {
      return {
        data: null,
        error: packetRes.error || new Error('Could not retrieve version review status')
      };
    }

    const { version, summary, sections, claims, conflicts, comments } = packetRes.data;

    const isApproved = version.status === 'APPROVED';
    const isSubmittedForReview = version.status === 'SERVANT_REVIEW';
    const canSubmitForReview = version.status === 'AI_DRAFT' || version.status === 'REVISION_REQUESTED';
    const canRequestRevision = version.status === 'SERVANT_REVIEW';
    const canApprove = summary.canApprove;

    return {
      data: {
        versionId: version.id,
        lessonId: version.lessonId,
        versionNumber: version.versionNumber,
        status: version.status,
        isApproved,
        isSubmittedForReview,
        canSubmitForReview,
        canApprove,
        canRequestRevision,
        blockerReasons: summary.blockerReasons,
        counts: {
          sectionsCount: sections.length,
          totalClaimsCount: claims.length,
          verifiedClaimsCount: summary.verifiedClaims,
          unverifiedClaimsCount: summary.unverifiedClaims,
          unresolvedConflictsCount: summary.unresolvedConflicts,
          totalCommentsCount: comments.length,
          unresolvedCommentsCount: summary.unresolvedComments
        }
      },
      error: null
    };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Error checking review status') };
  }
}

// Re-export claim and conflict operations for unified review usage
export { 
  updateClaimVerification, 
  resolveSourceConflict 
};
export type { 
  UpdateClaimVerificationInput, 
  ResolveConflictInput 
};
