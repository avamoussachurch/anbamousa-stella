import React, { useEffect, useState } from 'react';
import { BellRing, Settings2, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { requestBrowserNotificationPermission } from '../../lib/notificationService';
import type { Language } from '../../types';

const categories = [
  ['announcement','Announcements','الإعلانات'],['event','Church events','فعاليات الكنيسة'],
  ['lesson','New lessons','الدروس الجديدة'],['assignment','Assignments','التكليفات'],
  ['progress','Progress updates','تحديثات التقدم'],['streak','Streak reminders','تذكيرات الاستمرارية'],
  ['achievement','Achievements','الإنجازات'],['leaderboard','Leaderboard changes','تغييرات الترتيب'],
  ['help_request','Help requests','طلبات المساعدة'],['moderation','Moderation','الإشراف'],
  ['system','System updates','تحديثات النظام'],['motivation','Encouragement','رسائل التشجيع']
] as const;

export function NotificationPreferencesButton({ lang }: { lang: Language }) {
  const { userData } = useAuth();
  const isArabic = lang === 'ar';
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inAppEnabled, setInAppEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [language, setLanguage] = useState<'en' | 'ar'>(lang === 'ar' ? 'ar' : 'en');
  const [quietStart, setQuietStart] = useState('');
  const [quietEnd, setQuietEnd] = useState('');
  const [categorySettings, setCategorySettings] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open || !userData?.id || !supabase) return;
    let active = true;
    setLoading(true);
    supabase.from('notification_preferences')
      .select('in_app_enabled,push_enabled,category_settings,quiet_hours_start,quiet_hours_end,language')
      .eq('user_id', userData.id).maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setMessage(isArabic ? 'تعذر تحميل التفضيلات.' : 'Could not load preferences.');
        if (data) {
          setInAppEnabled(data.in_app_enabled);
          setPushEnabled(data.push_enabled);
          setLanguage(data.language === 'ar' ? 'ar' : 'en');
          setQuietStart(data.quiet_hours_start?.slice(0,5) || '');
          setQuietEnd(data.quiet_hours_end?.slice(0,5) || '');
          setCategorySettings(data.category_settings || {});
        }
        setLoading(false);
      });
    return () => { active = false; };
  }, [open, userData?.id, isArabic]);

  const setCategory = (key: string, enabled: boolean) =>
    setCategorySettings(previous => ({ ...previous, [key]: enabled }));

  const togglePush = async (enabled: boolean) => {
    if (!enabled) {
      setPushEnabled(false);
      localStorage.setItem('church_browser_notifications_enabled', 'false');
      if (supabase && userData?.id) {
        const registration = await navigator.serviceWorker?.ready.catch(() => null);
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) {
          await supabase.from('push_subscriptions').delete().eq('user_id', userData.id).eq('endpoint', subscription.endpoint);
          await subscription.unsubscribe();
        }
        await supabase.from('notification_preferences').upsert({ user_id: userData.id, push_enabled: false, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      }
      return;
    }
    const enabledResult = await requestBrowserNotificationPermission(userData?.id);
    setPushEnabled(enabledResult);
    setMessage(enabledResult
      ? (isArabic ? 'تم تفعيل إشعارات المتصفح على هذا الجهاز.' : 'Browser push is enabled on this device.')
      : (isArabic ? 'إعدادات الإشعارات الخارجية غير مكتملة أو لم تسمح بالإذن.' : 'Push setup is incomplete or permission was not granted.'));
  };

  const save = async () => {
    if (!supabase || !userData?.id) return;
    setSaving(true);
    const { error } = await supabase.from('notification_preferences').upsert({
      user_id: userData.id,
      in_app_enabled: inAppEnabled,
      push_enabled: pushEnabled,
      category_settings: categorySettings,
      language,
      quiet_hours_start: quietStart || null,
      quiet_hours_end: quietEnd || null,
      timezone: 'Africa/Cairo',
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
    setSaving(false);
    setMessage(error
      ? (isArabic ? 'تعذر حفظ التفضيلات.' : 'Could not save preferences.')
      : (isArabic ? 'تم حفظ تفضيلاتك.' : 'Your preferences were saved.'));
  };

  return (
    <>
      <button type="button" onClick={() => { setOpen(true); setMessage(''); }} aria-label={isArabic ? 'إعدادات الإشعارات' : 'Notification settings'} title={isArabic ? 'إعدادات الإشعارات' : 'Notification settings'} className="rounded-xl border border-white/20 bg-white/10 p-2 text-[var(--navigation-text)] transition-colors hover:bg-white/20">
        <Settings2 size={17} />
      </button>
      {open && <div className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/60 p-2 backdrop-blur-sm sm:items-center sm:p-5">
        <section role="dialog" aria-modal="true" aria-labelledby="notification-preferences-title" className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 text-[var(--text-primary)] shadow-2xl">
          <header className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2"><BellRing size={20}/><div><h2 id="notification-preferences-title" className="font-black">{isArabic ? 'تفضيلات الإشعارات' : 'Notification preferences'}</h2><p className="text-xs text-[var(--text-secondary)]">{isArabic ? 'اختار إيه اللي تحب يوصلك وإمتى.' : 'Choose what you receive and when.'}</p></div></div>
            <button type="button" onClick={() => setOpen(false)} aria-label={isArabic ? 'إغلاق' : 'Close'} className="rounded-xl p-2 hover:bg-[var(--state-hover)]"><X size={18}/></button>
          </header>
          {loading ? <p role="status" className="p-5 text-center">{isArabic ? 'بنحمّل...' : 'Loading...'}</p> : <>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex min-h-12 items-center justify-between rounded-xl border p-3 text-sm font-bold"><span>{isArabic ? 'إشعارات داخل التطبيق' : 'In-app notifications'}</span><input type="checkbox" checked={inAppEnabled} onChange={event => setInAppEnabled(event.target.checked)} /></label>
              <label className="flex min-h-12 items-center justify-between rounded-xl border p-3 text-sm font-bold"><span>{isArabic ? 'إشعارات المتصفح' : 'Browser push'}</span><input type="checkbox" checked={pushEnabled} onChange={event => void togglePush(event.target.checked)} /></label>
            </div>
            <h3 className="mt-5 mb-2 text-sm font-black">{isArabic ? 'أنواع الإشعارات' : 'Notification categories'}</h3>
            <div className="grid gap-2 sm:grid-cols-2">{categories.map(([key,en,ar]) => <label key={key} className="flex min-h-11 items-center justify-between rounded-xl bg-[var(--surface-secondary)] px-3 py-2 text-sm"><span>{isArabic ? ar : en}</span><input type="checkbox" checked={categorySettings[key] !== false} onChange={event => setCategory(key,event.target.checked)} /></label>)}</div>
            <h3 className="mt-5 mb-2 text-sm font-black">{isArabic ? 'لغة الإشعارات' : 'Notification language'}</h3>
            <select value={language} onChange={event => setLanguage(event.target.value as 'en' | 'ar')} className="min-h-11 w-full rounded-xl border bg-[var(--surface-secondary)] px-3 text-sm"><option value="en">English</option><option value="ar">العربية</option></select>
            <h3 className="mt-5 mb-2 text-sm font-black">{isArabic ? 'ساعات الهدوء (بتوقيت القاهرة)' : 'Quiet hours (Cairo time)'}</h3>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-bold">{isArabic ? 'من' : 'From'}<input type="time" value={quietStart} onChange={event => setQuietStart(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border bg-[var(--surface-secondary)] px-3 text-sm"/></label>
              <label className="text-xs font-bold">{isArabic ? 'إلى' : 'Until'}<input type="time" value={quietEnd} onChange={event => setQuietEnd(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border bg-[var(--surface-secondary)] px-3 text-sm"/></label>
            </div>
            {message && <p role="status" className="mt-3 rounded-xl bg-[var(--surface-secondary)] p-3 text-sm">{message}</p>}
            <button type="button" onClick={() => void save()} disabled={saving} className="mt-5 min-h-11 w-full rounded-xl bg-[var(--action-primary)] px-4 font-black text-[var(--action-primary-text)] disabled:opacity-50">{saving ? (isArabic ? 'بنحفظ...' : 'Saving...') : (isArabic ? 'حفظ التفضيلات' : 'Save preferences')}</button>
          </>}
        </section>
      </div>}
    </>
  );
}
