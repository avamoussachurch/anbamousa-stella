import React, { useState } from 'react';
import { Mic, Sparkles, FileText, CheckCircle } from 'lucide-react';
import { UniversalAudioPlayer } from '../../design-system/UniversalAudioPlayer';

interface SundaySchoolAudioPlayerProps {
  type: 'TEACHER_VOICE' | 'AI_NARRATION';
  audioUrl?: string;
  title: string;
  titleAr?: string;
  subTitle?: string;
  transcript?: string;
  durationSeconds?: number;
  lang?: 'ar' | 'en';
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
  lang = 'ar',
  recordedBy,
  isApproved = true,
  onTimeUpdate
}) => {
  const [showTranscript, setShowTranscript] = useState(false);
  const isTeacher = type === 'TEACHER_VOICE';
  const isAr = lang === 'ar';

  return (
    <div className={`rounded-2xl border p-4 sm:p-5 shadow-lg space-y-4 ${isTeacher
      ? 'bg-gradient-to-r from-amber-950/40 via-stone-900 to-amber-950/20 border-amber-800/40'
      : 'bg-gradient-to-r from-blue-950/40 via-stone-900 to-indigo-950/20 border-blue-800/40'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${isTeacher
            ? 'bg-amber-600/20 border-amber-500/50 text-amber-400'
            : 'bg-blue-600/20 border-blue-500/50 text-blue-400'
          }`}>
            {isTeacher ? <Mic className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm sm:text-base text-stone-100">{title}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-950 text-stone-300 border border-stone-700">
                {isTeacher ? 'Teacher Classroom Audio' : 'AI Approved Narration'}
              </span>
              {isApproved && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60 inline-flex items-center gap-1"><CheckCircle className="w-2.5 h-2.5" /> Verified</span>}
            </div>
            {titleAr && titleAr !== title && <p className="text-xs text-stone-300 mt-0.5" dir="rtl">{titleAr}</p>}
            <p className="text-xs text-stone-400 mt-0.5">{subTitle || (isTeacher ? `Recorded by ${recordedBy || 'Servant'} in Sunday School class` : 'Approved narration')}</p>
          </div>
        </div>
        {transcript && <button type="button" onClick={() => setShowTranscript(value => !value)} className="shrink-0 px-2.5 py-1 rounded-xl text-xs flex items-center gap-1 border border-stone-700 bg-stone-900 text-stone-300 hover:text-white"><FileText className="w-3.5 h-3.5" />{showTranscript ? 'Hide Words' : 'Transcript'}</button>}
      </div>

      {audioUrl ? (
        <UniversalAudioPlayer src={audioUrl} lang={lang} accent={isTeacher ? 'amber' : 'blue'} compact onTimeUpdate={onTimeUpdate} />
      ) : (
        <p role="status" className="text-xs text-stone-400">{isAr ? 'التسجيل الصوتي مش متاح دلوقتي.' : 'Audio recording is not available.'}</p>
      )}

      {showTranscript && transcript && (
        <div className="pt-3 border-t border-stone-800 text-xs text-stone-300 leading-relaxed bg-stone-950/70 p-4 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-amber-400 uppercase tracking-wider text-[10px]">Classroom Transcript</span>
            <span className="text-stone-500 text-[10px]">Approved source</span>
          </div>
          <p className="whitespace-pre-line text-stone-300 font-serif text-sm">{transcript}</p>
        </div>
      )}
    </div>
  );
};
