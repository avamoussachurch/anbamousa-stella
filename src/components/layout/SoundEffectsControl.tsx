import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useGlobalAudio } from '../../context/AudioContext';

export function SoundEffectsControl({ compact = false }: { compact?: boolean }) {
  const { soundEnabled, setSoundEnabled } = useGlobalAudio();
  const label = soundEnabled ? 'Mute sound effects' : 'Turn sound effects on';
  return (
    <button
      type="button"
      data-sfx="off"
      onClick={() => setSoundEnabled(!soundEnabled)}
      aria-label={label}
      aria-pressed={soundEnabled}
      title={label}
      className={`group inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-2xl border-2 border-amber-300/80 bg-[#123b45] px-3 text-amber-50 shadow-[0_8px_24px_rgba(9,35,42,.28)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#174e59] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-amber-300 motion-reduce:transform-none ${compact ? 'h-10 min-h-10 min-w-10 px-2' : ''}`}
    >
      {soundEnabled ? <Volume2 size={compact ? 17 : 19} /> : <VolumeX size={compact ? 17 : 19} />}
      {!compact && <span className="text-xs font-black">{soundEnabled ? 'SFX ON' : 'SFX OFF'}</span>}
    </button>
  );
}
