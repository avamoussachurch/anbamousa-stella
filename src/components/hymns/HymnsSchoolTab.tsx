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
import { CopticHymnItem, HymnLyricLine } from '../../data/hymnsData';
import { useAuth } from '../../context/AuthContext';
import { awardPoints } from '../../lib/pointsService';
import { Language } from '../../types';
import { getHymns } from '../../lib/hymnsService';
import { recordStudentSchoolActivity } from '../../lib/studentProgressService';
import { parseHymnsTaxisLevel } from '../../lib/hymnsTaxisLevel';
import { HymnsTaxisLevelSetup } from '../common/HymnsTaxisLevelSetup';
import { useActiveWorkspace } from '../../context/WorkspaceContext';
import { resolveCurriculumMediaUrl } from '../../lib/curriculumMediaUrl';
import { InAppDocumentViewer } from '../sunday-school/viewers/InAppDocumentViewer';
import { LearningAdventurePanel } from '../common/LearningAdventurePanel';
import { RewardCelebration } from '../sunday-school/student/RewardCelebration';
import { supabase } from '../../lib/supabase';
import { HymnPracticeInbox } from './HymnPracticeInbox';

export function HymnsSchoolTab({ lang }: { lang: Language }) {
  const isAr = lang === 'ar';
  const { userData, setUserDirectly } = useAuth();
  const workspace = useActiveWorkspace();
  const isTeacherOrAdmin = workspace === 'teacher' || workspace === 'admin';

  // Live Hymns & Enrollment State
  const [hymnsList, setHymnsList] = useState<CopticHymnItem[]>([]);
  const [isHymnsLoading, setIsHymnsLoading] = useState(true);
  const [hymnsLoadError, setHymnsLoadError] = useState<string | null>(null);
  const [selectedHymn, setSelectedHymn] = useState<CopticHymnItem | null>(null);
  const [resolvedAudioUrl, setResolvedAudioUrl] = useState('');
  const [resolvedSheetMusicUrl, setResolvedSheetMusicUrl] = useState('');
  const [audioUrlError, setAudioUrlError] = useState<string | null>(null);
  const [sheetMusicUrlError, setSheetMusicUrlError] = useState<string | null>(null);
  const [isResolvingSheetMusic, setIsResolvingSheetMusic] = useState(false);
  const [showSheetMusicViewer, setShowSheetMusicViewer] = useState(false);
  const [audioPlaybackError, setAudioPlaybackError] = useState<string | null>(null);

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
  const [isPracticeRecordingPaused, setIsPracticeRecordingPaused] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [recordedDurationSeconds, setRecordedDurationSeconds] = useState(0);
  const [isSubmittingPractice, setIsSubmittingPractice] = useState(false);
  const [practiceSubmitted, setPracticeSubmitted] = useState(false);
  const [practiceSubmissionMessage, setPracticeSubmissionMessage] = useState<string | null>(null);
  const [practiceSubmissionError, setPracticeSubmissionError] = useState<string | null>(null);
  const [practiceRecordingError, setPracticeRecordingError] = useState<string | null>(null);
  const [practiceWaveform, setPracticeWaveform] = useState<number[]>(() => Array(32).fill(0.08));
  const [masteredHymns, setMasteredHymns] = useState<Record<string, boolean>>({});

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const practiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const waveformContextRef = useRef<AudioContext | null>(null);
  const waveformAnalyserRef = useRef<AnalyserNode | null>(null);
  const waveformFrameRef = useRef<number | null>(null);
  const isUnmountingRef = useRef(false);
  const recordingStartedAtRef = useRef<number | null>(null);

  useEffect(() => {
    isUnmountingRef.current = false;
    return () => {
      isUnmountingRef.current = true;
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        try { recorder.stop(); } catch (_) {}
      }
      recordingStreamRef.current?.getTracks().forEach(track => track.stop());
      if (waveformFrameRef.current !== null) cancelAnimationFrame(waveformFrameRef.current);
      if (waveformContextRef.current) void waveformContextRef.current.close().catch(() => {});
    };
  }, []);

  useEffect(() => () => {
    if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
  }, [recordedAudioUrl]);

  const [showHymnCelebration, setShowHymnCelebration] = useState(false);
  const [masteryError, setMasteryError] = useState<string | null>(null);

  const submitPracticeRecording = async () => {
    if (!supabase || !userData?.id || !selectedHymn || !recordedAudioBlob) {
      setPracticeSubmissionError(isAr ? 'سجّل تدريبك وسجّل الدخول قبل الإرسال.' : 'Record a practice take and sign in before sending it.');
      return;
    }
    setIsSubmittingPractice(true);
    setPracticeSubmissionError(null);
    setPracticeSubmissionMessage(null);
    const mimeType = (recordedAudioBlob.type || 'audio/webm').split(';')[0].trim().toLowerCase();
    const extension = mimeType.includes('mp4') ? 'm4a' : mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mpeg') ? 'mp3' : 'webm';
    const uniqueId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
    const path = userData.id + '/' + String(selectedHymn.id) + '/' + uniqueId + '.' + extension;
    try {
      const { error: uploadError } = await supabase.storage.from('hymn-practice-recordings').upload(path, recordedAudioBlob, { contentType: mimeType, upsert: false });
      if (uploadError) throw uploadError;
      const { error: insertError } = await supabase.from('hymn_practice_submissions').insert({
        student_id: userData.id,
        hymn_id: String(selectedHymn.id),
        hymn_title: selectedHymn.titleEn || selectedHymn.title || (isAr ? 'تدريب لحن' : 'Hymn practice'),
        recording_path: path,
        mime_type: mimeType,
        duration_seconds: recordedDurationSeconds
      });
      if (insertError) {
        await supabase.storage.from('hymn-practice-recordings').remove([path]);
        throw insertError;
      }
      setPracticeSubmitted(true);
      setPracticeSubmissionMessage(isAr ? 'اترسل تسجيلك للخادم بنجاح. هيظهر في لوحة متابعة الخدام.' : 'Your practice recording was sent to your teacher successfully.');
    } catch (error) {
      setPracticeSubmissionError(error instanceof Error ? error.message : (isAr ? 'تعذر إرسال التسجيل.' : 'Could not send the recording.'));
    } finally {
      setIsSubmittingPractice(false);
    }
  };

  const assignedLevel = parseHymnsTaxisLevel(userData?.hymnsTaxisLevel);

  useEffect(() => {
    if (!isTeacherOrAdmin && assignedLevel !== null) setLevelFilter(assignedLevel);
  }, [assignedLevel, isTeacherOrAdmin]);

  // Load Hymns from Server or Fallback
  useEffect(() => {
    let isMounted = true;
    if (!isTeacherOrAdmin && assignedLevel === null) {
      setHymnsList([]);
      setSelectedHymn(null);
      setIsHymnsLoading(false);
      setHymnsLoadError(null);
      return () => { isMounted = false; };
    }
    const reqLevel = isTeacherOrAdmin && levelFilter !== 'all' ? levelFilter : undefined;
    setIsHymnsLoading(true);
    setHymnsLoadError(null);
    getHymns(reqLevel, seasonFilter, undefined, userData ? { roles: userData.roles, hymnsTaxisLevel: userData.hymnsTaxisLevel } : undefined).then(res => {
      if (!isMounted) return;
      if (res.success && res.items) {
        setHymnsList(res.items);
        // Always select the matching record returned by the server, not a local demo object.
        const serverSelection = res.items.find(h => h.id === selectedHymn?.id) || res.items[0];
        setSelectedHymn(serverSelection || null);
      } else {
        setHymnsList([]);
        setSelectedHymn(null);
        setHymnsLoadError(res.error || (isAr ? 'مش قادرين نحمّل الألحان دلوقتي.' : 'Could not load Hymns.'));
      }
      setIsHymnsLoading(false);
    }).catch(error => {
      if (!isMounted) return;
      setHymnsList([]);
      setSelectedHymn(null);
      setHymnsLoadError(error instanceof Error ? error.message : (isAr ? 'مش قادرين نحمّل الألحان دلوقتي.' : 'Could not load Hymns.'));
      setIsHymnsLoading(false);
    });

    return () => { isMounted = false; };
  }, [levelFilter, seasonFilter, isTeacherOrAdmin, assignedLevel, userData?.id, userData?.roles, lang]);

  // Private Storage references are not browser-playable URLs. Resolve them
  // through the authenticated server endpoint and refresh on hymn selection.
  useEffect(() => {
    let active = true;
    setResolvedAudioUrl('');
    setAudioUrlError(null);
    if (!selectedHymn?.audioUrl) return () => { active = false; };

    resolveCurriculumMediaUrl(selectedHymn.audioUrl)
      .then(url => { if (active) setResolvedAudioUrl(url); })
      .catch(error => {
        if (active) setAudioUrlError(error instanceof Error ? error.message : 'Audio could not be loaded.');
      });
    return () => { active = false; };
  }, [selectedHymn?.id, selectedHymn?.audioUrl]);

  useEffect(() => {
    let active = true;
    setResolvedSheetMusicUrl('');
    setSheetMusicUrlError(null);
    const reference = selectedHymn?.pdfUrl || selectedHymn?.sheetMusicUrl;
    if (!reference) { setIsResolvingSheetMusic(false); return () => { active = false; }; }
    setIsResolvingSheetMusic(true);
    resolveCurriculumMediaUrl(reference)
      .then(url => { if (active) setResolvedSheetMusicUrl(url); })
      .catch(error => {
        if (active) setSheetMusicUrlError(error instanceof Error ? error.message : 'PDF could not be opened.');
      })
      .finally(() => { if (active) setIsResolvingSheetMusic(false); });
    return () => { active = false; };
  }, [selectedHymn?.id, selectedHymn?.sheetMusicUrl, selectedHymn?.pdfUrl]);

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

  const togglePlay = async () => {
    if (!audioRef.current || !resolvedAudioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }
    if (practiceAudioRef.current && !practiceAudioRef.current.paused) {
      practiceAudioRef.current.pause();
      practiceAudioRef.current.currentTime = 0;
    }
    setAudioPlaybackError(null);
    try {
      await audioRef.current.play();
      setIsPlaying(true);
    } catch (error) {
      setIsPlaying(false);
      setAudioPlaybackError(error instanceof Error ? error.message : (isAr ? 'مش قادرين نشغّل التسجيل ده.' : 'This audio could not be played.'));
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const cur = audioRef.current.currentTime;
    setCurrentTime(cur);

    const lines = selectedHymn?.lines || [];
    if (lines && lines.length > 0) {
      for (let i = lines.length - 1; i >= 0; i--) {
        if (cur >= (lines[i].startTimeSec || 0)) {
          setActiveLineId(lines[i].id);
          break;
        }
      }
    }
  };

  const openSheetMusic = async () => {
    const reference = selectedHymn?.pdfUrl || selectedHymn?.sheetMusicUrl;
    if (!reference || isResolvingSheetMusic) return;
    setIsResolvingSheetMusic(true);
    setSheetMusicUrlError(null);
    try {
      const freshUrl = await resolveCurriculumMediaUrl(reference);
      setResolvedSheetMusicUrl(freshUrl);
      setShowSheetMusicViewer(true);
    } catch (error) {
      setSheetMusicUrlError(error instanceof Error ? error.message : 'PDF could not be opened.');
    } finally {
      setIsResolvingSheetMusic(false);
    }
  };

  const switchHymn = (hymn: CopticHymnItem) => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setSelectedHymn(hymn);
    if (userData && !isTeacherOrAdmin) {
      void recordStudentSchoolActivity({
        school: 'hymns',
        activityId: hymn.id,
        activityType: 'CONTENT_OPENED',
        titleAr: hymn.titleAr || 'لحن كنسي',
        titleEn: hymn.titleEn || 'Church Hymn',
        studentId: userData.id
      }).then(result => {
        if (result.success && setUserDirectly) {
          setUserDirectly({
            ...userData,
            currentStreak: result.streak.currentStreak,
            longestStreak: Math.max(userData.longestStreak || 0, result.streak.longestStreak)
          });
        } else if (!result.success) {
          console.warn('Could not sync Hymn-open learning activity:', result.error);
        }
      });
    }
    setAudioPlaybackError(null);
    setActiveLineId(1);
    setCurrentTime(0);
    setRecordedAudioUrl(null);
    setRecordedAudioBlob(null);
    setRecordedDurationSeconds(0);
    setPracticeSubmitted(false);
    setPracticeSubmissionMessage(null);
    setPracticeSubmissionError(null);
  };

  // Voice recording alongside hymn. The waveform is measured from the microphone
  // analyser and is never connected to speakers, preventing audio feedback.
  const startPracticeRecording = async () => {
    if (isRecordingPractice) return;
    setPracticeRecordingError(null);
    setRecordedAudioUrl(null);
    setRecordedAudioBlob(null);
    setRecordedDurationSeconds(0);
    setPracticeSubmitted(false);
    setPracticeSubmissionMessage(null);
    setPracticeSubmissionError(null);
    audioChunksRef.current = [];

    // Do not record the hymn speaker track into the student's practice take.
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    if (audioRef.current) audioRef.current.currentTime = 0;

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setPracticeRecordingError(isAr
        ? 'التسجيل الصوتي غير مدعوم في المتصفح ده.'
        : 'Voice recording is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      recordingStreamRef.current = stream;
      recordingStartedAtRef.current = Date.now();
      const supportedMimeType = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus'
      ].find(type => MediaRecorder.isTypeSupported?.(type));
      const recorder = new MediaRecorder(stream, supportedMimeType ? { mimeType: supportedMimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = event => {
        if (event.data && event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        setPracticeRecordingError(isAr ? 'حصلت مشكلة أثناء التسجيل. جرّب تاني.' : 'The recording encountered an error. Please try again.');
      };
      recorder.onpause = () => setIsPracticeRecordingPaused(true);
      recorder.onresume = () => setIsPracticeRecordingPaused(false);
      recorder.onstop = () => {
        if (isUnmountingRef.current) return;
        const mimeType = recorder.mimeType || audioChunksRef.current[0]?.type || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (blob.size > 0) {
          setRecordedAudioBlob(blob);
          setRecordedDurationSeconds(recordingStartedAtRef.current ? Math.max(1, Math.round((Date.now() - recordingStartedAtRef.current) / 1000)) : 0);
          setRecordedAudioUrl(URL.createObjectURL(blob));
        } else {
          setPracticeRecordingError(isAr ? 'التسجيل فاضي. اتأكد إن الميكروفون شغال وجرّب تاني.' : 'The recording is empty. Check your microphone and try again.');
        }
        recordingStreamRef.current?.getTracks().forEach(track => track.stop());
        recordingStreamRef.current = null;
        if (waveformFrameRef.current !== null) cancelAnimationFrame(waveformFrameRef.current);
        waveformFrameRef.current = null;
        waveformAnalyserRef.current = null;
        if (waveformContextRef.current) {
          void waveformContextRef.current.close().catch(() => {});
          waveformContextRef.current = null;
        }
        setPracticeWaveform(Array(32).fill(0.08));
        setIsRecordingPractice(false);
        setIsPracticeRecordingPaused(false);
      };

      const AudioContextConstructor = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextConstructor) {
        const context: AudioContext = new AudioContextConstructor();
        void context.resume().catch(() => {});
        const analyser = context.createAnalyser();
        analyser.fftSize = 64;
        const source = context.createMediaStreamSource(stream);
        source.connect(analyser);
        waveformContextRef.current = context;
        waveformAnalyserRef.current = analyser;
        const bins = new Uint8Array(analyser.frequencyBinCount);
        let waveformFrame = 0;
        const drawWaveform = () => {
          if (waveformAnalyserRef.current !== analyser) return;
          waveformFrame += 1;
          if (waveformFrame % 3 === 0) {
            if (recorder.state === 'paused') {
              setPracticeWaveform(Array(32).fill(0.08));
            } else {
              analyser.getByteFrequencyData(bins);
              setPracticeWaveform(Array.from(bins, value => Math.max(0.06, value / 255)));
            }
          }
          waveformFrameRef.current = requestAnimationFrame(drawWaveform);
        };
        drawWaveform();
      }

      recorder.start(250);
      setIsRecordingPractice(true);
      setIsPracticeRecordingPaused(false);
    } catch (err) {
      recordingStreamRef.current?.getTracks().forEach(track => track.stop());
      recordingStreamRef.current = null;
      if (waveformContextRef.current) {
        void waveformContextRef.current.close().catch(() => {});
        waveformContextRef.current = null;
      }
      setIsRecordingPractice(false);
      setPracticeRecordingError(err instanceof Error
        ? err.message
        : (isAr ? 'تعذر تشغيل الميكروفون. راجع صلاحيات المتصفح.' : 'Could not access the microphone. Check browser permissions.'));
    }
  };

  const pauseOrResumePracticeRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      setPracticeRecordingError(isAr ? 'مفيش تسجيل نشط.' : 'There is no active recording.');
      return;
    }
    try {
      if (recorder.state === 'recording') recorder.pause();
      else if (recorder.state === 'paused') recorder.resume();
    } catch (err) {
      setPracticeRecordingError(err instanceof Error ? err.message : (isAr ? 'تعذر إيقاف أو استكمال التسجيل.' : 'Could not pause or resume the recording.'));
    }
  };

  const stopPracticeRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      setPracticeRecordingError(isAr ? 'مفيش تسجيل نشط لإنهائه.' : 'There is no active recording to stop.');
      return;
    }
    try {
      // stop() flushes the final dataavailable event before onstop, even when paused.
      recorder.stop();
    } catch (err) {
      setPracticeRecordingError(err instanceof Error ? err.message : (isAr ? 'تعذر إنهاء التسجيل.' : 'Could not stop the recording.'));
    }
  };

  const markAsMastered = async (hymnId: string) => {
    if (masteredHymns[hymnId]) return;
    setMasteryError(null);
    let masteryConfirmed = !userData;
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
        if (res.success) masteryConfirmed = true;
        else setMasteryError(res.error || (isAr ? 'تعذر حفظ إتقان اللحن. حاول مرة أخرى.' : 'Could not save hymn mastery. Please try again.'));
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
        setMasteryError(isAr ? 'تعذر حفظ إتقان اللحن. حاول مرة أخرى.' : 'Could not save hymn mastery. Please try again.');
      }
    }
    if (!masteryConfirmed) {
      const reverted = { ...masteredHymns };
      delete reverted[hymnId];
      setMasteredHymns(reverted);
      try { localStorage.setItem('church_mastered_hymns', JSON.stringify(reverted)); } catch (_) {}
      return;
    }
    setShowHymnCelebration(true);
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
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {isTeacherOrAdmin && <HymnPracticeInbox lang={isAr ? 'ar' : 'en'} />}
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
              ? 'اتعلّم ألحان وتسابيح الكنيسة القبطية بالقبطي والمعرّب والعربي. اختار مستواك، واتدرّب على الهزات، وسجّل صوتك عشان تراجع أداءك.'
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
            {isAr ? `الألحان اللي هتظهرلك حسب مستواك المشترك: ${assignedLevel}.` : `Showing Hymns for your shared Level ${assignedLevel}.`}
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
            { id: 'all' as const, levelNum: 0, labelAr: 'كل المستويات', labelEn: 'All Levels', subAr: 'كل الألحان', subEn: 'Complete' },
            { id: 1 as const, levelNum: 1, labelAr: 'المستوى الأول', labelEn: 'Level 1: Novice', subAr: 'تمهيدي وللمبتدئين', subEn: 'Foundational' },
            { id: 2 as const, levelNum: 2, labelAr: 'المستوى التاني', labelEn: 'Level 2: Intermediate', subAr: 'متوسط وللشمامسة', subEn: 'Deacon Service' },
            { id: 3 as const, levelNum: 3, labelAr: 'المستوى التالت', labelEn: 'Level 3: Advanced', subAr: 'متقدم والمناسبات الكبيرة', subEn: 'Solemn Rites' },
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
            {isHymnsLoading ? (
              <div role="status" aria-live="polite" className="rounded-2xl border border-[var(--mousa-border-sand)] bg-white/70 dark:bg-slate-900/60 p-5 text-center text-sm font-semibold text-stone-500 dark:text-stone-300">
                {isAr ? 'بنحمّل الألحان...' : 'Loading hymns...'}
              </div>
            ) : filteredHymns.length === 0 ? (
              <div className="rounded-2xl border border-[var(--mousa-border-sand)] bg-white/70 dark:bg-slate-900/60 p-5 text-center text-sm font-semibold text-stone-500 dark:text-stone-300">
                {isAr ? 'مفيش ألحان متاحة للمستوى أو المناسبة دي دلوقتي.' : 'No hymns are available for this level or season yet.'}
              </div>
            ) : filteredHymns.map((hymn) => {
              const isSelected = hymn.id === selectedHymn?.id;
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
        {selectedHymn && filteredHymns.some(hymn => hymn.id === selectedHymn.id) && <div className="lg:col-span-2 space-y-6">
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
                className={`min-h-12 px-5 py-3 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-md ring-2 ring-offset-2 ring-offset-[var(--surface-primary)] ${
                  masteredHymns[selectedHymn.id]
                    ? 'bg-emerald-600 text-white ring-emerald-400/60'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white ring-emerald-400/70 hover:from-emerald-500 hover:to-teal-600 hover:scale-[1.02]'
                }`}
              >
                <CheckCircle2 size={16} />
                <span>{masteredHymns[selectedHymn.id] ? (isAr ? 'أتقنت اللحن (٧٥ نقطة)' : 'Mastered (75 pts)') : (isAr ? 'سجّل إنك حفظت اللحن وأتقنته' : 'Mark as Mastered')}</span>
              </button>
            </div>

            {masteryError && <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">{masteryError}</p>}
            <LearningAdventurePanel
              lang={isAr ? 'ar' : 'en'}
              accent="gold"
              title={isAr ? 'تحدي إتقان اللحن' : 'Master This Hymn'}
              subtitle={isAr
                ? 'اسمع، اتدرّب، وبعدها احتفل بإتقان اللحن.'
                : 'Listen closely, practise your delivery, then celebrate mastering the hymn.'}
              steps={[
                {
                  id: 'listen',
                  title: isAr ? 'اسمع اللحن' : 'Listen to the hymn',
                  detail: isAr ? 'اسمع ٨٠٪ على الأقل من التسجيل' : 'Listen to at least 80% of the recording',
                  complete: duration > 0 && currentTime / duration >= 0.8
                },
                {
                  id: 'practice',
                  title: isAr ? 'سجّل تدريبك' : 'Record your practice',
                  detail: isAr ? 'سجّل صوتك واسمعه للمراجعة' : 'Make a practice recording and replay it',
                  complete: Boolean(recordedAudioUrl)
                },
                {
                  id: 'master',
                  title: isAr ? 'افتح إتقان اللحن' : 'Master the hymn',
                  detail: isAr ? 'علّم اللحن كمتقن بعد التدريب' : 'Mark the hymn mastered after practising',
                  complete: Boolean(masteredHymns[selectedHymn.id])
                }
              ]}
            />

            {/* Hazat & Performance Explanation */}
            <div className="bg-amber-50/70 dark:bg-amber-950/30 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 text-xs text-amber-950 dark:text-amber-200 leading-relaxed font-medium">
              <span className="font-bold text-amber-900 dark:text-amber-300">💡 {isAr ? 'شرح الهزات والتقسيمات النغمية: ' : 'Hazat Guide: '}</span>
              {selectedHymn.hazatExplanationAr}
            </div>

            {/* Audio Controls */}
            <div className="bg-stone-50 dark:bg-stone-800/50 p-4 rounded-2xl border border-stone-200 dark:border-stone-700 space-y-3">
              <audio
                ref={audioRef}
                src={resolvedAudioUrl || undefined}
                onTimeUpdate={handleTimeUpdate}
                preload="metadata"
                onLoadedMetadata={() => {
                  if (audioRef.current && Number.isFinite(audioRef.current.duration)) setDuration(audioRef.current.duration);
                }}
                onError={() => {
                  setIsPlaying(false);
                  setAudioPlaybackError(isAr ? 'ملف الصوت مش قادر يشتغل. جرّب تفتح اللحن تاني.' : 'The audio file could not be played. Try reopening the hymn.');
                }}
                onEnded={() => setIsPlaying(false)}
              />

              {audioUrlError && (
                <p role="status" className="text-xs font-semibold text-rose-600">{audioUrlError}</p>
              )}
              {(selectedHymn?.pdfUrl || selectedHymn?.sheetMusicUrl) && (
                <button
                  type="button"
                  onClick={() => void openSheetMusic()}
                  disabled={isResolvingSheetMusic}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--mousa-teal)]/30 text-[var(--mousa-teal-deep)] dark:text-amber-300 text-xs font-bold hover:bg-[var(--mousa-teal)]/10 transition-colors disabled:opacity-50 disabled:cursor-wait"
                >
                  <FileText size={14} />
                  {isResolvingSheetMusic
                    ? (isAr ? 'بنجهّز ملف PDF...' : 'Preparing PDF...')
                    : (isAr ? 'افتح ملف اللحن PDF' : 'Open Hymn PDF')}
                </button>
              )}
              {sheetMusicUrlError && (
                <p role="alert" className="text-xs font-semibold text-rose-600">{sheetMusicUrlError}</p>
              )}
              {audioPlaybackError && (
                <p role="alert" className="text-xs font-semibold text-rose-600">{audioPlaybackError}</p>
              )}
              <div className="space-y-3">
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.1}
                  value={Math.min(currentTime, duration || 0)}
                  onChange={event => {
                    const nextTime = Number(event.target.value);
                    setCurrentTime(nextTime);
                    if (audioRef.current) audioRef.current.currentTime = nextTime;
                  }}
                  disabled={!duration}
                  aria-label={isAr ? 'موضع تشغيل اللحن' : 'Hymn playback position'}
                  className="w-full h-2 accent-amber-500 cursor-pointer disabled:opacity-40"
                />
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={togglePlay}
                    disabled={!resolvedAudioUrl}
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

                {/* Compact speed presets: two rows on phones, one row on wider screens. */}
                <div className="w-full min-w-0 sm:w-auto space-y-1">
                  <span className="block text-[11px] text-stone-500 font-bold">{isAr ? 'سرعة اللحن:' : 'Speed:'}</span>
                  <div className="grid grid-cols-4 sm:flex gap-1.5" role="group" aria-label={isAr ? 'سرعة تشغيل اللحن' : 'Hymn playback speed'}>
                    {[0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2].map(sp => (
                      <button
                        key={sp}
                        type="button"
                        onClick={() => setPlaybackSpeed(sp)}
                        aria-pressed={playbackSpeed === sp}
                        className={`min-w-0 px-2 py-2 rounded-xl text-[11px] font-black transition-colors cursor-pointer ${
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
            </div>
            </div>

            {/* Synced 3-Language Karaoke Lyrics */}
            <div className="space-y-3">
              <h3 className="font-black text-sm text-stone-800 dark:text-stone-200 flex items-center gap-2">
                <BookOpen size={16} className="text-amber-600" />
                <span>{isAr ? 'كلمات اللحن باللغات التلاتة (متزامنة مع الصوت):' : 'Synchronized Lyrics:'}</span>
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
                <span>{isAr ? 'تدريب الشماس: سجّل صوتك واسمعه' : 'Deacon Practice: Record & Listen to Your Voice'}</span>
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                {isAr ? 'شغّل اللحن وردّد وراه، وبعدها اسمع تسجيلك وقارن نغماتك وهزاتك بالمرتل.' : 'Chant alongside the cantor, then replay your voice to verify your pitch and rhythm.'}
              </p>

              <div className="space-y-3">
                <div
                  className="flex h-14 items-center justify-center gap-1 overflow-hidden rounded-2xl border border-amber-200/70 bg-white/80 px-3 dark:border-slate-700 dark:bg-slate-950/60"
                  role="img"
                  aria-label={isAr ? 'موجات صوت الميكروفون المباشرة' : 'Live microphone waveform'}
                >
                  {practiceWaveform.map((level, index) => (
                    <span
                      key={index}
                      className="w-1.5 shrink-0 rounded-full bg-amber-600 transition-[height] duration-75 dark:bg-amber-400"
                      style={{ height: `${Math.max(3, Math.min(1, level) * 38)}px`, opacity: isRecordingPractice ? 0.55 + Math.min(1, level) * 0.45 : 0.45 }}
                    />
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {!isRecordingPractice ? (
                    <button
                      type="button"
                      onClick={startPracticeRecording}
                      className="flex items-center gap-2 rounded-xl bg-[var(--color-church-burgundy)] px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#6e1623] disabled:opacity-50"
                    >
                      <Mic size={16} />
                      <span>{isAr ? 'ابدأ التسجيل' : 'Start recording'}</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={pauseOrResumePracticeRecording}
                        aria-label={isPracticeRecordingPaused ? (isAr ? 'استكمال التسجيل' : 'Resume recording') : (isAr ? 'إيقاف التسجيل مؤقتاً' : 'Pause recording')}
                        className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-md"
                      >
                        {isPracticeRecordingPaused ? <Play size={16} /> : <Pause size={16} />}
                        <span>{isPracticeRecordingPaused ? (isAr ? 'استكمال' : 'Resume') : (isAr ? 'إيقاف مؤقت' : 'Pause')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={stopPracticeRecording}
                        className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white shadow-md"
                      >
                        <Square size={16} />
                        <span>{isAr ? 'إنهاء التسجيل' : 'Finish recording'}</span>
                      </button>
                      <span className="text-xs font-semibold text-amber-800 dark:text-amber-200" aria-live="polite">
                        {isPracticeRecordingPaused ? (isAr ? 'التسجيل متوقف مؤقتاً' : 'Recording paused') : (isAr ? 'جاري التسجيل…' : 'Recording…')}
                      </span>
                    </>
                  )}
                </div>

                {practiceRecordingError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-800 dark:bg-red-950/40 dark:text-red-200">{practiceRecordingError}</p>}
                {recordedAudioUrl && (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex w-full flex-col gap-2">
                  <audio ref={practiceAudioRef} controls src={recordedAudioUrl} className="h-10 w-full max-w-sm" onPlay={() => { if (audioRef.current && !audioRef.current.paused) { audioRef.current.pause(); setIsPlaying(false); } }} />
                  <button type="button" onClick={() => void submitPracticeRecording()} disabled={isSubmittingPractice || practiceSubmitted || !recordedAudioBlob} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white shadow-md transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50">
                    {isSubmittingPractice ? (isAr ? 'جاري الإرسال...' : 'Sending…') : practiceSubmitted ? (isAr ? 'تم الإرسال ✓' : 'Sent to teacher ✓') : (isAr ? 'إرسال التسميع للخادم' : 'Send practice to teacher')}
                  </button>
                  {practiceSubmissionMessage && <p role="status" className="text-xs font-bold text-emerald-700 dark:text-emerald-300">{practiceSubmissionMessage}</p>}
                  {practiceSubmissionError && <p role="alert" className="text-xs font-bold text-red-600 dark:text-red-300">{practiceSubmissionError}</p>}
                </div>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      ✓ {isAr ? 'التسجيل جاهز للاستماع' : 'Recording ready to replay'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>}
      </div>
          <AnimatePresence>
            {showHymnCelebration && (
              <motion.div className="fixed inset-0 z-[140] flex items-center justify-center overflow-y-auto bg-slate-950/75 p-4 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowHymnCelebration(false)} role="dialog" aria-modal="true" aria-label={isAr ? 'احتفال إتقان اللحن' : 'Hymn mastery celebration'}>
                <motion.div initial={{ opacity: 0, y: 28, scale: 0.88 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.96 }} onClick={event => event.stopPropagation()} className="w-full max-w-lg rounded-[2rem] border border-amber-300/30 bg-[var(--mousa-cream-surface)] p-6 shadow-2xl dark:bg-[#211B15]">
                  <RewardCelebration type="star" lang={isAr ? 'ar' : 'en'} title="Hymn Mastered!" titleAr="برافو! أتقنت اللحن!" subtitle="Keep your voice growing with every practice." subtitleAr="كل تدريب بيخلّي صوتك أجمل وأقوى." pointsEarned={userData ? 75 : undefined} badgeText="Hymn Master" badgeTextAr="بطل الألحان" />
                  <button type="button" onClick={() => setShowHymnCelebration(false)} className="mt-5 min-h-11 w-full rounded-2xl bg-[var(--mousa-teal)] px-4 py-3 text-sm font-black text-white shadow-lg">{isAr ? 'يلا نكمل!' : 'Keep exploring!'}</button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          {showSheetMusicViewer && resolvedSheetMusicUrl && (
        <InAppDocumentViewer
          documentUrl={resolvedSheetMusicUrl}
          documentTitle={isAr ? (selectedHymn.titleAr || 'نوتة اللحن') : (selectedHymn.titleEn || 'Hymn Sheet Music')}
          documentType="pdf"
          onClose={() => setShowSheetMusicViewer(false)}
          lang={isAr ? 'ar' : 'en'}
        />
      )}
    </motion.div>
  );
}
