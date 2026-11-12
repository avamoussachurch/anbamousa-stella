import React, { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react';

type UiSound = 'tap' | 'success' | 'celebration' | 'navigation' | 'reward' | 'correct' | 'incorrect' | 'open' | 'close' | 'streak' | 'levelup' | 'achievement' | 'portal';

interface AudioContextType {
  currentTrackUrl: string | null;
  isPlaying: boolean;
  volume: number;
  playTrack: (url: string) => void;
  togglePlay: () => void;
  setVolume: (vol: number) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  playSound: (sound?: UiSound) => void;
}

const GlobalAudioContext = createContext<AudioContextType | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const soundContextRef = useRef<AudioContext | null>(null);
  const currentTrackUrlRef = useRef<string | null>(null);
  const isPlayingRef = useRef(false);
  const [currentTrackUrl, setCurrentTrackUrl] = useState<string | null>(null);
  const playPromiseRef = useRef<Promise<void> | void>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.5);
  const [soundEnabled, setSoundEnabledState] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem('anba_mousa_sound_enabled') !== 'false';
  });

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled);
    if (typeof window !== 'undefined') {
      try { window.localStorage.setItem('anba_mousa_sound_enabled', String(enabled)); } catch { /* Preference storage is optional. */ }
    }
  }, []);

  const playSound = useCallback((sound: UiSound = 'tap') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioContextConstructor = window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextConstructor) return;
      if (!soundContextRef.current) soundContextRef.current = new AudioContextConstructor();
      const context = soundContextRef.current;
      if (context.state === 'suspended') void context.resume();

      type Note = { frequency: number; delay: number; duration: number; wave: OscillatorType };
      const patterns: Record<UiSound, Note[]> = {
        tap: [{ frequency: 560, delay: 0, duration: 0.035, wave: 'sine' }],
        navigation: [
          { frequency: 392, delay: 0, duration: 0.06, wave: 'sine' },
          { frequency: 587.33, delay: 0.045, duration: 0.075, wave: 'sine' }
        ],
        open: [
          { frequency: 440, delay: 0, duration: 0.07, wave: 'triangle' },
          { frequency: 554.37, delay: 0.055, duration: 0.09, wave: 'triangle' },
          { frequency: 659.25, delay: 0.11, duration: 0.11, wave: 'sine' }
        ],
        close: [
          { frequency: 659.25, delay: 0, duration: 0.06, wave: 'sine' },
          { frequency: 493.88, delay: 0.05, duration: 0.085, wave: 'triangle' }
        ],
        correct: [
          { frequency: 659.25, delay: 0, duration: 0.075, wave: 'triangle' },
          { frequency: 783.99, delay: 0.065, duration: 0.095, wave: 'triangle' },
          { frequency: 987.77, delay: 0.13, duration: 0.13, wave: 'sine' }
        ],
        incorrect: [
          { frequency: 311.13, delay: 0, duration: 0.09, wave: 'triangle' },
          { frequency: 261.63, delay: 0.075, duration: 0.13, wave: 'sine' }
        ],
        success: [
          { frequency: 523.25, delay: 0, duration: 0.11, wave: 'triangle' },
          { frequency: 659.25, delay: 0.085, duration: 0.13, wave: 'triangle' },
          { frequency: 783.99, delay: 0.17, duration: 0.17, wave: 'sine' }
        ],
        reward: [
          { frequency: 587.33, delay: 0, duration: 0.09, wave: 'triangle' },
          { frequency: 739.99, delay: 0.07, duration: 0.11, wave: 'triangle' },
          { frequency: 880, delay: 0.14, duration: 0.15, wave: 'sine' },
          { frequency: 1174.66, delay: 0.22, duration: 0.12, wave: 'sine' }
        ],
        streak: [
          { frequency: 523.25, delay: 0, duration: 0.09, wave: 'triangle' },
          { frequency: 659.25, delay: 0.08, duration: 0.09, wave: 'triangle' },
          { frequency: 783.99, delay: 0.16, duration: 0.09, wave: 'triangle' },
          { frequency: 1046.5, delay: 0.24, duration: 0.2, wave: 'sine' }
        ],
        levelup: [
          { frequency: 392, delay: 0, duration: 0.1, wave: 'triangle' },
          { frequency: 523.25, delay: 0.09, duration: 0.1, wave: 'triangle' },
          { frequency: 659.25, delay: 0.18, duration: 0.1, wave: 'triangle' },
          { frequency: 783.99, delay: 0.27, duration: 0.22, wave: 'sine' }
        ],
        achievement: [
          { frequency: 659.25, delay: 0, duration: 0.1, wave: 'sine' },
          { frequency: 880, delay: 0.1, duration: 0.12, wave: 'triangle' },
          { frequency: 1108.73, delay: 0.2, duration: 0.16, wave: 'sine' },
          { frequency: 1318.51, delay: 0.3, duration: 0.22, wave: 'sine' }
        ],
        portal: [
          { frequency: 349.23, delay: 0, duration: 0.12, wave: 'sine' },
          { frequency: 523.25, delay: 0.08, duration: 0.13, wave: 'triangle' },
          { frequency: 698.46, delay: 0.16, duration: 0.16, wave: 'sine' },
          { frequency: 1046.5, delay: 0.24, duration: 0.2, wave: 'sine' }
        ],
        celebration: [
          { frequency: 523.25, delay: 0, duration: 0.12, wave: 'triangle' },
          { frequency: 659.25, delay: 0.09, duration: 0.13, wave: 'triangle' },
          { frequency: 783.99, delay: 0.18, duration: 0.13, wave: 'triangle' },
          { frequency: 1046.5, delay: 0.27, duration: 0.26, wave: 'sine' }
        ]
      };

      const now = context.currentTime;
      const duration = Math.max(...patterns[sound].map(note => note.delay + note.duration));
      const master = context.createGain();
      master.gain.setValueAtTime(0.0001, now);
      const peak = sound === 'tap' ? 0.025 : sound === 'incorrect' ? 0.035 : 0.055;
      master.gain.linearRampToValueAtTime(peak, now + 0.012);
      master.gain.exponentialRampToValueAtTime(0.0001, now + duration + 0.08);
      master.connect(context.destination);

      // Tiny pitch variation keeps repeated interactions from sounding mechanically identical.
      const variation = sound === 'tap' ? 1 + (Math.random() - 0.5) * 0.035 : 1;
      patterns[sound].forEach(note => {
        const oscillator = context.createOscillator();
        const envelope = context.createGain();
        oscillator.type = note.wave;
        oscillator.frequency.setValueAtTime(note.frequency * variation, now + note.delay);
        envelope.gain.setValueAtTime(0.0001, now + note.delay);
        envelope.gain.linearRampToValueAtTime(1, now + note.delay + 0.012);
        envelope.gain.exponentialRampToValueAtTime(0.0001, now + note.delay + note.duration);
        oscillator.connect(envelope);
        envelope.connect(master);
        oscillator.start(now + note.delay);
        oscillator.stop(now + note.delay + note.duration + 0.02);
      });
    } catch {
      // Sound is an enhancement only; audio failures must never block app actions.
    }
  }, [soundEnabled]);

  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.loop = true;
      audio.volume = volume;
      audio.addEventListener('play', () => { isPlayingRef.current = true; setIsPlaying(true); });
      audio.addEventListener('pause', () => { isPlayingRef.current = false; setIsPlaying(false); });
      audio.addEventListener('ended', () => { isPlayingRef.current = false; setIsPlaying(false); });
      audio.addEventListener('error', (e) => {
        console.error('Audio playback error', e);
        isPlayingRef.current = false;
        setIsPlaying(false);
      });
      audioRef.current = audio;
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (soundContextRef.current) {
        void soundContextRef.current.close();
        soundContextRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const handleUiClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const control = target?.closest<HTMLElement>('button, a[href], [role="button"], [data-sfx]');
      if (!control || control.hasAttribute('disabled') || control.getAttribute('aria-disabled') === 'true') return;
      if (control.dataset.sfx === 'off') return;
      const sound = control.dataset.sfx;
      if (sound && ['success', 'celebration', 'reward', 'navigation', 'correct', 'incorrect', 'open', 'close', 'streak', 'levelup', 'achievement', 'portal'].includes(sound)) {
        playSound(sound as UiSound);
      } else {
        playSound('tap');
      }
    };
    document.addEventListener('click', handleUiClick, true);
    return () => document.removeEventListener('click', handleUiClick, true);
  }, [playSound]);

  const safePlay = () => {
    if (!audioRef.current) return;
    const playPromise = audioRef.current.play();
    if (playPromise !== undefined) {
      playPromiseRef.current = playPromise;
      playPromise.catch(e => {
        if (e.name !== 'AbortError' && e.name !== 'NotAllowedError') console.error('Play failed:', e);
      });
    }
  };

  const safePause = () => {
    if (!audioRef.current) return;
    if (playPromiseRef.current !== undefined) {
      playPromiseRef.current.then(() => {
        audioRef.current?.pause();
      }).catch(() => {
        // The browser already aborted this playback request.
      });
    } else {
      audioRef.current.pause();
    }
  };

  const playTrack = (url: string) => {
    if (!audioRef.current) return;
    if (currentTrackUrlRef.current === url) {
      if (isPlayingRef.current) safePause();
      else safePlay();
      return;
    }
    if (isPlayingRef.current) safePause();
    // Keep the original player hand-off delay so rapid track changes remain reliable.
    setTimeout(() => {
      if (!audioRef.current) return;
      audioRef.current.src = url;
      audioRef.current.load();
      currentTrackUrlRef.current = url;
      setCurrentTrackUrl(url);
      safePlay();
    }, 50);
  };

  const togglePlay = () => {
    if (!audioRef.current || !currentTrackUrlRef.current) return;
    if (isPlayingRef.current) safePause();
    else safePlay();
  };

  const setVolume = (vol: number) => {
    const next = Math.max(0, Math.min(1, vol));
    if (audioRef.current) audioRef.current.volume = next;
    setVolumeState(next);
  };

  return (
    <GlobalAudioContext.Provider value={{ currentTrackUrl, isPlaying, volume, playTrack, togglePlay, setVolume, soundEnabled, setSoundEnabled, playSound }}>
      {children}
    </GlobalAudioContext.Provider>
  );
}

export function useGlobalAudio() {
  const context = useContext(GlobalAudioContext);
  if (!context) throw new Error('useGlobalAudio must be used within an AudioProvider');
  return context;
}
