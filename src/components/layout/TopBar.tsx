import React, { useState, useRef, useEffect } from 'react';
import { Award, Bell, Flame, X, Sun, Moon, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { PWAInstallButton } from './PWAInstallButton';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useActiveWorkspace } from '../../context/WorkspaceContext';
import { useLessons } from '../../context/LessonsContext';
import { Language } from '../../types';
import type { Role } from '../../types';
import type { Workspace } from '../../lib/workspaces';
import { getWorkspacePageLabel } from './workspaceNavigation';
import { shouldShowStudentProgress } from '../../lib/progressDisplay';
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
  onHomeClick?: () => void;
  onNavigate?: (tab: string) => void;
  activeTab?: string;
  workspace?: Workspace;
  onWorkspaceChange?: (workspace: Workspace) => void;
}

export function TopBar({ 
  lang, 
  onHomeClick,
  onNavigate,
  activeTab,
  workspace,
  onWorkspaceChange
}: TopBarProps) {
  const { userData } = useAuth();
  const activeWorkspace = useActiveWorkspace();
  const { lessons } = useLessons();
  const [showNotifs, setShowNotifs] = useState(false);
  const notifMenuRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();
  const reduceMotion = useReducedMotion();

  // Real dynamic notifications
  const [notifications, setNotifications] = useState<ChurchNotification[]>([]);
  const [browserNotifActive, setBrowserNotifActive] = useState<boolean>(() => isBrowserNotificationEnabled());

  // Notification generation only uses account identity, assigned roles, and streak.
  // Keep the callback stable while AuthContext updates screenTimeSeconds every 10 seconds.
  const notificationUser = React.useMemo(() => userData, [
    userData?.id,
    userData?.roles,
    userData?.currentStreak
  ]);

  const refreshNotifications = React.useCallback(async () => {
    const list = await getLiveNotificationsForUser(notificationUser, lessons || [], activeWorkspace);
    setNotifications(list);
  }, [notificationUser, lessons, activeWorkspace]);

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
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
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

  const churchNameDisplay = lang === 'ar' ? 'كنيسة الأنبا موسى' : 'Anba Moussa';
  const workspaceLabels: Record<Role, string> = lang === 'ar'
    ? { student: 'مساحة التلميذ', parent: 'مساحة ولي الأمر', teacher: 'مساحة الخادم', admin: 'مساحة الإدارة' }
    : { student: 'Student workspace', parent: 'Parent workspace', teacher: 'Servant workspace', admin: 'Admin workspace' };
  const availableWorkspaces = userData?.roles || [];
  const showStudentProgress = shouldShowStudentProgress({
    workspace,
    activeTab,
    roles: userData?.roles || [],
    progressKnown: userData?.progressKnown
  });

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
          aria-label={lang === 'ar' ? 'ارجع للرئيسية' : 'Go to home'}
          className="flex items-center gap-2 rounded-lg text-start font-bold text-base sm:text-lg cursor-pointer shrink-0 hover:opacity-90 transition-opacity"
        >
          <img src="/icon.svg" alt="" aria-hidden="true" className="h-9 w-9 rounded-xl border border-[var(--color-church-gold)]/60 object-cover shadow-sm shrink-0" />
          <span>{churchNameDisplay}</span>
        </button>

        {workspace && activeTab && (
          <div className="hidden min-w-0 flex-1 px-3 md:block" aria-live="polite">
            <p className="truncate text-sm font-black text-[var(--navigation-text)]">
              {getWorkspacePageLabel(workspace, activeTab, lang)}
            </p>
          </div>
        )}

        {/* Right Controls: student progress, theme, notifications, and PWA */}
        <div className="flex gap-1.5 sm:gap-2.5 items-center">
          {availableWorkspaces.length > 1 && workspace && onWorkspaceChange && (
            <label className="sr-only" htmlFor="workspace-selector">
              {lang === 'ar' ? 'بدّل مساحة العمل' : 'Switch workspace'}
            </label>
          )}
          {showStudentProgress && userData && (
            <div className="hidden items-center gap-1.5 sm:flex" aria-label={lang === 'ar' ? 'تقدمك' : 'Your progress'}>
              <span className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-[11px] font-black text-amber-100" aria-label={lang === 'ar' ? `${userData.points} نقطة` : `${userData.points} points`}>
                <Award size={14} />{userData.points}
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-[11px] font-black text-orange-100" aria-label={lang === 'ar' ? `${userData.currentStreak} يوم متواصل` : `${userData.currentStreak} day streak`}>
                <Flame size={14} />{userData.currentStreak}
              </span>
            </div>
          )}
          {availableWorkspaces.length > 1 && workspace && onWorkspaceChange && (
            <select
              id="workspace-selector"
              aria-label={lang === 'ar' ? 'بدّل مساحة العمل' : 'Switch workspace'}
              value={workspace}
              onChange={event => onWorkspaceChange(event.target.value as Workspace)}
              className="max-w-[9rem] sm:max-w-none rounded-xl border border-white/20 bg-white/10 px-2 py-2 text-xs font-bold text-white"
            >
              {availableWorkspaces.map(role => (
                <option key={role} value={role} className="text-slate-900">{workspaceLabels[role]}</option>
              ))}
            </select>
          )}
          {/* Dark / Light Church Aesthetic Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark'
              ? (lang === 'ar' ? 'حوّل للوضع الفاتح' : 'Switch to light mode')
              : (lang === 'ar' ? 'حوّل للوضع الداكن' : 'Switch to dark mode')}
            aria-pressed={theme === 'dark'}
            title={theme === 'dark' ? (lang === 'ar' ? 'الوضع النهاري' : 'Light Church Theme') : (lang === 'ar' ? 'الوضع الليلي' : 'Dark Church Theme')}
            className="rounded-xl border border-white/20 bg-white/10 p-2 text-amber-200 transition-colors hover:bg-white/20 hover:text-white"
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          <PWAInstallButton />

          {/* Real Authorized In-App & Browser Notifications */}
          <div className="relative" ref={notifMenuRef}>
            <button 
              type="button"
              onClick={() => setShowNotifs(!showNotifs)} 
              aria-expanded={showNotifs}
              aria-haspopup="true"
              aria-controls="church-notifications"
              aria-label={lang === 'ar' ? `إشعارات الكنيسة، ${unreadCount} غير مقروءة` : `Church notifications, ${unreadCount} unread`}
              className="relative rounded-xl p-2 text-[var(--navigation-text)] transition-colors hover:bg-white/15 hover:text-[var(--color-church-gold-light)]"
              title={lang === 'ar' ? 'إشعارات الكنيسة' : 'Church Notifications'}
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
                  aria-label={lang === 'ar' ? 'إشعارات الكنيسة' : 'Church notifications'}
                  className="absolute end-0 origin-top-end mt-3 w-80 max-w-[90vw] rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-2 text-[var(--text-primary)] shadow-2xl z-50 overflow-hidden text-start"
                >
                  <div className="p-3 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-[var(--color-church-blue)] dark:text-amber-200">
                        {lang === 'ar' ? 'إشعارات الكنيسة' : 'Church Notifications'}
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
                          title={lang === 'ar' ? 'علّم الكل كمقروء' : 'Mark all read'}
                        >
                          <CheckCheck size={13} />
                          <span>{lang === 'ar' ? 'علّم الكل كمقروء' : 'Mark all'}</span>
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
                        {lang === 'ar' ? 'تنبيهات المتصفح:' : 'Browser Push:'}
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
                          ? (lang === 'ar' ? 'شغالة ✅' : 'Active ✅') 
                          : (lang === 'ar' ? 'فعّل دلوقتي 🔔' : 'Enable 🔔')}
                      </button>
                    </div>
                  )}

                  <div className="max-h-80 overflow-y-auto divide-y divide-gray-50 dark:divide-slate-800/80">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-gray-500 dark:text-gray-400 space-y-1">
                        <span className="text-2xl block mb-1">🕊️</span>
                        <p className="font-bold">{lang === 'ar' ? 'مفيش إشعارات جديدة دلوقتي' : 'No new notifications'}</p>
                        <p className="text-[11px]">{lang === 'ar' ? 'كده إنت متابع كل جديد في كنيستك.' : 'You are all caught up.'}</p>
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

    </header>
  );
}
