import React, { useRef, useState } from 'react';
import { Maximize2, Play } from 'lucide-react';

type FeedVideoPlayerProps = {
  src: string;
  title?: string;
  onError?: () => void;
};

export function FeedVideoPlayer({ src, title, onError }: FeedVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [aspectRatio, setAspectRatio] = useState(9 / 16);
  const [failed, setFailed] = useState(false);

  const openFullscreen = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (video.requestFullscreen) await video.requestFullscreen();
      else if ((video as HTMLVideoElement & { webkitEnterFullscreen?: () => void }).webkitEnterFullscreen) {
        (video as HTMLVideoElement & { webkitEnterFullscreen: () => void }).webkitEnterFullscreen();
      }
    } catch {
      // Native playback controls remain available when fullscreen is unsupported.
    }
  };

  return (
    <section className="relative isolate w-full overflow-hidden bg-black" aria-label={title || 'Community video'}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,.08),transparent_70%)]" />
      {failed ? (
        <div className="flex min-h-56 items-center justify-center px-5 text-center text-sm font-semibold text-white/80">
          Video unavailable. Please try again later.
        </div>
      ) : (
        <div className="relative mx-auto flex max-h-[76svh] w-full items-center justify-center" style={{ aspectRatio, maxWidth: aspectRatio < 1 ? 'min(100%, 30rem)' : '100%' }}>
          <video
            ref={videoRef}
            src={src}
            controls
            playsInline
            preload="metadata"
            controlsList="nodownload"
            aria-label={title || 'Community video'}
            className="h-full w-full bg-black object-contain"
            onLoadedMetadata={event => {
              const video = event.currentTarget;
              if (video.videoWidth > 0 && video.videoHeight > 0) {
                setAspectRatio(Math.min(16 / 9, Math.max(9 / 16, video.videoWidth / video.videoHeight)));
              }
            }}
            onError={() => { setFailed(true); onError?.(); }}
          >
            Your browser does not support video playback.
          </video>
          <button
            type="button"
            onClick={() => void openFullscreen()}
            aria-label="Open video fullscreen"
            title="Fullscreen"
            className="absolute right-3 top-3 z-10 rounded-full border border-white/20 bg-black/70 p-2.5 text-white shadow-lg transition hover:bg-black"
          >
            <Maximize2 size={17} />
          </button>
          <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/65 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white/90">
            <Play size={11} fill="currentColor" /> Video
          </span>
        </div>
      )}
    </section>
  );
}
