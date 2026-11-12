import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { updateOwnAccountProfile, updateSupabaseProfile } from '../lib/supabaseDatabase';
import { updateLeaderboardUser, updateStreakLeaderboardUser } from '../lib/pointsService';
import { User } from '../types';
import type { Session } from '@supabase/supabase-js';
import { parseHymnsTaxisLevel } from '../lib/hymnsTaxisLevel';
import { getCompatibilityRole } from '../lib/workspaces';
import type { Role } from '../types';
import { fetchAssignedRoles } from '../lib/roleService';

interface AuthContextType {
  currentUser: { uid: string; email?: string | null } | null;
  userData: User | null;
  loading: boolean;
  loginAsGuest: (role?: 'student' | 'teacher' | 'parent', name?: string) => void;
  refreshAssignedRoles: () => Promise<{ success: boolean; error?: string }>;
  setUserDirectly: (user: User) => void;
  syncAuthoritativeProgress: (points: number, currentStreak: number, longestStreak: number) => void;
  updateUserProfile: (updates: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  addPoints: (pointsDelta: number) => Promise<number>;
  updateStreak: (currentStreak: number, longestStreak?: number) => Promise<void>;
  updateScreenTime: (secondsDelta: number) => void;
  logout: () => Promise<void>;
  isGuest: boolean;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userData: null,
  loading: true,
  loginAsGuest: () => {},
  refreshAssignedRoles: async () => ({ success: false, error: 'Not initialized' }),
  setUserDirectly: () => {},
  syncAuthoritativeProgress: () => {},
  updateUserProfile: async () => ({ success: false, error: 'Not initialized' }),
  addPoints: async () => 0,
  updateStreak: async () => {},
  updateScreenTime: () => {},
  logout: async () => {},
  isGuest: false,
});

export const useAuth = () => useContext(AuthContext);

export function getCachedProfileFields(raw: string | null, userId: string): Partial<User> {
  if (!raw) return {};
  try {
    const cached = JSON.parse(raw);
    if (cached?.id !== userId) return {};
    return {
      parentEmail: cached.parentEmail,
      phone: cached.phone,
      grade: cached.grade,
      parentPin: cached.parentPin,
      screenTimeSeconds: cached.screenTimeSeconds,
    };
  } catch (error) {
    console.warn('Could not read cached profile fields:', error);
    return {};
  }
}

function readGuestUser(raw: string | null): User | null {
  if (!raw) return null;
  try {
    const user = JSON.parse(raw) as Partial<User>;
    const role = user.role;
    if (!user.id?.startsWith('guest_') || !['student', 'parent', 'teacher'].includes(role || '')) return null;
    const safeRole = role as Exclude<Role, 'admin'>;
    return { ...user, role: safeRole, roles: [safeRole] } as User;
  } catch (error) {
    console.warn('Could not read saved guest session:', error);
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [userData, setUserData] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        return readGuestUser(localStorage.getItem('church_guest_user'));
      } catch (e) {
        console.warn('Error reading saved user session:', e);
      }
    }
    return null;
  });
  const [isGuest, setIsGuest] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return Boolean(readGuestUser(localStorage.getItem('church_guest_user')));
    }
    return false;
  });
  const [loading, setLoading] = useState(true);
  const screenTimeTimer = useRef<NodeJS.Timeout | null>(null);
  const sessionHydrationId = useRef(0);

  const setUserDirectly = (user: User) => {
    const isGuestUser = user.id.startsWith('guest_');
    const sameAuthenticatedUser = !isGuestUser && userData?.id === user.id;
    const safeUser: User = !isGuestUser && isSupabaseConfigured
      ? {
          ...user,
          roles: sameAuthenticatedUser ? userData.roles : [],
          role: sameAuthenticatedUser ? userData.role : 'student',
          points: sameAuthenticatedUser ? userData.points : 0,
          currentStreak: sameAuthenticatedUser ? userData.currentStreak : 0,
          longestStreak: sameAuthenticatedUser ? userData.longestStreak : 0,
        }
      : {
          ...user,
          roles: [user.role === 'admin' ? 'student' : user.role],
          role: user.role === 'admin' ? 'student' : user.role,
        };
    try {
      if (isGuestUser) {
        localStorage.setItem('church_guest_user', JSON.stringify(safeUser));
        localStorage.removeItem('church_auth_user');
      } else {
        localStorage.setItem('church_auth_user', JSON.stringify(safeUser));
        localStorage.removeItem('church_guest_user');
      }
    } catch (e) {}
    setUserData(safeUser);
    setCurrentUser({ uid: safeUser.id, email: safeUser.parentEmail || '' });
    setIsGuest(isGuestUser);
    setLoading(false);

    // Keep only user-editable profile fields in sync; role, points, and streaks are server-owned.
    if (!isGuestUser && isSupabaseConfigured && supabase && safeUser.id) {
      updateSupabaseProfile(safeUser.id, {
        last_active: new Date().toISOString()
      }).then(result => {
        if (result.error) console.warn('Note on Supabase profile sync in setUserDirectly:', result.error);
      }).catch(error => {
        console.warn('Note on Supabase profile sync in setUserDirectly:', error);
      });
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('church_user_updated', { detail: safeUser }));
    }
  };

  const syncAuthoritativeProgress = (points: number, currentStreak: number, longestStreak: number) => {
    if (!userData || isGuest || ![points, currentStreak, longestStreak].every(Number.isFinite)) return;
    const safeCurrentStreak = Math.max(0, currentStreak);
    const updatedUser: User = {
      ...userData,
      points: Math.max(0, points),
      currentStreak: safeCurrentStreak,
      longestStreak: Math.max(safeCurrentStreak, 0, longestStreak),
      progressKnown: true,
    };
    setUserData(updatedUser);
    try {
      localStorage.setItem('church_auth_user', JSON.stringify(updatedUser));
    } catch (e) {
      console.warn('Could not cache authoritative progress:', e);
    }
    updateLeaderboardUser(updatedUser, 0);
    updateStreakLeaderboardUser(updatedUser);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('church_user_updated', { detail: updatedUser }));
    }
  };

  const loginAsGuest = (role: 'student' | 'teacher' | 'parent' = 'student', name?: string) => {
    const defaultName = role === 'parent' 
      ? 'الأستاذ عماد مكرم (ولي أمر)' 
      : role === 'teacher' 
        ? 'الخادم مينا (تجريبي)' 
        : 'التلميذ ديفيد (تجريبي)';
    const guestUser: User = {
      id: 'guest_' + role + '_' + Date.now(),
      fullName: name || defaultName,
      role: role,
      roles: [role],
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=church_${role}_guest`,
      points: role === 'parent' ? 0 : 120,
      currentStreak: 3,
      longestStreak: 5,
      screenTimeSeconds: 480,
      parentEmail: 'parent.guardian@church.org',
      phone: '+20 100 123 4567',
      grade: 'الابتدائي - المرحلة الثالثة',
      hymnsTaxisLevel: 1,
      parentPin: '1234',
      requireRewardApproval: true,
      pushNotificationsEnabled: true,
      notifyLessonCompletion: true,
      notifyEventReminders: true
    };
    try {
      localStorage.setItem('church_guest_user', JSON.stringify(guestUser));
      localStorage.removeItem('church_auth_user');
    } catch (e) {}
    setUserData(guestUser);
    setCurrentUser({ uid: guestUser.id });
    setIsGuest(true);
    setLoading(false);
  };

  const refreshAssignedRoles = async (): Promise<{ success: boolean; error?: string }> => {
    if (!userData || isGuest) return { success: false, error: 'No authenticated account session' };
    if (!supabase) return { success: false, error: 'Supabase session verification is unavailable' };
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        return { success: false, error: sessionError?.message || 'Authenticated session is unavailable' };
      }
      const roles = await fetchAssignedRoles(session.access_token);
      setUserData(previous => {
        if (!previous || previous.id !== userData.id) return previous;
        const updated = { ...previous, roles, role: getCompatibilityRole(roles) };
        try {
          localStorage.setItem('church_auth_user', JSON.stringify(updated));
        } catch (error) {
          console.warn('Could not cache refreshed account profile:', error);
        }
        window.dispatchEvent(new CustomEvent('church_user_updated', { detail: updated }));
        return updated;
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Could not refresh assigned roles' };
    }
  };

  const updateUserProfile = async (updates: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    if (!userData) return { success: false, error: 'No active user session' };

    const editableFields = new Set([
      'fullName',
      'avatarUrl',
      'pushNotificationsEnabled',
      'notifyLessonCompletion',
      'notifyEventReminders',
      'requireRewardApproval',
    ]);
    const protectedField = Object.keys(updates).find(field => !editableFields.has(field));
    if (protectedField) {
      return { success: false, error: `Profile field "${protectedField}" must be changed through its authorized workflow.` };
    }

    if (updates.fullName !== undefined &&
      (typeof updates.fullName !== 'string' || updates.fullName.trim().length < 2 || updates.fullName.trim().length > 100)) {
      return { success: false, error: 'Name must contain 2 to 100 characters.' };
    }
    if (updates.avatarUrl !== undefined && typeof updates.avatarUrl !== 'string') {
      return { success: false, error: 'Avatar must be a valid image.' };
    }
    for (const field of ['pushNotificationsEnabled', 'notifyLessonCompletion', 'notifyEventReminders', 'requireRewardApproval'] as const) {
      if (updates[field] !== undefined && typeof updates[field] !== 'boolean') {
        return { success: false, error: 'Notification preferences must be boolean values.' };
      }
    }

    const editableUpdates: Partial<User> = {};
    if (updates.fullName !== undefined) editableUpdates.fullName = updates.fullName.trim();
    if (updates.avatarUrl !== undefined) editableUpdates.avatarUrl = updates.avatarUrl;
    if (updates.pushNotificationsEnabled !== undefined) editableUpdates.pushNotificationsEnabled = updates.pushNotificationsEnabled;
    if (updates.notifyLessonCompletion !== undefined) editableUpdates.notifyLessonCompletion = updates.notifyLessonCompletion;
    if (updates.notifyEventReminders !== undefined) editableUpdates.notifyEventReminders = updates.notifyEventReminders;
    if (updates.requireRewardApproval !== undefined) editableUpdates.requireRewardApproval = updates.requireRewardApproval;

    const updatedUser: User = {
      ...userData,
      ...editableUpdates,
      lastActive: new Date().toISOString(),
    };

    if (!isGuest && isSupabaseConfigured) {
      if (!supabase) return { success: false, error: 'Supabase is configured but its client is unavailable' };
      try {
        const { error } = await updateOwnAccountProfile({
          name: editableUpdates.fullName,
          avatar: editableUpdates.avatarUrl,
          push_notifications_enabled: editableUpdates.pushNotificationsEnabled,
          notify_lesson_completion: editableUpdates.notifyLessonCompletion,
          notify_event_reminders: editableUpdates.notifyEventReminders,
          require_reward_approval: editableUpdates.requireRewardApproval,
        });
        if (error) {
          return { success: false, error };
        }
      } catch (err: any) {
        return { success: false, error: err?.message || 'Could not update profile' };
      }
    }

    try {
      const storageKey = isGuest ? 'church_guest_user' : 'church_auth_user';
      localStorage.setItem(storageKey, JSON.stringify(updatedUser));
    } catch (e) {
      console.warn('LocalStorage error while updating profile:', e);
    }

    setUserData(updatedUser);

    // Sync leaderboard if user's display identity changed
    if (editableUpdates.fullName || editableUpdates.avatarUrl) {
      updateLeaderboardUser(updatedUser, 0);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('church_user_updated', { detail: updatedUser }));
    }

    return { success: true };
  };

  const updateStreak = async (currentStreak: number, longestStreak?: number): Promise<void> => {
    if (!userData) throw new Error('No active user session');
    if (!isGuest) {
      throw new Error('Streaks can only be changed by a server-verified activity.');
    }
    const nextCurrent = Math.max(1, currentStreak);
    const nextLongest = Math.max(nextCurrent, longestStreak ?? userData.longestStreak ?? nextCurrent);

    const updatedUser: User = {
      ...userData,
      currentStreak: nextCurrent,
      longestStreak: nextLongest,
      lastActive: new Date().toISOString()
    };

    setUserData(updatedUser);

    try {
      const storageKey = isGuest ? 'church_guest_user' : 'church_auth_user';
      localStorage.setItem(storageKey, JSON.stringify(updatedUser));
    } catch (e) {}

    // Update streak leaderboard
    updateStreakLeaderboardUser(updatedUser);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('church_user_updated', { detail: updatedUser }));
    }

    if (!isGuest && isSupabaseConfigured && supabase) {
      try {
        await updateSupabaseProfile(userData.id, {
          last_active: new Date().toISOString()
        });
      } catch (e) {
        console.warn('Error updating student streak in Supabase:', e);
      }
    }
  };

  const addPoints = async (pointsDelta: number): Promise<number> => {
    if (!userData) throw new Error('No active user session');
    if (!isGuest) {
      throw new Error('Points can only be changed by a server-verified lesson completion or trusted reward workflow.');
    }

    const newPoints = Math.max(0, (userData.points || 0) + pointsDelta);
    const updatedUser: User = {
      ...userData,
      points: newPoints,
      lastActive: new Date().toISOString(),
    };

    setUserData(updatedUser);

    try {
      const storageKey = isGuest ? 'church_guest_user' : 'church_auth_user';
      localStorage.setItem(storageKey, JSON.stringify(updatedUser));
    } catch (e) {}

    // Update dynamic leaderboard
    updateLeaderboardUser(updatedUser, pointsDelta);

    return newPoints;
  };

  const updateScreenTime = (secondsDelta: number) => {
    setUserData((prev) => {
      if (!prev) return null;
      const nextSeconds = Math.max(0, (prev.screenTimeSeconds || 0) + secondsDelta);
      const updated = { ...prev, screenTimeSeconds: nextSeconds };
      try {
        const key = isGuest ? 'church_guest_user' : 'church_auth_user';
        localStorage.setItem(key, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Live Screen Time Counter (ticks every 10 seconds to avoid rerendering the whole app every second)
  useEffect(() => {
    if (!userData) return;

    if (screenTimeTimer.current) {
      clearInterval(screenTimeTimer.current);
    }

    screenTimeTimer.current = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) {
        return; // Pause counter if user minimized or switched tab
      }

      setUserData((prev) => {
        if (!prev) return null;
        const currentSecs = prev.screenTimeSeconds || 0;
        const nextSecs = currentSecs + 10;

        // Persist to localStorage every 30 seconds to reduce write overhead
        if (nextSecs % 30 === 0) {
          try {
            const key = isGuest ? 'church_guest_user' : 'church_auth_user';
            const saved = localStorage.getItem(key);
            if (saved) {
              const parsed = JSON.parse(saved);
              parsed.screenTimeSeconds = nextSecs;
              localStorage.setItem(key, JSON.stringify(parsed));
            }
          } catch (e) {}
        }

        // Sync to Supabase every 60 seconds
        if (nextSecs % 60 === 0 && !isGuest && isSupabaseConfigured && supabase) {
          updateSupabaseProfile(prev.id, { screen_time_seconds: nextSecs }).then(result => {
            if (result.error) console.warn('Could not synchronize screen time:', result.error);
          }).catch(error => {
            console.warn('Could not synchronize screen time:', error);
          });
        }

        return { ...prev, screenTimeSeconds: nextSecs };
      });
    }, 10000);

    return () => {
      if (screenTimeTimer.current) {
        clearInterval(screenTimeTimer.current);
      }
    };
  }, [userData?.id, isGuest]);

  const isLoggingOutRef = useRef(false);

  const logout = async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    ++sessionHydrationId.current;

    try {
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('church_guest_user');
          localStorage.removeItem('church_auth_user');
        } catch (e) {
          console.warn('Error clearing localStorage on logout:', e);
        }
      }

      setIsGuest(false);
      setUserData(null);
      setCurrentUser(null);
      setLoading(false);

      // Safely sign out from Supabase if active without throwing
      if (isSupabaseConfigured && supabase) {
        try {
          const { error } = await supabase.auth.signOut();
          if (error) console.warn('Supabase sign out note:', error.message);
        } catch (e) {
          console.warn('Supabase sign out note:', e);
        }
      }
    } catch (err) {
      console.warn('Logout caught error:', err);
    } finally {
      setTimeout(() => {
        isLoggingOutRef.current = false;
      }, 800);
    }
  };

  useEffect(() => {
    let supabaseSub: any = null;
    let disposed = false;

    const clearUnauthenticatedUser = () => {
      ++sessionHydrationId.current;
      try {
        localStorage.removeItem('church_auth_user');
      } catch (e) {
        console.warn('Could not clear stale authenticated user cache:', e);
      }

      let savedGuest: User | null = null;
      try {
        savedGuest = readGuestUser(localStorage.getItem('church_guest_user'));
      } catch (e) {
        console.warn('Could not read saved guest session:', e);
      }

      setIsGuest(Boolean(savedGuest));
      setUserData(savedGuest);
      setCurrentUser(savedGuest ? { uid: savedGuest.id, email: savedGuest.parentEmail || '' } : null);
      setLoading(false);
    };

    const hydrateAuthenticatedUser = async (session: Session) => {
      const requestId = ++sessionHydrationId.current;
      const uid = session.user.id;
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, email, avatar, points, current_streak, longest_streak, grade, hymns_taxis_level, require_reward_approval, push_notifications_enabled, notify_lesson_completion, notify_event_reminders, screen_time_seconds')
        .eq('id', uid)
        .single();

      if (profileError) {
        console.error(`Could not load profile for authenticated user ${uid}:`, profileError.message);
      }

      let cachedAuthUser: Partial<User> = {};
      try {
        cachedAuthUser = getCachedProfileFields(localStorage.getItem('church_auth_user'), uid);
      } catch (error) {
        console.warn('Could not read cached profile fields:', error);
      }

      if (disposed || requestId !== sessionHydrationId.current) return;
      try {
        localStorage.removeItem('church_guest_user');
      } catch (e) {
        console.warn('Could not clear guest cache after authentication:', e);
      }

      let assignedRoles: Role[] = [];
      try {
        assignedRoles = await fetchAssignedRoles(session.access_token);
      } catch (error) {
        console.error('Could not load authoritative account roles:', error);
      }

      const loadedUser: User = {
        id: uid,
        fullName: profile?.name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
        email: session.user.email || undefined,
        roles: assignedRoles,
        role: getCompatibilityRole(assignedRoles),
        avatarUrl: profile?.avatar || session.user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`,
        points: Number.isFinite(profile?.points) ? profile.points : 0,
        currentStreak: Number.isFinite(profile?.current_streak) ? profile.current_streak : 0,
        longestStreak: Number.isFinite(profile?.longest_streak) ? profile.longest_streak : 0,
        progressKnown: !profileError && Number.isFinite(profile?.points) && Number.isFinite(profile?.current_streak),
        parentEmail: cachedAuthUser.parentEmail || profile?.email || session.user.email,
        phone: cachedAuthUser.phone,
        grade: profile?.grade || cachedAuthUser.grade,
        hymnsTaxisLevel: parseHymnsTaxisLevel(profile?.hymns_taxis_level) || undefined,
        parentPin: cachedAuthUser.parentPin,
        requireRewardApproval: profile?.require_reward_approval ?? true,
        pushNotificationsEnabled: profile?.push_notifications_enabled ?? true,
        notifyLessonCompletion: profile?.notify_lesson_completion ?? true,
        notifyEventReminders: profile?.notify_event_reminders ?? true,
        screenTimeSeconds: profile?.screen_time_seconds ?? cachedAuthUser.screenTimeSeconds ?? 0,
      };

      setUserData(loadedUser);
      setCurrentUser({ uid, email: loadedUser.parentEmail || '' });
      setIsGuest(false);
      setLoading(false);
      try {
        localStorage.setItem('church_auth_user', JSON.stringify(loadedUser));
      } catch (e) {
        console.warn('Could not cache authenticated profile:', e);
      }
      window.dispatchEvent(new CustomEvent('church_user_updated', { detail: loadedUser }));
    };

    if (isSupabaseConfigured && supabase) {
      const initialSessionRequest = sessionHydrationId.current;
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (disposed || initialSessionRequest !== sessionHydrationId.current) return;
        if (error) {
          console.error('Supabase session reconciliation failed:', error.message);
          clearUnauthenticatedUser();
        } else if (session?.user) {
          void hydrateAuthenticatedUser(session);
        } else {
          clearUnauthenticatedUser();
        }
      }).catch(err => {
        console.error('Supabase getSession error:', err);
        clearUnauthenticatedUser();
      });

      const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
          if (!isLoggingOutRef.current) {
            clearUnauthenticatedUser();
          }
        } else if (session?.user) {
          void hydrateAuthenticatedUser(session);
        } else if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          ++sessionHydrationId.current;
          clearUnauthenticatedUser();
        }
      });
      supabaseSub = authListener.subscription;
    } else {
      if (userData) {
        setCurrentUser({ uid: userData.id, email: userData.parentEmail || '' });
        setIsGuest(userData.id.startsWith('guest_'));
      }
      setLoading(false);
    }

    return () => {
      disposed = true;
      ++sessionHydrationId.current;
      if (screenTimeTimer.current) clearInterval(screenTimeTimer.current);
      if (supabaseSub) supabaseSub.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, userData, loading, loginAsGuest, refreshAssignedRoles, setUserDirectly, syncAuthoritativeProgress, updateUserProfile, addPoints, updateStreak, updateScreenTime, logout, isGuest }}>
      {children}
    </AuthContext.Provider>
  );
};
