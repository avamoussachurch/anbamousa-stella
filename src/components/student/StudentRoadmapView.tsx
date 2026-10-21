import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  Lock, 
  Play, 
  Sparkles, 
  Star, 
  Compass, 
  Trophy, 
  AlertCircle, 
  BookOpen, 
  Scroll, 
  ChevronRight, 
  Footprints,
  Crown,
  Info,
  X
} from 'lucide-react';
import { Lesson, Language } from '../../types';
import { formatStudentClassDisplay } from '../../lib/classGroups';

export type CheckpointState = 'completed' | 'current' | 'available' | 'locked';

export interface RoadmapNode {
  index: number;
  lesson: Lesson;
  state: CheckpointState;
  prerequisiteLesson?: Lesson;
  starsEarned: number;
  xOffsetPercent: number; // -38 to +38
}

interface StudentRoadmapViewProps {
  lessons: Lesson[];
  onStartLesson: (id: string) => void;
  lang: Language;
  isTeacher?: boolean;
  studentName?: string;
  studentAvatar?: string;
  studentGrade?: string;
  className?: string;
}

// Desert oasis waypoints along the Journey of Moses
const DESERT_WAYPOINTS = [
  { atIndex: 0, titleAr: 'واحة البداية المباركة', titleEn: 'Oasis of Blessed Beginnings', icon: '🌴' },
  { atIndex: 3, titleAr: 'نبع ماء وادي النطرون', titleEn: 'Wadi Al-Natrun Desert Spring', icon: '💧' },
  { atIndex: 6, titleAr: 'صخرة الصلاة والتسبيح', titleEn: 'The Rock of Prayer & Praise', icon: '⛪' },
  { atIndex: 9, titleAr: 'حصن برية شيهيت العظيم', titleEn: 'Great Fortress of Scetis', icon: '🏰' },
  { atIndex: 12, titleAr: 'قمة جبل سيناء المبارك', titleEn: 'Mount Sinai Summit', icon: '⛰️' },
  { atIndex: 15, titleAr: 'بستان رهبان البرية', titleEn: 'Garden of Desert Fathers', icon: '🕊️' },
];

export function StudentRoadmapView({
  lessons,
  onStartLesson,
  lang,
  isTeacher = false,
  studentName,
  studentAvatar,
  studentGrade,
  className = ''
}: StudentRoadmapViewProps) {
  const isAr = lang === 'ar';
  const isCop = lang === 'copt' || lang === 'cop';

  const [selectedLockedNode, setSelectedLockedNode] = useState<RoadmapNode | null>(null);

  // Derive nodes from real ordered curriculum
  const { nodes, completedCount, currentMilestoneIndex, nextLesson } = useMemo(() => {
    // Curate real lessons in natural curriculum order
    const sorted = [...lessons].sort((a, b) => {
      // Sort by date ascending if available, or maintain given curriculum order
      if (a.date && b.date) {
        return a.date.localeCompare(b.date);
      }
      return 0;
    });

    let currentFound = false;
    let completedSoFar = 0;
    let currentIndex = -1;
    let next: Lesson | null = null;

    // Sinusoidal winding curve x-offsets: alternating smoothly down the page
    // Pattern: 0, 30, 40, 20, -15, -38, -25, 10, 35, 30, -10, -35...
    const getXOffset = (idx: number) => {
      const angle = (idx * 1.15) + 0.3;
      return Math.sin(angle) * 35; // percentage: -35% to +35%
    };

    const roadmapNodes: RoadmapNode[] = sorted.map((lesson, idx) => {
      const isCompleted = Boolean(lesson.isCompleted);
      if (isCompleted) completedSoFar++;

      let state: CheckpointState = 'locked';
      const prevLesson = idx > 0 ? sorted[idx - 1] : undefined;
      const isPrevCompleted = idx === 0 || Boolean(prevLesson?.isCompleted) || isTeacher;

      if (isCompleted) {
        state = 'completed';
      } else if (isPrevCompleted) {
        if (!currentFound) {
          state = 'current';
          currentFound = true;
          currentIndex = idx;
          next = lesson;
        } else {
          state = 'available';
        }
      } else {
        state = 'locked';
      }

      return {
        index: idx,
        lesson,
        state,
        prerequisiteLesson: prevLesson,
        starsEarned: isCompleted ? 3 : 0,
        xOffsetPercent: getXOffset(idx)
      };
    });

    // If all completed or none current, default currentIndex
    if (currentIndex === -1 && sorted.length > 0) {
      if (completedSoFar === sorted.length) {
        currentIndex = sorted.length - 1;
      } else {
        currentIndex = 0;
        next = sorted[0];
      }
    }

    return {
      nodes: roadmapNodes,
      completedCount: completedSoFar,
      currentMilestoneIndex: currentIndex,
      nextLesson: next
    };
  }, [lessons, isTeacher]);

  const totalLessons = nodes.length;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const handleNodeClick = (node: RoadmapNode) => {
    if (node.state === 'locked' && !isTeacher) {
      setSelectedLockedNode(node);
      return;
    }
    onStartLesson(node.lesson.id);
  };

  // Empty state if no lessons published for this student's grade/class
  if (totalLessons === 0) {
    return (
      <div className="bg-[var(--mousa-cream-surface)] dark:bg-[#1E1914] rounded-3xl p-8 sm:p-12 text-center border-2 border-[var(--mousa-border-sand)] max-w-xl mx-auto shadow-sm space-y-4">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-100 dark:bg-amber-950/60 text-4xl flex items-center justify-center border-2 border-amber-300 dark:border-amber-800 shadow-inner">
          ⛺
        </div>
        <h3 className="text-xl sm:text-2xl font-black text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB]">
          {isCop ? 'Ⲙ̀ⲙⲟⲛ ϩⲁⲛⲥⲃⲱ ⲉⲧϩⲓⲱⲓϣ ϯⲛⲟⲩ' : isAr ? 'خيمة الانتظار في البرية' : 'Waiting in the Desert Sanctuary'}
        </h3>
        <p className="text-xs sm:text-sm text-[var(--mousa-sand-600)] dark:text-[var(--mousa-sand-400)] max-w-md mx-auto leading-relaxed">
          {isAr 
            ? 'يقوم خدام فصلك الكنسي حالياً بإعداد وتدقيق محطات منهج مدارس الأحد لمرحلتك. ستظهر أولى محطات رحلتك هنا فور نشرها!' 
            : 'Your Sunday School servants are currently preparing milestones for your class. Your roadmap will appear here as soon as the first lesson is published!'}
        </p>
      </div>
    );
  }

  return (
    <div className={`relative w-full max-w-2xl mx-auto pb-12 ${className}`} dir={isAr ? 'rtl' : 'ltr'}>
      {/* 1. Header Progress Bar & Current Position Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-2 z-30 mb-8 bg-[var(--mousa-cream-surface)]/95 dark:bg-[#1C1814]/95 backdrop-blur-md rounded-2xl p-4 border-2 border-[var(--mousa-border-sand)] shadow-md space-y-3"
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[var(--mousa-gold)] to-[var(--mousa-coral)] p-0.5 shadow-xs shrink-0">
              <img 
                src={studentAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=student`} 
                alt="Student" 
                className="w-full h-full rounded-xl object-cover bg-white" 
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB]">
                  {studentName || (isAr ? 'رفيق المسيرة' : 'Wayfarer')}
                </span>
                {studentGrade && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[var(--mousa-sand-100)] text-[var(--mousa-sand-600)] dark:text-[var(--mousa-sand-400)] border border-[var(--mousa-border-sand)]">
                    {studentGrade}
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--mousa-sand-600)] dark:text-[var(--mousa-sand-400)] font-bold flex items-center gap-1">
                <Footprints size={12} className="text-[var(--mousa-gold-dark)]" />
                <span>
                  {isAr 
                    ? `المحطة ${Math.min(completedCount + 1, totalLessons)} من ${totalLessons}` 
                    : `Milestone ${Math.min(completedCount + 1, totalLessons)} of ${totalLessons}`}
                </span>
              </p>
            </div>
          </div>

          {/* Quick Continue Button to Next Milestone */}
          {nextLesson && (
            <button
              onClick={() => onStartLesson(nextLesson!.id)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[var(--mousa-gold)] to-[var(--mousa-coral)] hover:brightness-105 text-white font-black text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
            >
              <Play size={13} fill="currentColor" />
              <span>{isAr ? 'تابع مسيرتك' : 'Continue'}</span>
            </button>
          )}
        </div>

        {/* Progress Bar with Sunrise Gradient */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[11px] font-black text-stone-600 dark:text-stone-300">
            <span>{isAr ? 'إنجاز طريق البرية' : 'Trail Progress'}</span>
            <span className="text-[var(--mousa-teal-deep)] dark:text-[var(--mousa-gold-light)]">{progressPercent}% ({completedCount}/{totalLessons})</span>
          </div>
          <div className="w-full h-3 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden p-0.5 border border-[var(--mousa-border-sand)]">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-[var(--mousa-teal)] via-[var(--mousa-gold)] to-[var(--mousa-coral)] shadow-xs"
            />
          </div>
        </div>
      </motion.div>

      {/* 2. The Winding Candy Crush Roadmap Trail */}
      <div className="relative pt-4 pb-16 flex flex-col items-center">
        {nodes.map((node, i) => {
          const isLast = i === nodes.length - 1;
          const nextNode = !isLast ? nodes[i + 1] : null;
          const waypoint = DESERT_WAYPOINTS.find(w => w.atIndex === i);

          const title = isAr 
            ? (node.lesson.titleAr || node.lesson.title) 
            : isCop 
              ? (node.lesson.titleCop || node.lesson.title) 
              : node.lesson.title;

          return (
            <React.Fragment key={node.lesson.id}>
              {/* Optional Scenic Oasis Waypoint Celebration */}
              {waypoint && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  className="my-6 px-4 py-2 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-800/80 shadow-xs flex items-center gap-2 text-xs font-black text-amber-900 dark:text-amber-200 z-10"
                >
                  <span className="text-xl">{waypoint.icon}</span>
                  <span>{isAr ? waypoint.titleAr : waypoint.titleEn}</span>
                </motion.div>
              )}

              {/* Checkpoint Node Container with Calculated Horizontal Offset */}
              <div 
                className="relative my-6 flex flex-col items-center z-10"
                style={{
                  transform: `translateX(${node.xOffsetPercent}%)`
                }}
              >
                {/* Checkpoint Stone Button */}
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => handleNodeClick(node)}
                  className={`group relative rounded-full flex flex-col items-center justify-center transition-all cursor-pointer shadow-lg select-none ${
                    node.state === 'completed'
                      ? 'w-20 h-20 sm:w-22 sm:h-22 bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-700 text-white ring-4 ring-emerald-300 dark:ring-emerald-700'
                      : node.state === 'current'
                        ? 'w-22 h-22 sm:w-24 sm:h-24 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-white ring-4 ring-[var(--mousa-gold)] ring-offset-4 ring-offset-[var(--mousa-cream-surface)] dark:ring-offset-[#1C1814] shadow-amber-500/40 animate-pulse'
                        : node.state === 'available'
                          ? 'w-20 h-20 sm:w-22 sm:h-22 bg-gradient-to-br from-teal-500 via-teal-600 to-teal-800 text-white ring-2 ring-teal-300 dark:ring-teal-700'
                          : 'w-18 h-18 sm:w-20 sm:h-20 bg-stone-200 dark:bg-stone-800 text-stone-500 dark:text-stone-400 ring-2 border-2 border-stone-300 dark:border-stone-700 opacity-80'
                  }`}
                  aria-label={`${title} - ${node.state}`}
                >
                  {/* Floating Indicator for Current Node (Avatar Guide & Start Banner) */}
                  {node.state === 'current' && (
                    <div className="absolute -top-11 flex flex-col items-center pointer-events-none z-20">
                      <div className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-[var(--mousa-coral)] text-white font-black text-[10px] shadow-md flex items-center gap-1 uppercase tracking-wider animate-bounce">
                        <Sparkles size={10} />
                        <span>{isAr ? 'محطتك الحالية' : 'Current Quest'}</span>
                      </div>
                      <div className="w-2 h-2 bg-[var(--mousa-coral)] rotate-45 -mt-1 shadow-2xs" />
                    </div>
                  )}

                  {/* 3 Gold Stars Badge on Completed Nodes */}
                  {node.state === 'completed' && (
                    <div className="absolute -top-3.5 flex items-center justify-center gap-0.5 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-700 shadow-xs z-20">
                      <Star size={11} className="fill-amber-500 text-amber-500" />
                      <Star size={12} className="fill-amber-500 text-amber-500" />
                      <Star size={11} className="fill-amber-500 text-amber-500" />
                    </div>
                  )}

                  {/* Node Center Icon / Milestone Number */}
                  <div className="flex flex-col items-center justify-center">
                    {node.state === 'completed' ? (
                      <CheckCircle2 size={32} className="text-white drop-shadow-md stroke-[2.5]" />
                    ) : node.state === 'current' ? (
                      <div className="flex flex-col items-center">
                        <Play size={28} className="fill-white text-white drop-shadow-md ml-0.5" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-100">
                          #{node.index + 1}
                        </span>
                      </div>
                    ) : node.state === 'available' ? (
                      <div className="flex flex-col items-center">
                        <Compass size={24} className="text-white drop-shadow-sm" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-teal-100">
                          #{node.index + 1}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center opacity-85">
                        <Lock size={20} className="text-stone-500 dark:text-stone-400" />
                        <span className="text-[10px] font-black text-stone-500 dark:text-stone-400 mt-0.5">
                          #{node.index + 1}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Points Pill below node */}
                  <div className="absolute -bottom-2.5 bg-white dark:bg-stone-900 px-2 py-0.5 rounded-full text-[10px] font-black shadow-xs border border-[var(--mousa-border-sand)] whitespace-nowrap text-stone-700 dark:text-stone-200">
                    +{node.lesson.pointsAvailable || 150} {isAr ? 'نقطة' : 'pts'}
                  </div>
                </motion.button>

                {/* Milestone Info Card attached beneath or alongside node */}
                <div 
                  onClick={() => handleNodeClick(node)}
                  className={`mt-4 w-56 sm:w-64 p-3 rounded-2xl border-2 text-center transition-all cursor-pointer shadow-xs ${
                    node.state === 'completed'
                      ? 'bg-emerald-50/90 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/60 hover:border-emerald-400'
                      : node.state === 'current'
                        ? 'bg-amber-50/95 dark:bg-amber-950/50 border-amber-400 dark:border-amber-700 shadow-amber-200/40 hover:border-amber-500 ring-2 ring-amber-300/40'
                        : node.state === 'available'
                          ? 'bg-teal-50/80 dark:bg-teal-950/30 border-teal-300 dark:border-teal-800 hover:border-teal-400'
                          : 'bg-stone-100/80 dark:bg-stone-900/40 border-stone-300 dark:border-stone-800 hover:border-stone-400'
                  }`}
                >
                  <p className="font-extrabold text-xs sm:text-sm text-stone-900 dark:text-stone-100 line-clamp-1">
                    {title}
                  </p>
                  
                  {node.lesson.summary && (
                    <p className="text-[11px] text-stone-600 dark:text-stone-400 line-clamp-2 mt-0.5 leading-snug">
                      {isAr ? (node.lesson.summaryAr || node.lesson.summary) : node.lesson.summary}
                    </p>
                  )}

                  <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] font-black">
                    {node.state === 'completed' ? (
                      <span className="text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        <span>{isAr ? 'مكتمل ✅ اضغط للمراجعة' : 'Completed ✅ Tap to review'}</span>
                      </span>
                    ) : node.state === 'current' ? (
                      <span className="text-amber-800 dark:text-amber-200 flex items-center gap-1">
                        <Play size={10} fill="currentColor" />
                        <span>{isAr ? 'انطلق في المحطة الآن 🚀' : 'Start Milestone Now 🚀'}</span>
                      </span>
                    ) : node.state === 'available' ? (
                      <span className="text-teal-700 dark:text-teal-300 flex items-center gap-1">
                        <Play size={10} fill="currentColor" />
                        <span>{isAr ? 'متاح للدراسة' : 'Available to explore'}</span>
                      </span>
                    ) : (
                      <span className="text-stone-500 dark:text-stone-400 flex items-center gap-1">
                        <Lock size={10} />
                        <span>{isAr ? 'مقفل (انقر لمعرفة المتطلب)' : 'Locked (tap for details)'}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Connecting Trail Segment to Next Node */}
              {nextNode && (
                <div className="relative w-full h-12 flex items-center justify-center pointer-events-none -my-2 overflow-visible">
                  <svg 
                    className="w-full h-20 overflow-visible"
                    viewBox="-100 0 200 40"
                    preserveAspectRatio="none"
                  >
                    <path
                      d={`M ${node.xOffsetPercent * 2} 0 C ${node.xOffsetPercent * 2} 25, ${nextNode.xOffsetPercent * 2} 15, ${nextNode.xOffsetPercent * 2} 40`}
                      fill="none"
                      stroke={
                        node.state === 'completed' && nextNode.state === 'completed'
                          ? '#10b981' // emerald
                          : node.state === 'completed' && nextNode.state === 'current'
                            ? '#f59e0b' // gold/amber
                            : '#d6c7b2' // sandstone
                      }
                      strokeWidth={
                        node.state === 'completed' || nextNode.state === 'current' ? '4' : '3'
                      }
                      strokeDasharray={
                        node.state === 'locked' || nextNode.state === 'locked' ? '6,6' : undefined
                      }
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* 3. Locked Node Explanation Dialog */}
      <AnimatePresence>
        {selectedLockedNode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedLockedNode(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#1E1914] rounded-3xl p-6 max-w-sm w-full border-2 border-[var(--mousa-border-sand)] shadow-xl space-y-4 text-center"
            >
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center text-2xl shadow-inner border border-amber-300">
                🔒
              </div>
              <h4 className="text-lg font-black text-stone-900 dark:text-stone-100">
                {isAr ? 'محطة مقفلة في البرية' : 'Milestone Locked'}
              </h4>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                {isAr ? (
                  <>
                    للوصول إلى درس <strong className="text-stone-900 dark:text-white">"{selectedLockedNode.lesson.titleAr || selectedLockedNode.lesson.title}"</strong>، 
                    يلزم أولاً إتمام المحطة السابقة:{' '}
                    <span className="text-[var(--mousa-coral)] font-black">
                      "{selectedLockedNode.prerequisiteLesson?.titleAr || selectedLockedNode.prerequisiteLesson?.title || 'المحطة السابقة'}"
                    </span>.
                  </>
                ) : (
                  <>
                    To unlock <strong className="text-stone-900 dark:text-white">"{selectedLockedNode.lesson.title}"</strong>, 
                    please first complete the previous milestone:{' '}
                    <span className="text-[var(--mousa-coral)] font-black">
                      "{selectedLockedNode.prerequisiteLesson?.title || 'Previous Milestone'}"
                    </span>.
                  </>
                )}
              </p>
              
              <div className="pt-2 flex gap-2">
                {selectedLockedNode.prerequisiteLesson && (
                  <button
                    onClick={() => {
                      const prevId = selectedLockedNode.prerequisiteLesson!.id;
                      setSelectedLockedNode(null);
                      onStartLesson(prevId);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-[var(--mousa-teal)] text-white font-black text-xs shadow-xs hover:bg-[var(--mousa-teal-deep)] transition-all cursor-pointer"
                  >
                    {isAr ? 'افتح المحطة السابقة' : 'Open Previous'}
                  </button>
                )}
                <button
                  onClick={() => setSelectedLockedNode(null)}
                  className="px-4 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold text-xs hover:bg-stone-200 transition-all cursor-pointer"
                >
                  {isAr ? 'حسناً' : 'Close'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
