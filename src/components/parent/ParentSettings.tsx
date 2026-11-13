import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  BellRing, 
  BellOff, 
  BookOpen, 
  Calendar, 
  Shield, 
  Sparkles, 
  Check, 
  AlertCircle, 
  Smartphone, 
  Send, 
  CheckCircle2,
  Volume2
} from 'lucide-react';

interface ParentSettingsProps {
  lang: 'en' | 'ar';
  // Reward approval
  requireApproval: boolean;
  onToggleApproval: () => void;
  // Push notification preferences
  pushNotificationsEnabled: boolean;
  onTogglePushNotifications: () => void;
  notifyLessonCompletion: boolean;
  onToggleLessonCompletion: () => void;
  notifyEventReminders: boolean;
  onToggleEventReminders: () => void;
  // Test notification triggers
  onSendTestNotification: (type: 'lesson' | 'event') => void;
  permissionStatus?: 'granted' | 'denied' | 'default' | 'unsupported';
}

export function ParentSettings({
  lang,
  requireApproval,
  onToggleApproval,
  pushNotificationsEnabled,
  onTogglePushNotifications,
  notifyLessonCompletion,
  onToggleLessonCompletion,
  notifyEventReminders,
  onToggleEventReminders,
  onSendTestNotification,
  permissionStatus = 'default'
}: ParentSettingsProps) {
  const [testSent, setTestSent] = useState<'lesson' | 'event' | null>(null);

  const handleTest = (type: 'lesson' | 'event') => {
    onSendTestNotification(type);
    setTestSent(type);
    setTimeout(() => setTestSent(null), 3000);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* 1. Real-Time Push Notifications Master Box */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-[var(--color-church-cream-dark)]"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
          <div className="flex items-start sm:items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
              pushNotificationsEnabled 
                ? 'bg-blue-50 text-[var(--color-church-blue)]' 
                : 'bg-gray-100 text-gray-400'
            }`}>
              {pushNotificationsEnabled ? <BellRing size={22} className="animate-bounce" /> : <BellOff size={22} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-bold text-[var(--color-church-blue)]">
                  {lang === 'ar' ? 'التنبيهات الفورية (Push Notifications)' : 'Real-Time Push Notifications'}
                </h2>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  pushNotificationsEnabled 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-gray-100 text-gray-500 border-gray-200'
                }`}>
                  {pushNotificationsEnabled 
                    ? (lang === 'ar' ? 'مفعّلة الآن ✓' : 'Enabled ✓') 
                    : (lang === 'ar' ? 'متوقفة ✕' : 'Disabled ✕')}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                {lang === 'ar' 
                  ? 'استلم تنبيهات فورية مباشرة على جهازك عند إتمام الأطفال للدروس وتذكيرات فعاليات الكنيسة' 
                  : 'Receive instant real-time alerts on your device for children lesson reports and church event reminders'}
              </p>
            </div>
          </div>

          {/* Master Toggle Switch */}
          <div className="flex items-center gap-3 self-end sm:self-center">
            <span className="text-xs font-bold text-gray-600 hidden sm:inline">
              {pushNotificationsEnabled 
                ? (lang === 'ar' ? 'التنبيهات نشطة' : 'Push Alerts On') 
                : (lang === 'ar' ? 'التنبيهات معطلة' : 'Push Alerts Off')}
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                id="push-notifications-master-toggle"
                type="checkbox" 
                className="sr-only peer" 
                checked={pushNotificationsEnabled}
                onChange={onTogglePushNotifications}
              />
              <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[var(--color-church-blue)]"></div>
            </label>
          </div>
        </div>

        {/* Sub-Toggles: Detailed Notification Categories */}
        <div className="pt-6 space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
            {lang === 'ar' ? 'تخصيص قنوات التنبيه الفورية:' : 'Customize Notification Channels:'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Toggle Category 1: Lesson Completion Reports */}
            <div className={`p-4 rounded-2xl border transition-all ${
              pushNotificationsEnabled && notifyLessonCompletion
                ? 'bg-blue-50/40 border-blue-200' 
                : 'bg-gray-50/60 border-gray-200 opacity-75'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-2xs border border-gray-100 flex items-center justify-center text-[var(--color-church-blue)] shrink-0">
                    <BookOpen size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[var(--color-church-blue)]">
                      {lang === 'ar' ? 'تقارير إتمام الدروس الجديدة' : 'New Lesson Completion Reports'}
                    </h4>
                    <p className="text-xs text-gray-500 font-medium mt-1 leading-relaxed">
                      {lang === 'ar' 
                        ? 'إشعار فوري لحظة إنهاء الطفل لدرس مدارس الأحد، تسليم مسابقة الكتاب المقدس، أو حفظ آية الأسبوع' 
                        : 'Instant alert when a child completes a lesson, finishes a quiz, or recites Scripture memory verses.'}
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input 
                    id="notify-lesson-completion-toggle"
                    type="checkbox" 
                    className="sr-only peer" 
                    disabled={!pushNotificationsEnabled}
                    checked={pushNotificationsEnabled && notifyLessonCompletion}
                    onChange={onToggleLessonCompletion}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-church-blue)] peer-disabled:opacity-50"></div>
                </label>
              </div>
            </div>

            {/* Toggle Category 2: Church Event Reminders */}
            <div className={`p-4 rounded-2xl border transition-all ${
              pushNotificationsEnabled && notifyEventReminders
                ? 'bg-amber-50/40 border-amber-200' 
                : 'bg-gray-50/60 border-gray-200 opacity-75'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-2xs border border-gray-100 flex items-center justify-center text-[var(--color-church-gold-dark)] shrink-0">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[var(--color-church-blue)]">
                      {lang === 'ar' ? 'تذكيرات فعاليات الكنيسة والقداسات' : 'Church Event & Liturgy Reminders'}
                    </h4>
                    <p className="text-xs text-gray-500 font-medium mt-1 leading-relaxed">
                      {lang === 'ar' 
                        ? 'تنبيهات مسبقة بمواعيد القداسات الإلهية، الأعياد الكنسية، رحلات مدارس الأحد، واجتماعات أولياء الأمور' 
                        : 'Timely reminders before upcoming Divine Liturgies, feasts, retreats, and parent fellowship meetings.'}
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input 
                    id="notify-event-reminders-toggle"
                    type="checkbox" 
                    className="sr-only peer" 
                    disabled={!pushNotificationsEnabled}
                    checked={pushNotificationsEnabled && notifyEventReminders}
                    onChange={onToggleEventReminders}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-church-gold-dark)] peer-disabled:opacity-50"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Live Simulation & Test Controls */}
        <div className="mt-6 pt-6 border-t border-gray-100 bg-gray-50/80 -mx-6 md:-mx-8 -mb-6 md:-mb-8 p-6 md:p-8 rounded-b-3xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                <Sparkles size={16} className="text-[var(--color-church-gold)]" />
                <span>{lang === 'ar' ? 'تجربة فحص الإشعارات الفورية:' : 'Test Real-Time Notifications Live:'}</span>
              </h4>
              <p className="text-xs text-gray-500 mt-0.5">
                {lang === 'ar' 
                  ? 'اضغط لإرسال إشعار تجريبي مباشر لاختبار ظهور التنبيهات على شاشتك' 
                  : 'Click below to dispatch a simulated real-time push alert to preview the experience'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <button
                id="test-lesson-notification-btn"
                type="button"
                disabled={!pushNotificationsEnabled}
                onClick={() => handleTest('lesson')}
                className={`py-2 px-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs ${
                  pushNotificationsEnabled 
                    ? 'bg-white hover:bg-blue-50 text-[var(--color-church-blue)] border border-blue-200' 
                    : 'bg-gray-200 text-gray-400 border border-gray-200 cursor-not-allowed'
                }`}
              >
                {testSent === 'lesson' ? (
                  <>
                    <Check size={14} className="text-emerald-600" />
                    <span>{lang === 'ar' ? 'تم الإرسال بنجاح!' : 'Alert Dispatched!'}</span>
                  </>
                ) : (
                  <>
                    <BookOpen size={14} />
                    <span>{lang === 'ar' ? 'تجربة إشعار درس' : 'Test Lesson Alert'}</span>
                  </>
                )}
              </button>

              <button
                id="test-event-notification-btn"
                type="button"
                disabled={!pushNotificationsEnabled}
                onClick={() => handleTest('event')}
                className={`py-2 px-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs ${
                  pushNotificationsEnabled 
                    ? 'bg-white hover:bg-amber-50 text-[var(--color-church-gold-dark)] border border-amber-200' 
                    : 'bg-gray-200 text-gray-400 border border-gray-200 cursor-not-allowed'
                }`}
              >
                {testSent === 'event' ? (
                  <>
                    <Check size={14} className="text-emerald-600" />
                    <span>{lang === 'ar' ? 'تم الإرسال بنجاح!' : 'Alert Dispatched!'}</span>
                  </>
                ) : (
                  <>
                    <Calendar size={14} />
                    <span>{lang === 'ar' ? 'تجربة إشعار فعالية' : 'Test Event Alert'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 2. Parental Approval & Safety Policy Setting */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-[var(--color-church-cream-dark)]"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <Shield size={22} />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-[var(--color-church-blue)]">
                {lang === 'ar' ? 'نظام التحكم والموافقة الأبوية' : 'Parental Approval & Reward Safety'}
              </h2>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
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
                id="parental-approval-setting-toggle"
                type="checkbox" 
                className="sr-only peer" 
                checked={requireApproval}
                onChange={onToggleApproval}
              />
              <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-church-blue)]"></div>
            </label>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
