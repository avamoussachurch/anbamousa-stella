import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { updateSupabaseProfile, addStudentPoints } from '../lib/supabaseDatabase';
import { updateLeaderboardUser, updateStreakLeaderboardUser } from '../lib/pointsService';
import { User } from '../types';

interface AuthContextType {
  currentUser: { uid: string; email?: string | null } | null;
  userData: User | null;
  loading: boolean;
  loginAsGuest: (role?: 'student' | 'teacher' | 'parent', name?: string) => void;
  setUserDirectly: (user: User) => void;
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
  setUserDirectly: () => {},
  updateUserProfile: async () => ({ success: false, error: 'Not initialized' }),
  addPoints: async () => 0,
  updateStreak: async () => {},
  updateScreenTime: () => {},
  logout: async () => {},
  isGuest: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [userData, setUserData] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedGuest = localStorage.getItem('church_guest_user');
        if (savedGuest) return JSON.parse(savedGuest);
        const savedUser = localStorage.getItem('church_auth_user');
        if (savedUser) return JSON.parse(savedUser);
      } catch (e) {
        console.warn('Error reading saved user session:', e);
      }
    }
    return null;
  });
  const [isGuest, setIsGuest] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return Boolean(localStorage.getItem('church_guest_user'));
    }
    return false;
  });
  const [loading, setLoading] = useState(true);
  const screenTimeTimer = useRef<NodeJS.Timeout | null>(null);

  const setUserDirectly = (user: User) => {
    const isGuestUser = user.id.startsWith('guest_') || isGuest;
    try {
      if (isGuestUser) {
        localStorage.setItem('church_guest_user', JSON.stringify(user));
        localStorage.removeItem('church_auth_user');
      } else {
        localStorage.setItem('church_auth_user', JSON.stringify(user));
        localStorage.removeItem('church_guest_user');
      }
    } catch (e) {}
    setUserData(user);
    setCurrentUser({ uid: user.id, email: user.parentEmail || '' });
    setIsGuest(isGuestUser);
    setLoading(false);

    // Propagate streak & points to Supabase public.profiles if online authenticated
    if (!isGuestUser && isSupabaseConfigured && supabase && user.id && !user.id.startsWith('guest_')) {
      updateSupabaseProfile(user.id, {
        points: user.points,
        current_streak: user.currentStreak,
        longest_streak: user.longestStreak,
        last_active: new Date().toISOString()
      }).catch(err => {
        console.warn('Note on Supabase profile sync in setUserDirectly:', err);
      });
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('church_user_updated', { detail: user }));
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
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=church_${role}_guest`,
      points: role === 'parent' ? 0 : 120,
      currentStreak: 3,
      longestStreak: 5,
      screenTimeSeconds: 480,
      parentEmail: 'parent.guardian@church.org',
      phone: '+20 100 123 4567',
      grade: 'الابتدائي - المرحلة الثالثة',
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

  const updateUserProfile = async (updates: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    if (!userData) return { success: false, error: 'No active user session' };

    const updatedUser: User = {
      ...userData,
      ...updates,
      lastActive: new Date().toISOString(),
    };

    setUserData(updatedUser);

    try {
      const storageKey = isGuest ? 'church_guest_user' : 'church_auth_user';
      localStorage.setItem(storageKey, JSON.stringify(updatedUser));
    } catch (e) {
      console.warn('LocalStorage error while updating profile:', e);
    }

    if (!isGuest && isSupabaseConfigured && supabase) {
      try {
        const { error } = await updateSupabaseProfile(userData.id, {
          name: updates.fullName,
          avatar: updates.avatarUrl,
          grade: updates.grade,
          points: updates.points !== undefined ? updates.points : updatedUser.points,
          current_streak: updates.currentStreak !== undefined ? updates.currentStreak : updatedUser.currentStreak,
          longest_streak: updates.longestStreak !== undefined ? updates.longestStreak : updatedUser.longestStreak,
          push_notifications_enabled: updates.pushNotificationsEnabled,
          notify_lesson_completion: updates.notifyLessonCompletion,
          notify_event_reminders: updates.notifyEventReminders,
          last_active: new Date().toISOString(),
        });
        if (error) {
          console.warn('Supabase update note:', error);
        }
      } catch (err: any) {
        console.warn('Supabase update caught:', err);
      }
    }

    // Sync leaderboard if user's display identity changed
    if (updates.fullName || updates.avatarUrl || updates.points !== undefined) {
      updateLeaderboardUser(updatedUser, 0);
    }
    if (updates.currentStreak !== undefined || updates.longestStreak !== undefined) {
      updateStreakLeaderboardUser(updatedUser);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('church_user_updated', { detail: updatedUser }));
    }

    return { success: true };
  };

  const updateStreak = async (currentStreak: number, longestStreak?: number): Promise<void> => {
    if (!userData) return;
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
          current_streak: nextCurrent,
          longest_streak: nextLongest,
          last_active: new Date().toISOString()
        });
      } catch (e) {
        console.warn('Error updating student streak in Supabase:', e);
      }
    }
  };

  const addPoints = async (pointsDelta: number): Promise<number> => {
    if (!userData) return 0;

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

    if (!isGuest && isSupabaseConfigured && supabase) {
      try {
        await addStudentPoints(userData.id, pointsDelta);
      } catch (e) {
        console.warn('Error adding student points in Supabase:', e);
      }
    }

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

  // Live Screen Time Counter (Ticks every second while user is actively viewing)
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
        const nextSecs = currentSecs + 1;

        // Persist to localStorage every 5 seconds to reduce write overhead
        if (nextSecs % 5 === 0) {
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
          updateSupabaseProfile(prev.id, { screen_time_seconds: nextSecs }).catch(() => {});
        }

        return { ...prev, screenTimeSeconds: nextSecs };
      });
    }, 1000);

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
          await supabase.auth.signOut();
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
    if (isSupabaseConfigured && supabase) {
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session?.user) {
          const uid = session.user.id;
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', uid)
            .single();

          let cachedAuthUser: any = {};
          try {
            const raw = localStorage.getItem('church_auth_user');
            if (raw) cachedAuthUser = JSON.parse(raw);
          } catch (e) {}

          const resolvedPoints = Math.max(Number(profile?.points ?? 0), Number(cachedAuthUser?.points ?? 0));
          const resolvedStreak = Math.max(Number(profile?.current_streak ?? 0), Number(cachedAuthUser?.currentStreak ?? 0), 1);
          const resolvedLongest = Math.max(Number(profile?.longest_streak ?? 0), Number(cachedAuthUser?.longestStreak ?? 0), resolvedStreak);

          const loadedUser: User = {
            id: uid,
            fullName: profile?.name || session.user.user_metadata?.full_name || 'User',
            role: (profile?.role as any) || (session.user.user_metadata?.role as any) || 'student',
            avatarUrl: profile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`,
            points: resolvedPoints,
            currentStreak: resolvedStreak,
            longestStreak: resolvedLongest,
            parentEmail: cachedAuthUser.parentEmail || profile?.email || session.user.email,
            phone: cachedAuthUser.phone,
            grade: profile?.grade || cachedAuthUser.grade,
            parentPin: cachedAuthUser.parentPin,
            requireRewardApproval: profile?.require_reward_approval ?? true,
            pushNotificationsEnabled: profile?.push_notifications_enabled ?? true,
            notifyLessonCompletion: profile?.notify_lesson_completion ?? true,
            notifyEventReminders: profile?.notify_event_reminders ?? true,
            screenTimeSeconds: profile?.screen_time_seconds ?? cachedAuthUser.screenTimeSeconds ?? 0,
          };
          setUserDirectly(loadedUser);
        } else {
          setLoading(false);
        }
      }).catch(err => {
        console.warn('Supabase getSession error:', err);
        setLoading(false);
      });

      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
          if (!isLoggingOutRef.current) {
            try {
              localStorage.removeItem('church_guest_user');
              localStorage.removeItem('church_auth_user');
            } catch (e) {}
            setIsGuest(false);
            setUserData(null);
            setCurrentUser(null);
            setLoading(false);
          }
        } else if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
          const uid = session.user.id;
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', uid)
            .single();

          let cachedAuthUser: any = {};
          try {
            const raw = localStorage.getItem('church_auth_user');
            if (raw) cachedAuthUser = JSON.parse(raw);
          } catch (e) {}

          const resolvedPoints = Math.max(Number(profile?.points ?? 0), Number(cachedAuthUser?.points ?? 0));
          const resolvedStreak = Math.max(Number(profile?.current_streak ?? 0), Number(cachedAuthUser?.currentStreak ?? 0), 1);
          const resolvedLongest = Math.max(Number(profile?.longest_streak ?? 0), Number(cachedAuthUser?.longestStreak ?? 0), resolvedStreak);

          const loadedUser: User = {
            id: uid,
            fullName: profile?.name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
            role: (profile?.role as any) || (session.user.user_metadata?.role as any) || 'student',
            avatarUrl: profile?.avatar || session.user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`,
            points: resolvedPoints,
            currentStreak: resolvedStreak,
            longestStreak: resolvedLongest,
            parentEmail: cachedAuthUser.parentEmail || profile?.email || session.user.email,
            phone: cachedAuthUser.phone,
            grade: profile?.grade || cachedAuthUser.grade,
            parentPin: cachedAuthUser.parentPin,
            requireRewardApproval: profile?.require_reward_approval ?? true,
            pushNotificationsEnabled: profile?.push_notifications_enabled ?? true,
            notifyLessonCompletion: profile?.notify_lesson_completion ?? true,
            notifyEventReminders: profile?.notify_event_reminders ?? true,
            screenTimeSeconds: profile?.screen_time_seconds ?? cachedAuthUser.screenTimeSeconds ?? 0,
          };
          setUserDirectly(loadedUser);
        }
      });
      supabaseSub = authListener.subscription;
    } else {
      setLoading(false);
    }

    return () => {
      if (screenTimeTimer.current) clearInterval(screenTimeTimer.current);
      if (supabaseSub) supabaseSub.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, userData, loading, loginAsGuest, setUserDirectly, updateUserProfile, addPoints, updateStreak, updateScreenTime, logout, isGuest }}>
      {children}
    </AuthContext.Provider>
  );
};
