'use client';

import { Play } from 'lucide-react';
import { useState } from 'react';

/** Vídeo que no contacta con YouTube hasta que se pulsa (ADR-0017). */
export function VideoEmbed({ videoId, title, provider }: { videoId: string; title: string; provider?: string }) {
  const [loaded, setLoaded] = useState(false);
  if (loaded) {
    return (
      <div className="aspect-video overflow-hidden rounded-2xl bg-black">
        <iframe
          className="size-full"
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setLoaded(true)}
      className="hero-gradient flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-2xl p-6 text-center text-white"
    >
      <span className="flex size-16 items-center justify-center rounded-full bg-white/25 backdrop-blur">
        <Play className="size-7 fill-current" />
      </span>
      <span className="max-w-md font-semibold">{title}</span>
      <span className="text-xs text-white/80">{provider ?? 'YouTube'} · se cargará al pulsar</span>
    </button>
  );
}
