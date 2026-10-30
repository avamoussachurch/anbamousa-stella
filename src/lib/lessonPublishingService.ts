import { supabase } from './supabase';
import { LessonVersion } from '../types';
import { DbLessonVersion } from './curriculumService';

export interface PublishLessonVersionInput {
  lessonId: string;
  versionId: string;
}

export interface PublishedVersionData {
  lessonId: string;
  versionId: string;
  status: 'PUBLISHED';
  activeVersionId: string;
  lessonStatus: 'published';
  publishedAt: string;
  publishedBy?: string;
}

export interface PublishResult {
  data: PublishedVersionData | null;
  error: Error | null;
}

export interface ScheduledLessonPublication {
  id: string;
  lesson_id: string;
  version_id: string;
  scheduled_at: string;
  status: 'scheduled' | 'processing' | 'published' | 'failed' | 'cancelled';
  error_message: string | null;
  created_at: string;
}

export interface BulkPublishResult {
  lessonId: string;
  versionId: string;
  success: boolean;
  error?: string;
}

export interface BulkScheduleResult {
  lessonId: string;
  versionId: string;
  success: boolean;
  error?: string;
}

export function getPublicationTimezone(configuredTimezone?: string): string {
  const candidate = configuredTimezone || 'Africa/Cairo';
  try {
    new Intl.DateTimeFormat('en', { timeZone: candidate });
    return candidate;
  } catch {
    return 'Africa/Cairo';
  }
}

export function parsePublicationLocalDateTime(
  value: string,
  timezone = getPublicationTimezone()
): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const [, yearText, monthText, dayText, hourText, minuteText] = match;
  const targetParts = {
    year: Number(yearText),
    month: Number(monthText),
    day: Number(dayText),
    hour: Number(hourText),
    minute: Number(minuteText)
  };
  const targetUtc = Date.UTC(
    targetParts.year,
    targetParts.month - 1,
    targetParts.day,
    targetParts.hour,
    targetParts.minute
  );
  let timestamp = targetUtc;

  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    });
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const parts = Object.fromEntries(
        formatter.formatToParts(new Date(timestamp))
          .filter(part => part.type !== 'literal')
          .map(part => [part.type, Number(part.value)])
      );
      const displayedUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
      timestamp += targetUtc - displayedUtc;
    }

    const resolved = new Date(timestamp);
    const finalParts = Object.fromEntries(
      formatter.formatToParts(resolved)
        .filter(part => part.type !== 'literal')
        .map(part => [part.type, Number(part.value)])
    );
    if (
      finalParts.year !== targetParts.year ||
      finalParts.month !== targetParts.month ||
      finalParts.day !== targetParts.day ||
      finalParts.hour !== targetParts.hour ||
      finalParts.minute !== targetParts.minute
    ) return null;
    return resolved;
  } catch {
    return null;
  }
}

export function validateFuturePublicationTime(value: string, now = new Date()): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.getTime() <= now.getTime()) return null;
  return date;
}

export function isPublicationDue(scheduledAt: string, now = new Date()): boolean {
  const scheduledTime = new Date(scheduledAt).getTime();
  return Number.isFinite(scheduledTime) && scheduledTime <= now.getTime();
}

export function canModifyScheduledPublication(
  publication: Pick<ScheduledLessonPublication, 'status'> | null | undefined
): boolean {
  return publication?.status === 'scheduled';
}

export function canManageLessonVersion(
  role: string | null | undefined,
  actorId: string | null | undefined,
  version: Pick<LessonVersion, 'createdBy'> | null | undefined
): boolean {
  if (role === 'admin') return Boolean(actorId);
  return role === 'teacher' && Boolean(actorId && version?.createdBy === actorId);
}

export async function publishLessonsInBulk(
  items: Array<{ lessonId: string; versionId: string }>,
  publish: (lessonId: string, versionId: string) => Promise<PublishResult>
): Promise<BulkPublishResult[]> {
  const results: BulkPublishResult[] = [];
  for (const item of items) {
    try {
      const result = await publish(item.lessonId, item.versionId);
      const success = Boolean(result.data && !result.error);
      results.push({
        ...item,
        success,
        ...(!success
          ? { error: result.error?.message || 'The server did not confirm publication.' }
          : {})
      });
    } catch (error) {
      results.push({
        ...item,
        success: false,
        error: error instanceof Error ? error.message : 'Publication request failed.'
      });
    }
  }
  return results;
}

export async function scheduleLessonsInBulk(
  items: Array<{ lessonId: string; versionId: string }>,
  scheduledAt: Date,
  schedule: (lessonId: string, versionId: string, scheduledAt: Date) => Promise<{
    data: ScheduledLessonPublication | null;
    error: Error | null;
  }>
): Promise<BulkScheduleResult[]> {
  const results: BulkScheduleResult[] = [];
  for (const item of items) {
    try {
      const result = await schedule(item.lessonId, item.versionId, scheduledAt);
      const success = Boolean(result.data && !result.error);
      results.push({
        ...item,
        success,
        ...(!success
          ? { error: result.error?.message || 'The server did not confirm scheduling.' }
          : {})
      });
    } catch (error) {
      results.push({
        ...item,
        success: false,
        error: error instanceof Error ? error.message : 'Scheduling request failed.'
      });
    }
  }
  return results;
}

export function formatPublicationTime(
  timestamp: string,
  timezone = getPublicationTimezone(),
  locale = 'en'
): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timezone
  }).format(new Date(timestamp));
}

export async function listScheduledLessonPublications(): Promise<{
  data: ScheduledLessonPublication[] | null;
  error: Error | null;
}> {
  if (!supabase) return { data: null, error: new Error('Supabase is not configured.') };
  try {
    const { data, error } = await supabase.rpc('list_lesson_publications');
    if (error) return { data: null, error: new Error(`Could not load publication schedules: ${error.message}`) };
    return { data: (data || []) as ScheduledLessonPublication[], error: null };
  } catch (error) {
    return { data: null, error: new Error(error instanceof Error ? error.message : 'Could not load publication schedules.') };
  }
}

export async function scheduleLessonPublication(
  lessonId: string,
  versionId: string,
  scheduledAt: Date
): Promise<{ data: ScheduledLessonPublication | null; error: Error | null }> {
  if (!supabase) return { data: null, error: new Error('Supabase is not configured.') };
  if (!lessonId || !versionId) return { data: null, error: new Error('A lesson and approved version are required.') };
  if (!Number.isFinite(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
    return { data: null, error: new Error('Choose a future publication time.') };
  }
  try {
    const { data, error } = await supabase.rpc('schedule_lesson_publication', {
      p_lesson_id: lessonId,
      p_version_id: versionId,
      p_scheduled_at: scheduledAt.toISOString()
    });
    if (error) return { data: null, error: new Error(`Could not schedule publication: ${error.message}`) };
    return { data: data as ScheduledLessonPublication, error: null };
  } catch (error) {
    return { data: null, error: new Error(error instanceof Error ? error.message : 'Could not schedule publication.') };
  }
}

export async function rescheduleLessonPublication(
  publicationId: string,
  scheduledAt: Date
): Promise<{ data: ScheduledLessonPublication | null; error: Error | null }> {
  if (!supabase) return { data: null, error: new Error('Supabase is not configured.') };
  if (!Number.isFinite(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
    return { data: null, error: new Error('Choose a future publication time.') };
  }
  try {
    const { data, error } = await supabase.rpc('reschedule_lesson_publication', {
      p_publication_id: publicationId,
      p_scheduled_at: scheduledAt.toISOString()
    });
    if (error) return { data: null, error: new Error(`Could not reschedule publication: ${error.message}`) };
    return { data: data as ScheduledLessonPublication, error: null };
  } catch (error) {
    return { data: null, error: new Error(error instanceof Error ? error.message : 'Could not reschedule publication.') };
  }
}

export async function cancelLessonPublication(publicationId: string): Promise<{
  data: ScheduledLessonPublication | null;
  error: Error | null;
}> {
  if (!supabase) return { data: null, error: new Error('Supabase is not configured.') };
  try {
    const { data, error } = await supabase.rpc('cancel_lesson_publication', {
      p_publication_id: publicationId
    });
    if (error) return { data: null, error: new Error(`Could not cancel publication: ${error.message}`) };
    return { data: data as ScheduledLessonPublication, error: null };
  } catch (error) {
    return {
      data: null,
      error: new Error(error instanceof Error ? error.message : 'Could not cancel publication.')
    };
  }
}

/**
 * Pre-publish validation UX check.
 * Verifies that a version is in APPROVED state with approval metadata before calling the authoritative RPC.
 * (The database RPC remains the real security boundary.)
 */
export function canPublishVersion(
  version: LessonVersion | DbLessonVersion | null | undefined,
  lessonId: string
): { canPublish: boolean; reason?: string } {
  if (!version) {
    return { canPublish: false, reason: 'Version does not exist.' };
  }

  const vLessonId = 'lessonId' in version ? version.lessonId : version.lesson_id;
  if (vLessonId && vLessonId !== lessonId) {
    return { canPublish: false, reason: 'Version does not belong to the target lesson.' };
  }

  const status = version.status;
  if (status !== 'APPROVED') {
    if (status === 'PUBLISHED') {
      return { canPublish: false, reason: 'This version is already published.' };
    }
    if (status === 'AI_DRAFT') {
      return { canPublish: false, reason: 'AI Drafts cannot be published. Must be submitted and approved by a servant first.' };
    }
    if (status === 'SERVANT_REVIEW') {
      return { canPublish: false, reason: 'Version is currently in Servant Review. Must be approved before publication.' };
    }
    if (status === 'REVISION_REQUESTED') {
      return { canPublish: false, reason: 'Revision has been requested. Edits and servant re-approval are required.' };
    }
    return { canPublish: false, reason: `Version cannot be published from status "${status}". Version must be APPROVED.` };
  }

  const approvedBy = 'approvedBy' in version ? version.approvedBy : (version as DbLessonVersion).approved_by;
  const approvedAt = 'approvedAt' in version ? version.approvedAt : (version as DbLessonVersion).approved_at;

  if (!approvedBy || !approvedAt) {
    return { canPublish: false, reason: 'Version is missing ecclesiastical approval metadata (approvedBy / approvedAt).' };
  }

  return { canPublish: true };
}

/**
 * Publishes an approved lesson version by calling the authoritative:
 * public.publish_lesson_version(lesson_id, version_id)
 * RPC in PostgreSQL / Supabase.
 *
 * Flow:
 * APPROVED
 * -> publish_lesson_version()
 * -> version becomes PUBLISHED
 * -> lessons.active_version_id = version_id
 * -> lessons.lesson_status = published
 * -> student read path automatically sees the new active version
 */
export async function publishLessonVersion(
  lessonId: string,
  versionId: string
): Promise<PublishResult> {
  if (!lessonId || !versionId) {
    return {
      data: null,
      error: new Error('Both lessonId and versionId are required for publication')
    };
  }

  try {
    const { data: sessionData, error: sessionError } = await supabase?.auth.getSession() || {
      data: { session: null },
      error: null
    };
    const token = sessionData.session?.access_token;
    if (sessionError || !token) {
      return { data: null, error: new Error('An active teacher session is required to publish a lesson.') };
    }

    const res = await fetch('/api/church/publish-approved-lesson-version', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ lessonId, versionId })
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      return {
        data: null,
        error: new Error(json?.message || json?.error || `HTTP ${res.status}: Failed to publish version`)
      };
    }

    return {
      data: {
        lessonId,
        versionId,
        status: 'PUBLISHED',
        activeVersionId: versionId,
        lessonStatus: 'published',
        publishedAt: json.publishedAt || new Date().toISOString(),
        publishedBy: json.publishedBy
      },
      error: null
    };
  } catch (err: unknown) {
    return {
      data: null,
      error: new Error(err instanceof Error ? err.message : 'Publication request failed.')
    };
  }
}
