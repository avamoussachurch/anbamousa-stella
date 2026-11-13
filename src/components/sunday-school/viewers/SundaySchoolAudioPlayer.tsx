import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Mic, 
  Sparkles, 
  FileText, 
  Clock, 
  CheckCircle, 
  Languages 
} from 'lucide-react';

interface SundaySchoolAudioPlayerProps {
  type: 'TEACHER_VOICE' | 'AI_NARRATION';
  audioUrl?: string;
  title: string;
  titleAr?: string;
  subTitle?: string;
  transcript?: string;
  durationSeconds?: number;
  recordedBy?: string;
  isApproved?: boolean;
  onTimeUpdate?: (currentTime: number) => void;
}

export const SundaySchoolAudioPlayer: React.FC<SundaySchoolAudioPlayerProps> = ({
  type,
  audioUrl,
  title,
  titleAr,
  subTitle,
  transcript,
  durationSeconds = 240,
  recordedBy,
  isApproved = true,
  onTimeUpdate
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(durationSeconds);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showTranscript, setShowTranscript] = useState<boolean>(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
      if (onTimeUpdate) onTimeUpdate(audio.currentTime);
    };

    const handleAudioError = () => {
      setIsPlaying(false);
      setPlaybackError('This recording could not be loaded. Please try again.');
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleAudioError);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleAudioError);
    };
  }, [onTimeUpdate, audioUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      setPlaybackError(null);
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((error) => {
        setIsPlaying(false);
        setPlaybackError(error instanceof Error ? error.message : 'Playback failed. Please try again.');
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const changeRate = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const isTeacher = type === 'TEACHER_VOICE';

  return (
    <div className={`rounded-2xl border p-4 sm:p-5 transition-all shadow-lg ${
      isTeacher 
        ? 'bg-gradient-to-r from-amber-950/40 via-stone-900 to-amber-950/20 border-amber-800/40 text-stone-100'
        : 'bg-gradient-to-r from-blue-950/40 via-stone-900 to-indigo-950/20 border-blue-800/40 text-stone-100'
    }`}>
      {/* Hidden Audio Tag */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
          onError={() => {
            setIsPlaying(false);
            setPlaybackError('This recording could not be loaded. Please try again.');
          }}
        />
      )}

      {/* Top Identity Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
            isTeacher 
              ? 'bg-amber-600/20 border-amber-500/50 text-amber-400' 
              : 'bg-blue-600/20 border-blue-500/50 text-blue-400'
          }`}>
            {isTeacher ? <Mic className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm sm:text-base text-stone-100">{title}</span>
              {isTeacher ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-700/60 font-medium flex items-center gap-1">
                  <Mic className="w-2.5 h-2.5" /> Teacher Classroom Audio
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-700/60 font-medium flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> AI Approved Narration
                </span>
              )}

              {isApproved && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60 flex items-center gap-0.5">
                  <CheckCircle className="w-2.5 h-2.5" /> Servant Verified
                </span>
              )}
            </div>

            {titleAr && (
              <p className="text-xs text-stone-300 font-sans mt-0.5" dir="rtl">{titleAr}</p>
            )}

            <p className="text-xs text-stone-400 mt-0.5">
              {subTitle || (isTeacher ? `Recorded by ${recordedBy || 'Servant'} in Sunday School class` : 'AI narration strictly based on servant-approved text')}
            </p>
          </div>
        </div>

        {transcript && (
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className={`px-2.5 py-1 rounded-xl text-xs flex items-center gap-1 transition-colors border ${
              showTranscript 
                ? 'bg-stone-800 text-stone-200 border-stone-700' 
                : 'bg-stone-900/80 text-stone-400 hover:text-stone-200 border-stone-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{showTranscript ? 'Hide Words' : 'Transcript'}</span>
          </button>
        )}
      </div>

      {playbackError && <p role="alert" className="mb-3 text-xs font-semibold text-rose-300">{playbackError}</p>}

      {/* Scrubber & Controls */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-stone-400 w-10 text-right">
            {formatTime(currentTime)}
          </span>

          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500 hover:accent-amber-400 focus:outline-none"
          />

          <span className="text-[11px] font-mono text-stone-400 w-10">
            {formatTime(duration)}
          </span>
        </div>

        <div className="flex items-center justify-between pt-1">
          {/* Playback rate */}
          <div className="flex items-center gap-1 bg-stone-900/90 rounded-xl border border-stone-800/80 p-1">
            {[0.75, 1.0, 1.25, 1.5].map((rate) => (
              <button
                key={rate}
                onClick={() => changeRate(rate)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  playbackRate === rate 
                    ? (isTeacher ? 'bg-amber-600 text-white font-bold' : 'bg-blue-600 text-white font-bold') 
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          {/* Primary Play/Pause Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.currentTime = Math.max(0, currentTime - 10);
                }
              }}
              className="p-2 text-stone-400 hover:text-stone-200 transition-colors"
              title="Rewind 10 seconds"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={togglePlay}
              className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform active:scale-95 ${
                isTeacher 
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/30' 
                  : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/30'
              }`}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            <button
              onClick={toggleMute}
              className="p-2 text-stone-400 hover:text-stone-200 transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>

          {/* Type Badge */}
          <div className="text-[11px] text-stone-400 hidden sm:block">
            {isTeacher ? 'Recorded in Church' : 'Approved AI Audio'}
          </div>
        </div>
      </div>

      {/* Transcript Accordion */}
      {showTranscript && transcript && (
        <div className="mt-4 pt-3 border-t border-stone-800 text-xs text-stone-300 leading-relaxed bg-stone-950/70 p-4 rounded-xl border border-stone-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-amber-400 uppercase tracking-wider text-[10px]">
              Word-for-Word Classroom Transcript
            </span>
            <span className="text-stone-500 text-[10px]">Grounding Source</span>
          </div>
          <p className="whitespace-pre-line text-stone-300 font-serif text-sm">
            {transcript}
          </p>
        </div>
      )}
    </div>
  );
};
