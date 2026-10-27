import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { LeaderboardEntry, StreakLeaderboardEntry } from '../types';
import { 
  getLeaderboard, 
  getStreakLeaderboard, 
  updateLeaderboardUser, 
  updateStreakLeaderboardUser 
} from '../lib/pointsService';

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
  currentStreak: 1,
  longestStreak: 1,
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

  const refreshScores = useCallback(() => {
    setLeaderboardList(getLeaderboard(userData));
    setStreakList(getStreakLeaderboard(userData));
  }, [userData]);

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
  }, [userData, refreshScores]);

  const currentPoints = userData?.points ?? 0;
  const currentStreak = userData?.currentStreak ?? 1;
  const longestStreak = Math.max(currentStreak, userData?.longestStreak ?? currentStreak);

  // Guaranteed unified Leaderboard: Synchronize current student's points identically
  const unifiedLeaderboard = useMemo<LeaderboardEntry[]>(() => {
    const isGuest = Boolean(userData?.id?.startsWith('guest_'));
    const raw = leaderboardList.map(entry => {
      const isUser = Boolean(
        userData && (
          entry.studentId === userData.id ||
          (isGuest && (entry.studentId === 'u1' || entry.studentId.startsWith('guest_'))) ||
          (userData.role === 'student' && !userData.id.startsWith('s-') && entry.studentId === 'u1')
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
    const raw = streakList.map(entry => {
      const isUser = Boolean(
        userData && (
          entry.studentId === userData.id ||
          (isGuest && (entry.studentId === 'u1' || entry.studentId.startsWith('guest_'))) ||
          (userData.role === 'student' && !userData.id.startsWith('s-') && entry.studentId === 'u1')
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
    if (userData) {
      updateLeaderboardUser({ ...userData, points: newTotal }, delta);
    }
    refreshScores();
    return newTotal;
  };

  const syncStreak = async (streak: number, longest?: number): Promise<void> => {
    if (authUpdateStreak) {
      await authUpdateStreak(streak, longest);
    }
    if (userData) {
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
