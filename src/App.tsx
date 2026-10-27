import React, { useState, useEffect } from 'react';
import { BottomNav } from './components/layout/BottomNav';
import { TopBar } from './components/layout/TopBar';
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
import { OfflineIndicator } from './components/layout/OfflineIndicator';
import { GlobalMusicPlayer } from './components/layout/GlobalMusicPlayer';
import { useAuth } from './context/AuthContext';
import { LessonsProvider } from './context/LessonsContext';
import { PointsProvider } from './context/PointsContext';
import { Language } from './types';

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
      const dir = newLang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.setAttribute('dir', dir);
      document.documentElement.setAttribute('lang', newLang === 'copt' ? 'cop' : newLang);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dir = lang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.setAttribute('dir', dir);
      document.documentElement.setAttribute('lang', lang === 'copt' ? 'cop' : lang);
    }
  }, [lang]);

  const [activeTab, setActiveTab] = useState('home');
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);

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
    if (userData && userData.role === 'student') {
      const dismissed = sessionStorage.getItem('dismissed_student_onboarding_' + userData.id);
      if (!userData.grade && !dismissed) {
        setShowStudentOnboardingModal(true);
      }
    }
  }, [userData?.id, userData?.role, userData?.grade]);

  // If parent opens app via child link, automatically navigate to family tab
  React.useEffect(() => {
    if (incomingChildCode && userData?.role === 'parent') {
      setActiveTab('family');
    }
  }, [incomingChildCode, userData?.role]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-church-cream)] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[var(--color-church-blue)] border-t-[var(--color-church-gold)] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!userData) {
    return <LoginScreen lang={lang} setLang={setLang} />;
  }

  const role = userData.role;

  // Simple tab router for app tabs
  const navigate = (tab: string, lessonId?: string) => {
    setActiveTab(tab);
    if (lessonId) {
      setActiveLessonId(lessonId);
    } else {
      setActiveLessonId(null);
    }
  };

  const handleOpenTeacherStudio = () => {
    setActiveTab('studio');
    setActiveLessonId(null);
  };

  const handleOpenParentPortal = () => {
    setActiveTab('family');
    setActiveLessonId(null);
  };

  const handleBackToHome = () => {
    setActiveTab('home');
    setActiveLessonId(null);
  };

  // Render main content area
  const renderMainContent = () => {
    // In-depth Lesson View (quizzes, audio, badges)
    if (activeLessonId) {
      return (
        <LessonView
          lessonId={activeLessonId}
          onBack={() => setActiveLessonId(null)}
          lang={lang}
        />
      );
    }

    switch (activeTab) {
      case 'home':
        return (
          <HomeTab
            onNavigate={navigate}
            onOpenTeacherStudio={role === 'teacher' ? handleOpenTeacherStudio : undefined}
            onOpenParentPortal={(role === 'parent' || role === 'teacher') ? handleOpenParentPortal : undefined}
            lang={lang}
          />
        );
      case 'lessons':
        return (
          <LessonsTab
            onStartLesson={(id) => navigate('lessons', id)}
            onOpenTeacherStudio={role === 'teacher' ? handleOpenTeacherStudio : undefined}
            lang={lang}
          />
        );
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
      case 'studio':
        return (
          <TeacherDashboard
            onBackToApp={handleBackToHome}
            onOpenParentPortal={handleOpenParentPortal}
            onPreviewLesson={(id) => setActiveLessonId(id)}
            lang={lang}
          />
        );
      case 'family':
        return (
          <ParentDashboard
            lang={lang}
            initialChildCode={incomingChildCode || undefined}
            onBackToApp={handleBackToHome}
            onOpenTeacherStudio={role === 'teacher' ? handleOpenTeacherStudio : undefined}
          />
        );
      case 'profile':
        return (
          <ProfileTab
            onLogout={handleLogout}
            onOpenTeacherStudio={role === 'teacher' ? handleOpenTeacherStudio : undefined}
            onOpenParentPortal={(role === 'parent' || role === 'teacher') ? handleOpenParentPortal : undefined}
            onNavigate={navigate}
            lang={lang}
          />
        );
      default:
        return (
          <HomeTab
            onNavigate={navigate}
            onOpenTeacherStudio={role === 'teacher' ? handleOpenTeacherStudio : undefined}
            onOpenParentPortal={(role === 'parent' || role === 'teacher') ? handleOpenParentPortal : undefined}
            lang={lang}
          />
        );
    }
  };

  const handleLogout = async () => {
    setActiveLessonId(null);
    setActiveTab('home');
    await logout();
  };

  return (
    <div 
      dir={lang === 'ar' ? 'rtl' : 'ltr'} 
      className="min-h-screen relative font-sans bg-[var(--color-church-cream)] pb-safe overflow-x-hidden selection:bg-[var(--color-church-gold)] selection:text-[var(--color-church-blue)]"
    >
      <TopBar 
        lang={lang} 
        setLang={setLang}
        onHomeClick={handleBackToHome}
        onNavigate={navigate}
        activeTab={activeTab}
      />
      <OfflineIndicator />
      <GlobalMusicPlayer lang={lang} />
      
      {/* Incoming Child Link Alert Banner */}
      {incomingChildCode && activeTab !== 'family' && (
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
              onClick={() => setActiveTab('family')}
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
      {role === 'student' && (!userData?.grade || userData?.activationStatus === 'PENDING_APPROVAL') && (
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
      <div className="mx-auto w-full md:pt-4 pb-20 md:pb-28">
        {renderMainContent()}
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
          setActiveTab={setActiveTab} 
          lang={lang} 
          userRole={role}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <LessonsProvider>
      <PointsProvider>
        <AppContent />
      </PointsProvider>
    </LessonsProvider>
  );
}
