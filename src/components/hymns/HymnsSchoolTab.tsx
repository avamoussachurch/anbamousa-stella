import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  Sparkles, 
  CheckCircle2, 
  Mic, 
  Square, 
  Music, 
  Sliders, 
  Repeat, 
  BookOpen, 
  ChevronRight, 
  Award, 
  ExternalLink,
  FileText,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { COPTIC_HYMNS_COLLECTION, CopticHymnItem, HymnLyricLine } from '../../data/hymnsData';
import { useAuth } from '../../context/AuthContext';
import { awardPoints } from '../../lib/pointsService';
import { Language } from '../../types';
import { getHymns } from '../../lib/hymnsService';
import { recordStudentSchoolActivity } from '../../lib/studentProgressService';
import { parseHymnsTaxisLevel } from '../../lib/hymnsTaxisLevel';
import { HymnsTaxisLevelSetup } from '../common/HymnsTaxisLevelSetup';

export function HymnsSchoolTab({ lang }: { lang: Language }) {
  const isAr = lang === 'ar';
  const { userData, setUserDirectly } = useAuth();
  const isTeacherOrAdmin = userData?.role === 'teacher' || userData?.role === 'admin';

  // Live Hymns & Enrollment State
  const [hymnsList, setHymnsList] = useState<CopticHymnItem[]>(COPTIC_HYMNS_COLLECTION);
  const [hymnsLoadError, setHymnsLoadError] = useState<string | null>(null);
  const [selectedHymn, setSelectedHymn] = useState<CopticHymnItem>(COPTIC_HYMNS_COLLECTION[0]);

  // Audio Playback
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isLooping, setIsLooping] = useState(false);
  const [activeLineId, setActiveLineId] = useState<number>(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seasonFilter, setSeasonFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<'all' | 1 | 2 | 3>('all');

  // Voice Recording Practice
  const [isRecordingPractice, setIsRecordingPractice] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [masteredHymns, setMasteredHymns] = useState<Record<string, boolean>>({});

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const assignedLevel = parseHymnsTaxisLevel(userData?.hymnsTaxisLevel);

  useEffect(() => {
    if (!isTeacherOrAdmin && assignedLevel !== null) setLevelFilter(assignedLevel);
  }, [assignedLevel, isTeacherOrAdmin]);

  // Load Hymns from Server or Fallback
  useEffect(() => {
    let isMounted = true;
    if (!isTeacherOrAdmin && assignedLevel === null) {
      setHymnsList([]);
      setHymnsLoadError(null);
      return () => { isMounted = false; };
    }
    const reqLevel = isTeacherOrAdmin && levelFilter !== 'all' ? levelFilter : undefined;
    setHymnsLoadError(null);
    getHymns(reqLevel, seasonFilter, undefined, userData ? { role: userData.role, hymnsTaxisLevel: userData.hymnsTaxisLevel } : undefined).then(res => {
      if (!isMounted) return;
      if (res.success && res.items) {
        setHymnsList(res.items);
        if (!res.items.some(h => h.id === selectedHymn.id)) {
          if (res.items[0]) setSelectedHymn(res.items[0]);
        }
      } else {
        setHymnsList([]);
        setHymnsLoadError(res.error || (isAr ? 'تعذر تحميل الألحان.' : 'Could not load Hymns.'));
      }
    });

    return () => { isMounted = false; };
  }, [levelFilter, seasonFilter, isTeacherOrAdmin, assignedLevel, userData?.id, userData?.role, lang]);

  // Read mastered hymns
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('church_mastered_hymns');
      if (saved) {
        try {
          setMasteredHymns(JSON.parse(saved));
        } catch (e) {}
      }
    }
  }, []);

  // Sync Audio Speed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(e => console.warn(e));
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const cur = audioRef.current.currentTime;
    setCurrentTime(cur);

    const lines = selectedHymn.lines;
    if (lines && lines.length > 0) {
      for (let i = lines.length - 1; i >= 0; i--) {
        if (cur >= (lines[i].startTimeSec || 0)) {
          setActiveLineId(lines[i].id);
          break;
        }
      }
    }
  };

  const switchHymn = (hymn: CopticHymnItem) => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setSelectedHymn(hymn);
    setActiveLineId(1);
    setCurrentTime(0);
    setRecordedAudioUrl(null);
  };

  // Voice recording alongside hymn
  const startPracticeRecording = async () => {
    try {
      setRecordedAudioUrl(null);
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedAudioUrl(url);
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      setIsRecordingPractice(true);
    } catch (err) {
      console.warn("Could not start microphone for hymn practice:", err);
    }
  };

  const stopPracticeRecording = () => {
    if (mediaRecorderRef.current && isRecordingPractice) {
      mediaRecorderRef.current.stop();
      setIsRecordingPractice(false);
    }
  };

  const markAsMastered = async (hymnId: string) => {
    const updated = { ...masteredHymns, [hymnId]: true };
    setMasteredHymns(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('church_mastered_hymns', JSON.stringify(updated));
    }
    if (userData) {
      try {
        const res = await recordStudentSchoolActivity({
          school: 'hymns',
          activityId: hymnId,
          activityType: 'HYMN_MASTERED',
          titleAr: selectedHymn?.titleAr || 'لحن شماسي معتمد',
          titleEn: selectedHymn?.titleEn || 'Mastered Deacon Hymn',
          studentId: userData.id
        });
        if (res.success && setUserDirectly) {
          setUserDirectly({
            ...userData,
            points: res.totalPoints ?? (userData.points + (res.pointsEarned || 75)),
            currentStreak: res.streak?.currentStreak ?? userData.currentStreak ?? 1,
            longestStreak: res.streak?.longestStreak ?? userData.longestStreak
          });
        }
      } catch (e) {
        console.warn('Note on hymn activity record:', e);
      }
    }
  };

  // Filter hymns
  const filteredHymns = hymnsList.filter(h => {
    if (!isTeacherOrAdmin && (assignedLevel === null || h.level !== assignedLevel)) return false;
    if (levelFilter !== 'all' && h.level !== levelFilter) return false;
    if (seasonFilter === 'all') return true;
    return h.occasionTag === seasonFilter;
  });

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="pb-28 pt-6 px-4 w-full max-w-7xl mx-auto space-y-6"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0B2E5C] via-[#1E3A8A] to-[#8B1E2E] text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute left-0 top-0 opacity-10 pointer-events-none transform -translate-x-6 -translate-y-6">
          <Music size={220} />
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-200 text-xs font-bold mb-3">
            <Sparkles size={14} className="text-amber-300" />
            <span>{isAr ? 'مدرسة الشمامسة والألحان القبطية الأرثوذكسية' : 'Coptic Deacon & Hymns School'}</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-amber-300 mb-2">
            {isAr ? 'مدرسة الألحان الكنسية' : 'Coptic Hymns School'}
          </h1>
          <p className="text-xs sm:text-base text-gray-200 leading-relaxed max-w-2xl font-medium">
            {isAr
              ? 'تعلّم ألحان وتسابيح الكنيسة القبطية الأصيلة بـ ٣ لغات (قبطي، معرب، عربي)، عبر المستويات الثلاثة مع التحكم في سرعة الصوت وتدريب الهزات وتسجيل صوتك للتقييم.'
              : 'Master ancient Coptic hymns across 3 class levels with 3-way synchronized lyrics, melodic hazat guidance, adjustable playback speed, and voice rehearsal.'}
          </p>
        </div>
      </div>

      {!isTeacherOrAdmin && (
        assignedLevel === null ? (
          <HymnsTaxisLevelSetup
            lang={lang}
            onSaved={level => {
              if (userData && setUserDirectly) setUserDirectly({ ...userData, hymnsTaxisLevel: level });
            }}
          />
        ) : (
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-3 text-sm font-bold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
            {isAr ? `محتوى الألحان المعروض على مستواك المشترك: المستوى ${assignedLevel}.` : `Showing Hymns for your shared Level ${assignedLevel}.`}
          </div>
        )
      )}

      {/* 3 Class Levels Selector Bar */}
      {(isTeacherOrAdmin || assignedLevel !== null) && <div className="bg-[var(--mousa-cream-surface)] dark:bg-[#1C1712] p-3 rounded-2xl border-2 border-[var(--mousa-border-sand)] space-y-2">
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-xs font-black text-stone-800 dark:text-stone-200 uppercase tracking-wider flex items-center gap-1.5">
            <Award size={15} className="text-amber-500" />
            <span>{isAr ? (isTeacherOrAdmin ? 'المستويات الدراسية للألحان:' : 'مستواك المشترك:') : (isTeacherOrAdmin ? 'Hymn Class Levels:' : 'Your shared level:')}</span>
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { id: 'all' as const, levelNum: 0, labelAr: 'جميع المستويات', labelEn: 'All Levels', subAr: 'كامل الألحان', subEn: 'Complete' },
            { id: 1 as const, levelNum: 1, labelAr: 'المستوى الأول', labelEn: 'Level 1: Novice', subAr: 'تمهيدي ومبتدئين', subEn: 'Foundational' },
            { id: 2 as const, levelNum: 2, labelAr: 'المستوى الثاني', labelEn: 'Level 2: Intermediate', subAr: 'متوسط وشمامسة', subEn: 'Deacon Service' },
            { id: 3 as const, levelNum: 3, labelAr: 'المستوى الثالث', labelEn: 'Level 3: Advanced', subAr: 'متقدم والمناسبات الكبرى', subEn: 'Solemn Rites' },
          ].filter(lvl => isTeacherOrAdmin || (assignedLevel !== null && lvl.levelNum === assignedLevel)).map(lvl => {
            return (
              <button
                key={lvl.id}
                onClick={() => setLevelFilter(lvl.id)}
                className={`p-2.5 rounded-xl text-start transition-all cursor-pointer border relative ${
                  levelFilter === lvl.id
                    ? 'bg-[var(--mousa-gold)] text-[var(--mousa-teal-deep)] border-[var(--mousa-gold)] shadow-xs font-black'
                    : 'bg-white/70 dark:bg-stone-900/60 text-stone-700 dark:text-stone-300 border-[var(--mousa-border-sand)] hover:border-amber-300 font-bold'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs sm:text-sm font-black truncate">{isAr ? lvl.labelAr : lvl.labelEn}</div>
                </div>
                <div className="text-[10px] opacity-80 truncate">{isAr ? lvl.subAr : lvl.subEn}</div>
              </button>
            );
          })}
        </div>
      </div>}

      {/* Season Filter Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{isAr ? 'المناسبة الطقسية:' : 'Liturgical Season:'}</span>
        {[
          { id: 'all', labelAr: 'كل الألحان', labelEn: 'All Seasons' },
          { id: 'annual', labelAr: 'سنوي وللقداس', labelEn: 'Annual' },
          { id: 'kiahk', labelAr: 'كيهك وتسابيح', labelEn: 'Kiahk' },
          { id: 'lent', labelAr: 'الصوم الكبير', labelEn: 'Great Lent' },
          { id: 'pascha', labelAr: 'أسبوع الآلام', labelEn: 'Pascha' },
        ].map(s => (
          <button
            key={s.id}
            onClick={() => setSeasonFilter(s.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              seasonFilter === s.id
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-50'
            }`}
          >
            {isAr ? s.labelAr : s.labelEn}
          </button>
        ))}
      </div>

      {/* Main Grid: Left Hymns Playlist & Right Active Practice Player */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Hymns Playlist */}
        <div className="space-y-3">
          {hymnsLoadError && (
            <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-xs font-bold text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
              {hymnsLoadError}
            </p>
          )}
          <div className="flex items-center justify-between px-1">
            <h3 className="font-extrabold text-sm sm:text-base text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Music size={16} className="text-[var(--color-church-blue)]" />
              <span>{isAr ? 'قائمة ألحان المرحلة' : 'Curriculum Hymns'}</span>
            </h3>
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full">
              {filteredHymns.length} {isAr ? 'لحن متاح' : 'Available'}
            </span>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredHymns.map((hymn) => {
              const isSelected = hymn.id === selectedHymn.id;
              const isMastered = Boolean(masteredHymns[hymn.id]);

              return (
                <div
                  key={hymn.id}
                  onClick={() => switchHymn(hymn)}
                  className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-gradient-to-r from-amber-50 to-amber-100/60 dark:from-stone-800 dark:to-stone-850 border-amber-500 shadow-sm ring-2 ring-amber-400/40'
                      : 'bg-white dark:bg-slate-900 hover:bg-stone-50 dark:hover:bg-stone-800/60 border-[var(--mousa-border-sand)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                      {hymn.titleAr}
                    </h4>
                    {isMastered && (
                      <span className="text-[10px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                        ✓ {isAr ? 'أتقنته' : 'Mastered'}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-serif text-amber-800 dark:text-amber-400 truncate mb-1">
                    {hymn.titleCoptic}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                    <span>{hymn.seasonAr}</span>
                    <span>{formatSec(hymn.durationSec)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: In-Depth Hymn Player & Synced Karaoke Lyrics */}
        {filteredHymns.some(hymn => hymn.id === selectedHymn.id) && <div className="lg:col-span-2 space-y-6">
          {/* Active Hymn Hero Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 border border-[var(--mousa-border-sand)] space-y-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-950/60 px-3 py-1 rounded-full">
                  {selectedHymn.seasonAr} • {isAr ? `مستوى ${selectedHymn.level}` : `Level ${selectedHymn.level}`}
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-100 mt-2">
                  {selectedHymn.titleAr}
                </h2>
                <div className="text-base sm:text-lg font-serif font-black text-amber-800 dark:text-amber-400 mt-0.5">
                  {selectedHymn.titleCoptic}
                </div>
              </div>

              {/* Mastered Button */}
              <button
                type="button"
                onClick={() => markAsMastered(selectedHymn.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  masteredHymns[selectedHymn.id]
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300 hover:bg-amber-100'
                }`}
              >
                <CheckCircle2 size={16} />
                <span>{masteredHymns[selectedHymn.id] ? (isAr ? 'تم إتقان اللحن (٧٥ نقطة)' : 'Mastered (75 pts)') : (isAr ? 'تأكيد الحفظ والإتقان' : 'Mark as Mastered')}</span>
              </button>
            </div>

            {/* Hazat & Performance Explanation */}
            <div className="bg-amber-50/70 dark:bg-amber-950/30 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 text-xs text-amber-950 dark:text-amber-200 leading-relaxed font-medium">
              <span className="font-bold text-amber-900 dark:text-amber-300">💡 {isAr ? 'دليل الهزات والتقاسيم النغمية: ' : 'Hazat Guide: '}</span>
              {selectedHymn.hazatExplanationAr}
            </div>

            {/* Audio Controls */}
            <div className="bg-stone-50 dark:bg-stone-800/50 p-4 rounded-2xl border border-stone-200 dark:border-stone-700 space-y-3">
              <audio
                ref={audioRef}
                src={selectedHymn.audioUrl}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => setIsPlaying(false)}
              />

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="p-3.5 bg-[var(--mousa-teal)] hover:opacity-90 text-white rounded-2xl cursor-pointer shadow-md transition-all active:scale-95"
                  >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                  </button>

                  <div className="text-xs font-mono font-bold text-stone-700 dark:text-stone-300">
                    <span>{formatSec(currentTime)}</span>
                    <span className="text-stone-400 mx-1">/</span>
                    <span className="text-stone-500">{formatSec(duration || selectedHymn.durationSec)}</span>
                  </div>
                </div>

                {/* Speed Toggle */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[11px] text-stone-500 font-bold">{isAr ? 'سرعة الأداء:' : 'Speed:'}</span>
                  {[0.75, 1.0, 1.25].map(sp => (
                    <button
                      key={sp}
                      type="button"
                      onClick={() => setPlaybackSpeed(sp)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-black transition-colors cursor-pointer ${
                        playbackSpeed === sp
                          ? 'bg-amber-500 text-white shadow-2xs'
                          : 'bg-white dark:bg-stone-700 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      {sp}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Synced 3-Language Karaoke Lyrics */}
            <div className="space-y-3">
              <h3 className="font-black text-sm text-stone-800 dark:text-stone-200 flex items-center gap-2">
                <BookOpen size={16} className="text-amber-600" />
                <span>{isAr ? 'كلمات اللحن باللغات الثلاث (متابعة حية مع الصوت):' : 'Synchronized Lyrics:'}</span>
              </h3>

              <div className="space-y-3">
                {selectedHymn.lines?.map((line) => {
                  const isActive = activeLineId === line.id;
                  return (
                    <div
                      key={line.id}
                      className={`p-4 rounded-2xl transition-all border text-center space-y-1.5 ${
                        isActive
                          ? 'bg-amber-100/70 dark:bg-amber-950/50 border-amber-500 shadow-sm ring-2 ring-amber-400/50 scale-[1.01]'
                          : 'bg-stone-50 dark:bg-stone-800/40 border-stone-200 dark:border-stone-700'
                      }`}
                    >
                      <div className="text-base sm:text-lg font-serif font-black text-[var(--mousa-teal-deep)] dark:text-amber-200">
                        {line.coptic}
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-amber-800 dark:text-amber-400">
                        {line.arabized}
                      </div>
                      <div className="text-xs text-stone-600 dark:text-stone-300 font-medium">
                        {line.arabic}
                      </div>
                      {line.hazatNotes && (
                        <div className="text-[10px] text-amber-700 dark:text-amber-300 font-bold pt-1">
                          🎵 {line.hazatNotes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Voice Rehearsal Recorder */}
            <div className="bg-gradient-to-r from-amber-500/10 via-[var(--color-church-gold)]/5 to-amber-500/10 dark:bg-slate-900 rounded-3xl p-5 border border-amber-300/60 dark:border-slate-800">
              <h4 className="font-bold text-sm text-amber-950 dark:text-amber-200 flex items-center gap-2 mb-2">
                <Mic size={16} className="text-amber-600" />
                <span>{isAr ? 'تدريب الشماس: سجل صوتك واستمع لأدائك' : 'Deacon Practice: Record & Listen to Your Voice'}</span>
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                {isAr ? 'شغّل اللحن وردد معه ثم استمع لتسجيلك لتقارن نغماتك وهزاتك مع المرتل.' : 'Chant alongside the cantor, then replay your voice to verify your pitch and rhythm.'}
              </p>

              <div className="flex flex-wrap items-center gap-3">
                {isRecordingPractice ? (
                  <button
                    type="button"
                    onClick={stopPracticeRecording}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white font-bold text-xs shadow-md animate-pulse cursor-pointer"
                  >
                    <Square size={16} />
                    <span>{isAr ? 'إيقاف التسجيل' : 'Stop Recording'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startPracticeRecording}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-church-burgundy)] hover:bg-[#6e1623] text-white font-bold text-xs shadow-md cursor-pointer"
                  >
                    <Mic size={16} />
                    <span>{isAr ? 'ابدأ تسجيل صوتي للتدريب' : 'Start Recording Voice'}</span>
                  </button>
                )}

                {recordedAudioUrl && (
                  <div className="flex items-center gap-2">
                    <audio controls src={recordedAudioUrl} className="h-9 w-60 sm:w-72" />
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      ✓ {isAr ? 'تم حفظ التسجيل' : 'Recorded'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>}
      </div>
    </motion.div>
  );
}
