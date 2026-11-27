import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize2, Pause, Play, Volume2, VolumeX, RotateCcw, RotateCw } from 'lucide-react';

type FeedVideoPlayerProps = {
  src: string;
  title?: string;
  lang?: 'ar' | 'en';
  onError?: () => void;
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  return Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0');
}

export function FeedVideoPlayer({ src, title, lang = 'en', onError }: FeedVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [aspectRatio, setAspectRatio] = useState(9 / 16);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const isArabic = lang === 'ar';

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
    setFailed(false);
    setMuted(true);
    setPlaybackRate(1);
  }, [src]);

  const togglePlayback = useCallback(async () => {
    const video = videoRef.current;
    if (!video || failed) return;
    if (video.paused) {
      try {
        await video.play();
      } catch {
        setPlaying(false);
      }
    } else {
      video.pause();
    }
  }, [failed]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  const seek = (value: number) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const next = Math.max(0, Math.min(duration, value));
    video.currentTime = next;
    setCurrent(next);
  };

  const skip = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    const max = Number.isFinite(video.duration) ? video.duration : duration;
    const next = Math.max(0, Math.min(max, video.currentTime + seconds));
    video.currentTime = next;
    setCurrent(next);
  };

  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) videoRef.current.playbackRate = rate;
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const openFullscreen = async () => {
    const target = containerRef.current || videoRef.current;
    if (!target) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (target.requestFullscreen) await target.requestFullscreen();
      else if (videoRef.current && (videoRef.current as HTMLVideoElement & { webkitEnterFullscreen?: () => void }).webkitEnterFullscreen) {
        (videoRef.current as HTMLVideoElement & { webkitEnterFullscreen: () => void }).webkitEnterFullscreen();
      }
    } catch {
      // Inline playback remains available if fullscreen is unsupported.
    }
  };

  return (
    <section className="relative isolate w-full overflow-hidden bg-black" aria-label={title || (isArabic ? 'فيديو من المجتمع' : 'Community video')}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,.08),transparent_70%)]" />
      {failed ? (
        <div className="flex min-h-56 items-center justify-center px-5 text-center text-sm font-semibold text-white/80">
          {isArabic ? 'الفيديو غير متاح حالياً. حاول مرة أخرى لاحقاً.' : 'Video unavailable. Please try again later.'}
        </div>
      ) : (
        <div
          ref={containerRef}
          className="relative mx-auto flex max-h-[76svh] w-full items-center justify-center overflow-hidden bg-black"
          style={{ aspectRatio, width: aspectRatio < 1 ? 'min(100%, calc(76svh * ' + aspectRatio + '))' : '100%', maxWidth: '100%' }}
          onClick={event => event.stopPropagation()}
          onPointerDown={event => event.stopPropagation()}
        >
          <video
            ref={videoRef}
            src={src}
            controls={false}
            playsInline
            preload="metadata"
            muted={muted}
            aria-label={title || (isArabic ? 'فيديو من المجتمع' : 'Community video')}
            className="absolute inset-0 h-full w-full bg-black object-contain"
            onClick={() => void togglePlayback()}
            onLoadedMetadata={event => {
              const video = event.currentTarget;
              setDuration(Number.isFinite(video.duration) ? video.duration : 0);
              if (video.videoWidth > 0 && video.videoHeight > 0) {
                setAspectRatio(Math.min(16 / 9, Math.max(9 / 16, video.videoWidth / video.videoHeight)));
              }
            }}
            onDurationChange={event => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
            onTimeUpdate={event => setCurrent(event.currentTarget.currentTime)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => { setPlaying(false); setCurrent(0); }}
            onError={() => { setFailed(true); setPlaying(false); onError?.(); }}
          >
            Your browser does not support video playback.
          </video>

          {!playing && (
            <button type="button" onClick={() => void togglePlayback()} aria-label={isArabic ? 'تشغيل الفيديو' : 'Play video'}
              className="absolute left-1/2 top-1/2 z-20 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/35 bg-black/55 text-white shadow-2xl backdrop-blur-sm transition hover:scale-105 hover:bg-black/75">
              <Play size={29} fill="currentColor" className="translate-x-0.5"/>
            </button>
          )}

          <span className="pointer-events-none absolute left-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white/90 backdrop-blur-sm">
            <Play size={11} fill="currentColor" /> {isArabic ? 'فيديو' : 'Video'}
          </span>

          <div className="absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-3 pb-3 pt-10 text-white" dir={isArabic ? 'rtl' : 'ltr'}>
            <input type="range" min={0} max={Math.max(0.1, duration || 0.1)} step={0.1} value={Math.min(current, duration || 0)}
              onChange={event => seek(Number(event.target.value))}
              aria-label={isArabic ? 'تقديم أو تأخير الفيديو' : 'Seek video'}
              className="mb-2 h-1.5 w-full cursor-pointer accent-amber-300"/>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button type="button" onClick={() => void togglePlayback()} aria-label={playing ? (isArabic ? 'إيقاف مؤقت' : 'Pause video') : (isArabic ? 'تشغيل الفيديو' : 'Play video')}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15 transition hover:bg-white/25">
                {playing ? <Pause size={18} fill="currentColor"/> : <Play size={18} fill="currentColor"/>}
              </button>
              <span className="min-w-[5.5rem] text-[11px] font-bold tabular-nums text-white/90">{formatTime(current)} / {formatTime(duration)}</span>
              <button type="button" onClick={() => skip(-5)} aria-label={isArabic ? 'رجوع ٥ ثواني' : 'Rewind 5 seconds'} title={isArabic ? 'رجوع ٥ ثواني' : 'Rewind 5s'} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15 transition hover:bg-white/25"><RotateCcw size={17}/></button>
              <button type="button" onClick={() => skip(5)} aria-label={isArabic ? 'تقديم ٥ ثواني' : 'Skip forward 5 seconds'} title={isArabic ? 'تقديم ٥ ثواني' : 'Forward 5s'} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15 transition hover:bg-white/25"><RotateCw size={17}/></button>
              <select value={playbackRate} onChange={event => changePlaybackRate(Number(event.target.value))} aria-label={isArabic ? 'سرعة تشغيل الفيديو' : 'Video playback speed'} className="h-9 max-w-[4.3rem] rounded-full border border-white/15 bg-white/15 px-2 text-[11px] font-black text-white outline-none">
                {[0.75,1,1.25,1.5,2].map(rate => <option key={rate} value={rate} className="bg-slate-900 text-white">{rate}x</option>)}
              </select>
              <span className="flex-1"/>
              <button type="button" onClick={toggleMute} aria-label={muted ? (isArabic ? 'تشغيل الصوت' : 'Unmute video') : (isArabic ? 'كتم الصوت' : 'Mute video')}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15 transition hover:bg-white/25">
                {muted ? <VolumeX size={18}/> : <Volume2 size={18}/>}
              </button>
              <button type="button" onClick={() => void openFullscreen()} aria-label={isArabic ? 'ملء الشاشة' : 'Fullscreen'}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15 transition hover:bg-white/25">
                <Maximize2 size={17}/>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
