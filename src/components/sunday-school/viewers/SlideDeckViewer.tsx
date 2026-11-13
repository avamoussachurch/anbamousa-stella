import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  Minimize2, 
  MessageSquare, 
  Layers, 
  Bookmark, 
  Download,
  Info
} from 'lucide-react';
import { PresentationSlide, LessonSource } from '../../../types';

interface SlideDeckViewerProps {
  slides: PresentationSlide[];
  source?: LessonSource;
  onClose?: () => void;
  initialSlideIndex?: number;
}

export const SlideDeckViewer: React.FC<SlideDeckViewerProps> = ({
  slides,
  source,
  onClose,
  initialSlideIndex = 0
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(initialSlideIndex);
  const [showNotes, setShowNotes] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const activeSlide = slides[currentSlideIndex] || slides[0];

  const handleNext = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={`bg-stone-900 text-stone-100 rounded-2xl shadow-2xl border border-stone-800 overflow-hidden flex flex-col ${
      isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen' : 'h-[750px] max-h-[85vh]'
    }`}>
      {/* Top Header */}
      <div className="bg-stone-950 px-4 py-3 border-b border-stone-800 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-950/60 border border-amber-800/50 flex items-center justify-center text-amber-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-stone-100 text-sm">
                Sunday School Slide Deck
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800/40 font-mono">
                Slide {currentSlideIndex + 1} of {slides.length}
              </span>
            </div>
            <p className="text-xs text-stone-400">
              {source ? source.originalFilename : 'Church Classroom Presentation'} • Traceable to Teacher Sources
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNotes(!showNotes)}
            className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 transition-colors ${
              showNotes 
                ? 'bg-amber-950/80 border-amber-700/60 text-amber-200' 
                : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            {showNotes ? 'Hide Speaker Notes' : 'Show Speaker Notes'}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 bg-stone-900 hover:bg-stone-800 text-stone-300 rounded-xl border border-stone-800 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Slide Canvas Area */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-stone-950/80">
        {/* Main Slide Presentation View */}
        <div className="flex-1 p-4 sm:p-8 flex items-center justify-center overflow-auto">
          <div className="w-full max-w-4xl aspect-[16/9] bg-stone-900 border-2 border-stone-700/60 rounded-2xl shadow-2xl relative flex flex-col justify-between p-8 sm:p-12 overflow-hidden bg-gradient-to-br from-stone-900 via-stone-900 to-stone-950">
            {/* Top Bar on Slide */}
            <div className="flex items-center justify-between border-b border-stone-800/80 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span className="text-xs uppercase tracking-widest text-amber-400 font-medium">
                  Anba Moussa Sunday School • 4th Grade
                </span>
              </div>
              <span className="text-xs font-mono text-stone-500">#{activeSlide.number}</span>
            </div>

            {/* Slide Body */}
            <div className="my-auto py-4">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 font-serif tracking-tight">
                {activeSlide.titleEn}
              </h2>
              <h3 className="text-lg sm:text-xl font-medium text-amber-300/90 mb-6 font-sans" dir="rtl">
                {activeSlide.titleAr}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* English Bullets */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">English Highlights</h4>
                  <ul className="space-y-2">
                    {activeSlide.bulletsEn.map((bullet, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-stone-200 text-sm sm:text-base leading-snug">
                        <span className="text-amber-500 mt-1 font-bold">✝</span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Arabic Bullets */}
                <div className="space-y-3" dir="rtl">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">النقاط التعليمية</h4>
                  <ul className="space-y-2">
                    {activeSlide.bulletsAr.map((bullet, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-stone-200 text-sm sm:text-base leading-snug font-sans">
                        <span className="text-amber-500 mt-1 font-bold">✝</span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Slide Footer with Source Badge */}
            <div className="border-t border-stone-800/80 pt-3 flex items-center justify-between text-xs text-stone-400">
              <div className="flex items-center gap-2">
                <Bookmark className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-stone-300 text-[11px]">
                  Sources: {activeSlide.sourceRefs?.map(r => `${r.sourceName} (${r.location})`).join(', ') || 'Teacher Curriculum'}
                </span>
              </div>
              <span className="font-mono text-stone-500 text-[11px]">Slide {activeSlide.number}</span>
            </div>
          </div>
        </div>

        {/* Right / Bottom Sidebar: Speaker Notes */}
        {showNotes && (
          <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-stone-800 bg-stone-950 p-5 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center gap-2 text-amber-400 mb-3 pb-2 border-b border-stone-800">
                <MessageSquare className="w-4 h-4" />
                <h3 className="font-semibold text-xs uppercase tracking-wider">Teacher Speaker Notes</h3>
              </div>

              <div className="space-y-4 text-xs text-stone-300">
                <div className="p-3 bg-stone-900/90 rounded-xl border border-stone-800">
                  <span className="font-semibold text-stone-400 block mb-1 text-[11px] uppercase">Instructional Guide (EN)</span>
                  <p className="leading-relaxed text-stone-200">
                    {activeSlide.speakerNotesEn || 'No specific notes for this slide.'}
                  </p>
                </div>

                <div className="p-3 bg-stone-900/90 rounded-xl border border-stone-800" dir="rtl">
                  <span className="font-semibold text-stone-400 block mb-1 text-[11px] uppercase">إرشادات الخادم (العربية)</span>
                  <p className="leading-relaxed text-stone-200 font-sans">
                    {activeSlide.speakerNotesAr || 'لا توجد ملاحظات إضافية لهذه الشريحة.'}
                  </p>
                </div>

                <div className="p-3 bg-amber-950/40 rounded-xl border border-amber-900/40 text-[11px] text-amber-200/90 flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Slides are generated strictly from the approved servant evidence map and outline.
                  </span>
                </div>
              </div>
            </div>

            {/* Quick action */}
            <div className="pt-4 border-t border-stone-800">
              <span className="text-[11px] text-stone-500 block mb-2">Classroom Presentation Mode</span>
              <button 
                onClick={toggleFullscreen}
                className="w-full py-2 bg-amber-700/50 hover:bg-amber-700/70 border border-amber-600/50 text-amber-100 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                {isFullscreen ? 'Exit Presentation' : 'Project to Smart Screen'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls Bar & Thumbnail Strip */}
      <div className="bg-stone-950 px-4 py-3 border-t border-stone-800 flex items-center justify-between gap-4">
        {/* Previous Button */}
        <button
          onClick={handlePrev}
          disabled={currentSlideIndex === 0}
          className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-30 disabled:hover:bg-stone-900 rounded-xl border border-stone-800 flex items-center gap-1.5 text-xs text-stone-300 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>

        {/* Slide Thumbnail Preview Strip */}
        <div className="flex items-center gap-2 overflow-x-auto py-1 max-w-xl">
          {slides.map((slide, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlideIndex(idx)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all shrink-0 flex items-center gap-1.5 ${
                currentSlideIndex === idx
                  ? 'bg-amber-600 text-white border-amber-500 shadow-md font-bold'
                  : 'bg-stone-900 border-stone-800 text-stone-400 hover:bg-stone-800 hover:text-stone-200'
              }`}
            >
              <span className="font-mono">#{slide.number}</span>
              <span className="truncate max-w-[120px] hidden sm:inline">{slide.titleEn}</span>
            </button>
          ))}
        </div>

        {/* Next Button */}
        <button
          onClick={handleNext}
          disabled={currentSlideIndex === slides.length - 1}
          className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-30 disabled:hover:bg-stone-900 rounded-xl border border-stone-800 flex items-center gap-1.5 text-xs text-stone-300 transition-colors"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
