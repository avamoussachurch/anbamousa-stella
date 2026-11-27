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
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import type { Language, Lesson, User } from '../../types';
import type { ExtendedPost } from '../../lib/feedService';
import { fetchFeedPostsFromSupabase } from '../../lib/feedService';
import { BibleVerseCard } from '../shared/BibleVerseCard';
import { StudentFeatureLinks } from './StudentFeatureLinks';

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
    <section className="stella-journey-path relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#102433] p-5 text-white shadow-[0_24px_70px_-38px_rgba(0,0,0,.8)] sm:p-7">
      <div aria-hidden="true" className="absolute -end-24 -top-32 h-72 w-72 rounded-full bg-[#E6B75A]/10 blur-3xl" />
      <div className="relative z-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[.2em] text-[#E8C574]">
            {isArabic ? 'رحلتك في البرية' : 'Your learning trail'}
          </p>
          <h2 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">
            {isArabic ? 'رحلة الأنبا موسى' : 'The Journey of Moses'}
          </h2>
        </div>
        <p className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-200">
          {isArabic
            ? `${completedLessons.length} من ${lessons.length} دروس خلّصتها`
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
                      ? (isArabic ? 'مقفول، خلّص المحطة اللي قبله الأول' : 'Locked, finish the previous lesson first')
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
                          ? (isArabic ? 'خلصت' : 'Completed')
                          : isCurrent
                            ? (isArabic ? 'الدرس اللي جاي' : 'Up next')
                            : isLocked
                              ? (isArabic ? 'مقفول — خلّص الدرس اللي قبله' : 'Locked — finish the previous lesson')
                              : (isArabic ? 'جاهز تبدأه' : 'Ready to explore')}
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
            ? 'محطات رحلتك هتظهر هنا أول ما منهج فصلك يبقى متاح.'
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
        setError(result.error?.message || (isArabic ? 'مش قادرين نحمّل المنشورات دلوقتي.' : 'Posts are unavailable right now.'));
        setPosts([]);
      } else {
        setPosts(result.data.slice(0, 2));
      }
      setLoading(false);
    }).catch(reason => {
      if (!active) return;
      setError(reason instanceof Error ? reason.message : (isArabic ? 'مش قادرين نحمّل المنشورات دلوقتي.' : 'Posts are unavailable right now.'));
      setPosts([]);
      setLoading(false);
    });
    return () => { active = false; };
  }, [isArabic, reload]);

  return (
    <section className="stella-community-card rounded-[1.75rem] border border-[#29414C] bg-[#101E28] p-5 text-white sm:p-6">
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
            <LoaderCircle size={16} className="animate-spin" /> {isArabic ? 'بنحمّل المنشورات...' : 'Loading community posts…'}
          </div>
        ) : error ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#765640] bg-[#34291F] p-4 text-sm text-[#F0D8B8]">
            <span>{isArabic ? 'المنشورات مش متاحة دلوقتي.' : 'Community posts are unavailable right now.'}</span>
            <button type="button" onClick={() => setReload(value => value + 1)} className="inline-flex min-h-9 items-center gap-2 rounded-lg px-2 font-bold hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F5D98C]">
              <RefreshCw size={14} /> {isArabic ? 'جرّب تاني' : 'Try again'}
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[.035] p-4 text-sm text-slate-300">
            {isArabic ? 'لسه مفيش منشورات جديدة. خليك أول واحد يشارك!' : 'No community posts yet. Check back soon.'}
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
  const displayName = isGuest
    ? (isArabic ? 'يا صاحبي' : 'friend')
    : user.fullName.trim().split(/\s+/)[0] || (isArabic ? 'يا صاحبي' : 'friend');
  const lessonTitle = nextLesson && (isArabic ? nextLesson.titleAr || nextLesson.title : nextLesson.title);
  const lessonSummary = nextLesson && (isArabic ? nextLesson.summaryAr || nextLesson.summary : nextLesson.summary);
  const openPointsView = (view: 'streak' | 'leaderboard') => {
    try { window.sessionStorage.setItem('anba-points-initial-view', view); } catch { /* storage may be unavailable */ }
    window.dispatchEvent(new CustomEvent('anba:points-view', { detail: view }));
    onNavigate('points');
  };

  return (
    <main className="stella-student-home mx-auto w-full max-w-[1440px] space-y-5 px-4 pb-28 pt-5 sm:space-y-7 sm:px-7 lg:px-10" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="stella-adventure-hero relative isolate min-h-[360px] overflow-hidden rounded-[2rem] border border-[#34505E] bg-[#0A1925] px-5 py-6 text-white shadow-[0_24px_65px_-38px_rgba(0,0,0,.65)] sm:min-h-[410px] sm:px-9 sm:py-8"
      >
        <AdventureStars reduceMotion={Boolean(reduceMotion)} />
        <motion.span aria-hidden="true" className="pointer-events-none absolute end-[12%] top-[18%] z-[1] text-2xl drop-shadow-[0_0_12px_rgba(245,217,140,.75)] sm:end-[18%] sm:top-[20%]" animate={reduceMotion ? undefined : { y: [0, -7, 0], rotate: [-4, 4, -4] }} transition={reduceMotion ? { duration: 0 } : { duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}>🏮</motion.span>
        <div aria-hidden="true" className="absolute -end-14 -top-24 h-72 w-72 rounded-full bg-[#E7B956]/15 blur-[75px]" />
        <svg aria-hidden="true" viewBox="0 0 900 430" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full opacity-100" style={isArabic ? { transform: 'scaleX(-1)' } : undefined}>
          <defs>
            <linearGradient id="anbaSky" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#123E56"/><stop offset=".58" stopColor="#277A82"/><stop offset="1" stopColor="#E7B96C"/></linearGradient>
            <linearGradient id="anbaStone" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#F7E6C5"/><stop offset="1" stopColor="#C9A879"/></linearGradient>
            <linearGradient id="anbaShadow" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#8C6948"/><stop offset="1" stopColor="#4D4A43"/></linearGradient>
            <radialGradient id="anbaHalo"><stop stopColor="#FFF2BE" stopOpacity=".95"/><stop offset="1" stopColor="#F5C86B" stopOpacity="0"/></radialGradient>
          </defs>
          <rect width="900" height="430" fill="url(#anbaSky)"/>
          <circle cx="680" cy="92" r="112" fill="url(#anbaHalo)"/>
          <circle cx="680" cy="92" r="39" fill="#FFE6A2" opacity=".88"/>
          <path d="M0 270 Q170 210 330 255T650 235T900 250V430H0Z" fill="#39756F"/>
          <path d="M0 315 Q200 270 390 310T720 280T900 300V430H0Z" fill="#285A58"/>
          <g opacity=".45" fill="#D4E5D4"><path d="M90 95q18-22 40 0q20-18 40 4H90Z"/><path d="M410 70q18-22 40 0q20-18 40 4H410Z"/></g>
          {/* Anba Mousa church courtyard */}
          <ellipse cx="586" cy="372" rx="270" ry="35" fill="#142F3B" opacity=".3"/>
          <path d="M365 258V190Q365 172 383 172H788Q806 172 806 190V258Z" fill="url(#anbaStone)" stroke="#FBEBCB" strokeWidth="4"/>
          <path d="M344 187L585 115L827 187Z" fill="#E7CB9B" stroke="#FBEBCB" strokeWidth="4" strokeLinejoin="round"/>
          <path d="M493 147V95Q493 70 518 70H652Q677 70 677 95V147Z" fill="#DCC194" stroke="#FBEBCB" strokeWidth="4"/>
          <path d="M511 79Q585 5 659 79V99H511Z" fill="#24707A" stroke="#FBEBCB" strokeWidth="4"/>
          <path d="M585 5V-15M575 -5H595" stroke="#F7D98C" strokeWidth="7" strokeLinecap="round"/>
          <path d="M380 172V119Q380 92 406 92H439Q465 92 465 119V172Z" fill="#D8BD91" stroke="#FBEBCB" strokeWidth="4"/>
          <path d="M389 104Q422 55 456 104V120H389Z" fill="#1F6976" stroke="#FBEBCB" strokeWidth="4"/>
          <path d="M736 172V119Q736 92 762 92H795Q821 92 821 119V172Z" fill="#D8BD91" stroke="#FBEBCB" strokeWidth="4"/>
          <path d="M745 104Q778 55 812 104V120H745Z" fill="#1F6976" stroke="#FBEBCB" strokeWidth="4"/>
          <path d="M422 125V158M406 141H438M778 125V158M762 141H794" stroke="#F7D98C" strokeWidth="5" strokeLinecap="round"/>
          <path d="M548 258V211Q548 178 585 178Q622 178 622 211V258Z" fill="#164956" stroke="#F7E7C9" strokeWidth="5"/>
          <path d="M565 258V216Q565 193 585 193Q605 193 605 216V258Z" fill="#F5D38E" opacity=".72"/>
          <path d="M405 208V185Q405 171 419 171Q433 171 433 185V208Z M700 208V185Q700 171 714 171Q728 171 728 185V208Z" fill="#1C5967" stroke="#FFF0D0" strokeWidth="3"/>
          <path d="M585 211V238M574 222H596" stroke="#F9D98C" strokeWidth="5" strokeLinecap="round"/>
          <path d="M480 258V221Q480 200 501 200Q522 200 522 221V258Z M648 258V221Q648 200 669 200Q690 200 690 221V258Z" fill="#1B5662" stroke="#F8E7C6" strokeWidth="3"/>
          {/* Courtyard and processional path */}
          <path d="M548 258L470 430H710L622 258Z" fill="#D6BC91" opacity=".92"/>
          <path d="M584 258L566 430M604 258L635 430" stroke="#F9E7C5" strokeWidth="4" opacity=".65"/>
          <path d="M0 378Q190 337 370 377T900 366V430H0Z" fill="#B58C5A"/>
          <path d="M90 370Q270 330 440 358T830 350" fill="none" stroke="#F6D68D" strokeWidth="5" strokeDasharray="3 17" strokeLinecap="round"/>
          {/* Palm silhouettes */}
          <g stroke="#183E43" strokeWidth="8" strokeLinecap="round" fill="none"><path d="M180 337Q188 240 176 172"/><path d="M176 172q-64-56-95-10q50-18 95 10q-8-70 39-83q-28 44-39 83q45-52 87-19q-50 2-87 19q61 8 66 51q-34-30-66-51"/><path d="M820 338Q814 250 828 190"/><path d="M828 190q-58-51-89-9q47-16 89 9q-7-64 37-76q-27 41-37 76q42-48 81-18q-47 2-81 18q57 8 61 48q-32-28-61-48"/></g>
          {/* Lanterns */}
          <g><path d="M287 0V70M278 70H296L292 101H282Z" stroke="#F5D98C" strokeWidth="3" fill="#E9B95E"/><circle cx="287" cy="85" r="18" fill="#FFE8A5" opacity=".18"/><path d="M852 35V92M844 92H860L856 120H848Z" stroke="#F5D98C" strokeWidth="3" fill="#E9B95E"/></g>
          <g fill="#FFE6A2"><circle cx="95" cy="150" r="3"/><circle cx="300" cy="130" r="2"/><circle cx="715" cy="48" r="2"/><circle cx="872" cy="175" r="2"/></g>
        </svg>
        <div aria-hidden="true" className={`pointer-events-none absolute inset-0 z-[1] ${isArabic ? 'bg-gradient-to-l' : 'bg-gradient-to-r'} from-[#0A2433]/95 via-[#0A2433]/68 to-transparent`} />

        <div className="relative z-10 flex min-h-[300px] flex-col justify-between gap-5 sm:min-h-[340px] sm:flex-row sm:items-end sm:gap-7">
          <div className="max-w-2xl sm:max-w-[min(58%,42rem)]">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#79CDD0]/25 bg-[#14313D]/80 px-3 py-1.5 text-[11px] font-black text-[#A7DCD7] backdrop-blur">
              <Sparkles size={13} className="text-[#F5D98C]" />
              {isArabic ? 'مغامرتك التعليمية بتبدأ من هنا' : 'Your next chapter starts here'}
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
                ? 'خطوة ورا خطوة، اكتشف حكايات الإيمان وكمّل رحلتك مع الأنبا موسى.'
                : 'Follow the lanterns, discover stories of faith, and walk the path of St. Moses.'}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={() => openPointsView('leaderboard')} aria-label={isArabic ? 'افتح ترتيب النقاط' : 'Open points leaderboard'} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#E5B85F]/30 bg-[#172B36]/90 px-3.5 text-xs font-extrabold text-[#F5D98C] shadow-lg transition hover:bg-[#243D48] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F5D98C]">
                <Star size={15} className="fill-current" /> {user.points} {isArabic ? 'نقطة' : 'points'}
              </button>
              <button type="button" onClick={() => openPointsView('streak')} aria-label={isArabic ? 'افتح نجوم المواظبة' : 'Open streak stars leaderboard'} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#79CDD0]/25 bg-[#122B36]/90 px-3.5 text-xs font-extrabold text-[#B9E4DE] shadow-lg transition hover:border-[#9EE0D4]/70 hover:bg-[#1A3D48] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F5D98C]">
                <Flame size={15} className="text-[#F0A27A]" /> {user.currentStreak ?? 0} {isArabic ? 'أيام مواظبة' : 'day streak'}
              </button>
            </div>
          </div>
      </div>
      </motion.section>

      <div aria-hidden="true" className={`pointer-events-none absolute inset-x-0 mx-auto mt-[-2rem] h-24 max-w-5xl rounded-full blur-3xl ${isArabic ? 'bg-[#D6A74D]/10' : 'bg-[#43B8B0]/10'}`} />

      <section className="stella-mission-stage grid gap-4">
        <div className="stella-home-next-card relative overflow-hidden rounded-[1.75rem] border border-[#435361] bg-[#14232C] p-5 text-white shadow-xl sm:p-7">
          <div aria-hidden="true" className="absolute -end-16 -top-20 h-52 w-52 rounded-full bg-[#E5B85F]/10 blur-3xl" />
          <div className="relative flex h-full flex-col">
            <div className="flex items-center gap-2 text-[#F5D98C]">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#29424B]"><BookOpen size={18} /></span>
              <span className="text-[11px] font-black uppercase tracking-[.18em]">{isArabic ? 'مهمتك القادمة' : 'Your next mission'}</span>
            </div>
            {curriculumLoading ? (
              <div role="status" className="flex min-h-40 flex-1 flex-col items-center justify-center gap-3 text-sm text-slate-300">
                <LoaderCircle className="animate-spin text-[#F5D98C]" size={25} />
                {isArabic ? 'نبحث عن درسك الجاي...' : 'Finding your next lesson…'}
              </div>
            ) : curriculumError ? (
              <div className="mt-5 flex flex-1 flex-col items-start justify-center gap-3">
                <p className="text-sm leading-relaxed text-[#F0C9B9]">{isArabic ? 'تعذر تحميل دروس فصلك.' : 'Your class lessons could not be loaded.'}</p>
                <button type="button" onClick={onRetryCurriculum} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#1D5256] px-4 text-sm font-extrabold text-white hover:bg-[#276B67] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F5D98C]">
                  <RefreshCw size={15} /> {isArabic ? 'جرّب تاني' : 'Try again'}
                </button>
              </div>
            ) : nextLesson ? (
              <>
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[#79CDD0]/30 bg-[#183841] px-2.5 py-1 text-[10px] font-extrabold text-[#A8DEDA]">
                    {nextLesson.category === 'hymns' ? (isArabic ? 'ألحان' : 'Hymns') : nextLesson.category === 'history' ? (isArabic ? 'تاريخ الكنيسة' : 'Church history') : (isArabic ? 'مدرسة الأحد' : 'Sunday School')}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
                    <Clock3 size={12} /> {isArabic ? 'من منهج فصلك' : 'From your class curriculum'}
                  </span>
                </div>
                <h2 className="mt-4 text-2xl font-black leading-tight sm:text-3xl">{lessonTitle}</h2>
                <p className="mt-2 line-clamp-3 max-w-2xl text-sm leading-relaxed text-slate-300">{lessonSummary}</p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button type="button" onClick={() => onNavigate('lessons', nextLesson.id)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#E5B85F] px-5 text-sm font-black text-[#13252D] shadow-lg shadow-black/20 transition hover:bg-[#F0CC7D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5D98C]">
                    {isArabic ? 'يلا نبدأ الدرس' : 'Begin lesson'} <ChevronRight size={17} className={isArabic ? 'rotate-180' : ''} />
                  </button>
                  <button type="button" onClick={() => onNavigate('lessons')} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs font-bold text-slate-300 transition hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F5D98C]">
                    {isArabic ? 'كل الدروس' : 'All lessons'} <ArrowUpRight size={14} />
                  </button>
                </div>
              </>
            ) : (
              <div className="mt-5 flex flex-1 flex-col items-start justify-center">
                <span className="text-3xl" aria-hidden="true">🏜️</span>
                <h2 className="mt-3 text-xl font-black">{isArabic ? 'محطتك القادمة قيد التجهيز' : 'Your next chapter is being prepared'}</h2>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-300">
                  {totalLessons > 0
                    ? (isArabic ? 'أكملت كل الدروس المتاحة في منهج فصلك. عد لاحقاً لمحطات جديدة.' : 'You have completed every available class lesson. Come back for new stops.')
                    : (isArabic ? 'لا توجد دروس متاحة لفصلك الآن. سنعرضها هنا فور نشرها.' : 'No class lessons are available yet. New lessons will appear here when published.')}
                </p>
                {!totalLessons && (
                  <button type="button" onClick={() => onNavigate('lessons')} className="mt-4 min-h-10 rounded-xl border border-white/15 px-4 text-sm font-bold text-white hover:bg-white/5">
                    {isArabic ? 'اكتشف مكتبة الدروس' : 'Explore lessons'}
                  </button>
                )}
              </div>
            )}
            {nextLesson?.pointsAvailable ? (
              <p className="mt-5 border-t border-white/10 pt-3 text-[11px] font-semibold text-slate-400">
                {isArabic ? 'هتكسب نقاط لما تكمّل الدرس' : 'Points are awarded after successful lesson completion'}
              </p>
            ) : null}
          </div>
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


      <StudentFeatureLinks lang={lang} onNavigate={onNavigate} />

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="stella-verse-shell min-w-0">
          <BibleVerseCard lang={lang} />
        </div>
        <FeedPreview lang={lang} onNavigate={onNavigate} />
      </section>
    </main>
  );
}
