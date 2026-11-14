import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Music, Play, Pause, Volume2, VolumeX, X, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useGlobalAudio } from '../../context/AudioContext';
import { useAuth } from '../../context/AuthContext';
import { getHymns } from '../../lib/hymnsService';
import type { CopticHymnItem } from '../../data/hymnsData';
import { useActiveWorkspace } from '../../context/WorkspaceContext';
import { resolveCurriculumMediaUrl } from '../../lib/curriculumMediaUrl';
import { fetchGlobalFeedAudioTracks, type GlobalFeedAudioTrack } from '../../lib/feedService';

export function GlobalMusicPlayer({ lang }: { lang: 'en' | 'ar' }) {
  const { currentTrackUrl, isPlaying, volume, playTrack, togglePlay, setVolume } = useGlobalAudio();
  const { userData, isGuest } = useAuth();
  const workspace = useActiveWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const [hymns, setHymns] = useState<Array<CopticHymnItem & { resolvedAudioUrl: string }>>([]);
  const [feedTracks, setFeedTracks] = useState<GlobalFeedAudioTrack[]>([]);
  const [isLoadingHymns, setIsLoadingHymns] = useState(false);
  const [hymnsError, setHymnsError] = useState<string | null>(null);
  const hymnRequestId = useRef(0);

  const refreshHymns = useCallback(async () => {
    const requestId = ++hymnRequestId.current;
    setIsLoadingHymns(true);
    setHymnsError(null);
    try {
      const viewer = userData && !isGuest
        ? workspace === 'student'
          ? { roles: userData.roles, hymnsTaxisLevel: userData.hymnsTaxisLevel }
          : workspace === 'teacher'
            ? { roles: userData.roles.filter(role => role === 'teacher' || role === 'admin'), hymnsTaxisLevel: userData.hymnsTaxisLevel }
            : undefined
        : undefined;
      const [result, feedResult] = await Promise.all([
        getHymns(undefined, undefined, userData && !isGuest ? 'published' : undefined, viewer),
        fetchGlobalFeedAudioTracks()
      ]);
      if (requestId !== hymnRequestId.current) return;
      if (!result.success) {
        setHymnsError(result.error || (lang === 'ar' ? 'مش قادرين نحمّل الألحان دلوقتي.' : 'Unable to load hymns.'));
        setHymns([]);
      } else {
        const publishedWithAudio = result.items.filter(hymn =>
          Boolean(hymn.audioUrl?.trim()) &&
          (hymn.status === 'published' || ((!userData || isGuest) && hymn.status == null))
        );
        const resolved = await Promise.all(publishedWithAudio.map(async hymn => {
          try {
            const resolvedAudioUrl = await resolveCurriculumMediaUrl(hymn.audioUrl);
            return resolvedAudioUrl ? { ...hymn, resolvedAudioUrl } : null;
          } catch (error) {
            console.warn('Could not resolve global Hymn audio:', hymn.id, error);
            return null;
          }
        }));
        if (requestId !== hymnRequestId.current) return;
        setHymns(resolved.filter((hymn): hymn is CopticHymnItem & { resolvedAudioUrl: string } => Boolean(hymn)));
        setHymnsError(null);
      }
      if (feedResult.error) console.warn('Could not load opted-in feed audio tracks:', feedResult.error.message);
      setFeedTracks(feedResult.data || []);
    } catch {
      if (requestId !== hymnRequestId.current) return;
      setHymnsError(lang === 'ar' ? 'مش قادرين نحمّل الألحان دلوقتي. حاول مرة أخرى.' : 'Unable to load hymns. Please try again.');
      setHymns([]);
    } finally {
      if (requestId === hymnRequestId.current) setIsLoadingHymns(false);
    }
  }, [isGuest, lang, userData?.id, userData?.roles, userData?.hymnsTaxisLevel, workspace]);

  useEffect(() => {
    setHymns([]);
    setHymnsError(null);
  }, [userData?.id, userData?.roles, userData?.hymnsTaxisLevel]);

  useEffect(() => {
    if (!isOpen) return;
    void refreshHymns();
    const refreshInterval = window.setInterval(() => void refreshHymns(), 45_000);
    const handleHymnsUpdated = () => void refreshHymns();
    window.addEventListener('church:hymns_updated', handleHymnsUpdated);
    return () => {
      window.clearInterval(refreshInterval);
      window.removeEventListener('church:hymns_updated', handleHymnsUpdated);
    };
  }, [isOpen, refreshHymns]);

  const currentHymn = hymns.find(h => h.resolvedAudioUrl === currentTrackUrl);
  const currentFeedTrack = feedTracks.find(track => track.mediaUrl === currentTrackUrl);
  const currentTrackTitle = currentHymn ? (lang === 'ar' ? currentHymn.titleAr : currentHymn.titleEn) : currentFeedTrack?.title;
  const currentTrackSubtitle = currentHymn ? currentHymn.titleCoptic : (currentFeedTrack ? (lang === 'ar' ? 'تسجيل من المجتمع' : 'Community recording') : '');

  return (
    <div className={`fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-40 flex max-w-[calc(100vw-1.5rem)] flex-col ${lang === 'ar' ? 'left-3 items-start' : 'right-3 items-end'}`}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="bg-white rounded-3xl shadow-xl border border-[var(--color-church-cream-dark)] p-4 mb-4 w-[min(18rem,calc(100vw-1.5rem))] sm:w-80 max-h-[70dvh] overflow-y-auto overflow-x-hidden"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-[var(--color-church-blue)] flex items-center gap-2">
                <Music size={18} className="text-[var(--color-church-gold)]" />
                {lang === 'ar' ? 'ألحان الكنيسة' : 'Church Hymns'}
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full p-1 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 mb-4">
              {isLoadingHymns && hymns.length === 0 ? (
                <p className="py-5 text-center text-sm text-[var(--text-secondary)]" role="status">
                  {lang === 'ar' ? 'بنحمّل الألحان...' : 'Loading hymns...'}
                </p>
              ) : hymnsError ? (
                <div className="py-4 text-center" role="alert">
                  <p className="text-sm text-[var(--feedback-error)]">{hymnsError}</p>
                  <button
                    type="button"
                    onClick={() => void refreshHymns()}
                    className="mt-2 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-[var(--mousa-teal)] hover:bg-[var(--mousa-sand-100)]"
                  >
                    <RefreshCw size={13} />
                    {lang === 'ar' ? 'جرّب تاني' : 'Retry'}
                  </button>
                </div>
              ) : hymns.length === 0 && feedTracks.length === 0 ? (
                <p className="py-5 text-center text-sm text-[var(--text-secondary)]">
                  {lang === 'ar' ? 'لسه مفيش ألحان منشورة بتسجيل صوتي.' : 'No published hymns with audio are available yet.'}
                </p>
              ) : hymns.map((hymn) => (
                <button
                  type="button"
                  key={hymn.id}
                  onClick={() => playTrack(hymn.resolvedAudioUrl)}
                  className={`w-full text-left p-3 rounded-xl flex justify-between items-center transition-colors ${
                    currentTrackUrl === hymn.resolvedAudioUrl
                      ? 'bg-[var(--color-church-cream)] border border-[var(--color-church-gold)]/50'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div>
                    <p className={`font-bold text-sm ${currentTrackUrl === hymn.resolvedAudioUrl ? 'text-[var(--color-church-burgundy)]' : 'text-gray-800'}`}>
                      {lang === 'ar' ? hymn.titleAr : hymn.titleEn}
                    </p>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">{lang === 'ar' ? hymn.seasonAr : hymn.seasonEn}</p>
                  </div>
                  {currentTrackUrl === hymn.resolvedAudioUrl && isPlaying ? (
                    <Pause size={16} className="text-[var(--color-church-burgundy)]" />
                  ) : (
                    <Play size={16} className="text-gray-400" />
                  )}
                </button>
              ))}
            </div>

            {feedTracks.length > 0 && (
              <div className="mt-3 border-t border-gray-100 pt-3 space-y-2">
                <p className="px-1 text-[11px] font-black uppercase tracking-wide text-gray-500">{lang === 'ar' ? 'تسجيلات المجتمع المضافة للمشغل' : 'Community recordings added to player'}</p>
                {feedTracks.map(track => (
                  <button key={track.id} type="button" onClick={() => playTrack(track.mediaUrl)} className={`w-full min-w-0 rounded-xl border p-3 text-left flex items-center justify-between gap-2 ${currentTrackUrl === track.mediaUrl ? 'bg-[var(--color-church-cream)] border-[var(--color-church-gold)]/50' : 'border-transparent hover:bg-gray-50'}`}>
                    <span className="min-w-0 truncate text-sm font-bold text-gray-800">{track.title}</span>
                    {currentTrackUrl === track.mediaUrl && isPlaying ? <Pause size={15} /> : <Play size={15} />}
                  </button>
                ))}
              </div>
            )}
            <div className="flex justify-end -mt-2 mb-3">
              <button
                type="button"
                onClick={() => void refreshHymns()}
                disabled={isLoadingHymns}
                aria-label={lang === 'ar' ? 'حدّث قائمة الألحان' : 'Refresh hymn list'}
                className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
              >
                <RefreshCw size={14} className={isLoadingHymns ? 'animate-spin' : ''} />
              </button>
            </div>

            {(currentHymn || currentFeedTrack) && (
              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center gap-4">
                  <button
                    onClick={togglePlay}
                    className="w-10 h-10 rounded-full bg-[var(--color-church-burgundy)] text-white flex items-center justify-center shadow-md hover:bg-red-800 transition-colors"
                  >
                    {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                  </button>
                  <div className="flex-1 overflow-hidden">
                     <p className="text-xs font-bold text-[var(--color-church-blue)] truncate">
                        {currentTrackTitle}
                     </p>
                     <p className="text-[10px] text-gray-500 truncate">
                        {currentTrackSubtitle}
                     </p>
                  </div>
                  <div className="relative flex items-center">
                    <button onClick={() => setShowVolume(!showVolume)} className="text-gray-400 hover:text-[var(--color-church-blue)] p-1">
                      {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                    <AnimatePresence>
                      {showVolume && (
                        <motion.div
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 80 }}
                          exit={{ opacity: 0, width: 0 }}
                          className="absolute right-8 top-1/2 -translate-y-1/2 bg-white rounded-full px-2 py-1 shadow-md border border-gray-100 flex items-center h-8"
                        >
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={volume}
                            onChange={(e) => setVolume(parseFloat(e.target.value))}
                            className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[var(--color-church-gold)]"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-white rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.15)] border-2 border-[var(--color-church-cream-dark)] flex items-center justify-center text-[var(--color-church-blue)] hover:scale-105 transition-transform"
      >
        <div className="relative">
           <Music size={24} />
           {isPlaying && (
             <span className="absolute -top-1 -right-1 flex h-3 w-3">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-church-gold)] opacity-75"></span>
               <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--color-church-gold)]"></span>
             </span>
           )}
        </div>
      </button>
    </div>
  );
}
