import { supabase } from './supabase';

export type AchievementEventType =
  | 'lesson_opened' | 'lesson_completed' | 'hymn_opened' | 'hymn_mastered'
  | 'taxis_opened' | 'taxis_completed' | 'prayer_day' | 'quiz_passed'
  | 'attendance_present' | 'community_post' | 'community_reaction'
  | 'memory_verse' | 'class_participation' | 'learning_day';

export async function recordAchievementEvent(
  eventType: AchievementEventType,
  sourceKey: string,
  metadata: Record<string, unknown> = {}
): Promise<{ success: boolean; pointsAwarded: number; error?: string }> {
  if (!supabase) return { success: false, pointsAwarded: 0, error: 'Supabase is unavailable.' };
  try {
    const { data, error } = await supabase.rpc('record_achievement_event', {
      p_event_type: eventType,
      p_source_key: sourceKey,
      p_metadata: metadata,
    });
    if (error) throw error;
    const badges = Array.isArray(data?.new_badges) ? data.new_badges : [];
    const milestones = Array.isArray(data?.new_milestones) ? data.new_milestones : [];
    const pointsAwarded = Number(data?.points_awarded || 0);
    if ((badges.length || milestones.length) && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('anba:achievement-unlocked', {
        detail: { badges, milestones, pointsAwarded }
      }));
    }
    return { success: true, pointsAwarded };
  } catch (error) {
    // Achievement tracking must never block a lesson, hymn, prayer, or quiz save.
    console.warn('Achievement event could not be recorded:', error);
    return { success: false, pointsAwarded: 0, error: error instanceof Error ? error.message : 'Achievement tracking failed.' };
  }
}
