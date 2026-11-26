import React, { useState, useEffect, useLayoutEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { BottomNav } from './components/layout/BottomNav';
import { TopBar } from './components/layout/TopBar';
import { WorkspaceSidebar } from './components/layout/WorkspaceSidebar';
import { AnbaMousaSplashScreen } from './components/layout/AnbaMousaSplashScreen';
import { useAuth } from './context/AuthContext';
import { LessonsProvider } from './context/LessonsContext';
import { PointsProvider } from './context/PointsContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { Language } from './types';
import { getAccountSetupStatus } from './lib/onboardingService';
import { applyLanguagePreference, getLanguageDirection } from './lib/uiPreferences';
import { canAccessWorkspace, canAccessWorkspaceTab, hasRole, resolveWorkspace, type Workspace } from './lib/workspaces';
import { AchievementCelebrationHost } from './components/achievements/AchievementCelebrationHost';

// Keep the entry bundle focused on authentication and shared navigation.
// Role workspaces and feature tabs are downloaded only when the user opens them.
const LoginScreen = React.lazy(() => import('./components/auth/LoginScreen').then(module => ({ default: module.LoginScreen })));
const StudentWelcomeTour = React.lazy(() => import('./components/auth/StudentWelcomeTour').then(module => ({ default: module.StudentWelcomeTour })));
const RoleWelcomeJourney = React.lazy(() => import('./components/auth/RoleWelcomeJourney').then(module => ({ default: module.RoleWelcomeJourney })));
const PasswordRecoveryScreen = React.lazy(() => import('./components/auth/PasswordRecoveryScreen').then(module => ({ default: module.PasswordRecoveryScreen })));
const OfflineIndicator = React.lazy(() => import('./components/layout/OfflineIndicator').then(module => ({ default: module.OfflineIndicator })));
const AmbientWorld = React.lazy(() => import('./components/layout/AmbientWorld').then(module => ({ default: module.AmbientWorld })));
const GlobalMusicPlayer = React.lazy(() => import('./components/layout/GlobalMusicPlayer').then(module => ({ default: module.GlobalMusicPlayer })));

const HomeTab = React.lazy(() => import('./components/student/HomeTab').then(module => ({ default: module.HomeTab })));
const LessonsTab = React.lazy(() => import('./components/student/LessonsTab').then(module => ({ default: module.LessonsTab })));
const PointsTab = React.lazy(() => import('./components/student/PointsTab').then(module => ({ default: module.PointsTab })));
const FeedTab = React.lazy(() => import('./components/student/FeedTab').then(module => ({ default: module.FeedTab })));
const ProfileTab = React.lazy(() => import('./components/student/ProfileTab').then(module => ({ default: module.ProfileTab })));
const LessonView = React.lazy(() => import('./components/student/LessonView').then(module => ({ default: module.LessonView })));
const TeacherDashboard = React.lazy(() => import('./components/teacher/TeacherDashboard').then(module => ({ default: module.TeacherDashboard })));
const ParentDashboard = React.lazy(() => import('./components/parent/ParentDashboard').then(module => ({ default: module.ParentDashboard })));
const CopticCalendarTab = React.lazy(() => import('./components/coptic/CopticCalendarTab').then(module => ({ default: module.CopticCalendarTab })));
const HymnsSchoolTab = React.lazy(() => import('./components/hymns/HymnsSchoolTab').then(module => ({ default: module.HymnsSchoolTab })));
const CopticTaxisTab = React.lazy(() => import('./components/taxis/CopticTaxisTab').then(module => ({ default: module.CopticTaxisTab })));
const AgpeyaPrayerTab = React.lazy(() => import('./components/agpeya/AgpeyaPrayerTab').then(module => ({ default: module.AgpeyaPrayerTab })));
const StudentOnboardingModal = React.lazy(() => import('./components/auth/StudentOnboardingModal').then(module => ({ default: module.StudentOnboardingModal })));
const AdminWorkspace = React.lazy(() => import('./components/admin/AdminWorkspace').then(module => ({ default: module.AdminWorkspace })));
const RoleAccountProfile = React.lazy(() => import('./components/profile/RoleAccountProfile').then(module => ({ default: module.RoleAccountProfile })));
const AccountSetupWizard = React.lazy(() => import('./components/auth/AccountSetupWizard').then(module => ({ default: module.AccountSetupWizard })));

function WorkspaceLoadingFallback({ lang }: { lang: Language }) {
  return (
    <div role="status" aria-live="polite" className="mx-auto flex min-h-[35vh] w-full items-center justify-center gap-3 p-6 text-center text-[var(--text-ink)]">
      <span aria-hidden="true" className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-church-gold)] border-t-transparent" />
      <span>{lang === 'ar' ? 'بنجهّز الصفحة...' : 'Preparing this page...'}</span>
    </div>
  );
}


function AppContent() {
  const { userData, loading, logout, isGuest } = useAuth();
  const reduceMotion = useReducedMotion();
  const [tabTransitionTick, setTabTransitionTick] = useState(0);
  const [lang, setLangState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('church_app_lang');
      if (saved === 'ar' || saved === 'en' || saved === 'cop' || saved === 'copt') return saved;
    }
    return 'ar';
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('church_app_lang', newLang);
      applyLanguagePreference(document.documentElement, newLang);
    }
  };

  useLayoutEffect(() => {
    if (typeof window !== 'undefined') {
      applyLanguagePreference(document.documentElement, lang);
    }
  }, [lang]);

  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === 'undefined') return 'home';
    return new URLSearchParams(window.location.search).get('tab') || 'home';
  });
  const [sharedPostId] = useState<string | null>(() => typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('post'));
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('workspace') as Workspace | null;
  });
  const [navigationError, setNavigationError] = useState<string | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('lesson');
  });
  const historyRouteRef = React.useRef<string | null>(null);
  const [visitedStudentTabs, setVisitedStudentTabs] = useState<Set<string>>(() => new Set<string>(['home']));

  // Detect incoming child connect link (?connectChild=ST-4921)
  const [incomingChildCode, setIncomingChildCode] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && window.location?.search) {
      const params = new URLSearchParams(window.location.search);
      return params.get('connectChild') || params.get('linkCode') || params.get('code') || null;
    }
    return null;
  });

  // Account setup completion is stored server-side so it follows the user across devices.
  const [showStudentOnboardingModal, setShowStudentOnboardingModal] = useState<boolean>(false);
  const [showStudentWelcomeTour, setShowStudentWelcomeTour] = useState<boolean>(false);
  const [roleWelcomeJourney, setRoleWelcomeJourney] = useState<'teacher' | 'parent' | null>(null);
  const [accountSetupRole, setAccountSetupRole] = useState<'teacher' | 'parent' | 'admin' | null>(null);

  useEffect(() => {
    if (!userData || isGuest || !activeWorkspace || !['student', 'teacher', 'parent', 'admin'].includes(activeWorkspace)) {
      setShowStudentOnboardingModal(false);
      setAccountSetupRole(null);
      return;
    }
    let cancelled = false;
    const role = activeWorkspace as 'student' | 'teacher' | 'parent' | 'admin';
    getAccountSetupStatus().then(status => {
      if (cancelled) return;
      if (!status.success) {
        if (role === 'student') setShowStudentOnboardingModal(true);
        else setAccountSetupRole(role);
        return;
      }
      const completed = status.completedRoles.includes(role);
      if (role === 'student') {
        const dismissed = sessionStorage.getItem('dismissed_student_onboarding_' + userData.id) === 'true';
        setShowStudentOnboardingModal(!completed && !dismissed);
      } else {
        setAccountSetupRole(completed ? null : role);
      }
      if (completed) {
        localStorage.setItem('stella_' + role + '_account_setup_v1_' + userData.id, 'completed');
      } else {
        localStorage.removeItem('stella_' + role + '_account_setup_v1_' + userData.id);
      }
    }).catch(() => {
      if (cancelled) return;
      if (role === 'student') setShowStudentOnboardingModal(true);
      else setAccountSetupRole(role);
    });
    return () => { cancelled = true; };
  }, [userData?.id, isGuest, activeWorkspace]);

  React.useEffect(() => {
    if (!userData) return;
    const assigned = userData.roles;
    const requestedWorkspace = new URLSearchParams(window.location.search).get('workspace');
    const nextWorkspace = resolveWorkspace(assigned, activeWorkspace || requestedWorkspace);
    if (nextWorkspace !== activeWorkspace) setActiveWorkspace(nextWorkspace);
    if (!nextWorkspace) {
      setActiveTab('home');
      setActiveLessonId(null);
      return;
    }
    if (!canAccessWorkspaceTab(assigned, nextWorkspace, activeTab)) {
      setActiveTab('home');
      setActiveLessonId(null);
    }
  }, [userData?.id, userData?.roles, activeWorkspace, activeTab]);

  React.useEffect(() => {
    if (activeWorkspace !== 'student' || !canAccessWorkspaceTab(userData?.roles || [], activeWorkspace, activeTab)) return;
    setVisitedStudentTabs(previous => previous.has(activeTab) ? previous : new Set(previous).add(activeTab));
  }, [activeWorkspace, activeTab, userData?.roles]);

  // A deep child-connection link is handled inside the assigned parent workspace.
  React.useEffect(() => {
    if (incomingChildCode && userData && hasRole(userData, 'parent')) {
      setActiveWorkspace('parent');
      setActiveTab('family');
    }
  }, [incomingChildCode, userData?.id, userData?.roles]);

  useEffect(() => {
    if (!userData || !hasRole(userData, 'student') || activeWorkspace !== 'student' || !userData.grade || showStudentOnboardingModal) return;
    const key = 'stella_student_welcome_tour_v1_' + userData.id;
    if (localStorage.getItem(key) !== 'completed') setShowStudentWelcomeTour(true);
  }, [userData?.id, userData?.roles, userData?.grade, activeWorkspace, showStudentOnboardingModal]);

  React.useEffect(() => {
    const routeKeyFromLocation = () => `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const handlePopState = (event: PopStateEvent) => {
      const params = new URLSearchParams(window.location.search);
      const resolved = resolveWorkspace(userData?.roles || [], params.get('workspace'));
      const requestedTab = params.get('tab') || 'home';
      const safeTab = canAccessWorkspaceTab(userData?.roles || [], resolved, requestedTab) ? requestedTab : 'home';
      const lessonId = resolved === 'student' && safeTab === 'lessons' ? params.get('lesson') : null;
      historyRouteRef.current = routeKeyFromLocation();
      setActiveWorkspace(resolved);
      setActiveTab(safeTab);
      setActiveLessonId(lessonId);
      setNavigationError(null);

      // Keep one in-app history entry at the app root so Back cannot leave the
      // installed/web app accidentally. Internal destinations remain normal history steps.
      if (event.state?.anbaMousaAppRoot && !event.state?.anbaMousaAppGuard) {
        window.history.pushState(
          { anbaMousaApp: true, anbaMousaAppRoot: true, anbaMousaAppGuard: true, routeKey: routeKeyFromLocation() },
          '',
          routeKeyFromLocation()
        );
        historyRouteRef.current = routeKeyFromLocation();
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [userData?.roles]);

  React.useEffect(() => {
    if (!userData || !activeWorkspace || !canAccessWorkspace(userData.roles, activeWorkspace)) return;
    const params = new URLSearchParams(window.location.search);
    params.set('workspace', activeWorkspace);
    params.set('tab', activeTab);
    if (activeLessonId && activeWorkspace === 'student' && activeTab === 'lessons') params.set('lesson', activeLessonId);
    else params.delete('lesson');
    const query = params.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
    const routeKey = nextUrl;

    if (historyRouteRef.current === null) {
      historyRouteRef.current = routeKey;
      // Duplicate the app entry once: the lower entry is the safe root fallback.
      window.history.replaceState({ ...(window.history.state || {}), anbaMousaApp: true, anbaMousaAppRoot: true, routeKey }, '', nextUrl);
      window.history.pushState({ anbaMousaApp: true, anbaMousaAppRoot: true, anbaMousaAppGuard: true, routeKey }, '', nextUrl);
      return;
    }
    if (historyRouteRef.current !== routeKey) {
      window.history.pushState({ anbaMousaApp: true, routeKey }, '', nextUrl);
      historyRouteRef.current = routeKey;
    } else {
      window.history.replaceState({ ...(window.history.state || {}), anbaMousaApp: true, routeKey }, '', nextUrl);
    }
  }, [activeWorkspace, activeTab, activeLessonId, userData?.id, userData?.roles]);

  if (loading) {
    return <AnbaMousaSplashScreen lang={lang} />;
  }

  if (window.location.pathname === '/reset-password') {
    return (
      <React.Suspense fallback={<AnbaMousaSplashScreen lang={lang} />}>
        <PasswordRecoveryScreen lang={lang} />
      </React.Suspense>
    );
  }

  if (!userData) {
    return (
      <React.Suspense fallback={<AnbaMousaSplashScreen lang={lang} />}>
        <LoginScreen lang={lang} setLang={setLang} />
      </React.Suspense>
    );
  }

  const navigate = (tab: string, lessonId?: string) => {
    if (!canAccessWorkspaceTab(userData.roles, activeWorkspace, tab) || (lessonId && activeWorkspace !== 'student')) {
      setNavigationError(lang === 'ar' ? 'هذه الصفحة غير متاحة في مساحة العمل الحالية.' : 'This page is not available in the current workspace.');
      return;
    }
    setNavigationError(null);
    setTabTransitionTick(current => current + 1);
    setActiveTab(tab);
    if (activeWorkspace === 'student') {
      setVisitedStudentTabs(previous => previous.has(tab) ? previous : new Set(previous).add(tab));
    }
    if (lessonId) {
      setActiveLessonId(lessonId);
    } else {
      setActiveLessonId(null);
    }
  };

  const handleBackToHome = () => {
    setTabTransitionTick(current => current + 1);
    setActiveTab('home');
    setActiveLessonId(null);
  };

  const switchWorkspace = (nextWorkspace: Workspace) => {
    if (!canAccessWorkspace(userData.roles, nextWorkspace)) {
      setNavigationError(lang === 'ar' ? 'لا تملك صلاحية مساحة العمل المطلوبة.' : 'You are not assigned to that workspace.');
      return;
    }
    setNavigationError(null);
    setTabTransitionTick(current => current + 1);
    setActiveWorkspace(nextWorkspace);
    setActiveTab('home');
    setActiveLessonId(null);
  };

  // Render main content area
  const renderMainContent = () => {
    if (!activeWorkspace || !canAccessWorkspace(userData.roles, activeWorkspace)) return null;
    if (!canAccessWorkspaceTab(userData.roles, activeWorkspace, activeTab)) return null;

    if (activeWorkspace === 'admin') {
      if (activeTab === 'profile') {
        return <RoleAccountProfile role="admin" lang={lang} setLang={setLang} onNavigate={navigate} onLogout={handleLogout} />;
      }
      return <AdminWorkspace activeTab={activeTab} lang={lang} onNavigate={navigate} />;
    }
    if (activeWorkspace === 'parent') {
      if (activeTab === 'profile') {
        return <RoleAccountProfile role="parent" lang={lang} setLang={setLang} onNavigate={navigate} onLogout={handleLogout} />;
      }
      if (activeTab === 'feed') return <FeedTab lang={lang} initialPostId={sharedPostId} />;
      return (
        <ParentDashboard
          lang={lang}
          activeTab={activeTab}
          onNavigate={navigate}
          initialChildCode={incomingChildCode || undefined}
        />
      );
    }
    if (activeWorkspace === 'teacher') {
      if (activeTab === 'profile') {
        return <RoleAccountProfile role="teacher" lang={lang} setLang={setLang} onNavigate={navigate} onLogout={handleLogout} />;
      }
      if (activeTab === 'feed') return <FeedTab lang={lang} initialPostId={sharedPostId} />;
      return (
        <TeacherDashboard
          lang={lang}
          activeTab={activeTab}
          onNavigate={navigate}
        />
      );
    }

    const renderStudentTab = (tab: string) => {
      switch (tab) {
        case 'lessons':
          return <LessonsTab onStartLesson={id => navigate('lessons', id)} lang={lang} />;
        case 'calendar':
          return <CopticCalendarTab lang={lang} />;
        case 'hymns':
          return <HymnsSchoolTab lang={lang} />;
        case 'taxis':
          return <CopticTaxisTab lang={lang} />;
        case 'agpeya':
          return <AgpeyaPrayerTab lang={lang} />;
        case 'points':
          return <PointsTab lang={lang} />;
        case 'feed':
          return <FeedTab lang={lang} initialPostId={sharedPostId} />;
        case 'profile':
          return <ProfileTab onLogout={handleLogout} onNavigate={navigate} workspaceRole="student" lang={lang} setLang={setLang} />;
        default:
          return <HomeTab onNavigate={navigate} lang={lang} />;
      }
    };

    return (
      <>
        {Array.from(visitedStudentTabs).map((tab: string) => (
          <div key={tab} hidden={activeLessonId !== null || tab !== activeTab} aria-hidden={activeLessonId !== null || tab !== activeTab}>
            {renderStudentTab(tab)}
          </div>
        ))}
        {activeLessonId && (
          <LessonView
            lessonId={activeLessonId}
            onBack={() => {
              if (window.history.state?.anbaMousaApp && !window.history.state?.anbaMousaAppRoot) window.history.back();
              else setActiveLessonId(null);
            }}
            lang={lang}
          />
        )}
      </>
    );
  };

  const handleLogout = async () => {
    setActiveLessonId(null);
    setActiveTab('home');
    await logout();
  };

  if (userData.roles.length === 0 || !activeWorkspace) {
    return (
      <div dir={getLanguageDirection(lang)} className="min-h-screen flex items-center justify-center bg-[var(--color-church-cream)] p-6">
        <div className="max-w-md rounded-3xl border bg-white p-6 text-center shadow-xl">
          <h1 className="text-xl font-black">{lang === 'ar' ? 'لا توجد مساحة عمل متاحة' : 'No workspace available'}</h1>
          <p className="mt-3 text-sm text-slate-600">{lang === 'ar' ? 'تعذر التحقق من أدوار الحساب. أعد المحاولة أو سجّل الخروج.' : 'Assigned roles could not be verified. Retry or sign out.'}</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-5 rounded-xl bg-indigo-800 px-4 py-2 font-bold text-white">{lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}</button>
          <button type="button" onClick={() => void logout()} className="ms-2 mt-5 rounded-xl border px-4 py-2 font-bold">{lang === 'ar' ? 'تسجيل الخروج' : 'Sign out'}</button>
        </div>
      </div>
    );
  }

  return (
    <WorkspaceProvider value={activeWorkspace}>
    <LessonsProvider>
    <PointsProvider>
    <div 
      dir={getLanguageDirection(lang)}
      className="min-h-screen relative isolate bg-[var(--color-church-cream)] pb-safe overflow-x-clip selection:bg-[var(--color-church-gold)] selection:text-[var(--color-church-blue)]"
    >
      <React.Suspense fallback={null}>
        <AmbientWorld variant="app" />
        <GlobalMusicPlayer lang={lang} />
        <OfflineIndicator />
      </React.Suspense>
      <div className="relative z-10 min-h-screen">
      <TopBar 
        lang={lang} 
        onHomeClick={handleBackToHome}
        onNavigate={navigate}
        activeTab={activeTab}
        workspace={activeWorkspace}
        onWorkspaceChange={switchWorkspace}
      />
      <div className="flex min-h-[calc(100dvh-4rem)] items-start">
      {!activeLessonId && (
        <WorkspaceSidebar
          workspace={activeWorkspace}
          activeTab={activeTab}
          lang={lang}
          onNavigate={tab => navigate(tab)}
        />
      )}
      <div className="min-w-0 flex-1">
      
      {/* Incoming Child Link Alert Banner */}
      {incomingChildCode && hasRole(userData, 'parent') && activeWorkspace === 'parent' && activeTab !== 'family' && (
        <div className="bg-gradient-to-r from-[var(--color-church-blue)] to-[var(--color-church-burgundy)] text-white px-4 py-2.5 shadow-md flex items-center justify-between text-xs sm:text-sm font-semibold relative z-30">
          <div className="flex items-center gap-2">
            <span className="text-base">🔗</span>
            <span>
              {lang === 'copt'
                ? `Ⲁⲩⲟⲩⲱⲣⲡ ⲛⲁⲕ ⲛ̀ⲟⲩⲥⲱⲛⲧ ⲛ̀ⲁⲗⲟⲩ (${incomingChildCode})`
                : lang === 'ar' 
                  ? `وصلك رابط ربط لطفل برمز سري (${incomingChildCode})` 
                  : `Child invite link detected (${incomingChildCode})`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('family')}
              className="bg-[var(--color-church-gold)] hover:brightness-110 text-[var(--color-church-blue)] font-black px-3 py-1 rounded-lg text-xs transition-colors cursor-pointer shadow-xs"
            >
              {lang === 'copt' ? 'Ⲥⲱⲛⲧ ⲉ̀ⲡⲓⲏⲓ' : lang === 'ar' ? 'ربط بحسابي الآن' : 'Connect to Family'}
            </button>
            <button
              onClick={() => setIncomingChildCode(null)}
              className="p-1 hover:bg-white/20 rounded-md text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Student Pending Activation / Sunday School Grade Alert Banner */}
      {activeWorkspace === 'student' && hasRole(userData, 'student') && (!userData?.grade || userData?.activationStatus === 'PENDING_APPROVAL') && (
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-4 py-2.5 shadow-md flex items-center justify-between text-xs sm:text-sm font-semibold sticky top-14 z-30">
          <div className="flex items-center gap-2">
            <span className="text-base">⏳</span>
            <span>
              {lang === 'ar'
                ? `طلب تفعيل حسابك لمدارس الأحد قيد الاعتماد اليدوي (${userData.requestedGrade || userData.grade || 'لم يُحدد الصف'})`
                : `Sunday School activation pending manual approval (${userData.requestedGrade || userData.grade || 'Grade not selected'})`}
            </span>
          </div>
          <span className="rounded-lg bg-amber-300/20 px-3 py-1 text-xs font-bold text-white">
            {lang === 'ar' ? 'راجع ملفك الشخصي لإدارة بيانات الصف' : 'Manage grade requests from Edit Profile'}
          </span>
        </div>
      )}
      
      {/* Container for responsive layout */}
      <div className="mx-auto w-full min-w-0 px-2 md:px-4 md:pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-8">
        {navigationError && <p role="alert" className="mx-auto my-2 max-w-3xl rounded-xl bg-amber-50 p-3 text-center text-sm font-bold text-amber-900">{navigationError}</p>}
        <motion.div
          initial={false}
          animate={reduceMotion
            ? { opacity: 1, y: 0, scale: 1 }
            : {
                opacity: [0.9, 1],
                y: [tabTransitionTick % 2 === 0 ? 18 : -18, 0],
                scale: [0.985, 1]
              }}
          transition={reduceMotion
            ? { duration: 0 }
            : { type: 'spring', stiffness: 280, damping: 28, mass: 0.72 }}
          className="min-w-0"
        >
          <React.Suspense fallback={<WorkspaceLoadingFallback lang={lang} />}>
            {renderMainContent()}
          </React.Suspense>
        </motion.div>
      </div>
      </div>
      </div>

      {showStudentWelcomeTour && activeWorkspace === 'student' && (
        <React.Suspense fallback={null}>
          <StudentWelcomeTour
            lang={lang}
            onClose={() => {
              setShowStudentWelcomeTour(false);
              if (userData?.id) localStorage.setItem('stella_student_welcome_tour_v1_' + userData.id, 'completed');
            }}
          />
        </React.Suspense>
      )}

      {roleWelcomeJourney && activeWorkspace === roleWelcomeJourney && (
        <React.Suspense fallback={null}>
          <RoleWelcomeJourney
            role={roleWelcomeJourney}
            lang={lang}
            onNavigate={navigate}
            onClose={() => {
              const key = 'stella_' + roleWelcomeJourney + '_welcome_v1_' + userData.id;
              localStorage.setItem(key, 'completed');
              setRoleWelcomeJourney(null);
            }}
          />
        </React.Suspense>
      )}

      {/* Student First-Login & Onboarding Modal */}
      <React.Suspense fallback={null}>
      {showStudentOnboardingModal && (
        <StudentOnboardingModal
          isOpen={showStudentOnboardingModal}
          onClose={() => {
            setShowStudentOnboardingModal(false);
            if (userData?.id) {
              sessionStorage.setItem('dismissed_student_onboarding_' + userData.id, 'true');
            }
          }}
          lang={lang}
          onSuccess={() => {
            setShowStudentOnboardingModal(false);
            if (userData?.id) {
              localStorage.setItem('stella_student_account_setup_v1_' + userData.id, 'completed');
              sessionStorage.setItem('dismissed_student_onboarding_' + userData.id, 'true');
            }
          }}
        />
      )}
      </React.Suspense>

      {accountSetupRole && activeWorkspace === accountSetupRole && (
        <React.Suspense fallback={null}>
          <AccountSetupWizard
            role={accountSetupRole}
            lang={lang}
            onNavigate={navigate}
            onComplete={() => {
              const key = 'stella_' + accountSetupRole + '_account_setup_v1_' + userData.id;
              localStorage.setItem(key, 'completed');
              setAccountSetupRole(null);
            }}
          />
        </React.Suspense>
      )}

      <AchievementCelebrationHost lang={lang === 'ar' ? 'ar' : 'en'} />

      {/* Unified Bottom Nav: Always accessible across all tabs, hidden during active full-screen lesson */}
      {!activeLessonId && (
        <BottomNav 
          activeTab={activeTab} 
          setActiveTab={tab => navigate(tab)}
          lang={lang} 
          workspace={activeWorkspace}
        />
      )}
      </div>
    </div>
    </PointsProvider>
    </LessonsProvider>
    </WorkspaceProvider>
  );
}

export default function App() {
  return <AppContent />;
}