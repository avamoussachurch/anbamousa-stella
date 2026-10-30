import { supabase } from './supabase';
import { User } from '../types';
import { parsePersistentMediaUploadResponse } from './mediaUploadResponse';

/**
 * Update user profile fields in Supabase using upsert
 */
/**
 * Update user profile fields in Supabase.
 * Strictly sanitizes updates so only valid columns physically present in public.profiles schema are sent.
 * Excludes parent_email, phone, parent_pin, child_code from database write payloads.
 */
export async function updateSupabaseProfile(
  userId: string,
  updates: Partial<{
    name: string;
    avatar: string;
    screen_time_seconds: number;
    require_reward_approval: boolean;
    push_notifications_enabled: boolean;
    notify_lesson_completion: boolean;
    notify_event_reminders: boolean;
    last_active: string;
    // Local-only / Demo fields accepted for compatibility but filtered out from DB payload:
    parent_email?: string;
    phone?: string;
    parent_pin?: string;
    child_code?: string;
  }>
) {
  if (!supabase) return { error: 'Supabase client not configured' };

  try {
    // Whitelist only real schema columns of public.profiles
    const dbPayload: Record<string, any> = {
      last_active: updates.last_active || new Date().toISOString()
    };

    if (updates.name !== undefined) dbPayload.name = updates.name;
    if (updates.avatar !== undefined) dbPayload.avatar = updates.avatar;
    if (updates.screen_time_seconds !== undefined) dbPayload.screen_time_seconds = updates.screen_time_seconds;
    if (updates.require_reward_approval !== undefined) dbPayload.require_reward_approval = updates.require_reward_approval;
    if (updates.push_notifications_enabled !== undefined) dbPayload.push_notifications_enabled = updates.push_notifications_enabled;
    if (updates.notify_lesson_completion !== undefined) dbPayload.notify_lesson_completion = updates.notify_lesson_completion;
    if (updates.notify_event_reminders !== undefined) dbPayload.notify_event_reminders = updates.notify_event_reminders;

    // Use update on profiles by primary key id
    const { data: updateData, error: updateError } = await supabase
      .from('profiles')
      .update(dbPayload)
      .eq('id', userId)
      .select();

    if (updateError) {
      console.warn('Note on Supabase profile update:', updateError.message);
      return { data: null, error: updateError.message };
    }
    if (!updateData || updateData.length === 0) {
      return { data: null, error: `Profile ${userId} was not found or could not be updated.` };
    }

    return { data: updateData, error: null };
  } catch (err: any) {
    console.warn('Error updating profile in Supabase:', err);
    return { error: err.message };
  }
}

/**
 * Upload an avatar image to the Supabase 'avatars' storage bucket
 * Includes client-side compression to ensure crisp, fast 256x256 avatars
 */
export async function uploadAvatarToSupabase(
  userId: string,
  file: File | Blob
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // 1. Client-side canvas compression for crisp high-res avatar
    const compressedDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const size = 320;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }
          // Center crop to square
          const minDim = Math.min(img.width, img.height);
          const startX = (img.width - minDim) / 2;
          const startY = (img.height - minDim) / 2;
          ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, size, size);
          resolve(canvas.toDataURL('image/jpeg', 0.92));
        };
        img.onerror = () => resolve(event.target?.result as string);
        img.src = event.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    // 2. If Supabase is connected, attempt upload to storage bucket
    if (supabase) {
      try {
        const fileExt = file instanceof File ? file.name.split('.').pop() : 'jpg';
        const fileName = `${userId}/avatar_${Date.now()}.${fileExt || 'jpg'}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true
          });

        if (!uploadError && uploadData) {
          const { data: publicUrlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);

          if (publicUrlData?.publicUrl) {
            // Update profile with public URL
            await updateSupabaseProfile(userId, { avatar: publicUrlData.publicUrl });
            return { success: true, url: publicUrlData.publicUrl };
          }
        }
      } catch (storageErr) {
        console.warn('Supabase storage upload fallback to local high-res data URL:', storageErr);
      }
    }

    // Fallback: return compressed high-res data URL
    if (userId) {
      await updateSupabaseProfile(userId, { avatar: compressedDataUrl }).catch(() => {});
    }
    return { success: true, url: compressedDataUrl };
  } catch (err: any) {
    console.error('Error uploading avatar:', err);
    return { success: false, error: err.message || 'Failed to process avatar' };
  }
}

/**
 * Link parent and child in the user_relationships table and profiles table
 */
export async function linkParentAndChildInSupabase(
  parentId: string,
  childId: string,
  childCode: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return {
      success: false,
      error: 'Supabase is not configured; the family relationship was not saved.'
    };
  }

  void parentId;
  void childId;
  void childCode;
  return {
    success: false,
    error: 'Family links must be verified by the trusted server before they can be saved to Supabase.',
  };
}

/**
 * Fetch linked children for a parent from Supabase
 */
export async function fetchLinkedChildrenFromSupabase(parentId: string) {
  if (!supabase) return [];

  try {
    // Check both user_relationships and profiles.parent_id
    const { data: relationships } = await supabase
      .from('user_relationships')
      .select('child_id, child_code')
      .eq('parent_id', parentId);

    const childIds = relationships?.map(r => r.child_id) || [];

    const { data: profilesByParentId } = await supabase
      .from('profiles')
      .select('*')
      .eq('parent_id', parentId);

    let combinedIds = new Set<string>();
    childIds.forEach(id => combinedIds.add(id));
    profilesByParentId?.forEach(p => combinedIds.add(p.id));

    if (combinedIds.size === 0) return profilesByParentId || [];

    const { data: fullProfiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', Array.from(combinedIds));

    return fullProfiles || profilesByParentId || [];
  } catch (err) {
    console.warn('Error fetching linked children from Supabase:', err);
    return [];
  }
}

/**
 * Search student by secret link code in Supabase.
 * Looks up child_code in public.user_relationships, retrieves the child_id,
 * and fetches the corresponding profile from public.profiles.
 * Never queries a non-existent child_code column on public.profiles.
 */
export async function findStudentByLinkCodeInSupabase(cleanCode: string) {
  if (!supabase) return null;
  const normalized = cleanCode?.trim();
  if (!normalized) return null;

  try {
    // 1. Search for child_code in public.user_relationships
    const { data: relMatch, error: relError } = await supabase
      .from('user_relationships')
      .select('child_id, child_code')
      .ilike('child_code', normalized)
      .limit(1)
      .maybeSingle();

    if (!relError && relMatch?.child_id) {
      // 2. Retrieve student's profile from public.profiles using child_id
      const { data: studentProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', relMatch.child_id)
        .maybeSingle();

      if (studentProfile) return studentProfile;
    }

    // 3. If input is a direct UUID, check against public.profiles.id
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalized);
    if (isUuid) {
      const { data: profileById } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', normalized)
        .maybeSingle();

      if (profileById) return profileById;
    }

    // 4. If input is an email, check against public.profiles.email (safe schema column)
    if (normalized.includes('@')) {
      const { data: profileByEmail } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', normalized)
        .maybeSingle();

      if (profileByEmail) return profileByEmail;
    }
  } catch (e) {
    console.warn('Supabase link lookup note:', e);
  }

  return null;
}

/**
 * Direct browser writes to progress and points are disabled.
 */
export async function recordLessonProgress(
  studentId: string,
  lessonId: string,
  quizScore: number,
  pointsEarned: number,
  verseMemorized: boolean = true
) {
  void studentId;
  void lessonId;
  void quizScore;
  void pointsEarned;
  void verseMemorized;
  throw new Error('Progress and points must be recorded by the authenticated lesson-completion server flow.');
}

/**
 * Submit reward redemption request in Supabase
 */
export async function submitRewardRequest(
  studentId: string,
  rewardId: string,
  rewardNameEn: string,
  rewardNameAr: string,
  costPoints: number,
  parentId?: string
) {
  if (!supabase) return;

  try {
    const { data, error } = await supabase
      .from('reward_requests')
      .insert({
        student_id: studentId,
        reward_id: rewardId,
        reward_name_en: rewardNameEn,
        reward_name_ar: rewardNameAr,
        cost_points: costPoints,
        parent_id: parentId || null,
        status: 'pending',
      });

    return { data, error };
  } catch (err) {
    console.warn('Error submitting reward request:', err);
  }
}

/**
 * Fetches the active cloud storage backend configuration status
 */
export async function checkStorageBackendStatus(): Promise<{
  configured: boolean;
  provider: string;
  bucket: string;
  publicDomain: string;
  unlimited: boolean;
  notes: string;
}> {
  try {
    const res = await fetch('/api/storage/status');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Could not fetch storage status:', err);
  }
  return {
    configured: false,
    provider: 'local-server',
    bucket: 'local-disk',
    publicDomain: '',
    unlimited: false,
    notes: 'Local storage fallback'
  };
}

/**
 * Parses a media URL to detect YouTube, Google Drive, Vimeo, direct audio, direct video, or image link
 */
export function extractEmbedMedia(inputUrl: string): {
  mediaType: 'youtube' | 'video' | 'image' | 'audio' | 'embed' | 'unknown';
  embedUrl: string;
  originalUrl: string;
} {
  const trimmed = inputUrl.trim();
  if (!trimmed) {
    return { mediaType: 'unknown', embedUrl: '', originalUrl: '' };
  }

  // 1. YouTube detection (watch?v=, youtu.be, shorts, embed)
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return {
      mediaType: 'youtube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
      originalUrl: trimmed
    };
  }

  // 2. Google Drive file detection (Converts share link to streamable embed with 0 storage consumption)
  const gdriveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (gdriveMatch && gdriveMatch[1]) {
    const fileId = gdriveMatch[1];
    return {
      mediaType: 'embed',
      embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
      originalUrl: trimmed
    };
  }

  // 3. Vimeo detection
  const vimeoMatch = trimmed.match(/(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)([0-9]+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      mediaType: 'video',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
      originalUrl: trimmed
    };
  }

  // 4. Direct Audio file extensions (.mp3, .wav, .m4a, .aac, .ogg)
  if (/\.(mp3|wav|m4a|aac|ogg)(\?.*)?$/i.test(trimmed)) {
    return {
      mediaType: 'audio',
      embedUrl: trimmed,
      originalUrl: trimmed
    };
  }

  // 5. Direct Video file extensions (.mp4, .webm, .mov)
  if (/\.(mp4|webm|mov)(\?.*)?$/i.test(trimmed)) {
    return {
      mediaType: 'video',
      embedUrl: trimmed,
      originalUrl: trimmed
    };
  }

  // 6. Image links or default
  return {
    mediaType: 'image',
    embedUrl: trimmed,
    originalUrl: trimmed
  };
}

/**
 * Uploads to trusted server-side Supabase Storage. mediaUrl is a stable reference;
 * previewUrl is temporary and must never be persisted.
 */
export async function uploadFeedMediaToSupabase(
  file: File,
  userId: string
): Promise<{
  success: boolean;
  mediaType: 'image' | 'video' | 'audio' | 'embed';
  mediaUrl?: string;
  previewUrl?: string;
  provider?: string;
  sizeKb?: number;
  error?: string;
}> {
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  const isAudio = file.type.startsWith('audio/');

  if (!isImage && !isVideo && !isAudio) {
    return {
      success: false,
      mediaType: 'image',
      error: 'Unsupported file type. Please upload a photo (JPG, PNG, WebP), video (MP4, WebM), or audio clip (MP3, M4A, WAV).'
    };
  }

  if (!supabase) {
    return { success: false, mediaType: 'image', error: 'Supabase is not configured; media cannot be saved persistently.' };
  }

  // 1. Try High-Capacity Node.js Backend Upload Route (/api/upload-media)
  try {
    const formData = new FormData();
    formData.append('media', file);
    formData.append('userId', userId);
    formData.append('type', 'feed');
    formData.append('isPublic', 'true');

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (sessionError || !accessToken) {
      return {
        success: false,
        mediaType: isImage ? 'image' : isVideo ? 'video' : 'audio',
        error: 'Your session expired. Sign in again before uploading media.'
      };
    }

    const res = await fetch('/api/upload-media', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData
    });

    const result = await parsePersistentMediaUploadResponse(res);
    if (result.success && result.mediaUrl && result.previewUrl) {
      return {
        success: true,
        mediaType: isImage ? 'image' : isVideo ? 'video' : 'audio',
        mediaUrl: result.mediaUrl,
        previewUrl: result.previewUrl,
        provider: result.provider || 'supabase-storage',
        sizeKb: result.sizeKb || Math.round(file.size / 1024)
      };
    }
    return {
      success: false,
      mediaType: isImage ? 'image' : isVideo ? 'video' : 'audio',
      error: result.error || 'Persistent media upload failed.'
    };
  } catch (serverErr) {
    console.warn('Persistent media upload failed:', serverErr);
    return {
      success: false,
      mediaType: isImage ? 'image' : isVideo ? 'video' : 'audio',
      error: serverErr instanceof Error ? serverErr.message : 'Persistent media upload failed.'
    };
  }

  return {
    success: false,
    mediaType: isImage ? 'image' : isVideo ? 'video' : 'audio',
    error: 'The file was not saved to persistent storage.'
  };

}

/**
 * Persistent Agpeya & Daily Prayer Tracker in Supabase
 */
export interface AgpeyaProgressRecord {
  date: string; // YYYY-MM-DD
  completedHours: Record<string, boolean>; // e.g. { prime: true, terce: false, ... }
  streakDays: number;
  personalPrayer?: string;
  lastUpdated: string;
}

export async function saveAgpeyaProgressToSupabase(
  userId: string,
  record: AgpeyaProgressRecord
): Promise<{ success: boolean; error?: string }> {
  // Always update resilient local cache
  if (typeof window !== 'undefined') {
    localStorage.setItem(`agpeya_checks_${record.date}`, JSON.stringify(record.completedHours));
    localStorage.setItem(`agpeya_streak_days`, record.streakDays.toString());
    if (record.personalPrayer !== undefined) {
      localStorage.setItem('agpeya_personal_intentions', record.personalPrayer);
    }
    localStorage.setItem(`agpeya_full_record_${userId}_${record.date}`, JSON.stringify(record));
  }

  if (!supabase) {
    return { success: true };
  }

  try {
    // Attempt upsert into 'agpeya_prayers'
    const { error: prayerErr } = await supabase
      .from('agpeya_prayers')
      .upsert({
        user_id: userId,
        date: record.date,
        completed_hours: record.completedHours,
        streak_days: record.streakDays,
        personal_prayer: record.personalPrayer || '',
        updated_at: record.lastUpdated
      }, { onConflict: 'user_id,date' });

    if (!prayerErr) {
      return { success: true };
    }

    // Secondary fallback: update profile's last_active
    await supabase
      .from('profiles')
      .update({
        last_active: new Date().toISOString()
      })
      .eq('id', userId);

    return { success: true };
  } catch (err: any) {
    console.warn('Supabase Agpeya sync fallback:', err?.message);
    return { success: true, error: err?.message };
  }
}

export async function getAgpeyaProgressFromSupabase(
  userId: string,
  date: string
): Promise<{ success: boolean; data?: AgpeyaProgressRecord; error?: string }> {
  // Check local cache first for instant UI response
  let localData: AgpeyaProgressRecord | null = null;
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(`agpeya_full_record_${userId}_${date}`);
    if (raw) {
      try {
        localData = JSON.parse(raw);
      } catch (e) {}
    }
  }

  if (!supabase) {
    return { success: true, data: localData || undefined };
  }

  try {
    const { data, error } = await supabase
      .from('agpeya_prayers')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .maybeSingle();

    if (!error && data) {
      const record: AgpeyaProgressRecord = {
        date: data.date,
        completedHours: data.completed_hours || {},
        streakDays: data.streak_days || 1,
        personalPrayer: data.personal_prayer || '',
        lastUpdated: data.updated_at || new Date().toISOString()
      };
      // Keep local in sync
      if (typeof window !== 'undefined') {
        localStorage.setItem(`agpeya_checks_${date}`, JSON.stringify(record.completedHours));
        localStorage.setItem(`agpeya_full_record_${userId}_${date}`, JSON.stringify(record));
      }
      return { success: true, data: record };
    }

    return { success: true, data: localData || undefined };
  } catch (err: any) {
    return { success: true, data: localData || undefined, error: err?.message };
  }
}
