import React, { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react';

type UiSound = 'tap' | 'success' | 'celebration' | 'navigation' | 'reward';

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

const AudioContext = createContext<AudioContextType | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const soundContextRef = useRef<AudioContext | null>(null);
  const currentTrackUrlRef = useRef<string | null>(null);
  const isPlayingRef = useRef(false);
  const [currentTrackUrl, setCurrentTrackUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.5);
  const [soundEnabled, setSoundEnabledState] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem('anba_mousa_sound_enabled') !== 'false';
  });

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('anba_mousa_sound_enabled', String(enabled));
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

      const patterns: Record<UiSound, Array<{ frequency: number; delay: number; duration: number; wave: OscillatorType }>> = {
        tap: [{ frequency: 520, delay: 0, duration: 0.045, wave: 'sine' }],
        navigation: [
          { frequency: 440, delay: 0, duration: 0.055, wave: 'sine' },
          { frequency: 660, delay: 0.045, duration: 0.07, wave: 'sine' }
        ],
        success: [
          { frequency: 523.25, delay: 0, duration: 0.12, wave: 'triangle' },
          { frequency: 659.25, delay: 0.09, duration: 0.14, wave: 'triangle' },
          { frequency: 783.99, delay: 0.18, duration: 0.2, wave: 'triangle' }
        ],
        reward: [
          { frequency: 587.33, delay: 0, duration: 0.11, wave: 'triangle' },
          { frequency: 739.99, delay: 0.08, duration: 0.12, wave: 'triangle' },
          { frequency: 880, delay: 0.16, duration: 0.16, wave: 'triangle' }
        ],
        celebration: [
          { frequency: 523.25, delay: 0, duration: 0.14, wave: 'triangle' },
          { frequency: 659.25, delay: 0.1, duration: 0.14, wave: 'triangle' },
          { frequency: 783.99, delay: 0.2, duration: 0.14, wave: 'triangle' },
          { frequency: 1046.5, delay: 0.3, duration: 0.28, wave: 'sine' }
        ]
      };

      const now = context.currentTime;
      const master = context.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.linearRampToValueAtTime(sound === 'tap' ? 0.035 : 0.07, now + 0.012);
      master.gain.exponentialRampToValueAtTime(0.0001, now + (sound === 'celebration' ? 0.75 : 0.42));
      master.connect(context.destination);

      patterns[sound].forEach(note => {
        const oscillator = context.createOscillator();
        const envelope = context.createGain();
        oscillator.type = note.wave;
        oscillator.frequency.setValueAtTime(note.frequency, now + note.delay);
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
      if (sound === 'success' || sound === 'celebration' || sound === 'reward' || sound === 'navigation') {
        playSound(sound);
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
      playPromise.catch(e => {
        if (e.name !== 'AbortError' && e.name !== 'NotAllowedError') console.error('Play failed:', e);
      });
    }
  };

  const safePause = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
  };

  const playTrack = (url: string) => {
    if (!audioRef.current) return;
    if (currentTrackUrlRef.current === url) {
      if (isPlayingRef.current) safePause();
      else safePlay();
      return;
    }
    audioRef.current.pause();
    audioRef.current.src = url;
    audioRef.current.load();
    currentTrackUrlRef.current = url;
    setCurrentTrackUrl(url);
    safePlay();
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
    <AudioContext.Provider value={{ currentTrackUrl, isPlaying, volume, playTrack, togglePlay, setVolume, soundEnabled, setSoundEnabled, playSound }}>
      {children}
    </AudioContext.Provider>
  );
}

export function useGlobalAudio() {
  const context = useContext(AudioContext);
  if (!context) throw new Error('useGlobalAudio must be used within an AudioProvider');
  return context;
}
