import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { hasRole } from '../lib/workspaces';
import { LeaderboardEntry, StreakLeaderboardEntry } from '../types';
import { 
  getLeaderboard, 
  getStreakLeaderboard, 
  updateLeaderboardUser, 
  updateStreakLeaderboardUser 
} from '../lib/pointsService';
import { getAuthoritativeLeaderboard } from '../lib/studentProgressService';

export interface PointsContextType {
  points: number;
  currentStreak: number;
  longestStreak: number;
  leaderboard: LeaderboardEntry[];
  streakLeaderboard: StreakLeaderboardEntry[];
  addPoints: (pointsDelta: number) => Promise<number>;
  syncStreak: (currentStreak: number, longestStreak?: number) => Promise<void>;
  refreshScores: () => void;
}

const PointsContext = createContext<PointsContextType>({
  points: 0,
  currentStreak: 0,
  longestStreak: 0,
  leaderboard: [],
  streakLeaderboard: [],
  addPoints: async () => 0,
  syncStreak: async () => {},
  refreshScores: () => {}
});

export const usePoints = () => useContext(PointsContext);

export const PointsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userData, addPoints: authAddPoints, updateStreak: authUpdateStreak } = useAuth();

  const [leaderboardList, setLeaderboardList] = useState<LeaderboardEntry[]>(() => getLeaderboard(userData));
  const [streakList, setStreakList] = useState<StreakLeaderboardEntry[]>(() => getStreakLeaderboard(userData));
  const refreshRequestRef = useRef(0);

  // Only values that affect leaderboard results belong in these dependencies.
  // AuthContext also updates screenTimeSeconds every 10 seconds; depending on the
  // whole user object here would refetch the full server leaderboard on every tick.
  const refreshUserId = userData?.id;
  const refreshUserRoles = userData?.roles;
  const refreshUserPoints = userData?.points;
  const refreshUserCurrentStreak = userData?.currentStreak;
  const refreshUserLongestStreak = userData?.longestStreak;
  const refreshUserName = userData?.fullName;
  const refreshUserAvatar = userData?.avatarUrl;
  const isGuestUser = Boolean(refreshUserId?.startsWith('guest_'));
  const isStudentUser = userData ? hasRole(userData, 'student') : false;

  const refreshScores = useCallback(() => {
    const requestId = ++refreshRequestRef.current;
    if (!refreshUserId) {
      setLeaderboardList([]);
      setStreakList([]);
      return;
    }

    if (isGuestUser) {
      setLeaderboardList(getLeaderboard(userData));
      setStreakList(getStreakLeaderboard(userData));
      return;
    }

    if (!isStudentUser) {
      setLeaderboardList([]);
      setStreakList([]);
      return;
    }

    void getAuthoritativeLeaderboard({ timeframe: 'weekly' }).then(result => {
      if (requestId !== refreshRequestRef.current) return;
      if (!result.success) {
        setLeaderboardList([]);
        setStreakList([]);
        return;
      }

      const entries: LeaderboardEntry[] = result.leaderboard.map((entry: any) => ({
        id: entry.id,
        studentId: entry.studentId,
        studentName: entry.studentName,
        avatarUrl: entry.avatarUrl,
        pointsThisWeek: entry.pointsThisWeek,
        rank: entry.rank
      }));
      setLeaderboardList(entries);
      setStreakList((result.streakLeaderboard || []).map((entry: any) => ({
        id: entry.id,
        studentId: entry.studentId,
        studentName: entry.studentName,
        studentNameAr: entry.studentName,
        avatarUrl: entry.avatarUrl,
        streakDays: entry.streakDays,
        longestStreak: entry.longestStreak,
        rank: entry.rank
      })));
    }).catch(() => {
      if (requestId !== refreshRequestRef.current) return;
      setLeaderboardList([]);
      setStreakList([]);
    });
  }, [
    refreshUserId,
    refreshUserRoles,
    refreshUserPoints,
    refreshUserCurrentStreak,
    refreshUserLongestStreak,
    refreshUserName,
    refreshUserAvatar,
    isGuestUser,
    isStudentUser,
    userData
  ]);

  useEffect(() => {
    refreshScores();

    const handleUpdate = () => {
      refreshScores();
    };

    window.addEventListener('church_leaderboard_updated', handleUpdate);
    window.addEventListener('church_streak_updated', handleUpdate);
    window.addEventListener('church_user_updated', handleUpdate);

    return () => {
      window.removeEventListener('church_leaderboard_updated', handleUpdate);
      window.removeEventListener('church_streak_updated', handleUpdate);
      window.removeEventListener('church_user_updated', handleUpdate);
    };
  }, [refreshScores]);

  const currentPoints = userData?.points ?? 0;
  const currentStreak = userData?.currentStreak ?? 0;
  const longestStreak = Math.max(currentStreak, userData?.longestStreak ?? currentStreak);

  // Guaranteed unified Leaderboard: Synchronize current student's points identically
  const unifiedLeaderboard = useMemo<LeaderboardEntry[]>(() => {
    const isGuest = Boolean(userData?.id?.startsWith('guest_'));
    if (!isGuest) return leaderboardList;
    const raw = leaderboardList.map(entry => {
      const isUser = Boolean(
        userData && (
          entry.studentId === userData.id ||
          (isGuest && (entry.studentId === 'u1' || entry.studentId.startsWith('guest_'))) ||
          (hasRole(userData, 'student') && !userData.id.startsWith('s-') && entry.studentId === 'u1')
        )
      );

      if (isUser) {
        return {
          ...entry,
          studentId: userData.id,
          studentName: userData.fullName.split(' ')[0] + ' ' + (userData.fullName.split(' ')[1]?.[0] || '') + '.',
          avatarUrl: userData.avatarUrl || entry.avatarUrl,
          pointsThisWeek: currentPoints
        };
      }
      return entry;
    });

    // Deduplicate any extra guest entries
    const deduped = isGuest 
      ? raw.filter(e => !e.studentId.startsWith('guest_') || e.studentId === userData?.id)
      : raw;

    const sorted = [...deduped].sort((a, b) => b.pointsThisWeek - a.pointsThisWeek);
    return sorted.map((e, idx) => ({ ...e, rank: idx + 1 }));
  }, [leaderboardList, currentPoints, userData]);

  // Guaranteed unified Streak Leaderboard: Synchronize current student's streak identically
  const unifiedStreakLeaderboard = useMemo<StreakLeaderboardEntry[]>(() => {
    const isGuest = Boolean(userData?.id?.startsWith('guest_'));
    if (!isGuest) return streakList;
    const raw = streakList.map(entry => {
      const isUser = Boolean(
        userData && (
          entry.studentId === userData.id ||
          (isGuest && (entry.studentId === 'u1' || entry.studentId.startsWith('guest_'))) ||
          (hasRole(userData, 'student') && !userData.id.startsWith('s-') && entry.studentId === 'u1')
        )
      );

      if (isUser) {
        return {
          ...entry,
          studentId: userData.id,
          studentName: userData.fullName,
          studentNameAr: userData.fullName,
          avatarUrl: userData.avatarUrl || entry.avatarUrl,
          streakDays: currentStreak,
          longestStreak: Math.max(longestStreak, currentStreak)
        };
      }
      return entry;
    });

    // Deduplicate any extra guest entries
    const deduped = isGuest
      ? raw.filter(e => !e.studentId.startsWith('guest_') || e.studentId === userData?.id)
      : raw;

    const sorted = [...deduped].sort((a, b) => b.streakDays - a.streakDays);
    return sorted.map((e, idx) => ({ ...e, rank: idx + 1 }));
  }, [streakList, currentStreak, longestStreak, userData]);

  const addPoints = async (delta: number): Promise<number> => {
    const newTotal = await authAddPoints(delta);
    if (userData?.id.startsWith('guest_')) {
      updateLeaderboardUser({ ...userData, points: newTotal }, delta);
    }
    refreshScores();
    return newTotal;
  };

  const syncStreak = async (streak: number, longest?: number): Promise<void> => {
    if (authUpdateStreak) {
      await authUpdateStreak(streak, longest);
    }
    if (userData?.id.startsWith('guest_')) {
      updateStreakLeaderboardUser({
        ...userData,
        currentStreak: streak,
        longestStreak: Math.max(streak, longest ?? userData.longestStreak ?? streak)
      });
    }
    refreshScores();
  };

  return (
    <PointsContext.Provider value={{
      points: currentPoints,
      currentStreak,
      longestStreak,
      leaderboard: unifiedLeaderboard,
      streakLeaderboard: unifiedStreakLeaderboard,
      addPoints,
      syncStreak,
      refreshScores
    }}>
      {children}
    </PointsContext.Provider>
  );
};
