import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, X, RefreshCw } from 'lucide-react';
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
  const dragOrigin = useRef<{ pointerX: number; pointerY: number; left: number; top: number } | null>(null);
  const didDrag = useRef(false);
  const [bubblePosition, setBubblePosition] = useState<{ left: number; top: number } | null>(() => {
    try {
      const saved = window.localStorage.getItem('anba-global-player-position');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      return Number.isFinite(parsed.left) && Number.isFinite(parsed.top) ? { left: parsed.left, top: parsed.top } : null;
    } catch { return null; }
  });
  const [isDragging, setIsDragging] = useState(false);
  const playerRootRef = useRef<HTMLDivElement>(null);

  const clampBubblePosition = useCallback((left: number, top: number) => {
    const bubbleSize = 62;
    const margin = 10;
    return {
      left: Math.max(margin, Math.min(window.innerWidth - bubbleSize - margin, left)),
      top: Math.max(margin + 8, Math.min(window.innerHeight - bubbleSize - margin, top))
    };
  }, []);

  const handleBubblePointerDown = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (isOpen) return;
    const rect = event.currentTarget.getBoundingClientRect();
    didDrag.current = false;
    dragOrigin.current = { pointerX: event.clientX, pointerY: event.clientY, left: rect.left, top: rect.top };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [isOpen]);

  const handleBubblePointerMove = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragOrigin.current) return;
    const dx = event.clientX - dragOrigin.current.pointerX;
    const dy = event.clientY - dragOrigin.current.pointerY;
    if (Math.abs(dx) + Math.abs(dy) > 4) {
      didDrag.current = true;
      setIsDragging(true);
    }
    if (didDrag.current) setBubblePosition(clampBubblePosition(dragOrigin.current.left + dx, dragOrigin.current.top + dy));
  }, [clampBubblePosition]);

  const handleBubblePointerUp = useCallback(() => {
    if (!dragOrigin.current) return;
    const current = bubblePosition;
    if (current && didDrag.current) {
      const bubbleSize = 62;
      const margin = 10;
      const candidates = [
        { edge: 'left', distance: current.left },
        { edge: 'right', distance: window.innerWidth - bubbleSize - current.left },
        { edge: 'top', distance: current.top },
        { edge: 'bottom', distance: window.innerHeight - bubbleSize - current.top }
      ];
      const nearest = candidates.reduce((best, candidate) => candidate.distance < best.distance ? candidate : best);
      const snapped = clampBubblePosition(
        nearest.edge === 'left' ? margin : nearest.edge === 'right' ? window.innerWidth - bubbleSize - margin : current.left,
        nearest.edge === 'top' ? margin + 8 : nearest.edge === 'bottom' ? window.innerHeight - bubbleSize - margin : current.top
      );
      setBubblePosition(snapped);
      try { window.localStorage.setItem('anba-global-player-position', JSON.stringify(snapped)); } catch { /* storage may be unavailable */ }
    }
    dragOrigin.current = null;
    setIsDragging(false);
  }, [bubblePosition, clampBubblePosition]);

  useEffect(() => {
    const handleResize = () => setBubblePosition(current => current ? clampBubblePosition(current.left, current.top) : current);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [clampBubblePosition]);


  useEffect(() => {
    if (!isOpen) return;
    const handleOutsidePointer = (event: PointerEvent) => {
      if (playerRootRef.current?.contains(event.target as Node)) return;
      setIsOpen(false);
      setShowVolume(false);
    };
    const handleEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setIsOpen(false); };
    document.addEventListener('pointerdown', handleOutsidePointer);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointer);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

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
    <motion.div
      ref={playerRootRef}
      className={`fixed z-50 flex max-w-[calc(100vw-1.25rem)] ${(bubblePosition ? bubblePosition.left < window.innerWidth / 2 : lang === 'ar') ? 'items-start' : 'items-end'} ${bubblePosition && bubblePosition.top < window.innerHeight / 2 ? 'flex-col-reverse' : 'flex-col'}`}
      style={bubblePosition ? undefined : {
        bottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)',
        ...(lang === 'ar' ? { left: 12 } : { right: 12 })
      }}
      animate={bubblePosition ? { left: bubblePosition.left, top: bubblePosition.top } : undefined}
      transition={isDragging ? { duration: 0 } : { type: 'spring', stiffness: 390, damping: 19, mass: 0.72, bounce: 0.52 }}
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={["anba-global-player-panel rounded-3xl p-4 w-[min(18rem,calc(100vw-1.5rem))] sm:w-80 max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain overflow-x-hidden", bubblePosition && bubblePosition.top < window.innerHeight / 2 ? "mt-4 mb-0" : "mb-4 mt-0"].join(" ")}
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

      <motion.button
        type="button"
        aria-label={lang === 'ar' ? 'افتح مشغل الألحان أو اسحب الفقاعة لتحريكها' : 'Open hymns player or drag the bubble to move it'}
        onPointerDown={handleBubblePointerDown}
        onPointerMove={handleBubblePointerMove}
        onPointerUp={handleBubblePointerUp}
        onPointerCancel={handleBubblePointerUp}
        onClick={() => { if (!didDrag.current) setIsOpen(!isOpen); didDrag.current = false; }}
        whileHover={{ scale: 1.07, rotate: -3 }}
        whileTap={{ scale: 0.92 }}
        style={{ touchAction: 'none', cursor: isDragging ? 'grabbing' : 'grab' }}
        className="anba-global-player-bubble relative grid h-[62px] w-[62px] select-none place-items-center rounded-full border border-[#E8D19A] text-white shadow-[0_10px_28px_rgba(8,30,35,.38)]"
        animate={isDragging
          ? { scale: 1.12, rotate: 9, y: -2 }
          : isPlaying
            ? { scale: 1, y: [0, -2, 0], rotate: [0, 2, 0] }
            : { scale: 1, y: 0, rotate: 0 }}
        transition={isDragging
          ? { type: 'spring', stiffness: 440, damping: 17, mass: 0.55 }
          : isPlaying
            ? { duration: 2.8, repeat: Infinity, ease: 'easeInOut' }
            : { type: 'spring', stiffness: 300, damping: 20 }}
      >
        <span className="absolute inset-0 rounded-full border-2 border-[#E8D19A] bg-[radial-gradient(circle_at_30%_22%,#42696A,#173D43_72%)] shadow-[inset_0_2px_5px_rgba(255,255,255,.22),0_7px_20px_rgba(8,30,35,.35)]" />
        <span className="absolute inset-[5px] rounded-full border border-[#F5E6BE]/35" />
        <svg className="relative z-10 h-10 w-10 drop-shadow-[0_2px_2px_rgba(0,0,0,.3)]" viewBox="0 0 48 48" role="img" aria-label="Coptic church cymbals">
          <circle cx="17" cy="27" r="12" fill="#D8B45F" stroke="#765326" strokeWidth="1.7" />
          <circle cx="31" cy="27" r="12" fill="#F0D58C" stroke="#765326" strokeWidth="1.7" />
          <circle cx="17" cy="27" r="8.5" fill="none" stroke="#FFF0BE" strokeWidth="1.1" />
          <circle cx="31" cy="27" r="8.5" fill="none" stroke="#FFF0BE" strokeWidth="1.1" />
          <path d="M24 4v11M19 9.5h10M24 15v5" stroke="#FFF0CE" strokeWidth="2" strokeLinecap="round" />
          <circle cx="17" cy="27" r="2" fill="#765326" /><circle cx="31" cy="27" r="2" fill="#765326" />
        </svg>
        {isPlaying && <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#173D43] bg-[#F5D98C]" />}
      </motion.button>
    </motion.div>
  );
}
