import { User, Lesson } from '../types';
import type { Workspace } from './workspaces';
import { hasRole } from './workspaces';
import { getPendingActivationRequests } from './onboardingService';

export interface ChurchNotification {
  id: string;
  type: 'NEW_LESSON' | 'STREAK_ALERT' | 'PRAYER_REMINDER' | 'BIBLE_VERSE' | 'ROSTER_APPROVAL';
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  timestamp: string;
  isRead: boolean;
  actionTab?: string;
  icon: string;
}

const READ_NOTIFICATIONS_KEY = 'church_read_notifications';
const BROWSER_NOTIF_PREF_KEY = 'church_browser_notifications_enabled';

function getReadNotificationIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(READ_NOTIFICATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function markNotificationAsRead(id: string): void {
  if (typeof window === 'undefined') return;
  const readIds = getReadNotificationIds();
  if (!readIds.includes(id)) {
    readIds.push(id);
    localStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify(readIds));
    window.dispatchEvent(new CustomEvent('church_notifications_updated'));
  }
}

export function markAllNotificationsAsRead(ids: string[]): void {
  if (typeof window === 'undefined') return;
  const readIds = Array.from(new Set([...getReadNotificationIds(), ...ids]));
  localStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify(readIds));
  window.dispatchEvent(new CustomEvent('church_notifications_updated'));
}

export function isBrowserNotificationEnabled(): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  return Notification.permission === 'granted' && localStorage.getItem(BROWSER_NOTIF_PREF_KEY) === 'true';
}

export async function requestBrowserNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  try {
    const permission = await Notification.requestPermission();
    const granted = permission === 'granted';
    localStorage.setItem(BROWSER_NOTIF_PREF_KEY, String(granted));
    return granted;
  } catch (err) {
    console.warn('Notification permission request error:', err);
    return false;
  }
}

/**
 * Generates genuine authorized notifications based on current user and real system state
 */
export async function getLiveNotificationsForUser(
  currentUser: User | null,
  lessons: Lesson[],
  workspace?: Workspace | null
): Promise<ChurchNotification[]> {
  if (!currentUser) return [];

  const readIds = getReadNotificationIds();
  const notifications: ChurchNotification[] = [];
  const todayDateStr = new Date().toISOString().slice(0, 10);

  // 1. Daily Bible Verse Reminder (Always active for today)
  const verseNotifId = `verse_${todayDateStr}`;
  notifications.push({
    id: verseNotifId,
    type: 'BIBLE_VERSE',
    titleAr: 'آية اليوم الذهبية',
    titleEn: 'Daily Bible Verse',
    bodyAr: '«كُنْ أَمِينًا إِلَى الْمَوْتِ فَسَأُعْطِيكَ إِكْلِيلَ الْحَيَاةِ» (رؤيا ٢: ١٠)',
    bodyEn: '"Be faithful until death, and I will give you the crown of life." (Revelation 2:10)',
    timestamp: new Date().toISOString(),
    isRead: readIds.includes(verseNotifId),
    actionTab: 'home',
    icon: '📖'
  });

  // 2. Prayer Tracker Reminder (Daily Agpeya)
  const prayerNotifId = `prayer_${todayDateStr}`;
  if (!workspace || workspace === 'student') notifications.push({
    id: prayerNotifId,
    type: 'PRAYER_REMINDER',
    titleAr: 'تذكير صلوات الأجبية اليومية',
    titleEn: 'Daily Agpeya Prayer Reminder',
    bodyAr: 'قِفْ في هدوء لدقائق وارفع قلبك بصلاة باكر أو الغروب لنوال بركة اليوم.',
    bodyEn: 'Take a quiet moment to pray Prime or Sunset prayer from the Agpeya.',
    timestamp: new Date().toISOString(),
    isRead: readIds.includes(prayerNotifId),
    actionTab: 'agpeya',
    icon: '✝️'
  });

  // 3. Streak Activity Notice
  if ((!workspace || workspace === 'student') && hasRole(currentUser, 'student')) {
    const streakNotifId = `streak_${todayDateStr}_${currentUser.currentStreak}`;
    if (currentUser.currentStreak > 0) {
      notifications.push({
        id: streakNotifId,
        type: 'STREAK_ALERT',
        titleAr: 'حافظ على استمرارية ستريك البركة 🔥',
        titleEn: 'Protect Your Blessing Streak 🔥',
        bodyAr: `أنت في اليوم ${currentUser.currentStreak} من الستريك! أكمل درس اليوم لتحافظ على تميزك.`,
        bodyEn: `You are on day ${currentUser.currentStreak}! Complete today's milestone to maintain your streak.`,
        timestamp: new Date().toISOString(),
        isRead: readIds.includes(streakNotifId),
        actionTab: 'home',
        icon: '🔥'
      });
    }

    // 4. New Published Lesson for eligible class
    const publishedForStudent = lessons.find(l => l.status === 'published' && !l.isCompleted);
    if (publishedForStudent) {
      const lessonNotifId = `lesson_${publishedForStudent.id}`;
      notifications.push({
        id: lessonNotifId,
        type: 'NEW_LESSON',
        titleAr: 'محطة درس جديدة متاحة لفصلك',
        titleEn: 'New Lesson Available',
        bodyAr: `تم نشر درس: "${publishedForStudent.titleAr || publishedForStudent.title}". انطلق لتعلّم القصة وحصد النقاط!`,
        bodyEn: `Lesson "${publishedForStudent.title}" is published. Begin the story to earn points!`,
        timestamp: publishedForStudent.date || new Date().toISOString(),
        isRead: readIds.includes(lessonNotifId),
        actionTab: 'lessons',
        icon: '✨'
      });
    }
  }

  // 5. Servants: Student Roster Approval Requests
  if ((!workspace || workspace === 'teacher' || workspace === 'admin') &&
      (hasRole(currentUser, 'teacher') || hasRole(currentUser, 'admin'))) {
    try {
      const reqRes = await getPendingActivationRequests();
      const pendingCount = (reqRes.requests || []).length;
      if (pendingCount > 0) {
        const rosterNotifId = `roster_${todayDateStr}_${pendingCount}`;
        notifications.push({
          id: rosterNotifId,
          type: 'ROSTER_APPROVAL',
          titleAr: 'طلبات اعتماد وتسكين تلاميذ جديدة',
          titleEn: 'Student Roster Approvals Needed',
          bodyAr: `يوجد ${pendingCount} طالب بانتظار اعتماد الصف الدراسي في كشوف الخدمة.`,
          bodyEn: `${pendingCount} student(s) require roster activation approval.`,
          timestamp: new Date().toISOString(),
          isRead: readIds.includes(rosterNotifId),
          actionTab: workspace === 'admin' ? 'home' : 'studio',
          icon: '📋'
        });
      }
    } catch (_) {}
  }

  return notifications;
}
