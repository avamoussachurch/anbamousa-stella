import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  FileText,
  Layers,
  BookOpen,
  X,
  Presentation,
  CheckCircle2,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from 'lucide-react';
import { PresentationSlide } from '../../../types';

interface InAppDocumentViewerProps {
  documentUrl?: string;
  documentTitle?: string;
  documentType?: 'pptx' | 'pdf' | 'docx' | 'slides' | 'auto';
  slides?: PresentationSlide[];
  onClose: () => void;
  lang?: 'en' | 'ar';
}

export const InAppDocumentViewer: React.FC<InAppDocumentViewerProps> = ({
  documentUrl,
  documentTitle = 'Classroom Slide Presentation',
  documentType = 'auto',
  slides = [],
  onClose,
  lang = 'ar'
}) => {
  const isAr = lang === 'ar';
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [showNotes, setShowNotes] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'slides' | 'embed'>('slides');

  // Detect file type
  const urlLower = (documentUrl || '').toLowerCase();
  const isPdf = documentType === 'pdf' || urlLower.endsWith('.pdf') || urlLower.includes('pdf');
  const isOfficeDoc = documentType === 'pptx' || documentType === 'docx' ||
    urlLower.endsWith('.pptx') || urlLower.endsWith('.ppt') ||
    urlLower.endsWith('.docx') || urlLower.endsWith('.doc');

  // Build embedded iframe URL using Office Online or Google Docs Viewer (in-app, no downloads)
  const getEmbedIframeUrl = () => {
    if (!documentUrl) return null;
    if (documentUrl.startsWith('data:') || documentUrl.startsWith('blob:')) {
      return documentUrl;
    }
    if (isOfficeDoc) {
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(documentUrl)}`;
    }
    // Universal Google Docs in-app viewer fallback
    return `https://docs.google.com/viewer?url=${encodeURIComponent(documentUrl)}&embedded=true`;
  };

  const embedUrl = getEmbedIframeUrl();
  const hasStructuredSlides = slides && slides.length > 0;
  const activeSlide = hasStructuredSlides ? (slides[currentSlideIndex] || slides[0]) : null;

  const handleNext = () => {
    if (hasStructuredSlides && currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };

  const handlePrev = () => {
    if (hasStructuredSlides && currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md transition-all`}
      dir="rtl"
    >
      <div
        className={`bg-stone-900 border border-stone-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col transition-all ${
          isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-5xl h-[88vh]'
        }`}
      >
        {/* Top Header Bar */}
        <div className="bg-stone-950 px-5 py-3.5 border-b border-stone-800 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Presentation className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-white text-sm sm:text-base">
                  {documentTitle}
                </h3>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800/60 font-mono font-medium">
                  {isAr ? 'عرض مباشر جوه التطبيق' : 'In-App Direct Viewer'}
                </span>
                {hasStructuredSlides && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 font-mono">
                    {isAr ? `شريحة ${currentSlideIndex + 1} من ${slides.length}` : `Slide ${currentSlideIndex + 1} of ${slides.length}`}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-400">
                {isAr 
                  ? 'اعرض شرائح ومستندات الخادم من غير ما تنزّل ملفات أو تفتح نوافذ برّه التطبيق.' 
                  : 'Teacher slide presentation and materials viewed directly within the application.'}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* If we have both structured slides and URL, let user toggle */}
            {hasStructuredSlides && embedUrl && (
              <div className="flex bg-stone-900 rounded-xl border border-stone-800 p-0.5 text-xs">
                <button
                  onClick={() => setViewMode('slides')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                    viewMode === 'slides' ? 'bg-amber-600 text-white font-bold' : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {isAr ? 'الشرائح التفاعلية' : 'Interactive Slides'}
                </button>
                <button
                  onClick={() => setViewMode('embed')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                    viewMode === 'embed' ? 'bg-amber-600 text-white font-bold' : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {isAr ? 'المستند الأصلي' : 'Original Doc'}
                </button>
              </div>
            )}

            {/* Toggle speaker notes button */}
            {hasStructuredSlides && viewMode === 'slides' && (
              <button
                onClick={() => setShowNotes(!showNotes)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  showNotes 
                    ? 'bg-amber-950/80 border-amber-700/60 text-amber-200' 
                    : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{showNotes ? (isAr ? 'اخفي الملاحظات' : 'Hide Notes') : (isAr ? 'اعرض الملاحظات' : 'Show Notes')}</span>
              </button>
            )}

            {/* Fullscreen button */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 bg-stone-900 hover:bg-stone-800 text-stone-300 rounded-xl border border-stone-800 transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-stone-950 relative overflow-hidden flex flex-col">
          {/* Mode 1: Embedded In-App Iframe for Documents */}
          {(viewMode === 'embed' || (!hasStructuredSlides && embedUrl)) ? (
            <div className="w-full h-full relative bg-stone-900 flex flex-col">
              <iframe
                src={embedUrl!}
                title={documentTitle}
                className="w-full flex-1 border-0 rounded-b-2xl bg-white"
                allow="autoplay"
              />
              <div className="p-2.5 bg-stone-950 border-t border-stone-800 text-center text-xs text-stone-400">
                {isAr ? 'المستند بيتعرض جوه التطبيق من غير ما تخرج من الدرس.' : 'Document rendered via secure in-app viewer without leaving the lesson.'}
              </div>
            </div>
          ) : hasStructuredSlides && activeSlide ? (
            /* Mode 2: Interactive In-App Slide Canvas */
            <div className="flex-1 flex flex-col p-4 sm:p-8 overflow-y-auto">
              <div className="flex-1 max-w-4xl w-full mx-auto bg-gradient-to-br from-stone-900 via-stone-900 to-amber-950/30 border border-stone-800 rounded-3xl p-6 sm:p-10 shadow-2xl flex flex-col justify-between space-y-6">
                {/* Slide Title */}
                <div className="space-y-2 border-b border-stone-800/80 pb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest text-amber-500 font-mono">
                      {isAr ? `الشريحة ${currentSlideIndex + 1}` : `Slide ${currentSlideIndex + 1}`}
                    </span>
                    <span className="text-xs text-stone-400">
                      {documentTitle}
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-3xl font-bold text-white tracking-tight leading-snug">
                    {isAr && activeSlide.titleAr ? activeSlide.titleAr : activeSlide.titleEn}
                  </h2>
                  {activeSlide.titleEn && activeSlide.titleAr && (
                    <h3 className="text-sm font-medium text-amber-400/80">
                      {isAr ? activeSlide.titleEn : activeSlide.titleAr}
                    </h3>
                  )}
                </div>

                {/* Slide Key Bullets */}
                <div className="space-y-4 my-auto py-4">
                  {((isAr && activeSlide.bulletsAr?.length ? activeSlide.bulletsAr : activeSlide.bulletsEn) || []).map((bullet, idx) => (
                    <div key={idx} className="flex items-start gap-3.5 text-stone-200">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500 mt-2 flex-shrink-0 shadow-sm" />
                      <p className="text-base sm:text-lg leading-relaxed font-sans">
                        {bullet}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Speaker Notes */}
                {showNotes && (activeSlide.speakerNotesAr || activeSlide.speakerNotesEn) && (
                  <div className="p-4 bg-stone-950/80 border border-amber-900/40 rounded-2xl space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      {isAr ? 'ملاحظات الخادم على الشريحة' : 'Servant Teaching Notes'}
                    </span>
                    <p className="text-xs sm:text-sm text-stone-300 leading-relaxed font-serif">
                      {isAr && activeSlide.speakerNotesAr ? activeSlide.speakerNotesAr : activeSlide.speakerNotesEn}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Fallback empty view */
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
              <Layers className="w-12 h-12 text-stone-600" />
              <p className="text-sm text-stone-400">
                {isAr ? 'مفيش شرائح مرفقة للدرس ده.' : 'No presentation slides attached to this lesson.'}
              </p>
            </div>
          )}
        </div>

        {/* Bottom Navigation Toolbar (for slides) */}
        {hasStructuredSlides && viewMode === 'slides' && (
          <div className="bg-stone-950 px-6 py-3.5 border-t border-stone-800 flex items-center justify-between gap-4">
            <button
              onClick={handlePrev}
              disabled={currentSlideIndex === 0}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                currentSlideIndex === 0
                  ? 'bg-stone-900 text-stone-600 cursor-not-allowed border border-stone-800'
                  : 'bg-stone-800 hover:bg-stone-700 text-white border border-stone-700 cursor-pointer active:scale-95'
              }`}
            >
              {isAr ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              <span>{isAr ? 'الشريحة اللي قبلها' : 'Previous Slide'}</span>
            </button>

            {/* Slide Dots / Indicators */}
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-[50%] py-1">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlideIndex(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    idx === currentSlideIndex 
                      ? 'w-6 bg-amber-500' 
                      : 'w-2 bg-stone-700 hover:bg-stone-500'
                  }`}
                  title={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              disabled={currentSlideIndex === slides.length - 1}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                currentSlideIndex === slides.length - 1
                  ? 'bg-stone-900 text-stone-600 cursor-not-allowed border border-stone-800'
                  : 'bg-amber-600 hover:bg-amber-500 text-white cursor-pointer active:scale-95 shadow-md'
              }`}
            >
              <span>{isAr ? 'الشريحة اللي بعدها' : 'Next Slide'}</span>
              {isAr ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
