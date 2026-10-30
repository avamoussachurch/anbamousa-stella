import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Shield, 
  Clock, 
  Settings, 
  Bell, 
  BellRing,
  BellOff,
  BookOpen, 
  Calendar, 
  TrendingUp,
  QrCode,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { updateSupabaseProfile } from '../../lib/supabaseDatabase';
import { 
  getAuthoritativeParentChildren,
  getAuthoritativeChurchEvents,
} from '../../lib/parentChildService';
import { AddChildModal } from './AddChildModal';
import { ChildProfile } from '../../types';
import { ChildrenLessonsProgress } from './ChildrenLessonsProgress';
import { ChurchEventNotifications } from './ChurchEventNotifications';
import { ParentSettings } from './ParentSettings';
import { WeeklyProgressView } from './WeeklyProgressView';

interface ParentDashboardProps {
  lang: 'en' | 'ar';
  onBackToApp?: () => void;
  onOpenTeacherStudio?: () => void;
  initialChildCode?: string;
}

export function ParentDashboard({ lang, onBackToApp, onOpenTeacherStudio, initialChildCode }: ParentDashboardProps) {
  const { userData, currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'weekly' | 'events' | 'approvals' | 'settings'>('overview');
  const [addChildInitialTab, setAddChildInitialTab] = useState<'qr' | 'code' | 'link'>('qr');
  
  // Consistent parent key across all operations
  const parentKey = userData?.id || currentUser?.uid || '';

  // Dynamic linked children from parentChildService
  const [linkedChildren, setLinkedChildren] = useState<ChildProfile[]>([]);
  const [childrenLoading, setChildrenLoading] = useState(true);
  const [childrenError, setChildrenError] = useState<string | null>(null);
  const [churchEvents, setChurchEvents] = useState<import('../../types').ChurchEventNotification[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [isAddChildModalOpen, setIsAddChildModalOpen] = useState(Boolean(initialChildCode));
  const [selectedChildId, setSelectedChildId] = useState('');

  const refreshChildren = async () => {
    setChildrenLoading(true);
    setChildrenError(null);
    const result = await getAuthoritativeParentChildren();
    if (result.error || !result.data) {
      setLinkedChildren([]);
      setChildrenError(lang === 'ar'
        ? 'تعذر تحميل بيانات الأبناء. تأكد من تسجيل الدخول بحساب ولي أمر مرتبط، ثم أعد المحاولة.'
        : 'Unable to load linked children. Sign in with a linked parent account and try again.');
      setChildrenLoading(false);
      return;
    }
    const updated: ChildProfile[] = result.data.map(child => ({
      id: child.id,
      studentId: child.id,
      nameEn: child.name,
      nameAr: child.name,
      age: 0,
      gradeEn: child.grade,
      gradeAr: child.grade,
      avatarUrl: child.avatarUrl,
      points: child.points ?? 0,
      pointsKnown: child.points !== null,
      rank: 0,
      attendanceRate: 0,
      screenTimeMinutes: 0,
      completedLessonsCount: 0,
      totalLessonsCount: 0,
      verseMemorizedCount: 0,
      pendingRewardsCount: 0,
      lessons: [],
      isRealAccount: true
    }));
    setLinkedChildren(updated);
    setSelectedChildId(current => updated.some(child => child.id === current) ? current : (updated[0]?.id || ''));
    setChildrenLoading(false);
  };

  useEffect(() => {
    void refreshChildren();
    void getAuthoritativeChurchEvents().then(({ data, error }) => {
      setEventsLoading(false);
      setEventsError(error
        ? (lang === 'ar' ? 'تعذر تحميل فعاليات الكنيسة. حاول مرة أخرى.' : 'Unable to load church events. Please try again.')
        : null);
      setChurchEvents(data || []);
    });

    // Listen for cross-component linking events
    const handleChildrenUpdated = () => {
      refreshChildren();
    };
    window.addEventListener('church:children_updated', handleChildrenUpdated);
    window.addEventListener('church:parent_linked', handleChildrenUpdated);

    return () => {
      window.removeEventListener('church:children_updated', handleChildrenUpdated);
      window.removeEventListener('church:parent_linked', handleChildrenUpdated);
    };
  }, [parentKey]);

  // Firestore parental approval toggle
  const [requireApproval, setRequireApproval] = useState<boolean>(
    userData?.requireRewardApproval ?? true
  );

  // Real-time Push notification preferences
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState<boolean>(() => {
    if (userData?.pushNotificationsEnabled !== undefined) return userData.pushNotificationsEnabled;
    const saved = localStorage.getItem('church_parent_push_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  const [notifyLessonCompletion, setNotifyLessonCompletion] = useState<boolean>(() => {
    if (userData?.notifyLessonCompletion !== undefined) return userData.notifyLessonCompletion;
    const saved = localStorage.getItem('church_parent_notify_lessons');
    return saved !== null ? saved === 'true' : true;
  });

  const [notifyEventReminders, setNotifyEventReminders] = useState<boolean>(() => {
    if (userData?.notifyEventReminders !== undefined) return userData.notifyEventReminders;
    const saved = localStorage.getItem('church_parent_notify_events');
    return saved !== null ? saved === 'true' : true;
  });

  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'default' | 'unsupported'>('default');

  // Interactive in-app push alert toast for live preview and real-time alerts
  const [activePushToast, setActivePushToast] = useState<{
    id: string;
    title: string;
    body: string;
    icon: string;
    badge: string;
    timestamp: string;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission);
    } else {
      setPermissionStatus('unsupported');
    }
  }, []);

  // Auto-dismiss push toast after 5 seconds
  useEffect(() => {
    if (activePushToast) {
      const timer = setTimeout(() => {
        setActivePushToast(null);
      }, 5500);
      return () => clearTimeout(timer);
    }
  }, [activePushToast]);

  const toggleApproval = async () => {
    const newValue = !requireApproval;
    setRequireApproval(newValue);
    if (currentUser) {
      await updateSupabaseProfile(currentUser.uid, {
        require_reward_approval: newValue
      });
    }
  };

  const togglePushNotifications = async () => {
    const nextVal = !pushNotificationsEnabled;
    setPushNotificationsEnabled(nextVal);
    try {
      localStorage.setItem('church_parent_push_enabled', String(nextVal));
    } catch (e) {}

    // If enabling, request permission if available in browser
    if (nextVal && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        try {
          const perm = await Notification.requestPermission();
          setPermissionStatus(perm);
        } catch (e) {
          console.warn("Notification request permission warning:", e);
        }
      }
    }

    if (currentUser) {
      await updateSupabaseProfile(currentUser.uid, {
        push_notifications_enabled: nextVal
      });
    }

    // Show temporary feedback toast
    setActivePushToast({
      id: 'toggle-' + Date.now(),
      title: nextVal 
        ? (lang === 'ar' ? 'تم تفعيل التنبيهات الفورية 🔔' : 'Real-Time Alerts Enabled 🔔')
        : (lang === 'ar' ? 'تم إيقاف التنبيهات الفورية 🔕' : 'Real-Time Alerts Disabled 🔕'),
      body: nextVal
        ? (lang === 'ar' ? 'ستصلك إشعارات فورية لتقارير إتمام الدروس وتذكيرات فعاليات الكنيسة.' : 'You will receive real-time alerts for lesson completions and church event reminders.')
        : (lang === 'ar' ? 'لن تستلم تنبيهات منبثقة فورية بعد الآن.' : 'Push notifications are now muted.'),
      icon: nextVal ? '🔔' : '🔕',
      badge: nextVal ? (lang === 'ar' ? 'نشط' : 'Active') : (lang === 'ar' ? 'متوقف' : 'Muted'),
      timestamp: lang === 'ar' ? 'الآن' : 'Just now'
    });
  };

  const toggleLessonCompletion = async () => {
    const nextVal = !notifyLessonCompletion;
    setNotifyLessonCompletion(nextVal);
    try {
      localStorage.setItem('church_parent_notify_lessons', String(nextVal));
    } catch (e) {}
    if (currentUser) {
      await updateSupabaseProfile(currentUser.uid, {
        notify_lesson_completion: nextVal
      });
    }
  };

  const toggleEventReminders = async () => {
    const nextVal = !notifyEventReminders;
    setNotifyEventReminders(nextVal);
    try {
      localStorage.setItem('church_parent_notify_events', String(nextVal));
    } catch (e) {}
    if (currentUser) {
      await updateSupabaseProfile(currentUser.uid, {
        notify_event_reminders: nextVal
      });
    }
  };

  const handleSendTestNotification = (type: 'lesson' | 'event') => {
    const isLesson = type === 'lesson';
    const title = isLesson
      ? (lang === 'ar' ? '🎉 إتمام درس جديد: مينا عماد' : '🎉 New Lesson Completed: Mina Emad')
      : (lang === 'ar' ? '⛪ تذكير كنسي: قداس عيد الصليب' : '⛪ Church Reminder: Feast of the Cross Liturgy');
    const body = isLesson
      ? (lang === 'ar' ? 'أتم مينا درس "الشهيد العظيم مارمينا العجائبي" بدرجة ١٠٠٪ في الاختبار وحفظ الآية (+١٥٠ نقطة).' : 'Mina completed "St. Mina the Wonder-Worker" with 100% quiz score and memorized the Scripture verse (+150 pts).')
      : (lang === 'ar' ? 'القداس الإلهي غداً الجمعة ٦:٣٠ ص بكنيسة القديس الأنبا موسى الأسود، يليه إفطار محبة.' : 'Divine Liturgy tomorrow Friday at 6:30 AM at St. Moses Church, followed by agape fellowship.');

    // Native browser notification if permitted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: 'https://api.dicebear.com/7.x/bottts/svg?seed=church_bell'
        });
      } catch (err) {
        console.warn('Native notification failed:', err);
      }
    }

    // In-app floating push alert toast
    setActivePushToast({
      id: 'test-' + Date.now(),
      title,
      body,
      icon: isLesson ? '📖' : '⛪',
      badge: isLesson ? (lang === 'ar' ? 'تقرير درس' : 'Lesson Report') : (lang === 'ar' ? 'تذكير كنسي' : 'Event Reminder'),
      timestamp: lang === 'ar' ? 'الآن' : 'Just now'
    });
  };

  return (
    <div className="parent-portal max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pb-28 pt-4 relative" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Floating Real-Time Push Notification Toast */}
      <AnimatePresence>
        {activePushToast && (
          <motion.div
            key={activePushToast.id}
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.95 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-lg bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border-2 border-[var(--color-church-blue)]/20 p-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-2xl flex items-center justify-center shrink-0 border border-blue-100 shadow-2xs">
                {activePushToast.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h5 className="font-bold text-sm text-[var(--color-church-blue)] truncate">
                      {activePushToast.title}
                    </h5>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--color-church-cream)] text-[var(--color-church-gold-dark)] border border-[var(--color-church-gold)]/30">
                      {activePushToast.badge}
                    </span>
                  </div>
                  <button 
                    onClick={() => setActivePushToast(null)}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors"
                  >
                    <X size={15} />
                  </button>
                </div>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  {activePushToast.body}
                </p>
                <div className="flex items-center justify-between mt-2 pt-1 border-t border-gray-100 text-[10px] text-gray-400 font-medium">
                  <span className="flex items-center gap-1">
                    <BellRing size={11} className="text-[var(--color-church-gold)]" />
                    <span>{lang === 'ar' ? 'إشعار فوري حقيقي' : 'Real-time Push Notification'}</span>
                  </span>
                  <span>{activePushToast.timestamp}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Welcome Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[var(--mousa-cream-surface)] rounded-3xl p-6 md:p-8 shadow-xs border-2 border-[var(--mousa-border-sand)] mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[var(--mousa-gold-soft)] border border-[var(--mousa-gold)]/30 p-2 flex items-center justify-center text-3xl shadow-xs">
            👨‍👩‍👧‍👦
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-black text-[var(--mousa-teal-deep)]">
                {lang === 'ar' ? 'بوابة أولياء الأمور' : 'Parent Portal'}
              </h1>
              <span className="text-xs bg-[var(--mousa-sand-100)] text-[var(--mousa-teal-deep)] border border-[var(--mousa-border-sand)] font-bold px-2.5 py-0.5 rounded-full">
                {lang === 'ar' ? 'رحلة القديس الأنبا موسى' : 'The Journey of Moses'}
              </span>
            </div>
            <p className="text-sm text-[var(--mousa-sand-500)] font-bold mt-1">
              {lang === 'ar' 
                ? `أهلاً بك يا ${userData?.fullName || 'ولي الأمر'}، متابعة نمو أطفالك في مسيرة مدارس الأحد` 
                : `Welcome, ${userData?.fullName || 'Parent'} — Track your children's Sunday School journey`}
            </p>
          </div>
        </div>

        {/* Quick Controls, Family Stats, Notification Toggle & Logout */}
        <div className="flex items-center flex-wrap gap-2.5 w-full md:w-auto justify-between md:justify-end">
          {onOpenTeacherStudio && (
            <button
              type="button"
              onClick={onOpenTeacherStudio}
              className="px-3.5 py-2 rounded-2xl bg-[var(--mousa-sand-100)] hover:bg-[var(--mousa-sand-200)] text-[var(--mousa-teal-deep)] border border-[var(--mousa-border-sand)] text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <span>⛪</span>
              <span>{lang === 'ar' ? 'استوديو الخادم' : 'Servant Studio'}</span>
            </button>
          )}

          {onBackToApp && (
            <button
              type="button"
              onClick={onBackToApp}
              className="px-3.5 py-2 rounded-2xl bg-[var(--mousa-cream-surface)] hover:bg-[var(--mousa-sand-100)] text-[var(--mousa-sand-600)] text-xs font-bold transition-all cursor-pointer border border-[var(--mousa-border-sand)]"
            >
              {lang === 'ar' ? 'تطبيق الكنيسة' : 'Church App'}
            </button>
          )}

          {/* Quick Notification Toggle Button */}
          <button
            type="button"
            onClick={togglePushNotifications}
            title={lang === 'ar' ? 'تبديل التنبيهات الفورية' : 'Toggle Real-Time Push Alerts'}
            className={`px-3 py-2 rounded-2xl border-2 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs ${
              pushNotificationsEnabled
                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                : 'bg-[var(--mousa-cream-surface)] hover:bg-[var(--mousa-sand-100)] text-stone-500 border-[var(--mousa-border-sand)]'
            }`}
          >
            {pushNotificationsEnabled ? (
              <BellRing size={15} className="text-emerald-700" />
            ) : (
              <BellOff size={15} className="text-gray-400" />
            )}
            <span>
              {pushNotificationsEnabled 
                ? (lang === 'ar' ? 'التنبيهات: مفعّلة' : 'Push: On') 
                : (lang === 'ar' ? 'التنبيهات: معطلة' : 'Push: Off')}
            </span>
          </button>

          {/* Quick Scan Child QR Button */}
          <button
            type="button"
            onClick={() => {
              setAddChildInitialTab('qr');
              setIsAddChildModalOpen(true);
            }}
            title={lang === 'ar' ? 'مسح رمز QR للطفل لربط حسابه فورياً' : 'Scan child QR code to link instantly'}
            className="px-3.5 py-2 rounded-2xl bg-[var(--mousa-teal)] hover:bg-[var(--mousa-teal-deep)] text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <QrCode size={15} className="text-[var(--mousa-gold)]" />
            <span>{lang === 'ar' ? 'مسح كود QR' : 'Scan Child QR'}</span>
          </button>

          <div className="flex items-center gap-2 bg-[var(--mousa-sand-100)] px-3.5 py-2 rounded-2xl border border-[var(--mousa-border-sand)] text-xs font-bold text-[var(--mousa-teal-deep)]">
            <Users size={16} className="text-[var(--mousa-gold)]" />
            <span>
              {childrenLoading ? '…' : linkedChildren.length} {lang === 'ar' ? 'أطفال مرتبطون' : 'linked children'}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Main Navigation Tabs */}
      <div className="flex gap-2 sm:gap-4 mb-8 overflow-x-auto pb-1">
        {/* Tab 1: Lessons Progress */}
        <button 
          onClick={() => setActiveTab('overview')}
          className={`flex-1 min-w-[140px] py-3.5 px-3.5 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer ${
            activeTab === 'overview' 
              ? 'bg-[var(--mousa-teal)] text-white shadow-xs' 
              : 'bg-[var(--mousa-cream-surface)] text-[var(--mousa-sand-600)] hover:bg-[var(--mousa-sand-100)] border-2 border-[var(--mousa-border-sand)]'
          }`}
        >
          <BookOpen size={18} className={activeTab === 'overview' ? 'text-[var(--mousa-gold)]' : 'text-stone-400'} />
          <span>{lang === 'ar' ? 'تقدم الدروس' : 'Lessons & Progress'}</span>
        </button>

        {/* Tab 2: Weekly Aggregated Progress */}
        <button 
          onClick={() => setActiveTab('weekly')}
          className={`flex-1 min-w-[140px] py-3.5 px-3.5 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer ${
            activeTab === 'weekly' 
              ? 'bg-[var(--mousa-teal)] text-white shadow-xs' 
              : 'bg-[var(--mousa-cream-surface)] text-[var(--mousa-sand-600)] hover:bg-[var(--mousa-sand-100)] border-2 border-[var(--mousa-border-sand)]'
          }`}
        >
          <TrendingUp size={18} className={activeTab === 'weekly' ? 'text-[var(--mousa-gold)]' : 'text-stone-400'} />
          <span>{lang === 'ar' ? 'التقرير الأسبوعي' : 'Weekly Progress'}</span>
        </button>

        {/* Tab 3: Church Events Feed */}
        <button 
          onClick={() => setActiveTab('events')}
          className={`flex-1 min-w-[140px] py-3.5 px-3.5 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 relative shadow-xs cursor-pointer ${
            activeTab === 'events' 
              ? 'bg-[var(--mousa-teal)] text-white shadow-xs' 
              : 'bg-[var(--mousa-cream-surface)] text-[var(--mousa-sand-600)] hover:bg-[var(--mousa-sand-100)] border-2 border-[var(--mousa-border-sand)]'
          }`}
        >
          <Calendar size={18} className={activeTab === 'events' ? 'text-[var(--mousa-gold)]' : 'text-stone-400'} />
          <span>{lang === 'ar' ? 'فعاليات الكنيسة' : 'Church Events'}</span>
        </button>

        {/* Tab 4: Reward Approvals */}
        <button 
          onClick={() => setActiveTab('approvals')}
          className={`flex-1 min-w-[140px] py-3.5 px-3.5 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 relative shadow-xs cursor-pointer ${
            activeTab === 'approvals' 
              ? 'bg-[var(--mousa-teal)] text-white shadow-xs' 
              : 'bg-[var(--mousa-cream-surface)] text-[var(--mousa-sand-600)] hover:bg-[var(--mousa-sand-100)] border-2 border-[var(--mousa-border-sand)]'
          }`}
        >
          <Shield size={18} className={activeTab === 'approvals' ? 'text-[var(--mousa-gold)]' : 'text-stone-400'} />
          <span>{lang === 'ar' ? 'موافقات المكافآت' : 'Reward Approvals'}</span>
        </button>

        {/* Tab 5: Settings & Notifications */}
        <button 
          id="parent-settings-tab-btn"
          onClick={() => setActiveTab('settings')}
          className={`flex-1 min-w-[140px] py-3.5 px-3.5 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 relative shadow-xs cursor-pointer ${
            activeTab === 'settings' 
              ? 'bg-[var(--mousa-teal)] text-white shadow-xs' 
              : 'bg-[var(--mousa-cream-surface)] text-[var(--mousa-sand-600)] hover:bg-[var(--mousa-sand-100)] border-2 border-[var(--mousa-border-sand)]'
          }`}
        >
          <Settings size={18} className={activeTab === 'settings' ? 'text-[var(--mousa-gold)]' : 'text-stone-400'} />
          <span>{lang === 'ar' ? 'الإعدادات والتنبيهات' : 'Settings & Alerts'}</span>
          {pushNotificationsEnabled && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Notifications active"></span>
          )}
        </button>
      </div>

      {/* Tab Content Rendering */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {childrenLoading ? (
              <div className="mousa-card-sand p-8 text-center text-[var(--text-secondary)]" role="status">
                {lang === 'ar' ? 'جارٍ تحميل بيانات الأبناء...' : 'Loading linked children...'}
              </div>
            ) : childrenError ? (
              <div className="mousa-card-sand p-8 text-center" role="alert">
                <p className="text-[var(--feedback-error)] mb-4">{childrenError}</p>
                <button onClick={() => void refreshChildren()} className="mousa-btn-quest px-4 py-2 rounded-xl">
                  {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
                </button>
              </div>
            ) : linkedChildren.length === 0 ? (
              <div className="mousa-card-sand p-8 text-center text-[var(--text-secondary)]">
                <p className="font-bold text-[var(--text-primary)]">{lang === 'ar' ? 'لا يوجد أبناء مرتبطون بالحساب حتى الآن.' : 'No children are linked to this account yet.'}</p>
                <p className="mt-2 text-sm">{lang === 'ar' ? 'اربط حساب الطفل لعرض بياناته الحقيقية.' : 'Link a student account to see its verified information.'}</p>
                <button onClick={() => setIsAddChildModalOpen(true)} className="mousa-btn-quest px-4 py-2 rounded-xl mt-4">
                  {lang === 'ar' ? 'ربط طفل' : 'Link a child'}
                </button>
              </div>
            ) : (
              <ChildrenLessonsProgress 
                childrenProfiles={linkedChildren}
                selectedChildId={selectedChildId}
                onSelectChild={setSelectedChildId}
                onOpenAddChildModal={() => {
                  setAddChildInitialTab('code');
                  setIsAddChildModalOpen(true);
                }}
                onOpenQrScanner={() => {
                  setAddChildInitialTab('qr');
                  setIsAddChildModalOpen(true);
                }}
                lang={lang}
              />
            )}
          </motion.div>
        )}

        {activeTab === 'weekly' && (
          <motion.div
            key="weekly-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {childrenLoading ? (
              <div className="mousa-card-sand p-8 text-center text-[var(--text-secondary)]" role="status">
                {lang === 'ar' ? 'جارٍ تحميل بيانات الأبناء...' : 'Loading linked children...'}
              </div>
            ) : childrenError ? (
              <div className="mousa-card-sand p-8 text-center" role="alert">
                <p className="text-[var(--feedback-error)] mb-4">{childrenError}</p>
                <button onClick={() => void refreshChildren()} className="mousa-btn-quest px-4 py-2 rounded-xl">
                  {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
                </button>
              </div>
            ) : (
              <WeeklyProgressView 
                childrenProfiles={linkedChildren}
                lang={lang}
                onOpenAddChildModal={() => {
                  setAddChildInitialTab('code');
                  setIsAddChildModalOpen(true);
                }}
                onOpenQrScanner={() => {
                  setAddChildInitialTab('qr');
                  setIsAddChildModalOpen(true);
                }}
              />
            )}
          </motion.div>
        )}

        {activeTab === 'events' && (
          <motion.div
            key="events-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {eventsLoading ? (
              <div className="mousa-card-sand p-8 text-center text-[var(--text-secondary)]" role="status">
                {lang === 'ar' ? 'جارٍ تحميل فعاليات الكنيسة...' : 'Loading church events...'}
              </div>
            ) : eventsError ? (
              <div className="mousa-card-sand p-8 text-center" role="alert">
                <p className="text-[var(--feedback-error)] mb-4">{eventsError}</p>
                <button onClick={() => {
                  setEventsLoading(true);
                  void getAuthoritativeChurchEvents().then(({ data, error }) => {
                    setEventsLoading(false);
                    setEventsError(error
                      ? (lang === 'ar' ? 'تعذر تحميل فعاليات الكنيسة. حاول مرة أخرى.' : 'Unable to load church events. Please try again.')
                      : null);
                    setChurchEvents(data || []);
                  });
                }} className="mousa-btn-quest px-4 py-2 rounded-xl">
                  {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
                </button>
              </div>
            ) : (
              <ChurchEventNotifications events={churchEvents} lang={lang} />
            )}
          </motion.div>
        )}

        {activeTab === 'approvals' && (
          <motion.div
            key="approvals-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Control & Toggle Banner */}
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-[var(--mousa-border-sand)]">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                    <Shield size={22} />
                  </div>
                  <div>
                    <h2 className="text-lg md:text-xl font-bold text-[var(--mousa-teal-deep)]">
                      {lang === 'ar' ? 'نظام التحكم والموافقة الأبوية' : 'Parental Approval & Reward Safety'}
                    </h2>
                    <p className="text-xs text-gray-500 font-medium">
                      {lang === 'ar' 
                        ? 'عند التفعيل، لن يتمكن الطفل من استبدال نقاطه بهدايا إلا بعد موافقتك الصريحة' 
                        : 'When enabled, points can only be redeemed for gifts with your explicit confirmation'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <span className="text-xs font-bold text-gray-600">
                    {requireApproval 
                      ? (lang === 'ar' ? 'الموافقة مطلوبة دائماً' : 'Approval Required') 
                      : (lang === 'ar' ? 'استبدال مباشر بدون موافقة' : 'Instant Redeem')}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={requireApproval}
                      onChange={toggleApproval}
                    />
                    <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--mousa-teal-deep)]"></div>
                  </label>
                </div>
              </div>

              <div className="pt-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-4 flex items-center gap-2">
                  <Clock size={16} />
                  {lang === 'ar' ? 'طلبات المكافآت' : 'Reward requests'}
                </h3>
                <div className="bg-[var(--surface-secondary)] rounded-2xl p-8 text-center border border-[var(--border-default)] text-[var(--text-secondary)] font-medium text-sm">
                  {lang === 'ar' ? 'لا يعرض هذا القسم طلبات حقيقية حالياً؛ يلزم ربطه بخدمة المكافآت.' : 'Reward requests are not connected to a persisted service yet.'}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div
            key="settings-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <ParentSettings 
              lang={lang}
              requireApproval={requireApproval}
              onToggleApproval={toggleApproval}
              pushNotificationsEnabled={pushNotificationsEnabled}
              onTogglePushNotifications={togglePushNotifications}
              notifyLessonCompletion={notifyLessonCompletion}
              onToggleLessonCompletion={toggleLessonCompletion}
              notifyEventReminders={notifyEventReminders}
              onToggleEventReminders={toggleEventReminders}
              onSendTestNotification={handleSendTestNotification}
              permissionStatus={permissionStatus}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add / Link Child Modal */}
      <AddChildModal
        isOpen={isAddChildModalOpen}
        initialCode={initialChildCode}
        initialTab={addChildInitialTab}
        onClose={() => {
          setIsAddChildModalOpen(false);
          refreshChildren();
        }}
        onChildLinked={(newChild) => {
          setLinkedChildren(prev => {
            const filtered = prev.filter(c => c.id !== newChild.id && c.linkCode !== newChild.linkCode);
            return [newChild, ...filtered];
          });
          setSelectedChildId(newChild.id);
          refreshChildren();
          setActivePushToast({
            id: 'linked-' + Date.now(),
            title: lang === 'ar' ? 'تم ربط الطفل بنجاح' : 'Child Linked Successfully',
            body: lang === 'ar' ? `تم ربط حساب ${newChild.nameAr} بنجاح وتفعيل المزامنة المباشرة` : `${newChild.nameEn} is now linked and live synced`,
            icon: '👨‍👧',
            badge: lang === 'ar' ? 'ربط عائلي' : 'Family Linked',
            timestamp: lang === 'ar' ? 'الآن' : 'Just now'
          });
        }}
        parentEmail={userData?.email || currentUser?.email || ''}
        parentId={parentKey}
        parentName={userData?.fullName || (lang === 'ar' ? 'ولي الأمر' : 'Parent Guardian')}
        existingChildren={linkedChildren}
        lang={lang}
      />
    </div>
  );
}
