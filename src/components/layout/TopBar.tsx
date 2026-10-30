import React, { useState, useRef, useEffect } from 'react';
import { Bell, Globe, Cross, X, Sun, Moon, Calendar, BookOpen, Scroll, Check, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { PWAInstallButton } from './PWAInstallButton';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useLessons } from '../../context/LessonsContext';
import { Language } from '../../types';
import { LANGUAGE_OPTIONS } from '../../lib/i18n';
import { 
  getLiveNotificationsForUser, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  requestBrowserNotificationPermission,
  isBrowserNotificationEnabled,
  ChurchNotification 
} from '../../lib/notificationService';

interface TopBarProps {
  lang: Language;
  setLang: (l: Language) => void;
  onHomeClick?: () => void;
  onNavigate?: (tab: string) => void;
  activeTab?: string;
}

export function TopBar({ 
  lang, 
  setLang,
  onHomeClick,
  onNavigate,
  activeTab
}: TopBarProps) {
  const { userData } = useAuth();
  const { lessons } = useLessons();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();
  const reduceMotion = useReducedMotion();

  // Real dynamic notifications
  const [notifications, setNotifications] = useState<ChurchNotification[]>([]);
  const [browserNotifActive, setBrowserNotifActive] = useState<boolean>(() => isBrowserNotificationEnabled());

  const refreshNotifications = React.useCallback(async () => {
    const list = await getLiveNotificationsForUser(userData, lessons || []);
    setNotifications(list);
  }, [userData, lessons]);

  useEffect(() => {
    refreshNotifications();
    const handleUpdate = () => refreshNotifications();
    window.addEventListener('church_notifications_updated', handleUpdate);
    return () => window.removeEventListener('church_notifications_updated', handleUpdate);
  }, [refreshNotifications]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setShowLangMenu(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setShowLangMenu(false);
        setShowNotifs(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const churchNameDisplay = lang === 'ar' ? 'كنيسة الأنبا موسى' : 'St. Musa Church';

  const handleNotificationClick = (notif: ChurchNotification) => {
    markNotificationAsRead(notif.id);
    if (notif.actionTab && onNavigate) {
      onNavigate(notif.actionTab);
    }
    setShowNotifs(false);
  };

  const handleMarkAllRead = () => {
    markAllNotificationsAsRead(notifications.map(n => n.id));
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleToggleBrowserNotif = async () => {
    const granted = await requestBrowserNotificationPermission();
    setBrowserNotifActive(granted);
  };

  return (
    <header className="app-topbar sticky top-0 z-50 border-b shadow-md">
      <div className="max-w-7xl mx-auto flex justify-between items-center p-2.5 sm:p-4 px-2 sm:px-4 gap-2">
        
        {/* Church Brand */}
        <button
          type="button"
          onClick={onHomeClick}
          aria-label={lang === 'ar' ? 'العودة للرئيسية' : 'Go to home'}
          className="flex items-center gap-2 rounded-lg text-start font-bold text-base sm:text-lg cursor-pointer shrink-0 hover:opacity-90 transition-opacity"
        >
          <Cross size={22} fill="currentColor" className="text-[var(--color-church-gold)] shrink-0" />
          <span>{churchNameDisplay}</span>
        </button>

        {/* Center Quick Navigation (Calendar, Agpeya) - Desktop View. Hymns School is now integrated into Lessons. */}
        {onNavigate && (
          <nav aria-label={lang === 'ar' ? 'روابط سريعة' : 'Quick links'} className="app-topbar-quick-nav hidden md:flex items-center gap-1.5 p-1 rounded-2xl border shadow-xs">
            <button
              type="button"
              onClick={() => onNavigate('calendar')}
              aria-current={activeTab === 'calendar' ? 'page' : undefined}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'calendar'
                  ? 'app-topbar-quick-active shadow-xs font-black'
                  : 'app-topbar-quick-idle'
              }`}
            >
              <Calendar size={15} />
              <span>{lang === 'ar' ? 'التقويم والسنكسار' : 'Coptic Calendar'}</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('agpeya')}
              aria-current={activeTab === 'agpeya' ? 'page' : undefined}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'agpeya'
                  ? 'app-topbar-quick-active shadow-xs font-black'
                  : 'app-topbar-quick-idle'
              }`}
            >
              <BookOpen size={15} />
              <span>{lang === 'ar' ? 'صلوات الأجبية' : 'Daily Agpeya'}</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('taxis')}
              aria-current={activeTab === 'taxis' ? 'page' : undefined}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'taxis'
                  ? 'app-topbar-quick-active shadow-xs font-black'
                  : 'app-topbar-quick-idle'
              }`}
            >
              <Scroll size={15} />
              <span>{lang === 'ar' ? 'طقوس الكنيسة' : 'Coptic Taxis'}</span>
            </button>
          </nav>
        )}

        {/* Right Controls: Theme Toggle, Language, Notifications, PWA */}
        <div className="flex gap-1.5 sm:gap-2.5 items-center">
          {/* Dark / Light Church Aesthetic Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark'
              ? (lang === 'ar' ? 'التبديل للوضع الفاتح' : 'Switch to light mode')
              : (lang === 'ar' ? 'التبديل للوضع الداكن' : 'Switch to dark mode')}
            aria-pressed={theme === 'dark'}
            title={theme === 'dark' ? (lang === 'ar' ? 'الوضع النهاري الكنسي' : 'Light Church Theme') : (lang === 'ar' ? 'الوضع الليلي الهادئ' : 'Dark Church Theme')}
            className="rounded-xl border border-white/20 bg-white/10 p-2 text-amber-200 transition-colors hover:bg-white/20 hover:text-white"
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          <PWAInstallButton />
          
          {/* Language Switcher Popover (Arabic & English Only) */}
          <div className="relative" ref={langMenuRef}>
            <button 
              type="button"
              onClick={() => setShowLangMenu(!showLangMenu)} 
              aria-expanded={showLangMenu}
              aria-haspopup="true"
              aria-controls="language-menu"
              aria-label={lang === 'ar' ? 'اختيار اللغة' : 'Choose language'}
              className="flex items-center gap-1.5 text-xs sm:text-sm bg-white/20 hover:bg-white/30 px-2.5 sm:px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer border border-white/15 shadow-xs"
              title="Language / اللغة"
            >
              <Globe size={15} className="text-[var(--color-church-gold-light)]" /> 
              <span className="tracking-wide">
                {lang === 'ar' ? '🇪🇬 عربي' : '🌐 English'}
              </span>
            </button>

            <AnimatePresence>
              {showLangMenu && (
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: reduceMotion ? 0 : 0.15 }}
                  role="group"
                  aria-label={lang === 'ar' ? 'اختيار اللغة' : 'Language options'}
                  id="language-menu"
                  className="absolute end-0 mt-2 w-64 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-overlay)] p-2 text-[var(--text-primary)] shadow-2xl z-50 overflow-hidden"
                >
                  <div className="px-3 py-2 border-b border-[var(--border-stone)]/50">
                    <p className="text-[11px] font-extrabold text-[var(--brand-burgundy)] dark:text-[var(--brand-gold)] uppercase tracking-wider flex items-center gap-1.5">
                      <Globe size={12} />
                      <span>{lang === 'ar' ? 'اختر اللغة' : 'Select Language'}</span>
                    </p>
                  </div>

                  <div className="py-1 space-y-1">
                    {LANGUAGE_OPTIONS.map((opt) => {
                      const isSelected = lang === opt.code;
                      return (
                        <button
                          type="button"
                          key={opt.code}
                          onClick={() => {
                            setLang(opt.code);
                            setShowLangMenu(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer text-start ${
                            isSelected
                              ? 'bg-[var(--state-selected)] text-[var(--action-primary)] font-bold shadow-xs'
                              : 'hover:bg-[var(--state-hover)] text-[var(--text-primary)]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-base">{opt.flagSymbol}</span>
                            <div>
                              <p className="font-bold text-xs">{opt.label}</p>
                              <p className={`text-[10px] ${isSelected ? 'text-[var(--text-secondary)]' : 'text-[var(--color-neutral)]'}`}>
                                {opt.churchDialect}
                              </p>
                            </div>
                          </div>
                          {isSelected && (
                            <Check size={14} className="text-[var(--brand-gold)] shrink-0 font-black" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Real Authorized In-App & Browser Notifications */}
          <div className="relative" ref={notifMenuRef}>
            <button 
              type="button"
              onClick={() => setShowNotifs(!showNotifs)} 
              aria-expanded={showNotifs}
              aria-haspopup="true"
              aria-controls="church-notifications"
              aria-label={lang === 'ar' ? `الإشعارات الكنسية، ${unreadCount} غير مقروءة` : `Church notifications, ${unreadCount} unread`}
              className="relative rounded-xl p-2 text-[var(--navigation-text)] transition-colors hover:bg-white/15 hover:text-[var(--color-church-gold-light)]"
              title={lang === 'ar' ? 'الإشعارات الكنسية' : 'Church Notifications'}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 end-0.5 bg-[var(--color-church-gold)] text-[var(--color-church-blue)] text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showNotifs && (
                <motion.div 
                  initial={reduceMotion ? false : { opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={reduceMotion ? { duration: 0 } : { type: 'spring', bounce: 0.4 }}
                  role="region"
                  id="church-notifications"
                  aria-label={lang === 'ar' ? 'الإشعارات الكنسية' : 'Church notifications'}
                  className="absolute end-0 origin-top-end mt-3 w-80 max-w-[90vw] rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-2 text-[var(--text-primary)] shadow-2xl z-50 overflow-hidden text-start"
                >
                  <div className="p-3 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-[var(--color-church-blue)] dark:text-amber-200">
                        {lang === 'ar' ? 'الإشعارات الكنسية' : 'Church Notifications'}
                      </span>
                      {unreadCount > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--mousa-gold)] text-[var(--mousa-teal-deep)] font-black">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          className="text-[11px] text-[var(--mousa-coral-dark)] dark:text-[var(--mousa-gold)] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                          title={lang === 'ar' ? 'تحديد الكل كمقروء' : 'Mark all read'}
                        >
                          <CheckCheck size={13} />
                          <span>{lang === 'ar' ? 'قراءة الكل' : 'Mark all'}</span>
                        </button>
                      )}
                      <button 
                        type="button"
                        onClick={() => setShowNotifs(false)} 
                        className="text-gray-400 hover:text-[var(--color-church-burgundy)] bg-gray-50 dark:bg-slate-800 rounded-full p-1 cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Browser notification permission request toggle */}
                  {'Notification' in window && (
                    <div className="px-3 py-2 bg-amber-50/70 dark:bg-amber-950/30 border-b border-amber-200/50 dark:border-amber-900/50 flex items-center justify-between text-[11px]">
                      <span className="text-amber-900 dark:text-amber-200 font-bold">
                        {lang === 'ar' ? 'إشعارات المتصفح الفورية:' : 'Browser Push:'}
                      </span>
                      <button
                        type="button"
                        onClick={handleToggleBrowserNotif}
                        className={`px-2.5 py-0.5 rounded-full font-bold cursor-pointer transition-all ${
                          browserNotifActive
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                            : 'bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-white'
                        }`}
                      >
                        {browserNotifActive 
                          ? (lang === 'ar' ? 'مفعّلة ✅' : 'Active ✅') 
                          : (lang === 'ar' ? 'تفعيل الآن 🔔' : 'Enable 🔔')}
                      </button>
                    </div>
                  )}

                  <div className="max-h-80 overflow-y-auto divide-y divide-gray-50 dark:divide-slate-800/80">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-gray-500 dark:text-gray-400 space-y-1">
                        <span className="text-2xl block mb-1">🕊️</span>
                        <p className="font-bold">{lang === 'ar' ? 'لا توجد إشعارات جديدة حالياً' : 'No new notifications'}</p>
                        <p className="text-[11px]">{lang === 'ar' ? 'أنت على اطلاع دائم بجميع أنشطة كنيستك.' : 'You are all caught up.'}</p>
                      </div>
                    ) : (
                      notifications.map(notif => (
                        <button 
                          type="button"
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          aria-label={`${lang === 'ar' ? notif.titleAr : notif.titleEn}. ${lang === 'ar' ? notif.bodyAr : notif.bodyEn}`}
                          className={`p-3 text-xs flex gap-3 items-start transition-colors cursor-pointer ${
                            notif.isRead
                              ? 'text-[var(--text-secondary)] hover:bg-[var(--state-hover)]'
                              : 'bg-[var(--state-selected)] hover:bg-[var(--state-hover)] font-semibold'
                          }`}
                        >
                          <span className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-base shrink-0 shadow-2xs">
                            {notif.icon}
                          </span>
                          <div className="flex-1 space-y-0.5">
                            <div className="flex items-center justify-between gap-1">
                              <p className="font-bold text-[var(--color-church-blue)] dark:text-amber-200">
                                {lang === 'ar' ? notif.titleAr : notif.titleEn}
                              </p>
                              {!notif.isRead && (
                                <span className="w-2 h-2 rounded-full bg-[var(--mousa-coral)] shrink-0" />
                              )}
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 text-[11px] leading-relaxed">
                              {lang === 'ar' ? notif.bodyAr : notif.bodyEn}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Mobile Top Bar Quick Sub-row for Calendar & Agpeya */}
      {onNavigate && (
        <nav aria-label={lang === 'ar' ? 'روابط سريعة' : 'Quick links'} className="app-topbar-mobile-quick md:hidden flex items-center justify-around px-2 py-1.5 border-t text-xs font-bold overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => onNavigate('calendar')}
            aria-current={activeTab === 'calendar' ? 'page' : undefined}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl transition-all cursor-pointer shrink-0 ${
              activeTab === 'calendar'
                ? 'app-topbar-quick-active shadow-xs font-black'
                : 'app-topbar-quick-idle'
            }`}
          >
            <Calendar size={13} />
            <span>{lang === 'ar' ? 'التقويم والسنكسار' : 'Calendar'}</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('agpeya')}
            aria-current={activeTab === 'agpeya' ? 'page' : undefined}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl transition-all cursor-pointer shrink-0 ${
              activeTab === 'agpeya'
                ? 'app-topbar-quick-active shadow-xs font-black'
                : 'app-topbar-quick-idle'
            }`}
          >
            <BookOpen size={13} />
            <span>{lang === 'ar' ? 'الأجبية' : 'Agpeya'}</span>
          </button>
        </nav>
      )}
    </header>
  );
}
