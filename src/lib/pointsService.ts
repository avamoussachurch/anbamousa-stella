import { LeaderboardEntry, User } from '../types';
import { mockLeaderboard } from '../data';

const LEADERBOARD_STORAGE_KEY = 'church_leaderboard_data';
const PURCHASES_STORAGE_KEY = 'church_reward_purchases';

export function getLeaderboard(currentUser?: User | null): LeaderboardEntry[] {
  let list: LeaderboardEntry[] = [];
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(LEADERBOARD_STORAGE_KEY);
      if (saved) {
        list = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Error reading leaderboard from localStorage:', e);
    }
  }

  if (!list || list.length === 0) {
    list = [...mockLeaderboard];
  }

  // Ensure current user is accurately and uniquely represented in leaderboard
  if (currentUser) {
    const isGuest = currentUser.id.startsWith('guest_');
    const userPoints = Math.max(0, currentUser.points ?? 0);
    const displayName = currentUser.fullName.split(' ')[0] + ' ' + (currentUser.fullName.split(' ')[1]?.[0] || '') + '.';

    // Match existing user entry or standard guest baseline ('u1' / any previous guest)
    const existingIndex = list.findIndex(
      (e) => e.studentId === currentUser.id ||
             (isGuest && (e.studentId === 'u1' || e.studentId.startsWith('guest_'))) ||
             (currentUser.role === 'student' && !currentUser.id.startsWith('s-') && e.studentId === 'u1')
    );

    if (existingIndex >= 0) {
      list[existingIndex] = {
        ...list[existingIndex],
        studentId: currentUser.id,
        studentName: displayName,
        avatarUrl: currentUser.avatarUrl || list[existingIndex].avatarUrl,
        pointsThisWeek: userPoints, // Guaranteed synchronization with true user points
      };
    } else {
      list.push({
        id: 'lb_' + currentUser.id,
        studentId: currentUser.id,
        studentName: displayName,
        avatarUrl: currentUser.avatarUrl,
        pointsThisWeek: userPoints,
        rank: list.length + 1,
      });
    }

    // Clean up any stale duplicate guest entries
    if (isGuest) {
      list = list.filter((e, idx) => {
        if (e.studentId.startsWith('guest_') && e.studentId !== currentUser.id) return false;
        return true;
      });
    }

    // Sort by pointsThisWeek descending
    list.sort((a, b) => b.pointsThisWeek - a.pointsThisWeek);
    list = list.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(list));
      } catch (e) {}
    }
  }

  return list;
}

export function updateLeaderboardUser(
  currentUser: User,
  pointsDelta: number
): LeaderboardEntry[] {
  let list = getLeaderboard(currentUser);

  const userIndex = list.findIndex(
    (e) => e.studentId === currentUser.id || (currentUser.id.startsWith('guest_') && e.studentId === 'u1')
  );
  if (userIndex >= 0) {
    list[userIndex].pointsThisWeek = currentUser.points;
    list[userIndex].avatarUrl = currentUser.avatarUrl || list[userIndex].avatarUrl;
    list[userIndex].studentName = currentUser.fullName.split(' ')[0] + ' ' + (currentUser.fullName.split(' ')[1]?.[0] || '') + '.';
  } else {
    list.push({
      id: 'lb_' + currentUser.id,
      studentId: currentUser.id,
      studentName: currentUser.fullName.split(' ')[0] + ' ' + (currentUser.fullName.split(' ')[1]?.[0] || '') + '.',
      avatarUrl: currentUser.avatarUrl,
      pointsThisWeek: currentUser.points,
      rank: list.length + 1,
    });
  }

  list.sort((a, b) => b.pointsThisWeek - a.pointsThisWeek);
  list = list.map((item, idx) => ({ ...item, rank: idx + 1 }));

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(list));
      window.dispatchEvent(new CustomEvent('church_leaderboard_updated', { detail: list }));
    } catch (e) {}
  }

  return list;
}

export function getUserRank(userId: string, currentUser?: User | null): LeaderboardEntry | undefined {
  const list = getLeaderboard(currentUser);
  return list.find((e) => e.studentId === userId);
}

export function getSavedPurchases(userId: string): any[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(`${PURCHASES_STORAGE_KEY}_${userId}`);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return [];
}

export function saveRewardPurchaseLocal(userId: string, purchase: any): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getSavedPurchases(userId);
    const updated = [purchase, ...existing];
    localStorage.setItem(`${PURCHASES_STORAGE_KEY}_${userId}`, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('church_purchases_updated', { detail: updated }));
  } catch (e) {}
}

export function awardPoints(
  first: string | number,
  second: string | number,
  third?: string
): number {
  if (typeof window === 'undefined') return 0;
  
  let targetUserId: string | undefined;
  let pointsToAdd = 0;
  let reason = '';

  if (typeof first === 'string' && typeof second === 'number') {
    targetUserId = first;
    pointsToAdd = second;
    reason = third || '';
  } else if (typeof first === 'number') {
    pointsToAdd = first;
    reason = typeof second === 'string' ? second : '';
  }

  try {
    const isGuest = Boolean(localStorage.getItem('church_guest_user'));
    const storageKey = isGuest ? 'church_guest_user' : 'church_auth_user';
    const userJson = localStorage.getItem(storageKey);
    if (userJson) {
      const user = JSON.parse(userJson);
      if (!targetUserId || user.id === targetUserId) {
        user.points = (user.points || 0) + pointsToAdd;
        localStorage.setItem(storageKey, JSON.stringify(user));
        updateLeaderboardUser(user, pointsToAdd);
        window.dispatchEvent(new CustomEvent('church_user_updated', { detail: user }));
        return user.points;
      }
    }
  } catch (e) {
    console.warn('Error awarding points:', e);
  }
  return pointsToAdd;
}

export interface StreakLeaderboardEntry {
  id: string;
  studentId: string;
  studentName: string;
  studentNameAr: string;
  avatarUrl: string;
  streakDays: number;
  longestStreak: number;
  rank: number;
}

const DEFAULT_STREAK_LEADERBOARD: StreakLeaderboardEntry[] = [
  { id: 'st-1', studentId: 's-mina', studentName: 'Mina Shenouda', studentNameAr: 'مينا شنودة', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mina', streakDays: 14, longestStreak: 18, rank: 1 },
  { id: 'st-2', studentId: 's-mary', studentName: 'Mary George', studentNameAr: 'مريم جورج', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mary', streakDays: 10, longestStreak: 12, rank: 2 },
  { id: 'st-3', studentId: 'u1', studentName: 'Youssef Mina', studentNameAr: 'يوسف مينا', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Youssef', streakDays: 4, longestStreak: 12, rank: 3 },
  { id: 'st-4', studentId: 's-marina', studentName: 'Marina Hany', studentNameAr: 'مارينا هاني', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marina', streakDays: 6, longestStreak: 8, rank: 4 },
  { id: 'st-5', studentId: 's-david', studentName: 'David Emad', studentNameAr: 'ديفيد عماد', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David', streakDays: 5, longestStreak: 9, rank: 5 },
  { id: 'st-6', studentId: 's-kirollos', studentName: 'Kirollos Bassem', studentNameAr: 'كيرلس باسم', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kirollos', streakDays: 3, longestStreak: 5, rank: 6 },
  { id: 'st-7', studentId: 's-mark', studentName: 'Mark Fady', studentNameAr: 'مارك فادي', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mark', streakDays: 2, longestStreak: 4, rank: 7 },
];

const STREAK_LEADERBOARD_STORAGE_KEY = 'church_streak_leaderboard_data';

export function getStreakLeaderboard(currentUser?: User | null): StreakLeaderboardEntry[] {
  let list: StreakLeaderboardEntry[] = [];
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(STREAK_LEADERBOARD_STORAGE_KEY);
      if (saved) {
        list = JSON.parse(saved);
      }
    } catch (_) {}
  }

  if (!list || list.length === 0) {
    list = [...DEFAULT_STREAK_LEADERBOARD];
  }

  if (currentUser) {
    const isGuest = currentUser.id.startsWith('guest_');
    const userStreak = Math.max(1, currentUser.currentStreak ?? 1);
    const userLongest = Math.max(userStreak, currentUser.longestStreak ?? userStreak);

    const existingIdx = list.findIndex(
      (e) => e.studentId === currentUser.id || 
             (isGuest && (e.studentId === 'u1' || e.studentId.startsWith('guest_'))) ||
             (currentUser.role === 'student' && !currentUser.id.startsWith('s-') && e.studentId === 'u1')
    );

    if (existingIdx >= 0) {
      list[existingIdx] = {
        ...list[existingIdx],
        studentId: currentUser.id,
        studentName: currentUser.fullName,
        studentNameAr: currentUser.fullName,
        avatarUrl: currentUser.avatarUrl || list[existingIdx].avatarUrl,
        streakDays: userStreak,
        longestStreak: userLongest
      };
    } else {
      list.push({
        id: 'st_' + currentUser.id,
        studentId: currentUser.id,
        studentName: currentUser.fullName,
        studentNameAr: currentUser.fullName,
        avatarUrl: currentUser.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.id}`,
        streakDays: userStreak,
        longestStreak: userLongest,
        rank: list.length + 1
      });
    }

    // Clean up any stale duplicate guest entries
    if (isGuest) {
      list = list.filter((e) => {
        if (e.studentId.startsWith('guest_') && e.studentId !== currentUser.id) return false;
        return true;
      });
    }

    // Sort descending by streakDays
    list.sort((a, b) => b.streakDays - a.streakDays);
    list = list.map((item, index) => ({
      ...item,
      rank: index + 1
    }));

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STREAK_LEADERBOARD_STORAGE_KEY, JSON.stringify(list));
      } catch (_) {}
    }
  }

  return list;
}

export function updateStreakLeaderboardUser(currentUser: User): StreakLeaderboardEntry[] {
  const list = getStreakLeaderboard(currentUser);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STREAK_LEADERBOARD_STORAGE_KEY, JSON.stringify(list));
      window.dispatchEvent(new CustomEvent('church_streak_updated', { detail: list }));
    } catch (_) {}
  }
  return list;
}

