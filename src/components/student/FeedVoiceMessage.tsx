import React, { useEffect, useRef, useState } from 'react';
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
  const [playbackRate, setPlaybackRate] = useState(1);
  const [waveformLevels, setWaveformLevels] = useState<number[]>(() => Array(48).fill(5));

  const waveformRequestedRef = useRef(false);
  const waveformCancelledRef = useRef(false);

  useEffect(() => {
    waveformRequestedRef.current = false;
    waveformCancelledRef.current = false;
    setWaveformLevels(Array(48).fill(5));
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
    setFailed(false);
    setPlaybackRate(1);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.playbackRate = 1;
    }

    return () => {
      waveformCancelledRef.current = true;
    };
  }, [src]);

  // Only fetch and decode the full recording after the user chooses to play it.
  // Fetching every visible voice post on mount duplicates media transfer and wastes egress.
  const loadWaveformOnDemand = async () => {
    if (waveformRequestedRef.current || typeof window === 'undefined' || !('AudioContext' in window)) return;
    waveformRequestedRef.current = true;
    let context: AudioContext | null = null;
    try {
      const response = await fetch(src, { mode: 'cors' });
      if (!response.ok) throw new Error('Waveform source unavailable');
      const buffer = await response.arrayBuffer();
      if (waveformCancelledRef.current) return;
      context = new AudioContext();
      const decoded = await context.decodeAudioData(buffer.slice(0));
      if (waveformCancelledRef.current) return;
      const channel = decoded.getChannelData(0);
      const count = 48;
      const levels = Array.from({ length: count }, (_, index) => {
        const start = Math.floor(index * channel.length / count);
        const end = Math.max(start + 1, Math.floor((index + 1) * channel.length / count));
        let energy = 0;
        let peak = 0;
        for (let sample = start; sample < end; sample += 1) {
          const amplitude = Math.abs(channel[sample] || 0);
          energy += amplitude * amplitude;
          peak = Math.max(peak, amplitude);
        }
        const rms = Math.sqrt(energy / Math.max(1, end - start));
        return Math.max(4, Math.min(34, Math.round(4 + Math.max(rms * 42, peak * 15))));
      });
      setWaveformLevels(levels);
    } catch {
      // Keep a neutral waveform rather than fabricating audio peaks.
    } finally {
      if (context) void context.close().catch(() => {});
    }
  };

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio || failed) return;
    if (audio.paused) {
      void loadWaveformOnDemand();
      try { await audio.play(); } catch { setFailed(true); }
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  const seek = (value: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(duration) || duration <= 0) return;
    const next = Math.max(0, Math.min(duration, value));
    audio.currentTime = next;
    setCurrent(next);
  };

  const progress = duration > 0 ? Math.min(1, Math.max(0, current / duration)) : 0;

  return (
    <div className="flex w-full max-w-[28rem] items-center gap-2.5 rounded-[1.35rem] border border-emerald-200/70 bg-[#F0F8F2] px-3 py-2.5 text-stone-800 shadow-sm dark:border-emerald-900/60 dark:bg-[#172C25] dark:text-emerald-50" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={event => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
        onDurationChange={event => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
        onTimeUpdate={event => setCurrent(Number.isFinite(event.currentTarget.currentTime) ? event.currentTarget.currentTime : 0)}
        onEnded={() => { setPlaying(false); setCurrent(0); }}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        onError={() => { setFailed(true); setPlaying(false); }}
      />
      <button type="button" onClick={() => void toggle()} disabled={failed}
        aria-label={playing ? (lang === 'ar' ? 'إيقاف مؤقت' : 'Pause voice message') : (lang === 'ar' ? 'تشغيل الرسالة الصوتية' : 'Play voice message')}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-700 text-white shadow transition hover:bg-emerald-600 disabled:opacity-50 dark:bg-emerald-500 dark:text-emerald-950">
        {failed ? <AlertCircle size={16}/> : playing ? <Pause size={17} fill="currentColor"/> : <Play size={17} fill="currentColor" className="translate-x-px"/>}
      </button>
      <div className="min-w-0 flex-1">
        <div className="relative flex h-9 items-center gap-[2px]" aria-label={lang === 'ar' ? 'موجة الرسالة الصوتية' : 'Voice message waveform'}>
          {waveformLevels.map((height,index) => <span key={index} className={'min-w-[2px] flex-1 rounded-full transition-colors ' + (index / waveformLevels.length <= progress ? 'bg-emerald-700 dark:bg-emerald-300' : 'bg-emerald-900/25 dark:bg-emerald-100/30')} style={{ height: height + 'px' }}/>)}
          <input type="range" min={0} max={Math.max(0.1,duration || 0.1)} step={0.05} value={Math.min(current,duration || 0)}
            disabled={failed || !duration} onChange={event => seek(Number(event.target.value))}
            aria-label={lang === 'ar' ? 'تقديم أو تأخير الرسالة الصوتية' : 'Seek voice message'}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-default"/>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2 text-[10px] font-semibold tabular-nums text-emerald-950/70 dark:text-emerald-100/70">
          <span>{failed ? (lang === 'ar' ? 'التسجيل غير متاح' : 'Voice message unavailable') : clock(current)}</span>
          <span>{clock(duration)}</span>
        </div>
      </div>
      <select value={playbackRate} onChange={event => setPlaybackRate(Number(event.target.value))} aria-label={lang === 'ar' ? 'سرعة الرسالة الصوتية' : 'Voice playback speed'} className="h-8 shrink-0 rounded-lg border border-emerald-800/15 bg-white/70 px-1.5 text-[10px] font-black text-emerald-950 outline-none dark:border-emerald-100/15 dark:bg-white/10 dark:text-emerald-50">
        {[0.75,1,1.25,1.5,2].map(rate => <option key={rate} value={rate} className="text-slate-900">{rate}x</option>)}
      </select>
    </div>
  );
}
