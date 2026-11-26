import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, AlertCircle } from 'lucide-react';

type Props = { src: string; lang: 'ar' | 'en' };

function clock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const value = Math.floor(seconds);
  return Math.floor(value / 60) + ':' + String(value % 60).padStart(2, '0');
}

export function FeedVoiceMessage({ src, lang }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [failed, setFailed] = useState(false);
  const bars = useMemo(() => Array.from({ length: 32 }, (_, index) => 4 + Math.round(Math.abs(Math.sin(index * 1.7 + src.length) * Math.cos(index * .43)) * 15)), [src]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
    setFailed(false);
  }, [src]);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio || failed) return;
    if (audio.paused) {
      try { await audio.play(); } catch { setFailed(true); }
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  const seek = (value: number) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const next = Math.max(0, Math.min(duration, value));
    audio.currentTime = next;
    setCurrent(next);
  };

  return (
    <div className="flex w-full max-w-[28rem] items-center gap-2.5 rounded-[1.35rem] border border-emerald-200/70 bg-[#F0F8F2] px-3 py-2.5 text-stone-800 shadow-sm dark:border-emerald-900/60 dark:bg-[#172C25] dark:text-emerald-50" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={event => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
        onTimeUpdate={event => setCurrent(event.currentTarget.currentTime)}
        onEnded={() => { setPlaying(false); setCurrent(0); }}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        onError={() => { setFailed(true); setPlaying(false); }}
      />
      <button type="button" onClick={() => void toggle()} disabled={failed}
        aria-label={playing ? (lang === 'ar' ? 'إيقاف مؤقت' : 'Pause voice message') : (lang === 'ar' ? 'تشغيل الرسالة الصوتية' : 'Play voice message')}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-700 text-white shadow transition hover:bg-emerald-600 disabled:opacity-50 dark:bg-emerald-500 dark:text-emerald-950">
        {failed ? <AlertCircle size={16}/> : playing ? <Pause size={17} fill="currentColor"/> : <Play size={17} fill="currentColor" className="translate-x-px"/>}
      </button>
      <div className="min-w-0 flex-1">
        <div className="relative flex h-7 items-center gap-[3px]" aria-label={lang === 'ar' ? 'موجة الرسالة الصوتية' : 'Voice message waveform'}>
          {bars.map((height,index) => <span key={index} className={'min-w-[2px] flex-1 rounded-full ' + (duration > 0 && index / bars.length <= current / duration ? 'bg-emerald-700 dark:bg-emerald-300' : 'bg-emerald-900/25 dark:bg-emerald-100/30')} style={{ height: height + 'px' }}/>)}
          <input type="range" min={0} max={Math.max(0.1,duration || 0.1)} step={0.1} value={Math.min(current,duration || 0)}
            disabled={failed || !duration} onChange={event => seek(Number(event.target.value))}
            aria-label={lang === 'ar' ? 'تقديم أو تأخير الرسالة الصوتية' : 'Seek voice message'}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-default"/>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2 text-[10px] font-semibold tabular-nums text-emerald-950/70 dark:text-emerald-100/70">
          <span>{failed ? (lang === 'ar' ? 'التسجيل غير متاح' : 'Voice message unavailable') : clock(current)}</span>
          <span>{clock(duration)}</span>
        </div>
      </div>
    </div>
  );
}
