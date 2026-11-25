import { supabase } from './supabase';

export type AchievementEventType = 'prayer_day';

export function dispatchAchievementResult(data: any): { pointsAwarded: number; hasUnlocks: boolean } {
  const badges = Array.isArray(data?.new_badges) ? data.new_badges : [];
  const milestones = Array.isArray(data?.new_milestones) ? data.new_milestones : [];
  const pointsAwarded = Number(data?.points_awarded || 0);
  if ((badges.length || milestones.length) && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('anba:achievement-unlocked', {
      detail: { badges, milestones, pointsAwarded }
    }));
  }
  return { pointsAwarded, hasUnlocks: badges.length > 0 || milestones.length > 0 };
}

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
    const result = dispatchAchievementResult(data);
    return { success: true, pointsAwarded: result.pointsAwarded };
  } catch (error) {
    console.warn('Verified prayer achievement could not be recorded:', error);
    return { success: false, pointsAwarded: 0, error: error instanceof Error ? error.message : 'Achievement tracking failed.' };
  }
}

