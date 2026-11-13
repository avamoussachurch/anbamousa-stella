import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, RotateCcw, RotateCw } from 'lucide-react';

export interface UniversalAudioPlayerProps {
  src: string;
  title?: string;
  lang?: 'ar' | 'en';
  className?: string;
  compact?: boolean;
  accent?: 'amber' | 'teal' | 'blue';
}

const SPEED_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

const formatTime = (value: number) => {
  if (!Number.isFinite(value) || value < 0) return '0:00';
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

export function UniversalAudioPlayer({
  src,
  title,
  lang = 'ar',
  className = '',
  compact = false,
  accent = 'amber'
}: UniversalAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState('');

  const isAr = lang === 'ar';
  const accentClass = accent === 'teal' ? 'accent-teal-600' : accent === 'blue' ? 'accent-blue-500' : 'accent-amber-500';

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = speed;
    audio.volume = volume;
    audio.muted = muted;
  }, [speed, volume, muted, src]);

  useEffect(() => {
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setError('');
    if (audioRef.current) audioRef.current.pause();
  }, [src]);

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      setPlaying(false);
      return;
    }
    setError('');
    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
      setError(isAr ? 'مش قادرين نشغّل الملف الصوتي. جرّب تاني.' : 'Audio could not be played. Please try again.');
    }
  };

  const seek = (value: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setCurrentTime(value);
  };

  const changeSpeed = (value: number) => {
    const next = Math.min(2, Math.max(0.5, value));
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  return (
    <section className={`w-full rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-3 sm:p-4 space-y-3 ${className}`} dir={isAr ? 'rtl' : 'ltr'}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={event => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
        onDurationChange={event => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
        onTimeUpdate={event => setCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => {
          setPlaying(false);
          setError(isAr ? 'ملف الصوت مش متاح دلوقتي.' : 'This audio file is unavailable right now.');
        }}
      />
      {title && <div className="text-sm font-bold text-stone-800 dark:text-stone-100 truncate">{title}</div>}
      {error && <p role="alert" className="text-xs font-semibold text-rose-600 dark:text-rose-300">{error}</p>}

      <div className="space-y-1">
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(currentTime, duration || 0)}
          onChange={event => seek(Number(event.target.value))}
          disabled={!duration}
          aria-label={isAr ? 'موضع التشغيل' : 'Playback position'}
          className={`w-full h-2 rounded-full cursor-pointer disabled:opacity-40 ${accentClass}`}
        />
        <div className="flex justify-between text-[11px] font-mono text-stone-500 dark:text-stone-400" dir="ltr">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className={`flex flex-wrap items-center justify-between gap-3 ${compact ? '' : 'sm:pt-1'}`}>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => seek(Math.max(0, currentTime - 10))} disabled={!duration} aria-label={isAr ? 'رجوع ١٠ ثواني' : 'Back 10 seconds'} className="p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-40">
            <RotateCcw size={17} />
          </button>
          <button type="button" onClick={togglePlayback} disabled={!src} aria-label={playing ? (isAr ? 'إيقاف مؤقت' : 'Pause') : (isAr ? 'تشغيل' : 'Play')} className="w-11 h-11 rounded-full bg-[var(--mousa-teal)] text-white flex items-center justify-center shadow-md disabled:opacity-40">
            {playing ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}
          </button>
          <button type="button" onClick={() => seek(Math.min(duration, currentTime + 10))} disabled={!duration} aria-label={isAr ? 'تقديم ١٠ ثواني' : 'Forward 10 seconds'} className="p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-40">
            <RotateCw size={17} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-stone-500">{isAr ? 'السرعة' : 'Speed'}</span>
          <select value={SPEED_PRESETS.includes(speed) ? String(speed) : 'custom'} onChange={event => event.target.value !== 'custom' && changeSpeed(Number(event.target.value))} aria-label={isAr ? 'اختار سرعة التشغيل' : 'Choose playback speed'} className="rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-2 py-1 text-xs font-bold text-stone-800 dark:text-stone-100">
            {!SPEED_PRESETS.includes(speed) && <option value="custom">{speed.toFixed(2)}x</option>}
            {SPEED_PRESETS.map(rate => <option key={rate} value={rate}>{rate}x</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <span className="text-[11px] font-semibold text-stone-500 whitespace-nowrap">{isAr ? 'ضبط السرعة' : 'Fine speed'}</span>
        <input type="range" min={0.5} max={2} step={0.05} value={speed} onChange={event => changeSpeed(Number(event.target.value))} aria-label={isAr ? 'ضبط سرعة التشغيل بدقة' : 'Fine playback speed adjustment'} className={`w-full h-1.5 cursor-pointer ${accentClass}`} />
        <span className="text-xs font-mono font-bold text-stone-700 dark:text-stone-200 w-12 text-end">{speed.toFixed(2)}x</span>
      </div>

      {!compact && (
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setMuted(value => !value)} aria-label={muted ? (isAr ? 'إلغاء كتم الصوت' : 'Unmute') : (isAr ? 'كتم الصوت' : 'Mute')} className="p-1.5 text-stone-500">
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume} onChange={event => { setVolume(Number(event.target.value)); setMuted(false); }} aria-label={isAr ? 'مستوى الصوت' : 'Volume'} className={`w-24 ${accentClass}`} />
        </div>
      )}
    </section>
  );
}
