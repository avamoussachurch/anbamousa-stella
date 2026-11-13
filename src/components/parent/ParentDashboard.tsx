import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, Plus, RefreshCw, ShieldCheck, Users, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { hasRole } from '../../lib/workspaces';
import {
  getAuthoritativeChurchEvents,
  getAuthoritativeParentChildren,
  getParentRewardRequests,
  reviewParentRewardRequest,
  type ParentChildRecord,
  type ParentRewardRequest
} from '../../lib/parentChildService';
import { fetchFeedPostsFromSupabase, type ExtendedPost } from '../../lib/feedService';
import type { ChurchEventNotification, ChildProfile, User } from '../../types';
import { AddChildModal } from './AddChildModal';
import { ChurchEventNotifications } from './ChurchEventNotifications';
import { ParentLearningJourney } from './ParentLearningJourney';
import { ParentHomeDashboard } from './ParentHomeDashboard';
import { getLocalizedErrorMessage } from '../../lib/localizedErrors';

type ParentSection = 'home' | 'children' | 'journey' | 'family' | 'events';

interface ParentDashboardProps {
  lang: 'en' | 'ar';
  activeTab: string;
  onNavigate: (tab: string) => void;
  initialChildCode?: string;
}

function asChildProfile(child: ParentChildRecord): ChildProfile {
  return {
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
  };
}

export function ParentDashboard({ lang, activeTab, onNavigate, initialChildCode }: ParentDashboardProps) {
  const { userData, currentUser, updateUserProfile } = useAuth();
  const isArabic = lang === 'ar';
  const isParent = hasRole(userData, 'parent');
  const [section, setSection] = useState<ParentSection>(
    activeTab === 'children' || activeTab === 'journey' || activeTab === 'family' || activeTab === 'events' ? activeTab : 'home'
  );
  const [children, setChildren] = useState<ParentChildRecord[]>([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [childrenLoading, setChildrenLoading] = useState(true);
  const [childrenError, setChildrenError] = useState<string | null>(null);
  const [events, setEvents] = useState<ChurchEventNotification[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<ExtendedPost[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [announcementsError, setAnnouncementsError] = useState<string | null>(null);
  const [rewardRequests, setRewardRequests] = useState<ParentRewardRequest[]>([]);
  const [rewardsLoading, setRewardsLoading] = useState(true);
  const [rewardsError, setRewardsError] = useState<string | null>(null);
  const [reviewingRequestId, setReviewingRequestId] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [savingSetting, setSavingSetting] = useState<string | null>(null);
  const [isAddChildModalOpen, setIsAddChildModalOpen] = useState(Boolean(initialChildCode));
  const [addChildInitialTab, setAddChildInitialTab] = useState<'qr' | 'code' | 'link'>(initialChildCode ? 'code' : 'qr');

  const selectedChild = children.find(child => child.id === selectedChildId) || children[0] || null;
  const parentName = userData?.fullName || (isArabic ? 'ولي الأمر' : 'Parent');
  const sectionTitles: Record<ParentSection, { ar: string; en: string }> = {
    home: { ar: 'نظرة عامة', en: 'Overview' },
    children: { ar: 'أولادي', en: 'My children' },
    journey: { ar: 'رحلة التعلّم', en: 'Learning journey' },
    family: { ar: 'إعدادات الأسرة', en: 'Family settings' },
    events: { ar: 'الأخبار والفعاليات', en: 'News & events' }
  };
  const navigateSection = (nextSection: ParentSection) => {
    setSection(nextSection);
    onNavigate(nextSection);
  };

  useEffect(() => {
    if (activeTab === 'children' || activeTab === 'journey' || activeTab === 'family' || activeTab === 'events') {
      setSection(activeTab);
    } else if (activeTab === 'home') {
      setSection('home');
    }
  }, [activeTab]);

  const refreshChildren = useCallback(async () => {
    if (!isParent) {
      setChildren([]);
      setChildrenLoading(false);
      setChildrenError(null);
      return;
    }
    setChildrenLoading(true);
    setChildrenError(null);
    const result = await getAuthoritativeParentChildren();
    if (result.error || !result.data) {
      setChildren([]);
      setChildrenError(getLocalizedErrorMessage(result.error?.message, lang) || (isArabic ? 'مش قادرين نحمّل بيانات الأولاد المرتبطين بالحساب.' : 'Unable to load linked children.'));
      setChildrenLoading(false);
      return;
    }
    setChildren(result.data);
    setSelectedChildId(current => result.data?.some(child => child.id === current) ? current : (result.data?.[0]?.id || ''));
    setChildrenLoading(false);
  }, [isParent, isArabic]);

  const refreshEvents = useCallback(async () => {
    setEventsLoading(true);
    setEventsError(null);
    const result = await getAuthoritativeChurchEvents();
    setEvents(result.data || []);
    setEventsError(result.error?.message ? getLocalizedErrorMessage(result.error.message, lang) : null);
    setEventsLoading(false);
  }, [lang]);

  const refreshAnnouncements = useCallback(async () => {
    setAnnouncementsLoading(true);
    setAnnouncementsError(null);
    const result = await fetchFeedPostsFromSupabase();
    if (result.error || !result.data) {
      setAnnouncements([]);
      setAnnouncementsError(getLocalizedErrorMessage(result.error?.message, lang) || (isArabic ? 'مش قادرين نحمّل الإعلانات دلوقتي.' : 'Unable to load announcements.'));
    } else {
      setAnnouncements(result.data.filter(post => post.isAnnouncement).slice(0, 8));
    }
    setAnnouncementsLoading(false);
  }, [isArabic]);

  const refreshRewards = useCallback(async () => {
    if (!isParent) {
      setRewardRequests([]);
      setRewardsLoading(false);
      return;
    }
    setRewardsLoading(true);
    setRewardsError(null);
    const result = await getParentRewardRequests();
    setRewardRequests(result.data || []);
    setRewardsError(result.error?.message ? getLocalizedErrorMessage(result.error.message, lang) : null);
    setRewardsLoading(false);
  }, [isParent, lang]);

  useEffect(() => {
    void refreshChildren();
    if (isParent) {
      void refreshEvents();
      void refreshAnnouncements();
      void refreshRewards();
    }
    const onChildrenUpdated = () => void refreshChildren();
    window.addEventListener('church:children_updated', onChildrenUpdated);
    window.addEventListener('church:parent_linked', onChildrenUpdated);
    return () => {
      window.removeEventListener('church:children_updated', onChildrenUpdated);
      window.removeEventListener('church:parent_linked', onChildrenUpdated);
    };
  }, [isParent, refreshChildren, refreshEvents, refreshAnnouncements, refreshRewards]);

  const pendingRewards = useMemo(() => rewardRequests.filter(request => request.status === 'pending'), [rewardRequests]);

  const handleRewardDecision = async (request: ParentRewardRequest, decision: 'approved' | 'rejected') => {
    setReviewingRequestId(request.id);
    setReviewError(null);
    const result = await reviewParentRewardRequest(request.id, decision);
    if (result.error) {
      setReviewError(getLocalizedErrorMessage(result.error.message, lang));
    } else {
      await refreshRewards();
    }
    setReviewingRequestId(null);
  };

  const handleSettingChange = async (
    field: 'pushNotificationsEnabled' | 'notifyLessonCompletion' | 'notifyEventReminders' | 'requireRewardApproval'
  ) => {
    if (!userData) return;
    const value = !userData[field];
    setSavingSetting(field);
    setSettingsError(null);
    const result = await updateUserProfile({ [field]: value } as Partial<User>);
    if (!result.success) setSettingsError(getLocalizedErrorMessage(result.error, lang) || (isArabic ? 'ماقدرناش نحفظ الإعداد.' : 'Could not save this setting.'));
    setSavingSetting(null);
  };

  const openAddChild = (tab: 'qr' | 'code' | 'link' = 'code') => {
    setAddChildInitialTab(tab);
    setIsAddChildModalOpen(true);
  };

  if (!isParent) {
    return (
      <main className="mx-auto max-w-3xl p-6" dir="rtl">
        <div className="mousa-card-sand p-8 text-center" role="alert">
          <ShieldCheck className="mx-auto mb-3 text-[var(--action-primary)]" size={28} />
          <h1 className="text-xl font-black text-[var(--text-primary)]">{isArabic ? 'مساحة ولي الأمر' : 'Parent workspace'}</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {isArabic ? 'المساحة دي متاحة للحسابات المعيّن لها دور ولي أمر.' : 'This workspace is available only to accounts assigned the parent role.'}
          </p>
        </div>
      </main>
    );
  }

  const renderChildrenCards = () => {
    if (childrenLoading) return <div className="mousa-card-sand p-6 text-center text-[var(--text-secondary)]" role="status">{isArabic ? 'بنحمّل بيانات العيلة...' : 'Loading family records…'}</div>;
    if (childrenError) return (
      <div className="mousa-card-sand p-6 text-center" role="alert">
        <p className="mb-3 text-[var(--feedback-error)]">{childrenError}</p>
        <button type="button" onClick={() => void refreshChildren()} className="mousa-btn-quest rounded-xl px-4 py-2">{isArabic ? 'حاول تاني' : 'Retry'}</button>
      </div>
    );
    if (children.length === 0) return (
      <div className="mousa-card-sand p-8 text-center">
        <Users className="mx-auto mb-3 text-[var(--action-primary)]" size={30} />
        <h2 className="font-black text-[var(--text-primary)]">{isArabic ? 'لسه مفيش أطفال مرتبطين بالحساب' : 'No children are linked to this account yet'}</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{isArabic ? 'اربط حساب الطفل بكود التوصيل الموثّق عشان تتابع بياناته الحقيقية.' : 'Connect a child with a verified connection code to see their real records.'}</p>
        <button type="button" onClick={() => openAddChild('code')} className="mousa-btn-quest mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2"><Plus size={16} />{isArabic ? 'ربط طفل' : 'Connect a child'}</button>
      </div>
    );
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {children.map(child => (
          <article key={child.id} className={`mousa-card-sand p-5 text-start ${selectedChild?.id === child.id ? 'ring-2 ring-[var(--action-primary)]' : ''}`}>
            <button type="button" onClick={() => { setSelectedChildId(child.id); navigateSection('journey'); }} className="flex w-full items-center gap-3 text-start">
              <img src={child.avatarUrl || undefined} alt="" className="h-14 w-14 rounded-2xl bg-white object-cover" />
              <span className="min-w-0">
                <span className="block truncate font-black text-[var(--text-primary)]">{child.name}</span>
                <span className="mt-1 block text-sm text-[var(--text-secondary)]">{child.grade || (isArabic ? 'الصف مش متسجل' : 'Grade not recorded')}</span>
              </span>
            </button>
            <dl className="mt-4 space-y-2 border-t border-[var(--border-default)] pt-3 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-[var(--text-secondary)]">{isArabic ? 'فصل مدارس الأحد' : 'Sunday School class'}</dt><dd className="font-semibold text-[var(--text-primary)]">{isArabic ? child.classNameAr || 'مش متسجل' : child.className || 'Not recorded'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-[var(--text-secondary)]">{isArabic ? 'مستوى الألحان والطقس' : 'Hymns & Taxis level'}</dt><dd className="font-semibold text-[var(--text-primary)]">{child.hymnsTaxisLevel ? (isArabic ? `المستوى ${child.hymnsTaxisLevel}` : `Level ${child.hymnsTaxisLevel}`) : (isArabic ? 'مش متاح' : 'Not available')}</dd></div>
            </dl>
            {child.points !== null && <p className="mt-3 text-xs font-bold text-[var(--text-secondary)]">{isArabic ? `النقاط المسجلة دلوقتي: ${child.points}` : `Recorded current points: ${child.points}`}</p>}
          </article>
        ))}
        <button type="button" onClick={() => openAddChild('code')} className="mousa-card-sand flex min-h-40 flex-col items-center justify-center gap-2 border-dashed p-5 text-sm font-bold text-[var(--action-primary)]">
          <Plus size={24} />{isArabic ? 'ربط طفل تاني' : 'Connect another child'}
        </button>
      </div>
    );
  };

  return (
    <main className="parent-portal mx-auto w-full max-w-7xl px-4 pb-28 pt-5 sm:px-6 lg:px-8" dir="rtl">
      {section !== 'home' && (
        <header className="mb-4 border-b border-[var(--border-default)] pb-3">
          <p className="text-xs font-black uppercase tracking-[.14em] text-[var(--action-primary)]">
            {isArabic ? 'مساحة الأسرة' : 'Family workspace'}
          </p>
          <h1 className="mt-1 text-xl font-black text-[var(--text-primary)] sm:text-2xl">
            {isArabic ? sectionTitles[section].ar : sectionTitles[section].en}
          </h1>
          {section === 'journey' && selectedChild && (
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {isArabic ? `رحلة التعلّم لـ ${selectedChild.name}` : `Learning records for ${selectedChild.name}`}
            </p>
          )}
        </header>
      )}

      {section === 'home' && (
        <ParentHomeDashboard
          lang={lang}
          parentName={parentName}
          children={children}
          childrenLoading={childrenLoading}
          childrenError={childrenError}
          onRefreshChildren={() => void refreshChildren()}
          selectedChildId={selectedChild?.id || selectedChildId}
          onSelectChild={setSelectedChildId}
          onOpenJourney={childId => {
            setSelectedChildId(childId);
            navigateSection('journey');
          }}
          onAddChild={() => openAddChild('code')}
          events={events}
          eventsLoading={eventsLoading}
          eventsError={eventsError}
          announcements={announcements}
          announcementsLoading={announcementsLoading}
          announcementsError={announcementsError}
          rewardRequests={rewardRequests}
          rewardsLoading={rewardsLoading}
          rewardsError={rewardsError}
          onOpenFamily={() => navigateSection('family')}
          onOpenEvents={() => navigateSection('events')}
        />
      )}

      {section === 'children' && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <p className="text-sm text-[var(--text-secondary)]">{isArabic ? 'بيانات الأولاد المرتبطين بالحساب بشكل موثّق.' : 'Children connected through a verified family relationship.'}</p>
            <div className="flex gap-2"><button type="button" onClick={() => openAddChild('code')} className="mousa-btn-quest inline-flex items-center gap-2 rounded-xl px-4 py-2"><Plus size={16} />{isArabic ? 'إدخال كود' : 'Enter code'}</button><button type="button" onClick={() => openAddChild('qr')} className="rounded-xl border border-[var(--border-default)] px-4 py-2 text-sm font-bold text-[var(--text-primary)]">{isArabic ? 'مسح QR' : 'Scan QR'}</button></div>
          </div>
          {renderChildrenCards()}
        </section>
      )}

      {section === 'journey' && (
        childrenLoading ? <div className="mousa-card-sand p-6 text-center text-[var(--text-secondary)]" role="status">{isArabic ? 'بنحمّل بيانات العيلة...' : 'Loading family records…'}</div>
          : childrenError ? <div className="mousa-card-sand p-6 text-center text-[var(--feedback-error)]" role="alert">{childrenError}</div>
            : selectedChild ? <div className="space-y-4">
              {children.length > 1 && <label className="mousa-card-sand flex items-center gap-3 p-4 text-sm font-bold text-[var(--text-primary)]">{isArabic ? 'اختار ابنك:' : 'Select child:'}<select value={selectedChild.id} onChange={event => setSelectedChildId(event.target.value)} className="min-w-48 rounded-lg border border-[var(--border-default)] bg-white px-3 py-2">{children.map(child => <option key={child.id} value={child.id}>{child.name}</option>)}</select></label>}
              <ParentLearningJourney child={selectedChild} lang={lang} />
            </div>
              : <div className="mousa-card-sand p-8 text-center"><p className="text-[var(--text-secondary)]">{isArabic ? 'اربط حساب ابنك عشان تقدر تتابع رحلة التعلّم.' : 'Connect a child account to view their learning journey.'}</p><button type="button" onClick={() => openAddChild('code')} className="mousa-btn-quest mt-4 rounded-xl px-4 py-2">{isArabic ? 'ربط طفل' : 'Connect a child'}</button></div>
      )}

      {section === 'family' && (
        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <section className="mousa-card-sand p-5 sm:p-6">
            <h2 className="text-lg font-black text-[var(--text-primary)]">{isArabic ? 'تفضيلات حساب ولي الأمر' : 'Parent account preferences'}</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{isArabic ? 'الإعدادات دي محفوظة على حسابك، ومش بتغيّر بيانات الطفل.' : 'These settings are saved on your own account and do not modify a child’s records.'}</p>
            <div className="mt-5 space-y-4">
              {[
                { field: 'pushNotificationsEnabled' as const, label: isArabic ? 'تفضيل التنبيهات' : 'Notification preference', detail: isArabic ? 'اختيارك لاستقبال التنبيهات داخل الخدمات المتاحة.' : 'Your preference for notifications in supported services.' },
                { field: 'notifyLessonCompletion' as const, label: isArabic ? 'تنبيهات إتمام الدروس' : 'Lesson completion alerts', detail: isArabic ? 'تفضيل مرتبط بحسابك؛ وصول التنبيه يعتمد على دعم الخدمة.' : 'An account preference; delivery depends on service support.' },
                { field: 'notifyEventReminders' as const, label: isArabic ? 'تذكيرات الفعاليات' : 'Event reminders', detail: isArabic ? 'تفضيل مرتبط بحسابك؛ لا يعني وجود تنبيه مجدول.' : 'An account preference; it does not mean a reminder is scheduled.' },
                { field: 'requireRewardApproval' as const, label: isArabic ? 'طلب موافقتي على المكافآت' : 'Require my reward approval', detail: isArabic ? 'تفضيل محفوظ في حسابك؛ طلبات المكافآت نفسها تظهر أدناه لو كانت مسجلة.' : 'A preference saved on your account; recorded reward requests appear below.' }
              ].map(item => (
                <label key={item.field} className="flex items-start justify-between gap-4 border-b border-[var(--border-default)] pb-4 last:border-0">
                  <span><span className="block font-bold text-[var(--text-primary)]">{item.label}</span><span className="mt-1 block text-xs text-[var(--text-secondary)]">{item.detail}</span></span>
                  <input type="checkbox" checked={Boolean(userData?.[item.field])} disabled={savingSetting === item.field} onChange={() => void handleSettingChange(item.field)} className="mt-1 h-5 w-5 accent-[var(--action-primary)]" />
                </label>
              ))}
            </div>
            {settingsError && <p className="mt-3 text-sm text-[var(--feedback-error)]" role="alert">{settingsError}</p>}
          </section>

          <section className="mousa-card-sand p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div><h2 className="text-lg font-black text-[var(--text-primary)]">{isArabic ? 'طلبات موافقة المكافآت' : 'Reward approval requests'}</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">{isArabic ? 'طلبات فعلية مرتبطة بالأبناء الموثقين فقط.' : 'Persisted requests for verified linked children only.'}</p></div>
              <button type="button" onClick={() => void refreshRewards()} aria-label={isArabic ? 'تحديث الطلبات' : 'Refresh requests'} className="rounded-xl border border-[var(--border-default)] p-2 text-[var(--text-primary)]"><RefreshCw size={17} /></button>
            </div>
            {rewardsLoading ? <p className="mt-5 text-sm text-[var(--text-secondary)]" role="status">{isArabic ? 'بنحمّل الطلبات...' : 'Loading requests…'}</p>
              : rewardsError ? <div className="mt-5 text-sm text-[var(--feedback-error)]" role="alert"><AlertCircle className="me-2 inline" size={16} />{rewardsError}</div>
                : rewardRequests.length === 0 ? <p className="mt-5 rounded-xl bg-white/70 p-5 text-center text-sm text-[var(--text-secondary)]">{isArabic ? 'مفيش طلبات مكافآت مسجلة للأبناء المرتبطين.' : 'No reward requests are recorded for linked children.'}</p>
                  : <div className="mt-4 space-y-3">{rewardRequests.map(request => {
                    const child = children.find(item => item.id === request.student_id);
                    return <article key={request.id} className="rounded-xl border border-[var(--border-default)] bg-white/70 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold text-[var(--text-primary)]">{isArabic ? request.reward_name_ar : request.reward_name_en}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{child?.name || (isArabic ? 'ابن مرتبط' : 'Linked child')} · {request.cost_points} {isArabic ? 'نقطة' : 'points'} · {new Date(request.created_at).toLocaleDateString(isArabic ? 'ar-EG' : 'en-EG')}</p></div><span className="rounded-full bg-[var(--surface-secondary)] px-3 py-1 text-xs font-bold text-[var(--text-secondary)]">{request.status === 'pending' ? (isArabic ? 'بانتظار القرار' : 'Pending') : request.status === 'approved' ? (isArabic ? 'موافق عليه' : 'Approved') : (isArabic ? 'مرفوض' : 'Rejected')}</span></div>{request.status === 'pending' && <div className="mt-3 flex gap-2"><button type="button" disabled={reviewingRequestId === request.id} onClick={() => void handleRewardDecision(request, 'approved')} className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><Check size={14} />{isArabic ? 'موافقة' : 'Approve'}</button><button type="button" disabled={reviewingRequestId === request.id} onClick={() => void handleRewardDecision(request, 'rejected')} className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-default)] px-3 py-2 text-xs font-bold text-[var(--text-primary)] disabled:opacity-50"><X size={14} />{isArabic ? 'رفض' : 'Reject'}</button></div>}</article>;
                  })}</div>}
            {reviewError && <p className="mt-3 text-sm text-[var(--feedback-error)]" role="alert">{reviewError}</p>}
            <p className="mt-4 border-t border-[var(--border-default)] pt-4 text-xs text-[var(--text-secondary)]">{isArabic ? 'إعدادات وقت الشاشة مش متاحة حالياً؛ مش هنظهر أو نغيّر حدود غير محفوظة على الخادم.' : 'Screen-time controls are not available; no unsaved local limits are shown or changed.'}</p>
          </section>
        </div>
      )}

      {section === 'events' && (
        <div className="space-y-5">
          <section className="mousa-card-sand p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div><h2 className="text-lg font-black text-[var(--text-primary)]">{isArabic ? 'إعلانات الكنيسة' : 'Church announcements'}</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">{isArabic ? 'منشورات معلّمة كإعلان في موجز الكنيسة.' : 'Posts marked as announcements in the church feed.'}</p></div>
              <button type="button" onClick={() => void refreshAnnouncements()} aria-label={isArabic ? 'تحديث الإعلانات' : 'Refresh announcements'} className="rounded-xl border border-[var(--border-default)] p-2 text-[var(--text-primary)]"><RefreshCw size={17} /></button>
            </div>
            {announcementsLoading ? <p className="mt-4 text-sm text-[var(--text-secondary)]" role="status">{isArabic ? 'بنحمّل الإعلانات...' : 'Loading announcements…'}</p>
              : announcementsError ? <p className="mt-4 text-sm text-[var(--feedback-error)]" role="alert">{announcementsError}</p>
                : announcements.length === 0 ? <p className="mt-4 text-sm text-[var(--text-secondary)]">{isArabic ? 'مفيش إعلانات منشورة حالياً.' : 'No published announcements right now.'}</p>
                  : <div className="mt-3 divide-y divide-[var(--border-default)]">{announcements.map(post => <article key={post.id} className="py-4"><p className="whitespace-pre-wrap text-sm text-[var(--text-primary)]">{post.content}</p><p className="mt-2 text-xs text-[var(--text-secondary)]">{post.authorName} · {new Date(post.createdAt).toLocaleString(isArabic ? 'ar-EG' : 'en-EG')}</p></article>)}</div>}
          </section>
          <section>
            {eventsLoading ? <div className="mousa-card-sand p-6 text-center text-[var(--text-secondary)]" role="status">{isArabic ? 'بنحمّل الفعاليات...' : 'Loading events…'}</div>
              : eventsError ? <div className="mousa-card-sand p-6 text-center text-[var(--feedback-error)]" role="alert">{eventsError}<button type="button" onClick={() => void refreshEvents()} className="ms-3 underline">{isArabic ? 'حاول تاني' : 'Retry'}</button></div>
                : <ChurchEventNotifications events={events} lang={lang} />}
          </section>
        </div>
      )}

      <AddChildModal
        isOpen={isAddChildModalOpen}
        initialCode={initialChildCode}
        initialTab={addChildInitialTab}
        onClose={() => {
          setIsAddChildModalOpen(false);
          void refreshChildren();
        }}
        onChildLinked={child => {
          setSelectedChildId(child.id);
          navigateSection('children');
          void refreshChildren();
        }}
        parentEmail={userData?.email || currentUser?.email || ''}
        parentId={userData?.id || currentUser?.uid || ''}
        parentName={parentName}
        existingChildren={children.map(asChildProfile)}
        lang={lang}
      />
    </main>
  );
}
