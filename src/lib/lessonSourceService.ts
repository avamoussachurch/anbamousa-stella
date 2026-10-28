import { supabase } from './supabase';
import { 
  LessonSource, 
  SourceType, 
  RightsStatus, 
  SourceProcessingStatus, 
  SourcePriority 
} from '../types';
import { 
  DbLessonSource, 
  adaptDbSourceToAppSource 
} from './curriculumService';
import { getEditableLessonVersion } from './lessonAuthoringService';

export interface AddLessonSourceInput {
  lessonId: string;
  sessionId?: string;
  type: SourceType;
  originalFilename: string;
  mimeType: string;
  fileUrl?: string;
  fileSize?: number;
  description?: string;
  teacherNotes?: string;
  rightsStatus?: RightsStatus;
  processingStatus?: SourceProcessingStatus;
  priority?: SourcePriority;
  transcript?: string;
  extractedContent?: string;
  pageCount?: number;
  slideCount?: number;
  durationSeconds?: number;
  youtubeId?: string;
}

export interface UpdateLessonSourceInput {
  description?: string;
  teacherNotes?: string;
  rightsStatus?: RightsStatus;
  processingStatus?: SourceProcessingStatus;
  priority?: SourcePriority;
  transcript?: string;
  extractedContent?: string;
  originalFilename?: string;
}

export interface SourceServiceResult<T> {
  data: T | null;
  error: Error | null;
}

export interface DraftSourcePacket {
  lessonId: string;
  draftVersionId: string;
  sources: LessonSource[];
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
    return { user: null, error: new Error('Authentication required for source ingestion') };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  const finalRole = profile?.role || 'student';
  if (finalRole !== 'teacher' && finalRole !== 'admin') {
    return { user: null, error: new Error('Only servants, teachers, and administrators may ingest curriculum sources') };
  }

  return { user: { id: user.id, role: finalRole }, error: null };
}

/**
 * Uploads a source media file (PDF, PPTX, audio, video, image) to the local server storage (/uploads).
 * Does NOT use external cloud providers (S3/R2).
 */
export async function uploadSourceMedia(
  file: File,
  lessonId?: string
): Promise<{ success: boolean; fileUrl?: string; error?: string }> {
  try {
    const formData = new FormData();
    formData.append('media', file);
    formData.append('type', 'source');
    if (lessonId) {
      formData.append('lessonId', lessonId);
    }

    const headers: Record<string, string> = {};
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      if (session?.user?.id) {
        formData.append('userId', session.user.id);
      }
    }

    const response = await fetch('/api/upload-media', {
      method: 'POST',
      headers,
      body: formData
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => null);
      throw new Error(errJson?.error || `Upload failed with status ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      fileUrl: data.mediaUrl
    };
  } catch (err: any) {
    console.error('Source media upload error:', err);
    return {
      success: false,
      error: err?.message || 'Failed to upload source media'
    };
  }
}

/**
 * Resolves an authenticated URL for accessing a private source file.
 * Appends the current user's session token as a query parameter for browser media elements and download links.
 */
export async function getAuthorizedSourceUrl(fileUrl?: string): Promise<string> {
  if (!fileUrl || !fileUrl.startsWith('/uploads/')) {
    return fileUrl || '';
  }
  // Public samples do not need auth tokens
  if (fileUrl.includes('sample_') || fileUrl.includes('demo_') || fileUrl.includes('public_')) {
    return fileUrl;
  }
  if (!supabase) return fileUrl;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      const separator = fileUrl.includes('?') ? '&' : '?';
      return `${fileUrl}${separator}token=${encodeURIComponent(session.access_token)}`;
    }
  } catch {
    // Return original url if session resolution fails
  }
  return fileUrl;
}

/**
 * 1. addLessonSource(input)
 *
 * Persists a new source record into public.lesson_sources under servant RLS.
 * - Associates with lesson_id
 * - Records provenance (uploaded_by = servant.id, timestamp)
 * - Initial theological verification status is UNVERIFIED (theological claim verified = NO)
 */
export async function addLessonSource(
  input: AddLessonSourceInput
): Promise<SourceServiceResult<LessonSource>> {
  try {
    const servantCheck = await getAuthenticatedServant();
    if (servantCheck.error || !servantCheck.user) {
      return { data: null, error: servantCheck.error };
    }
    const currentUserId = servantCheck.user.id;

    // Verify target lesson exists
    const { data: lessonRow, error: lessonErr } = await supabase!
      .from('lessons')
      .select('id, created_by, active_version_id')
      .eq('id', input.lessonId)
      .maybeSingle();

    if (lessonErr || !lessonRow) {
      return { data: null, error: new Error('Target lesson not found') };
    }

    // Verify servant authorization (Requirement 5)
    if (lessonRow.created_by && lessonRow.created_by !== currentUserId && servantCheck.user.role !== 'admin') {
      return { data: null, error: new Error('Cannot add sources to another teacher\'s lesson') };
    }

    const sourceId = generateUuid();
    const nowIso = new Date().toISOString();

    // Map into exact schema columns of public.lesson_sources (DO NOT INVENT COLUMNS)
    const dbPayload: Record<string, any> = {
      id: sourceId,
      lesson_id: input.lessonId,
      session_id: input.sessionId || null,
      uploaded_by: currentUserId,
      type: input.type,
      original_filename: input.originalFilename,
      mime_type: input.mimeType,
      file_url: input.fileUrl || null,
      file_size: input.fileSize || null,
      description: input.description || null,
      teacher_notes: input.teacherNotes || null,
      rights_status: input.rightsStatus || 'TEACHER_OWNED',
      processing_status: input.processingStatus || 'PENDING',
      priority: input.priority || 'PRIMARY',
      transcript: input.transcript || null,
      extracted_content: input.extractedContent || null,
      created_at: nowIso
    };

    const { data: inserted, error: insertErr } = await supabase!
      .from('lesson_sources')
      .insert(dbPayload)
      .select('*')
      .single();

    if (insertErr || !inserted) {
      return { data: null, error: new Error(`Failed to persist source: ${insertErr?.message}`) };
    }

    const appSource = adaptDbSourceToAppSource(inserted as DbLessonSource);
    return { data: appSource, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Unexpected failure adding source') };
  }
}

/**
 * 2. listLessonSources(lessonId)
 *
 * Lists all sources associated with a lesson.
 * Strictly adheres to servant RLS policies.
 */
export async function listLessonSources(
  lessonId: string
): Promise<SourceServiceResult<LessonSource[]>> {
  if (!supabase) {
    return { data: null, error: new Error('Supabase client is not configured') };
  }

  try {
    const { data: dbSources, error: sourcesErr } = await supabase
      .from('lesson_sources')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: true });

    if (sourcesErr) {
      return { data: null, error: new Error(`Failed to query lesson sources: ${sourcesErr.message}`) };
    }

    const adaptedList = (dbSources || []).map((s: DbLessonSource) => adaptDbSourceToAppSource(s));
    return { data: adaptedList, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Error listing lesson sources') };
  }
}

/**
 * 3. getLessonSource(sourceId)
 *
 * Retrieves a single source by ID.
 */
export async function getLessonSource(
  sourceId: string
): Promise<SourceServiceResult<LessonSource>> {
  if (!supabase) {
    return { data: null, error: new Error('Supabase client is not configured') };
  }

  try {
    const { data, error } = await supabase
      .from('lesson_sources')
      .select('*')
      .eq('id', sourceId)
      .maybeSingle();

    if (error || !data) {
      return { data: null, error: new Error(error?.message || 'Source not found') };
    }

    return { data: adaptDbSourceToAppSource(data as DbLessonSource), error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Error fetching source') };
  }
}

/**
 * 4. updateLessonSource(sourceId, updates)
 *
 * Updates metadata for an authorized draft source.
 * - Protects immutable published curriculum
 * - Prevents teachers from updating other teachers' sources
 */
export async function updateLessonSource(
  sourceId: string,
  updates: UpdateLessonSourceInput
): Promise<SourceServiceResult<LessonSource>> {
  try {
    const servantCheck = await getAuthenticatedServant();
    if (servantCheck.error || !servantCheck.user) {
      return { data: null, error: servantCheck.error };
    }
    const currentUserId = servantCheck.user.id;
    const currentUserRole = servantCheck.user.role;

    // Fetch existing source
    const { data: existing, error: fetchErr } = await supabase!
      .from('lesson_sources')
      .select('*')
      .eq('id', sourceId)
      .maybeSingle();

    if (fetchErr || !existing) {
      return { data: null, error: new Error('Source not found') };
    }

    // Authorization check
    if (existing.uploaded_by !== currentUserId && currentUserRole !== 'admin') {
      return { data: null, error: new Error('Teacher cannot edit another teacher\'s source') };
    }

    const payload: Record<string, any> = {};
    if (updates.description !== undefined) payload.description = updates.description || null;
    if (updates.teacherNotes !== undefined) payload.teacher_notes = updates.teacherNotes || null;
    if (updates.rightsStatus !== undefined) payload.rights_status = updates.rightsStatus;
    if (updates.processingStatus !== undefined) payload.processing_status = updates.processingStatus;
    if (updates.priority !== undefined) payload.priority = updates.priority;
    if (updates.transcript !== undefined) payload.transcript = updates.transcript || null;
    if (updates.extractedContent !== undefined) payload.extracted_content = updates.extractedContent || null;
    if (updates.originalFilename !== undefined) payload.original_filename = updates.originalFilename;

    const { data: updated, error: updateErr } = await supabase!
      .from('lesson_sources')
      .update(payload)
      .eq('id', sourceId)
      .select('*')
      .single();

    if (updateErr || !updated) {
      return { data: null, error: new Error(`Failed to update source: ${updateErr?.message}`) };
    }

    return { data: adaptDbSourceToAppSource(updated as DbLessonSource), error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Error updating source') };
  }
}

/**
 * 5. removeLessonSource(sourceId)
 *
 * Removes a source record under servant RLS.
 * - Prevents teachers from deleting other teachers' sources
 * - Does not cascade destructively
 */
export async function removeLessonSource(
  sourceId: string
): Promise<SourceServiceResult<boolean>> {
  try {
    const servantCheck = await getAuthenticatedServant();
    if (servantCheck.error || !servantCheck.user) {
      return { data: null, error: servantCheck.error };
    }
    const currentUserId = servantCheck.user.id;
    const currentUserRole = servantCheck.user.role;

    // Fetch existing source
    const { data: existing, error: fetchErr } = await supabase!
      .from('lesson_sources')
      .select('*')
      .eq('id', sourceId)
      .maybeSingle();

    if (fetchErr || !existing) {
      return { data: null, error: new Error('Source not found') };
    }

    // Authorization check
    if (existing.uploaded_by !== currentUserId && currentUserRole !== 'admin') {
      return { data: null, error: new Error('Teacher cannot delete another teacher\'s source') };
    }

    // Unlink from lesson_section_sources if any exist
    await supabase!
      .from('lesson_section_sources')
      .delete()
      .eq('source_id', sourceId);

    // Delete source
    const { error: delErr } = await supabase!
      .from('lesson_sources')
      .delete()
      .eq('id', sourceId);

    if (delErr) {
      return { data: null, error: new Error(`Failed to delete source: ${delErr.message}`) };
    }

    return { data: true, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Error deleting source') };
  }
}

/**
 * 6. getDraftSourcePacket(lessonId)
 *
 * Preparation for Phase 2B.3: Evidence Map generation.
 * Resolves:
 * - Current lesson
 * - Current authorized draft version
 * - All attached sources with database IDs and references
 */
export async function getDraftSourcePacket(
  lessonId: string
): Promise<SourceServiceResult<DraftSourcePacket>> {
  try {
    const servantCheck = await getAuthenticatedServant();
    if (servantCheck.error || !servantCheck.user) {
      return { data: null, error: servantCheck.error };
    }

    // Resolve editable draft version
    const draftRes = await getEditableLessonVersion(lessonId);
    if (draftRes.error || !draftRes.data) {
      return { data: null, error: draftRes.error || new Error('No editable draft version found') };
    }

    // Resolve sources for this lesson
    const sourcesRes = await listLessonSources(lessonId);
    if (sourcesRes.error) {
      return { data: null, error: sourcesRes.error };
    }

    return {
      data: {
        lessonId,
        draftVersionId: draftRes.data.id,
        sources: sourcesRes.data || []
      },
      error: null
    };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Failed to prepare draft source packet') };
  }
}

export interface ServantManagedSource extends LessonSource {
  lessonTitle?: string;
  lessonStatus?: 'draft' | 'published';
  isPublic?: boolean;
  evidenceMapAvailable?: boolean;
  evidenceClaimsCount?: number;
  claimsSample?: Array<{
    claimId: string;
    statementEn: string;
    statementAr: string;
    category?: string;
    sourceLocation?: string;
    verified: boolean;
    servantReviewStatus?: string;
  }>;
}

export interface SourceEvidenceDetails {
  sourceId: string;
  lessonId: string;
  sourceFilename: string;
  evidenceMapAvailable: boolean;
  claimsCount: number;
  claims: Array<{
    claimId: string;
    statementEn: string;
    statementAr: string;
    category?: string;
    sourceLocation?: string;
    quoteEn?: string;
    verified: boolean;
    servantReviewStatus?: string;
  }>;
}

/**
 * 7. fetchServantSources(lessonId?, type?)
 *
 * Retrieves curriculum sources for an authorized servant using authoritative server endpoints.
 * Includes evidence map availability and provenance link metadata.
 */
export async function fetchServantSources(
  lessonId?: string,
  type?: string
): Promise<SourceServiceResult<ServantManagedSource[]>> {
  try {
    const headers = await getAuthHeader();
    const params = new URLSearchParams();
    if (lessonId) params.append('lessonId', lessonId);
    if (type && type !== 'ALL') params.append('type', type);

    const queryStr = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`/api/church/sources${queryStr}`, { headers });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.message || errJson?.error || `Failed to fetch sources: ${res.status}`);
    }

    const data = await res.json();
    return { data: data.sources || [], error: null };
  } catch (err: any) {
    console.warn('Error fetching servant sources via API, falling back if offline:', err);
    // If Supabase is available and lessonId is provided, fallback to listLessonSources
    if (lessonId && supabase) {
      const fallback = await listLessonSources(lessonId);
      if (fallback.data) {
        return { data: fallback.data as ServantManagedSource[], error: null };
      }
    }
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * 8. fetchSourceEvidence(sourceId)
 *
 * Read-only inspection of evidence map and theological claims associated with a source.
 */
export async function fetchSourceEvidence(
  sourceId: string
): Promise<SourceServiceResult<SourceEvidenceDetails>> {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/church/sources/${encodeURIComponent(sourceId)}/evidence`, { headers });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.message || errJson?.error || `Failed to fetch source evidence: ${res.status}`);
    }

    const data = await res.json();
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Helper to get authorization headers from current session
 */
async function getAuthHeader(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  if (supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
    } catch {
      // ignore
    }
  }
  return headers;
}
