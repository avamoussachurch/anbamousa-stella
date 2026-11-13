import React, { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  Flame,
  Heart,
  LoaderCircle,
  LockKeyhole,
  MessageCircle,
  RefreshCw,
  Sparkles,
  Star,
  Trophy
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import type { Language, Lesson, User } from '../../types';
import type { ExtendedPost } from '../../lib/feedService';
import { fetchFeedPostsFromSupabase } from '../../lib/feedService';
import { BibleVerseCard } from '../shared/BibleVerseCard';
import { StudentFeatureLinks } from './StudentFeatureLinks';
import { MosesJourneyBadge } from './JourneyOfMosesVisuals';

interface StudentAdventureHomeProps {
  user: User;
  isGuest: boolean;
  lang: Language;
  lessons: Lesson[];
  nextLesson: Lesson | null;
  completedLessons: Lesson[];
  totalLessons: number;
  curriculumLoading: boolean;
  curriculumError: string | null;
  onNavigate: (tab: string, lessonId?: string) => void;
  onRetryCurriculum: () => void;
}

function AdventureStars({ reduceMotion }: { reduceMotion: boolean }) {
  const stars = [
    [7, 23, 2], [15, 51, 1], [27, 16, 1], [42, 34, 2], [57, 14, 1],
    [70, 42, 1], [83, 18, 2], [94, 36, 1], [35, 67, 1], [76, 72, 1]
  ];

  return (
    <div aria-hidden="true" className="stella-adventure-stars absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map(([left, top, size], index) => (
        <span
          key={`${left}-${top}`}
          className="stella-adventure-star absolute rounded-full bg-[#F5D98C]"
          style={{
            left: `${left}%`,
            top: `${top}%`,
            width: `${size + 1}px`,
            height: `${size + 1}px`,
            animationDelay: `${index * -0.7}s`,
            animationPlayState: reduceMotion ? 'paused' : 'running'
          }}
        />
      ))}
    </div>
  );
}

function JourneyPath({
  lessons,
  completedLessons,
  nextLesson,
  lang,
  onNavigate,
  reduceMotion
}: Pick<StudentAdventureHomeProps, 'lessons' | 'completedLessons' | 'nextLesson' | 'lang' | 'onNavigate'> & { reduceMotion: boolean }) {
  const isArabic = lang === 'ar';
  const pathLessons = lessons.slice(0, 5);
  const completedIds = new Set(completedLessons.map(lesson => lesson.id));

  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#102433] p-5 text-white shadow-[0_24px_70px_-38px_rgba(0,0,0,.8)] sm:p-7">
      <div aria-hidden="true" className="absolute -end-24 -top-32 h-72 w-72 rounded-full bg-[#E6B75A]/10 blur-3xl" />
      <div className="relative z-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[.2em] text-[#E8C574]">
            {isArabic ? 'طريقك في البرية' : 'Your learning trail'}
          </p>
          <h2 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">
            {isArabic ? 'رحلة الأنبا موسى' : 'The Journey of Moses'}
          </h2>
        </div>
        <p className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-200">
          {isArabic
            ? `${completedLessons.length} من ${lessons.length} دروس مكتملة`
            : `${completedLessons.length} of ${lessons.length} lessons complete`}
        </p>
      </div>

      {pathLessons.length > 0 ? (
        <div className="relative mt-7">
          <svg
            aria-hidden="true"
            viewBox="0 0 1000 130"
            preserveAspectRatio="none"
            className="absolute inset-x-0 top-3 hidden h-24 w-full sm:block"
          >
            <path d="M45 67 C160 12 205 112 310 66 S460 18 545 67 S700 115 790 62 S905 28 955 62" fill="none" stroke="#315361" strokeWidth="7" strokeLinecap="round" />
            <path
              d="M45 67 C160 12 205 112 310 66 S460 18 545 67 S700 115 790 62 S905 28 955 62"
              fill="none"
              stroke="#E6B75A"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="8 12"
              className="stella-trail-dashes"
            />
          </svg>
          <ol className="relative grid gap-3 sm:grid-cols-5 sm:gap-2">
            {pathLessons.map((lesson, index) => {
              const isCompleted = completedIds.has(lesson.id);
              const isCurrent = nextLesson?.id === lesson.id;
              const isLocked = !isCompleted && !isCurrent;
              const title = isArabic ? (lesson.titleAr || lesson.title) : lesson.title;
              return (
                <motion.li key={lesson.id} className="min-w-0" initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={reduceMotion ? { duration: 0 } : { duration: 0.28, delay: index * 0.055, ease: 'easeOut' }}>
                  <button
                    type="button"
                    onClick={() => onNavigate('lessons', isLocked ? undefined : lesson.id)}
                    aria-label={`${isLocked
                      ? (isArabic ? 'مقفل، أكمل المحطة السابقة أولاً' : 'Locked, finish the previous lesson first')
                      : (isArabic ? 'افتح الدرس' : 'Open lesson')}: ${title}`}
                    className={`group flex min-h-[76px] w-full items-center gap-3 rounded-2xl border px-3 py-3 text-start transition hover:-translate-y-0.5 hover:border-[#E6B75A]/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5D98C] sm:min-h-0 sm:flex-col sm:gap-2 sm:border-0 sm:bg-transparent sm:px-1 sm:py-0 sm:text-center ${
                      isCurrent
                        ? 'border-[#E6B75A]/60 bg-[#173545] sm:bg-transparent'
                        : isLocked
                          ? 'border-white/5 bg-white/[.02] hover:bg-white/[.04] sm:hover:bg-transparent'
                          : 'border-white/10 bg-white/[.035] hover:bg-white/[.07] sm:hover:bg-transparent'
                    }`}
                  >
                    <span className={`relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 shadow-lg transition group-hover:scale-105 ${
                      isCompleted
                        ? 'border-[#8AD2A6] bg-[#17614D] text-white'
                        : isCurrent
                          ? 'border-[#F5D98C] bg-[#E6B75A] text-[#102433]'
                          : 'border-[#56727B] bg-[#183342] text-[#C2D3D7]'
                    }`}>
                      {isCompleted ? <Check size={18} strokeWidth={3} /> : isCurrent ? <Sparkles size={18} /> : isLocked ? <LockKeyhole size={16} /> : <span className="text-xs font-black">{index + 1}</span>}
                    </span>
                    <span className="min-w-0 flex-1 sm:flex-none">
                      <span className={`block truncate text-xs font-extrabold sm:max-w-[10rem] ${isCurrent ? 'text-[#F5D98C]' : 'text-slate-200'}`}>
                        {title}
                      </span>
                      <span className="mt-0.5 block text-[10px] font-bold text-slate-400">
                        {isCompleted
                          ? (isArabic ? 'مكتمل' : 'Completed')
                          : isCurrent
                            ? (isArabic ? 'درسك التالي' : 'Up next')
                            : isLocked
                              ? (isArabic ? 'مقفل — أكمل الدرس السابق' : 'Locked — finish the previous lesson')
                              : (isArabic ? 'متاح للتعلم' : 'Ready to explore')}
                      </span>
                    </span>
                    <ArrowUpRight size={14} className="ms-auto shrink-0 text-slate-500 sm:hidden" />
                  </button>
                </motion.li>
              );
            })}
          </ol>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[.04] p-4 text-sm leading-relaxed text-slate-300">
          {isArabic
            ? 'ستظهر محطات رحلتك هنا عندما يصبح منهج فصلك متاحاً.'
            : 'Your journey stops will appear here when your class curriculum is available.'}
        </div>
      )}
    </section>
  );
}

function FeedPreview({
  lang,
  onNavigate
}: Pick<StudentAdventureHomeProps, 'lang' | 'onNavigate'>) {
  const isArabic = lang === 'ar';
  const [posts, setPosts] = useState<ExtendedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchFeedPostsFromSupabase().then(result => {
      if (!active) return;
      if (result.error || !result.data) {
        setError(result.error?.message || (isArabic ? 'تعذر تحميل المنشورات.' : 'Posts are unavailable right now.'));
        setPosts([]);
      } else {
        setPosts(result.data.slice(0, 2));
      }
      setLoading(false);
    }).catch(reason => {
      if (!active) return;
      setError(reason instanceof Error ? reason.message : (isArabic ? 'تعذر تحميل المنشورات.' : 'Posts are unavailable right now.'));
      setPosts([]);
      setLoading(false);
    });
    return () => { active = false; };
  }, [isArabic, reload]);

  return (
    <section className="rounded-[1.75rem] border border-[#29414C] bg-[#101E28] p-5 text-white sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1D4851] text-[#9EE0D4]">
            <Heart size={19} />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#92B1B8]">{isArabic ? 'مجتمع الكنيسة' : 'Church community'}</p>
            <h2 className="text-lg font-black">{isArabic ? 'منشورات جديدة' : 'From the community'}</h2>
          </div>
        </div>
        <button type="button" onClick={() => onNavigate('feed')} className="inline-flex min-h-10 items-center gap-1 rounded-xl px-3 text-xs font-extrabold text-[#F5D98C] transition hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F5D98C]">
          {isArabic ? 'افتح المنشورات' : 'Open feed'} <ChevronRight size={15} className={isArabic ? 'rotate-180' : ''} />
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {loading ? (
          <div role="status" className="flex items-center gap-2 rounded-xl bg-white/[.04] p-4 text-sm text-slate-300">
            <LoaderCircle size={16} className="animate-spin" /> {isArabic ? 'جاري تحميل المنشورات...' : 'Loading community posts…'}
          </div>
        ) : error ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#765640] bg-[#34291F] p-4 text-sm text-[#F0D8B8]">
            <span>{isArabic ? 'المنشورات غير متاحة حالياً.' : 'Community posts are unavailable right now.'}</span>
            <button type="button" onClick={() => setReload(value => value + 1)} className="inline-flex min-h-9 items-center gap-2 rounded-lg px-2 font-bold hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F5D98C]">
              <RefreshCw size={14} /> {isArabic ? 'إعادة المحاولة' : 'Try again'}
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[.035] p-4 text-sm text-slate-300">
            {isArabic ? 'لا توجد منشورات جديدة بعد. كن أول من يشارك!' : 'No community posts yet. Check back soon.'}
          </div>
        ) : posts.map(post => (
          <button
            type="button"
            key={post.id}
            onClick={() => onNavigate('feed')}
            className="block w-full rounded-2xl border border-white/10 bg-white/[.035] p-4 text-start transition hover:border-[#79CDD0]/40 hover:bg-white/[.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F5D98C]"
          >
            <span className="flex items-center gap-2 text-xs font-extrabold text-slate-300">
              <img src={post.authorAvatar} alt="" className="h-7 w-7 rounded-full bg-[#233A44] object-cover" />
              <span className="truncate">{post.authorName}</span>
              <span className="ms-auto flex shrink-0 items-center gap-1 text-[10px] text-slate-400"><MessageCircle size={12} />{post.comments.length}</span>
            </span>
            <span className="mt-3 line-clamp-2 block text-sm leading-relaxed text-slate-100">{post.content}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function StudentAdventureHome({
  user,
  isGuest,
  lang,
  lessons,
  nextLesson,
  completedLessons,
  totalLessons,
  curriculumLoading,
  curriculumError,
  onNavigate,
  onRetryCurriculum
}: StudentAdventureHomeProps) {
  const isArabic = lang === 'ar';
  const reduceMotion = useReducedMotion();
  const progress = totalLessons > 0 ? Math.round((completedLessons.length / totalLessons) * 100) : 0;
  const displayName = isGuest
    ? (isArabic ? 'صديقي' : 'friend')
    : user.fullName.trim().split(/\s+/)[0] || (isArabic ? 'صديقي' : 'friend');
  const lessonTitle = nextLesson && (isArabic ? nextLesson.titleAr || nextLesson.title : nextLesson.title);
  const lessonSummary = nextLesson && (isArabic ? nextLesson.summaryAr || nextLesson.summary : nextLesson.summary);

  return (
    <main className="stella-student-home mx-auto w-full max-w-[1440px] space-y-5 px-4 pb-28 pt-5 sm:space-y-7 sm:px-7 lg:px-10" dir={isArabic ? 'rtl' : 'ltr'}>
      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="stella-adventure-hero relative isolate min-h-[300px] overflow-hidden rounded-[2rem] border border-[#34505E] bg-[#0A1925] px-5 py-5 text-white shadow-[0_32px_90px_-44px_rgba(0,0,0,.85)] sm:min-h-[330px] sm:px-9 sm:py-9"
      >
        <AdventureStars reduceMotion={Boolean(reduceMotion)} />
        <motion.span aria-hidden="true" className="pointer-events-none absolute end-[12%] top-[18%] z-[1] text-2xl drop-shadow-[0_0_12px_rgba(245,217,140,.75)] sm:end-[18%] sm:top-[20%]" animate={reduceMotion ? undefined : { y: [0, -7, 0], rotate: [-4, 4, -4] }} transition={reduceMotion ? { duration: 0 } : { duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}>🏮</motion.span>
        <div aria-hidden="true" className="absolute -end-14 -top-24 h-72 w-72 rounded-full bg-[#E7B956]/15 blur-[75px]" />
        <svg aria-hidden="true" viewBox="0 0 800 360" preserveAspectRatio="xMidYMax slice" className="absolute inset-x-0 bottom-0 h-[78%] w-full opacity-90">
          <defs>
            <linearGradient id="stellaDuneFar" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#28505A" /><stop offset="1" stopColor="#173541" /></linearGradient>
            <linearGradient id="stellaDuneNear" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#A77B46" /><stop offset="1" stopColor="#624B36" /></linearGradient>
            <radialGradient id="stellaSun"><stop stopColor="#FFE8A1" /><stop offset="1" stopColor="#E7B956" stopOpacity=".15" /></radialGradient>
          </defs>
          <circle cx="650" cy="106" r="52" fill="url(#stellaSun)" />
          <path d="M0 228Q120 160 235 214T475 190T800 205V360H0Z" fill="url(#stellaDuneFar)" />
          <path d="M0 275Q150 215 302 260T555 238T800 250V360H0Z" fill="#20424A" />
          <path d="M0 315Q160 270 330 302T610 278T800 290V360H0Z" fill="url(#stellaDuneNear)" opacity=".74" />
          <path d="M580 207V142h40v65m-48-65 28-39 28 39m-28-39V80m-12 12h24" fill="#102A36" stroke="#E4B85A" strokeWidth="3" strokeLinejoin="round" />
          <path d="M611 165h10v12h-10m-18 17h15v13h-15m39-13h15v13h-15" fill="#E9C16A" opacity=".8" />
          <path d="M48 318Q230 290 410 310T746 277" fill="none" stroke="#E5B85F" strokeWidth="3" strokeDasharray="4 13" strokeLinecap="round" opacity=".8" />
          <g className="stella-cloud-drift" fill="#B7D1D1" opacity=".12">
            <path d="M176 112c0-10 8-18 18-18 5-15 28-17 36-2 13-1 20 14 12 23h-58c-5 0-8-1-8-3Z" />
            <path d="M390 78c0-8 7-14 15-14 4-12 22-13 28-2 10-1 15 11 9 18h-45c-4 0-7-1-7-2Z" />
          </g>
          <g className="stella-cloud-drift stella-cloud-drift-slow" fill="#B7D1D1" opacity=".09">
            <path d="M72 184c0-6 5-11 12-11 3-9 16-10 21-1 8-1 11 8 7 13H78c-4 0-6 0-6-1Z" />
          </g>
          <g fill="#F5D98C">
            <circle cx="95" cy="148" r="2" /><circle cx="258" cy="125" r="2" /><circle cx="442" cy="160" r="2" /><circle cx="722" cy="98" r="2" /><circle cx="540" cy="80" r="1.5" />
          </g>
        </svg>

        <div className="relative z-10 flex min-h-[250px] flex-col justify-between gap-5 sm:min-h-[270px] sm:flex-row sm:items-end sm:gap-7">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#79CDD0]/25 bg-[#14313D]/80 px-3 py-1.5 text-[11px] font-black text-[#A7DCD7] backdrop-blur">
              <Sparkles size={13} className="text-[#F5D98C]" />
              {isArabic ? 'مغامرة تعلمك تبدأ من هنا' : 'Your next chapter starts here'}
            </span>
            {isGuest && (
              <span className="ms-2 inline-flex items-center rounded-full border border-[#E5B85F]/35 bg-[#392F1E]/80 px-3 py-1.5 text-[10px] font-extrabold text-[#F5D98C]">
                {isArabic ? 'معاينة ضيف · بيانات تجريبية' : 'Guest preview · demo data'}
              </span>
            )}
            <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight sm:text-5xl">
              {isArabic ? `أهلاً يا ${displayName}` : `Welcome, ${displayName}`}
              <span aria-hidden="true" className="ms-2 inline-block text-[#F5D98C]">✦</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#D1E0E2] sm:text-base">
              {isArabic
                ? 'خطوة وراء خطوة، اكتشف حكايات الإيمان وامشِ في درب الأنبا موسى.'
                : 'Follow the lanterns, discover stories of faith, and walk the path of St. Moses.'}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={() => onNavigate('points')} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#E5B85F]/30 bg-[#172B36]/90 px-3.5 text-xs font-extrabold text-[#F5D98C] shadow-lg transition hover:bg-[#243D48] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F5D98C]">
                <Star size={15} className="fill-current" /> {user.points} {isArabic ? 'نقطة' : 'points'}
              </button>
              <span className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#79CDD0]/25 bg-[#122B36]/90 px-3.5 text-xs font-extrabold text-[#B9E4DE] shadow-lg">
                <Flame size={15} className="text-[#F0A27A]" /> {user.currentStreak ?? 0} {isArabic ? 'أيام مواظبة' : 'day streak'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 self-start rounded-2xl border border-white/10 bg-[#102431]/80 px-4 py-3 backdrop-blur sm:self-end">
            <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#E5B85F] bg-[#1B3B47] text-xl">✝</span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9BB9BE]">{isArabic ? 'محطات الرحلة' : 'Journey progress'}</p>
              <p className="mt-0.5 text-sm font-black text-white">
                {curriculumLoading
                  ? (isArabic ? 'جاري تحميل المنهج' : 'Loading curriculum')
                  : totalLessons > 0
                    ? `${completedLessons.length} / ${totalLessons} · ${progress}%`
                    : (isArabic ? 'في انتظار المنهج' : 'Curriculum pending')}
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,.8fr)]">
        <div className="relative overflow-hidden rounded-[1.75rem] border border-[#435361] bg-[#14232C] p-5 text-white shadow-xl sm:p-7">
          <div aria-hidden="true" className="absolute -end-16 -top-20 h-52 w-52 rounded-full bg-[#E5B85F]/10 blur-3xl" />
          <div className="relative flex h-full flex-col">
            <div className="flex items-center gap-2 text-[#F5D98C]">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#29424B]"><BookOpen size={18} /></span>
              <span className="text-[11px] font-black uppercase tracking-[.18em]">{isArabic ? 'محطتك التالية' : 'Your next lesson'}</span>
            </div>
            {curriculumLoading ? (
              <div role="status" className="flex min-h-40 flex-1 flex-col items-center justify-center gap-3 text-sm text-slate-300">
                <LoaderCircle className="animate-spin text-[#F5D98C]" size={25} />
                {isArabic ? 'نبحث عن محطتك التالية...' : 'Finding your next lesson…'}
              </div>
            ) : curriculumError ? (
              <div className="mt-5 flex flex-1 flex-col items-start justify-center gap-3">
                <p className="text-sm leading-relaxed text-[#F0C9B9]">{isArabic ? 'تعذر تحميل دروس فصلك.' : 'Your class lessons could not be loaded.'}</p>
                <button type="button" onClick={onRetryCurriculum} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#1D5256] px-4 text-sm font-extrabold text-white hover:bg-[#276B67] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F5D98C]">
                  <RefreshCw size={15} /> {isArabic ? 'إعادة المحاولة' : 'Try again'}
                </button>
              </div>
            ) : nextLesson ? (
              <>
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[#79CDD0]/30 bg-[#183841] px-2.5 py-1 text-[10px] font-extrabold text-[#A8DEDA]">
                    {nextLesson.category === 'hymns' ? (isArabic ? 'ألحان' : 'Hymns') : nextLesson.category === 'history' ? (isArabic ? 'تاريخ الكنيسة' : 'Church history') : (isArabic ? 'مدرسة الأحد' : 'Sunday School')}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
                    <Clock3 size={12} /> {isArabic ? 'درس من منهج فصلك' : 'From your class curriculum'}
                  </span>
                </div>
                <h2 className="mt-4 text-2xl font-black leading-tight sm:text-3xl">{lessonTitle}</h2>
                <p className="mt-2 line-clamp-3 max-w-2xl text-sm leading-relaxed text-slate-300">{lessonSummary}</p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button type="button" onClick={() => onNavigate('lessons', nextLesson.id)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#E5B85F] px-5 text-sm font-black text-[#13252D] shadow-lg shadow-black/20 transition hover:bg-[#F0CC7D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5D98C]">
                    {isArabic ? 'ابدأ الدرس' : 'Begin lesson'} <ChevronRight size={17} className={isArabic ? 'rotate-180' : ''} />
                  </button>
                  <button type="button" onClick={() => onNavigate('lessons')} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs font-bold text-slate-300 transition hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F5D98C]">
                    {isArabic ? 'كل الدروس' : 'All lessons'} <ArrowUpRight size={14} />
                  </button>
                </div>
              </>
            ) : (
              <div className="mt-5 flex flex-1 flex-col items-start justify-center">
                <span className="text-3xl" aria-hidden="true">🏜️</span>
                <h2 className="mt-3 text-xl font-black">{isArabic ? 'الطريق جاهز لك' : 'Your path is waiting'}</h2>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-300">
                  {totalLessons > 0
                    ? (isArabic ? 'أكملت كل الدروس المتاحة في منهج فصلك. عد لاحقاً لمحطات جديدة.' : 'You have completed every available class lesson. Come back for new stops.')
                    : (isArabic ? 'لا توجد دروس متاحة لفصلك الآن. سنعرضها هنا فور نشرها.' : 'No class lessons are available yet. New lessons will appear here when published.')}
                </p>
                {!totalLessons && (
                  <button type="button" onClick={() => onNavigate('lessons')} className="mt-4 min-h-10 rounded-xl border border-white/15 px-4 text-sm font-bold text-white hover:bg-white/5">
                    {isArabic ? 'استكشف مكتبة الدروس' : 'Explore lessons'}
                  </button>
                )}
              </div>
            )}
            {nextLesson?.pointsAvailable ? (
              <p className="mt-5 border-t border-white/10 pt-3 text-[11px] font-semibold text-slate-400">
                {isArabic ? 'نقاط متاحة عند إكمال الدرس بنجاح' : 'Points are awarded after successful lesson completion'}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex-1 rounded-[1.75rem] border border-[#31505B] bg-gradient-to-br from-[#163543] to-[#10232E] p-5 text-white shadow-xl sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#9ACDCB]">{isArabic ? 'تقدمك الحقيقي' : 'Your real progress'}</p>
                <h2 className="mt-1 text-lg font-black">{isArabic ? 'رحلة التعلم' : 'Learning journey'}</h2>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#24535A] text-[#F5D98C]"><Trophy size={19} /></span>
            </div>
            {curriculumLoading ? (
              <div role="status" className="mt-6 flex items-center gap-2 text-sm text-slate-300"><LoaderCircle size={16} className="animate-spin" />{isArabic ? 'جاري تحميل التقدم...' : 'Loading progress…'}</div>
            ) : curriculumError ? (
              <div className="mt-4">
                <p className="text-sm text-[#F0C9B9]">{isArabic ? 'التقدم غير متاح حتى يكتمل تحميل المنهج.' : 'Progress is unavailable until the curriculum loads.'}</p>
                <button type="button" onClick={onRetryCurriculum} className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-xs font-bold text-[#F5D98C] hover:bg-white/5"><RefreshCw size={13} />{isArabic ? 'إعادة المحاولة' : 'Try again'}</button>
              </div>
            ) : totalLessons > 0 ? (
              <>
                <div className="mt-5 flex items-end justify-between gap-3">
                  <p className="text-4xl font-black tabular-nums">{progress}<span className="ms-1 text-xl text-[#A7C6C9]">%</span></p>
                  <p className="pb-1 text-xs font-bold text-[#C3D7D9]">{completedLessons.length} / {totalLessons} {isArabic ? 'دروس' : 'lessons'}</p>
                </div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#091A23]" role="progressbar" aria-label={isArabic ? 'تقدم الدروس' : 'Lesson progress'} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full rounded-full bg-gradient-to-r from-[#4BB79D] to-[#E5B85F] transition-[width] duration-700" style={{ width: `${progress}%` }} />
                </div>
                <p className="mt-3 text-xs leading-relaxed text-[#B8CDD0]">
                  {completedLessons.length > 0
                    ? (isArabic ? `أحسنت! أتممت ${completedLessons.length} ${completedLessons.length === 1 ? 'درس' : 'دروس'} في رحلتك.` : `Well done — ${completedLessons.length} ${completedLessons.length === 1 ? 'lesson' : 'lessons'} completed on your trail.`)
                    : (isArabic ? 'ابدأ أولى خطواتك في رحلة التعلم.' : 'Take your first step on the learning trail.')}
                </p>
              </>
            ) : (
              <p className="mt-5 rounded-xl border border-white/10 bg-white/[.04] p-3 text-sm leading-relaxed text-[#C3D7D9]">
                {isArabic ? 'سيظهر تقدمك هنا عندما يتوفر منهج فصلك.' : 'Your progress will appear here when your class curriculum is available.'}
              </p>
            )}
          </div>
          <button type="button" onClick={() => onNavigate('points')} className="flex min-h-[76px] items-center justify-between gap-3 rounded-[1.5rem] border border-[#5C4E37] bg-[#29291F] px-5 py-4 text-start text-white transition hover:border-[#E5B85F]/70 hover:bg-[#323126] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F5D98C]">
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6A542E] text-[#FFE29B]"><Star size={18} className="fill-current" /></span>
              <span><span className="block text-xs font-black">{isArabic ? 'رصيد نقاطك' : 'Your points'}</span><span className="block text-[10px] text-[#C5B99E]">{isArabic ? 'افتح صفحة إنجازاتك' : 'View your achievements'}</span></span>
            </span>
            <span className="text-lg font-black tabular-nums text-[#F5D98C]">{user.points}<ArrowUpRight size={14} className="ms-1 inline" /></span>
          </button>
        </div>
      </section>

      <JourneyPath
        lessons={lessons}
        completedLessons={completedLessons}
        nextLesson={nextLesson}
        lang={lang}
        onNavigate={onNavigate}
        reduceMotion={Boolean(reduceMotion)}
      />

      {completedLessons.length > 0 && (
        <MosesJourneyBadge
          completedLessonsCount={completedLessons.length}
          lastCompletedLessonTitle={isArabic
            ? completedLessons[completedLessons.length - 1].titleAr || completedLessons[completedLessons.length - 1].title
            : completedLessons[completedLessons.length - 1].title}
          lang={lang}
          onExploreMore={() => onNavigate('lessons')}
          isRecentCompletion={false}
        />
      )}

      <StudentFeatureLinks lang={lang} onNavigate={onNavigate} />

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-[1.75rem] border border-[#635638] bg-[#28291F] shadow-xl [&>div]:!min-h-[210px] [&>div]:!rounded-none [&>div]:!bg-none [&>div]:!p-6 [&>div]:!text-[#FFF4D8] [&_p]:!text-[#FFF4D8] [&_span]:!text-[#F2D991]">
          <BibleVerseCard lang={lang} />
        </div>
        <FeedPreview lang={lang} onNavigate={onNavigate} />
      </section>
    </main>
  );
}
