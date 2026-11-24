import type { User, Lesson } from '../types';
import type { Workspace } from './workspaces';
import { supabase } from './supabase';

export interface ChurchNotification {
  id: string;
  type: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  timestamp: string;
  isRead: boolean;
  actionTab?: string;
  icon: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  announcement: '📣', event: '📅', lesson: '📚', assignment: '📝',
  progress: '🌱', streak: '🔥', achievement: '🏅', leaderboard: '🏆',
  help_request: '🛟', moderation: '🛡️', system: '⚙️', motivation: '✨', community: '👥'
};

function toChurchNotification(row: any): ChurchNotification {
  return {
    id: String(row.id),
    type: String(row.category || 'system').toUpperCase(),
    titleAr: row.title_ar || 'إشعار جديد',
    titleEn: row.title_en || 'New notification',
    bodyAr: row.body_ar || '',
    bodyEn: row.body_en || '',
    timestamp: row.created_at || new Date().toISOString(),
    isRead: Boolean(row.read_at),
    actionTab: row.action_tab || undefined,
    icon: CATEGORY_ICONS[row.category] || '🔔'
  };
}

export async function getLiveNotificationsForUser(
  currentUser: User | null,
  _lessons: Lesson[],
  _workspace?: Workspace | null
): Promise<ChurchNotification[]> {
  if (!currentUser || !supabase) return [];
  const { data: preferences } = await supabase
    .from('notification_preferences')
    .select('in_app_enabled,category_settings')
    .eq('user_id', currentUser.id)
    .maybeSingle();
  if (preferences?.in_app_enabled === false) return [];
  const categorySettings = preferences?.category_settings || {};
  const { data, error } = await supabase
    .from('notifications')
    .select('id,category,title_en,title_ar,body_en,body_ar,action_tab,created_at,read_at')
    .eq('recipient_id', currentUser.id)
    .order('created_at', { ascending: false })
    .limit(60);
  if (error) {
    console.warn('Could not load persistent notifications:', error.message);
    return [];
  }
  return (data || []).filter((row: any) => categorySettings[row.category] !== false).map(toChurchNotification);
}

export async function markNotificationAsRead(id: string, userId?: string): Promise<void> {
  if (!supabase || !userId) return;
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('recipient_id', userId)
    .is('read_at', null);
  if (error) console.warn('Could not mark notification as read:', error.message);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('church_notifications_updated'));
}

export async function markAllNotificationsAsRead(ids: string[], userId?: string): Promise<void> {
  if (!supabase || !userId || ids.length === 0) return;
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', userId)
    .in('id', ids)
    .is('read_at', null);
  if (error) console.warn('Could not mark notifications as read:', error.message);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('church_notifications_updated'));
}

function decodeVapidKey(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  const raw = atob(padded);
  return Uint8Array.from(raw, character => character.charCodeAt(0));
}

export function isBrowserNotificationEnabled(): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  return Notification.permission === 'granted' && localStorage.getItem('church_browser_notifications_enabled') === 'true';
}

/**
 * Permission alone is not reported as "push enabled". A valid VAPID public key,
 * service worker subscription, and persisted endpoint are all required.
 */
export async function requestBrowserNotificationPermission(userId?: string): Promise<boolean> {
  if (!userId || !supabase || typeof window === 'undefined' ||
      !('Notification' in window) || !('serviceWorker' in navigator) ||
      !('PushManager' in window)) return false;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const vapidPublicKey = (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY || '';
    if (!vapidPublicKey) {
      localStorage.setItem('church_browser_notifications_enabled', 'false');
      console.warn('Browser notification permission was granted, but VITE_VAPID_PUBLIC_KEY is not configured. Push delivery remains disabled.');
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeVapidKey(vapidPublicKey)
      });
    }
    const serialized = subscription.toJSON();
    const p256dh = serialized.keys?.p256dh;
    const authSecret = serialized.keys?.auth;
    if (!subscription.endpoint || !p256dh || !authSecret) return false;

    const { error: subscriptionError } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh,
        auth_secret: authSecret,
        expiration_time: subscription.expirationTime
          ? new Date(subscription.expirationTime).toISOString()
          : null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'endpoint' });
    if (subscriptionError) throw subscriptionError;

    const { error: preferenceError } = await supabase
      .from('notification_preferences')
      .upsert({ user_id: userId, push_enabled: true, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (preferenceError) throw preferenceError;
    localStorage.setItem('church_browser_notifications_enabled', 'true');
    return true;
  } catch (error) {
    if (typeof localStorage !== 'undefined') localStorage.setItem('church_browser_notifications_enabled', 'false');
    console.warn('Could not enable browser push notifications:', error);
    return false;
  }
}

export function subscribeToNotifications(userId: string, onChange: () => void): () => void {
  if (!supabase) return () => undefined;
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'notifications',
      filter: `recipient_id=eq.${userId}`
    }, onChange)
    .subscribe();
  return () => { void supabase?.removeChannel(channel); };
}
