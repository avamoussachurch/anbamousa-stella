import { supabase } from './supabase';

export interface ServantHomeClass {
  id: string;
  classGroupId: string;
  name: string;
  nameAr: string;
  studentCount: number;
  completedLessons: number;
  progressRecords: number;
  curriculumCount: number;
  lastActivityAt: string | null;
}

export interface ServantHomeSummary {
  churchYear: string | null;
  classes: ServantHomeClass[];
  totals: {
    students: number;
    completedLessons: number;
    progressRecords: number;
    curriculumCount: number;
  };
  studentsWithoutProgress: number;
  lessonsAwaitingReview: number;
  recentActivity: Array<{
    lessonId: string;
    title: string;
    titleAr: string;
    classGroupId: string;
    completedAt: string;
  }>;
  upcomingEvents: Array<{
    id: string;
    title: string;
    titleAr: string;
    type: string;
    dateTime: string;
    location: string | null;
    locationAr: string | null;
  }>;
  scheduledPublications: Array<{
    lessonId: string;
    title: string;
    titleAr: string;
    classGroupId: string;
    scheduledAt: string;
  }>;
  publicationScheduleAvailable: boolean;
  publicationScheduleError: string | null;
  attendanceAvailable: boolean;
  checkedAt: string;
}

export async function getServantHomeSummary(): Promise<{
  data: ServantHomeSummary | null;
  error: Error | null;
}> {
  if (!supabase) {
    return { data: null, error: new Error('Authenticated server access is not configured.') };
  }

  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw new Error(`Could not verify the current session: ${sessionError.message}`);
    if (!session?.access_token) throw new Error('Sign in to load your verified servant dashboard.');

    const response = await fetch('/api/church/servant/home-summary', {
      method: 'GET',
      headers: { authorization: `Bearer ${session.access_token}` }
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success) {
      throw new Error(payload?.message || payload?.error || `Could not load servant dashboard (HTTP ${response.status}).`);
    }
    if (!Array.isArray(payload.classes) || !payload.totals || !Array.isArray(payload.upcomingEvents) || !Array.isArray(payload.recentActivity) || !Array.isArray(payload.scheduledPublications)) {
      throw new Error('The server returned an incomplete servant dashboard summary.');
    }

    return { data: payload as ServantHomeSummary, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Could not load servant dashboard data.')
    };
  }
}
