import React, { useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { extractEmbedMedia } from '../../lib/supabaseDatabase';

type Props = { src: string; title?: string; onError?: () => void };

export function FeedEmbeddedMediaPlayer({ src, title = 'Community video', onError }: Props) {
  const [failed, setFailed] = useState(false);
  const embedUrl = useMemo(() => {
    const parsed = extractEmbedMedia(src);
    return parsed.mediaType === 'youtube' ? parsed.embedUrl : (parsed.embedUrl || src);
  }, [src]);

  if (failed) {
    return <div className="flex aspect-video w-full items-center justify-center gap-2 bg-black px-4 text-center text-sm font-semibold text-white/80" role="status"><AlertCircle size={17}/>Video unavailable. Please try again later.</div>;
  }

  return (
    <div
      className="relative z-10 mx-auto aspect-video w-full max-h-[72svh] min-h-[200px] overflow-hidden bg-black"
      onClick={event => event.stopPropagation()}
      onPointerDown={event => event.stopPropagation()}
    >
      <iframe
        src={embedUrl}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        className="absolute inset-0 z-10 block h-full w-full border-0 bg-black"
        onError={() => { setFailed(true); onError?.(); }}
      />
    </div>
  );
}
