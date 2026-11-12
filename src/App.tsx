import React, { useState, useEffect, useLayoutEffect } from 'react';
import { BottomNav } from './components/layout/BottomNav';
import { TopBar } from './components/layout/TopBar';
import { WorkspaceSidebar } from './components/layout/WorkspaceSidebar';
import { HomeTab } from './components/student/HomeTab';
import { LessonsTab } from './components/student/LessonsTab';
import { PointsTab } from './components/student/PointsTab';
import { FeedTab } from './components/student/FeedTab';
import { ProfileTab } from './components/student/ProfileTab';
import { LessonView } from './components/student/LessonView';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { ParentDashboard } from './components/parent/ParentDashboard';
import { CopticCalendarTab } from './components/coptic/CopticCalendarTab';
import { HymnsSchoolTab } from './components/hymns/HymnsSchoolTab';
import { CopticTaxisTab } from './components/taxis/CopticTaxisTab';
import { AgpeyaPrayerTab } from './components/agpeya/AgpeyaPrayerTab';
import { LoginScreen } from './components/auth/LoginScreen';
import { StudentOnboardingModal } from './components/auth/StudentOnboardingModal';
import { AdminWorkspace } from './components/admin/AdminWorkspace';
import { RoleAccountProfile } from './components/profile/RoleAccountProfile';
import { OfflineIndicator } from './components/layout/OfflineIndicator';
import { AnbaMousaSplashScreen } from './components/layout/AnbaMousaSplashScreen';
import { GlobalMusicPlayer } from './components/layout/GlobalMusicPlayer';
import { useAuth } from './context/AuthContext';
import { LessonsProvider } from './context/LessonsContext';
import { PointsProvider } from './context/PointsContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { Language } from './types';
import { applyLanguagePreference, getLanguageDirection } from './lib/uiPreferences';
import { canAccessWorkspace, canAccessWorkspaceTab, hasRole, resolveWorkspace, type Workspace } from './lib/workspaces';

function AppContent() {
  const { userData, loading, logout } = useAuth();
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
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('workspace') as Workspace | null;
  });
  const [navigationError, setNavigationError] = useState<string | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [visitedStudentTabs, setVisitedStudentTabs] = useState<Set<string>>(() => new Set<string>(['home']));

  // Detect incoming child connect link (?connectChild=ST-4921)
  const [incomingChildCode, setIncomingChildCode] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && window.location?.search) {
      const params = new URLSearchParams(window.location.search);
      return params.get('connectChild') || params.get('linkCode') || params.get('code') || null;
    }
    return null;
  });

  // On first student login without exact grade, show onboarding modal
  const [showStudentOnboardingModal, setShowStudentOnboardingModal] = useState<boolean>(false);
  useEffect(() => {
    if (userData && hasRole(userData, 'student') && activeWorkspace === 'student') {
      const dismissed = sessionStorage.getItem('dismissed_student_onboarding_' + userData.id);
      if (!userData.grade && !dismissed) {
        setShowStudentOnboardingModal(true);
      }
    }
  }, [userData?.id, userData?.roles, userData?.grade, activeWorkspace]);

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

  React.useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const resolved = resolveWorkspace(userData?.roles || [], params.get('workspace'));
      setActiveWorkspace(resolved);
      setActiveTab(canAccessWorkspaceTab(userData?.roles || [], resolved, params.get('tab') || 'home')
        ? params.get('tab') || 'home'
        : 'home');
      setActiveLessonId(null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [userData?.roles]);

  React.useEffect(() => {
    if (!userData || !activeWorkspace || !canAccessWorkspace(userData.roles, activeWorkspace)) return;
    const params = new URLSearchParams(window.location.search);
    params.set('workspace', activeWorkspace);
    params.set('tab', activeTab);
    const query = params.toString();
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
  }, [activeWorkspace, activeTab, userData?.roles]);

  if (loading) {
    return <AnbaMousaSplashScreen lang={lang} />;
  }

  if (!userData) {
    return <LoginScreen lang={lang} setLang={setLang} />;
  }

  const navigate = (tab: string, lessonId?: string) => {
    if (!canAccessWorkspaceTab(userData.roles, activeWorkspace, tab) || (lessonId && activeWorkspace !== 'student')) {
      setNavigationError(lang === 'ar' ? 'هذه الصفحة غير متاحة في مساحة العمل الحالية.' : 'This page is not available in the current workspace.');
      return;
    }
    setNavigationError(null);
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
    setActiveTab('home');
    setActiveLessonId(null);
  };

  const switchWorkspace = (nextWorkspace: Workspace) => {
    if (!canAccessWorkspace(userData.roles, nextWorkspace)) {
      setNavigationError(lang === 'ar' ? 'لا تملك صلاحية مساحة العمل المطلوبة.' : 'You are not assigned to that workspace.');
      return;
    }
    setNavigationError(null);
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
      if (activeTab === 'feed') return <FeedTab lang={lang} />;
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
      if (activeTab === 'feed') return <FeedTab lang={lang} />;
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
          return <FeedTab lang={lang} />;
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
            onBack={() => setActiveLessonId(null)}
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
      className="min-h-screen relative bg-[var(--color-church-cream)] pb-safe overflow-x-hidden selection:bg-[var(--color-church-gold)] selection:text-[var(--color-church-blue)]"
    >
      <TopBar 
        lang={lang} 
        onHomeClick={handleBackToHome}
        onNavigate={navigate}
        activeTab={activeTab}
        workspace={activeWorkspace}
        onWorkspaceChange={switchWorkspace}
      />
      <OfflineIndicator />
      <GlobalMusicPlayer lang={lang} />
      <div className="flex items-start">
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
        <div className="bg-gradient-to-r from-[var(--color-church-blue)] to-[var(--color-church-burgundy)] text-white px-4 py-2.5 shadow-md flex items-center justify-between text-xs sm:text-sm font-semibold sticky top-14 z-30">
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
          <button
            onClick={() => setShowStudentOnboardingModal(true)}
            className="bg-amber-300 hover:bg-amber-200 text-amber-950 font-black px-3 py-1 rounded-lg text-xs transition-colors cursor-pointer shadow-xs shrink-0"
          >
            {lang === 'ar' ? 'عرض / تحديد الصف' : 'Select / Review Grade'}
          </button>
        </div>
      )}
      
      {/* Container for responsive layout */}
      <div className="mx-auto w-full min-w-0 px-2 md:px-4 md:pt-4 pb-20 lg:pb-8">
        {navigationError && <p role="alert" className="mx-auto my-2 max-w-3xl rounded-xl bg-amber-50 p-3 text-center text-sm font-bold text-amber-900">{navigationError}</p>}
        {renderMainContent()}
      </div>
      </div>
      </div>

      {/* Student First-Login & Onboarding Modal */}
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
              sessionStorage.setItem('dismissed_student_onboarding_' + userData.id, 'true');
            }
          }}
        />
      )}

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
    </PointsProvider>
    </LessonsProvider>
    </WorkspaceProvider>
  );
}

export default function App() {
  return <AppContent />;
}