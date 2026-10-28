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

  if (role !== 'student') {
    return {
      success: false,
      error: 'Teacher and parent accounts must be provisioned by a church administrator.',
    };
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password: password,
      options: {
        data: {
          full_name: fullName,
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
      role: 'student',
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

    if (profileError || !profileData) {
      return {
        success: false,
        error: 'The account profile is not available. Contact a church administrator to provision it.',
      };
    }

    const user: User = {
      id: userId,
      fullName: profileData.name || authData.user.user_metadata?.full_name || 'User',
      role: profileData.role,
      avatarUrl: profileData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
      points: profileData.points ?? 0,
      currentStreak: profileData.current_streak ?? 0,
      longestStreak: profileData.longest_streak ?? 0,
      requireRewardApproval: profileData.require_reward_approval ?? true,
      pushNotificationsEnabled: profileData.push_notifications_enabled ?? true,
      notifyLessonCompletion: profileData.notify_lesson_completion ?? true,
      notifyEventReminders: profileData.notify_event_reminders ?? true,
      screenTimeSeconds: profileData.screen_time_seconds ?? 0,
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
