import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { User } from '../types';

export interface SupabaseAuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

/**
 * Register a new user in Supabase Auth & Public Profiles
 */
export async function registerWithSupabase(
  email: string,
  password: string,
  fullName: string,
  role: 'student' | 'teacher' | 'parent',
  grade?: string
): Promise<SupabaseAuthResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      error: 'Supabase credentials not configured yet. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your settings.',
    };
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password: password,
      options: {
        data: {
          full_name: fullName,
          role: role,
          grade: grade || undefined,
        },
      },
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: 'Registration failed - no user returned.' };
    }

    const userId = authData.user.id;
    const profile: User = {
      id: userId,
      fullName: fullName,
      role: role,
      grade: grade,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
      points: 0,
      currentStreak: 0,
      longestStreak: 0,
      screenTimeSeconds: 0,
      requireRewardApproval: true,
      pushNotificationsEnabled: true,
      notifyLessonCompletion: true,
      notifyEventReminders: true,
    };

    // Insert or update profile row in public.profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        name: fullName,
        email: email.trim(),
        role: role,
        grade: grade || null,
        avatar: profile.avatarUrl,
        points: 0,
        current_streak: 0,
        longest_streak: 0,
        require_reward_approval: true,
        push_notifications_enabled: true,
        notify_lesson_completion: true,
        notify_event_reminders: true,
      });

    if (profileError) {
      console.warn('Profile insertion warning:', profileError);
    }

    return { success: true, user: profile };
  } catch (err: any) {
    return { success: false, error: err.message || 'An unexpected error occurred during signup.' };
  }
}

/**
 * Sign in existing user with Supabase
 */
export async function loginWithSupabase(
  email: string,
  password: string
): Promise<SupabaseAuthResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      error: 'Supabase credentials not configured yet. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your settings.',
    };
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: 'No user record returned.' };
    }

    const userId = authData.user.id;

    // Fetch user profile from public.profiles table
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.warn('Could not fetch user profile from Supabase:', profileError);
    }

    let activeProfile = profileData;
    if (!activeProfile) {
      const meta = authData.user.user_metadata || {};
      const fallbackName = meta.full_name || meta.name || authData.user.email?.split('@')[0] || 'User';
      const fallbackRole = (authData.user.email === 'avamoussachurch@gmail.com' || authData.user.email === 'abram.amir2010@gmail.com') ? 'teacher' : (meta.role || 'student');
      const fallbackGrade = meta.grade || (fallbackRole === 'teacher' ? 'Servant' : 'Primary');
      const fallbackAvatar = meta.avatar_url || meta.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`;

      const { data: createdProfile } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          name: fallbackName,
          email: authData.user.email || '',
          role: fallbackRole,
          grade: fallbackGrade,
          avatar: fallbackAvatar,
          points: 100,
          current_streak: 1,
          longest_streak: 1
        })
        .select('*')
        .maybeSingle();

      if (createdProfile) {
        activeProfile = createdProfile;
      }
    }

    const user: User = {
      id: userId,
      fullName: activeProfile?.name || authData.user.user_metadata?.full_name || 'User',
      role: (activeProfile?.role as any) || (authData.user.user_metadata?.role as any) || 'student',
      avatarUrl: activeProfile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
      points: activeProfile?.points ?? 0,
      currentStreak: activeProfile?.current_streak ?? 0,
      longestStreak: activeProfile?.longest_streak ?? 0,
      requireRewardApproval: activeProfile?.require_reward_approval ?? true,
      pushNotificationsEnabled: activeProfile?.push_notifications_enabled ?? true,
      notifyLessonCompletion: activeProfile?.notify_lesson_completion ?? true,
      notifyEventReminders: activeProfile?.notify_event_reminders ?? true,
      screenTimeSeconds: activeProfile?.screen_time_seconds ?? 0,
    };

    return { success: true, user };
  } catch (err: any) {
    return { success: false, error: err.message || 'Login failed.' };
  }
}

/**
 * Sign in with Google OAuth via Supabase
 */
export async function signInWithGoogleSupabase(): Promise<{ error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      error: 'Supabase is not configured yet. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    };
  }

  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      return { error: error.message };
    }

    return {};
  } catch (err: any) {
    return { error: err.message || 'Google sign-in failed.' };
  }
}

/**
 * Diagnostic helper to test Supabase connection live
 */
export async function testSupabaseConnection(): Promise<{
  connected: boolean;
  status: string;
  authWorking: boolean;
  details?: any;
}> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      connected: false,
      status: 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY',
      authWorking: false,
    };
  }

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const authWorking = !sessionError;

    // Test a lightweight query on public.profiles
    const { data, error } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true });

    if (error) {
      return {
        connected: false,
        status: `Database query error: ${error.message} (Code: ${error.code})`,
        authWorking,
        details: error,
      };
    }

    return {
      connected: true,
      status: 'Connected successfully to Supabase PostgreSQL & Auth',
      authWorking,
      details: data,
    };
  } catch (e: any) {
    return {
      connected: false,
      status: e.message || 'Connection test failed',
      authWorking: false,
    };
  }
}

/**
 * Upload lesson worksheets or audio files to Supabase Storage
 */
export async function uploadLessonAssetToSupabase(
  bucket: 'hymns-audio' | 'lesson-worksheets',
  path: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  if (!supabase) {
    return { url: null, error: 'Supabase is not configured' };
  }

  try {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: true,
    });

    if (error) {
      return { url: null, error: error.message };
    }

    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return { url: publicUrlData.publicUrl, error: null };
  } catch (e: any) {
    return { url: null, error: e.message };
  }
}
