import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Music, Play, Pause, Volume2, VolumeX, X, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useGlobalAudio } from '../../context/AudioContext';
import { useAuth } from '../../context/AuthContext';
import { getHymns } from '../../lib/hymnsService';
import type { CopticHymnItem } from '../../data/hymnsData';

export function GlobalMusicPlayer({ lang }: { lang: 'en' | 'ar' }) {
  const { currentTrackUrl, isPlaying, volume, playTrack, togglePlay, setVolume } = useGlobalAudio();
  const { userData, isGuest } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const [hymns, setHymns] = useState<CopticHymnItem[]>([]);
  const [isLoadingHymns, setIsLoadingHymns] = useState(false);
  const [hymnsError, setHymnsError] = useState<string | null>(null);
  const hymnRequestId = useRef(0);

  const refreshHymns = useCallback(async () => {
    const requestId = ++hymnRequestId.current;
    setIsLoadingHymns(true);
    setHymnsError(null);
    try {
      const viewer = userData && !isGuest
        ? { role: userData.role, hymnsTaxisLevel: userData.hymnsTaxisLevel }
        : undefined;
      const result = await getHymns(undefined, undefined, userData && !isGuest ? 'published' : undefined, viewer);
      if (requestId !== hymnRequestId.current) return;
      if (!result.success) {
        setHymnsError(result.error || (lang === 'ar' ? 'تعذر تحميل الألحان.' : 'Unable to load hymns.'));
        setHymns([]);
        return;
      }
      setHymns(result.items.filter(hymn =>
        Boolean(hymn.audioUrl?.trim()) &&
        (hymn.status === 'published' || ((!userData || isGuest) && hymn.status == null))
      ));
    } catch {
      if (requestId !== hymnRequestId.current) return;
      setHymnsError(lang === 'ar' ? 'تعذر تحميل الألحان. حاول مرة أخرى.' : 'Unable to load hymns. Please try again.');
      setHymns([]);
    } finally {
      if (requestId === hymnRequestId.current) setIsLoadingHymns(false);
    }
  }, [isGuest, lang, userData?.id, userData?.role, userData?.hymnsTaxisLevel]);

  useEffect(() => {
    setHymns([]);
    setHymnsError(null);
  }, [userData?.id, userData?.role, userData?.hymnsTaxisLevel]);

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

  const currentHymn = hymns.find(h => h.audioUrl === currentTrackUrl);

  return (
    <div className="fixed bottom-24 right-4 z-40 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="bg-white rounded-3xl shadow-xl border border-[var(--color-church-cream-dark)] p-4 mb-4 w-72 md:w-80 overflow-hidden"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-[var(--color-church-blue)] flex items-center gap-2">
                <Music size={18} className="text-[var(--color-church-gold)]" />
                {lang === 'ar' ? 'الألحان الكنسية' : 'Church Hymns'}
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full p-1 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 mb-4">
              {isLoadingHymns && hymns.length === 0 ? (
                <p className="py-5 text-center text-sm text-[var(--text-secondary)]" role="status">
                  {lang === 'ar' ? 'جارٍ تحميل الألحان...' : 'Loading hymns...'}
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
                    {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
                  </button>
                </div>
              ) : hymns.length === 0 ? (
                <p className="py-5 text-center text-sm text-[var(--text-secondary)]">
                  {lang === 'ar' ? 'لا توجد ألحان منشورة بها تسجيل صوتي بعد.' : 'No published hymns with audio are available yet.'}
                </p>
              ) : hymns.map((hymn) => (
                <button
                  type="button"
                  key={hymn.id}
                  onClick={() => playTrack(hymn.audioUrl)}
                  className={`w-full text-left p-3 rounded-xl flex justify-between items-center transition-colors ${
                    currentTrackUrl === hymn.audioUrl
                      ? 'bg-[var(--color-church-cream)] border border-[var(--color-church-gold)]/50'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div>
                    <p className={`font-bold text-sm ${currentTrackUrl === hymn.audioUrl ? 'text-[var(--color-church-burgundy)]' : 'text-gray-800'}`}>
                      {lang === 'ar' ? hymn.titleAr : hymn.titleEn}
                    </p>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">{lang === 'ar' ? hymn.seasonAr : hymn.seasonEn}</p>
                  </div>
                  {currentTrackUrl === hymn.audioUrl && isPlaying ? (
                    <Pause size={16} className="text-[var(--color-church-burgundy)]" />
                  ) : (
                    <Play size={16} className="text-gray-400" />
                  )}
                </button>
              ))}
            </div>

            <div className="flex justify-end -mt-2 mb-3">
              <button
                type="button"
                onClick={() => void refreshHymns()}
                disabled={isLoadingHymns}
                aria-label={lang === 'ar' ? 'تحديث قائمة الألحان' : 'Refresh hymn list'}
                className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
              >
                <RefreshCw size={14} className={isLoadingHymns ? 'animate-spin' : ''} />
              </button>
            </div>

            {currentHymn && (
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
                        {lang === 'ar' ? currentHymn.titleAr : currentHymn.titleEn}
                     </p>
                     <p className="text-[10px] text-gray-500 truncate">
                        {currentHymn.titleCoptic}
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
