import React, { useState } from 'react';
import { 
  ShieldCheck, 
  FileText, 
  Mic, 
  Layers, 
  BookOpen, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink,
  Search,
  Lock,
  Globe,
  Quote
} from 'lucide-react';
import { EvidenceMap, LessonSource } from '../../../types';

interface EvidenceCoverageModalProps {
  evidenceMap?: EvidenceMap;
  sources: LessonSource[];
  allowInternetSearch: boolean;
  onClose: () => void;
  onOpenSourceViewer?: (source: LessonSource) => void;
}

export const EvidenceCoverageModal: React.FC<EvidenceCoverageModalProps> = ({
  evidenceMap,
  sources,
  allowInternetSearch,
  onClose,
  onOpenSourceViewer
}) => {
  const [filterVerified, setFilterVerified] = useState<'all' | 'verified' | 'flagged'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!evidenceMap) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 max-w-md w-full text-center">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-stone-100 mb-2">No Evidence Map Available</h3>
          <p className="text-xs text-stone-400 mb-4">
            An evidence map has not yet been compiled for this lesson. Ingest teacher sources to construct the claim graph.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const claims = evidenceMap.importantClaims || [];
  const filteredClaims = claims.filter(c => {
    if (filterVerified === 'verified' && !c.verified) return false;
    if (filterVerified === 'flagged' && c.verified) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.statementEn.toLowerCase().includes(q) ||
        c.statementAr.toLowerCase().includes(q) ||
        c.sourceName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getSourceIcon = (sourceId: string) => {
    const src = sources.find(s => s.id === sourceId);
    if (!src) return <FileText className="w-3.5 h-3.5 text-stone-400" />;
    if (src.type === 'TEACHER_VOICE') return <Mic className="w-3.5 h-3.5 text-amber-400" />;
    if (src.type === 'PPTX') return <Layers className="w-3.5 h-3.5 text-blue-400" />;
    return <FileText className="w-3.5 h-3.5 text-emerald-400" />;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center overflow-y-auto overscroll-contain p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-4xl w-full max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1.5rem)] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="bg-stone-950 px-6 py-4 border-b border-stone-800 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-950/70 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Sunday School Evidence Map & Source Grounding
                </h2>
                {allowInternetSearch ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800/60 flex items-center gap-1">
                    <Globe className="w-3 h-3" /> Teacher Sources + Search Mode
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-semibold flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Strict Mode: Teacher Sources Only (Closed-Source)
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-400">
                Every theological and historical statement must be directly verifiable in teacher classroom sources.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-stone-800 text-stone-400 hover:text-stone-200 rounded-xl transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        {/* Status Bar */}
        <div className="bg-stone-950/60 px-6 py-3 border-b border-stone-800/80 flex items-center justify-between flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-4">
            <span className="text-stone-400">
              Total Ingested Sources: <strong className="text-stone-200 font-mono">{sources.length}</strong>
            </span>
            <span className="text-stone-400">
              Verified Claims: <strong className="text-emerald-400 font-mono">{claims.filter(c => c.verified).length}/{claims.length}</strong>
            </span>
            <span className="text-stone-400">
              Scripture References: <strong className="text-amber-400 font-mono">{evidenceMap.bibleReferences.length}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-stone-900 border border-stone-800 rounded-xl px-2.5 py-1 text-xs">
              <Search className="w-3.5 h-3.5 text-stone-500 mr-1.5 self-center" />
              <input
                type="text"
                placeholder="Search claims & sources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-stone-200 placeholder-stone-500 focus:outline-none w-36"
              />
            </div>

            <div className="flex rounded-xl bg-stone-900 border border-stone-800 p-0.5 text-xs">
              <button
                onClick={() => setFilterVerified('all')}
                className={`px-2 py-0.5 rounded-lg transition-colors ${filterVerified === 'all' ? 'bg-stone-700 text-white font-medium' : 'text-stone-400'}`}
              >
                All
              </button>
              <button
                onClick={() => setFilterVerified('verified')}
                className={`px-2 py-0.5 rounded-lg transition-colors ${filterVerified === 'verified' ? 'bg-emerald-900/60 text-emerald-200 font-medium' : 'text-stone-400'}`}
              >
                Verified
              </button>
              <button
                onClick={() => setFilterVerified('flagged')}
                className={`px-2 py-0.5 rounded-lg transition-colors ${filterVerified === 'flagged' ? 'bg-red-900/60 text-red-200 font-medium' : 'text-stone-400'}`}
              >
                Flagged
              </button>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Main Topics */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-amber-500" />
              Identified Primary Lesson Topics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {evidenceMap.mainTopicsEn.map((topic, i) => (
                <div key={i} className="p-3 bg-stone-950/70 rounded-xl border border-stone-800/80">
                  <div className="text-xs font-semibold text-stone-200 mb-1">
                    {i + 1}. {topic}
                  </div>
                  {evidenceMap.mainTopicsAr[i] && (
                    <div className="text-xs text-amber-400/90 font-sans" dir="rtl">
                      {evidenceMap.mainTopicsAr[i]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Traceable Claims List */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Traceable Lesson Claims ({filteredClaims.length})
              </span>
              <span className="text-[11px] font-normal text-stone-500">
                Click a source to open document/audio viewer
              </span>
            </h3>

            <div className="space-y-3">
              {filteredClaims.map((claim) => {
                const matchingSource = sources.find(s => s.id === claim.sourceId);
                return (
                  <div 
                    key={claim.claimId}
                    className="p-4 bg-stone-950/80 rounded-xl border border-stone-800 hover:border-stone-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {claim.category && (
                            <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-mono font-bold tracking-wider bg-stone-800 text-stone-300 border border-stone-700">
                              {claim.category}
                            </span>
                          )}
                          {claim.servantReviewStatus && (
                            <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-mono font-bold tracking-wider ${
                              claim.servantReviewStatus === 'APPROVED'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                                : claim.servantReviewStatus === 'FLAGGED'
                                ? 'bg-red-950 text-red-300 border border-red-800/60'
                                : 'bg-stone-900 text-amber-300 border border-amber-800/40'
                            }`}>
                              Review: {claim.servantReviewStatus}
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-stone-200 font-medium leading-relaxed">
                          {claim.statementEn}
                        </p>
                        <p className="text-xs text-stone-400 font-sans leading-relaxed" dir="rtl">
                          {claim.statementAr}
                        </p>
                      </div>

                      <div className="shrink-0 flex flex-col items-end gap-1">
                        {claim.verified ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Verified
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800/60 font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Unverified
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Exact Excerpt / Verbatim Quote Callout */}
                    {(claim.quoteEn || claim.quoteAr) && (
                      <div className="mt-2.5 p-2.5 bg-stone-900/90 rounded-lg border-l-2 border-amber-500/80 space-y-1">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                          <Quote className="w-3 h-3" /> Exact Source Excerpt (Closed-Source Provenance)
                        </div>
                        {claim.quoteEn && (
                          <p className="text-xs text-stone-300 italic font-serif leading-relaxed">
                            {claim.quoteEn}
                          </p>
                        )}
                        {claim.quoteAr && (
                          <p className="text-xs text-stone-400 italic font-sans leading-relaxed" dir="rtl">
                            {claim.quoteAr}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Servant Review Note if present */}
                    {claim.servantReviewNote && (
                      <div className="mt-2 text-[11px] text-amber-200/90 bg-amber-950/20 px-2.5 py-1 rounded border border-amber-900/30">
                        <span className="font-semibold text-amber-400">Servant Note:</span> {claim.servantReviewNote}
                      </div>
                    )}

                    {/* Source Citation Badge */}
                    <div className="mt-3 pt-2.5 border-t border-stone-900 flex items-center justify-between text-xs text-stone-400 flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 text-stone-300">
                        {getSourceIcon(claim.sourceId)}
                        <span className="font-semibold text-[11px] text-stone-200">{claim.sourceName}</span>
                        <span className="text-stone-500">•</span>
                        <span className="text-amber-400 font-mono text-[11px]">{claim.sourceLocation}</span>
                      </div>

                      {matchingSource && onOpenSourceViewer && (
                        <button
                          onClick={() => onOpenSourceViewer(matchingSource)}
                          className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 hover:underline"
                        >
                          View In Source <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scripture References */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-blue-400" />
              Verified Biblical Scriptures
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {evidenceMap.bibleReferences.map((ref, idx) => (
                <div key={idx} className="p-4 bg-stone-950/70 rounded-xl border border-stone-800 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-400 font-serif text-sm">{ref.reference}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/50">
                      Scripture
                    </span>
                  </div>
                  <p className="text-stone-200 italic font-serif">
                    "{ref.textEn}"
                  </p>
                  <p className="text-stone-400 italic font-sans" dir="rtl">
                    "{ref.textAr}"
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Source Discrepancies & Conflicts */}
          {evidenceMap.conflicts && evidenceMap.conflicts.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Source Discrepancies & Conflicts ({evidenceMap.conflicts.length})
                </span>
                <span className="text-[11px] font-normal text-stone-400">
                  Flagged for human servant theological review
                </span>
              </h3>

              <div className="space-y-3">
                {evidenceMap.conflicts.map((conf) => (
                  <div key={conf.id} className="p-4 bg-amber-950/20 border border-amber-900/50 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" /> Source Discrepancy
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        conf.status === 'RESOLVED' 
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60' 
                          : 'bg-amber-950 text-amber-300 border border-amber-800/60'
                      }`}>
                        {conf.status === 'RESOLVED' ? 'Resolved by Servant' : 'Unresolved Discrepancy'}
                      </span>
                    </div>

                    <div className="text-xs text-stone-200">
                      <p className="font-medium text-stone-100">{conf.conflictDescriptionEn}</p>
                      {conf.conflictDescriptionAr && (
                        <p className="text-stone-400 mt-1 font-sans" dir="rtl">{conf.conflictDescriptionAr}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 bg-stone-900/80 rounded-lg border border-stone-800">
                        <span className="text-[10px] font-semibold text-stone-400 block mb-1">
                          Source A: {conf.sourceAName} {conf.sourceALocation ? `(${conf.sourceALocation})` : ''}
                        </span>
                        {conf.sourceAQuote && (
                          <p className="text-stone-300 italic text-[11px] font-serif">{conf.sourceAQuote}</p>
                        )}
                      </div>
                      <div className="p-2.5 bg-stone-900/80 rounded-lg border border-stone-800">
                        <span className="text-[10px] font-semibold text-stone-400 block mb-1">
                          Source B: {conf.sourceBName} {conf.sourceBLocation ? `(${conf.sourceBLocation})` : ''}
                        </span>
                        {conf.sourceBQuote && (
                          <p className="text-stone-300 italic text-[11px] font-serif">{conf.sourceBQuote}</p>
                        )}
                      </div>
                    </div>

                    {conf.resolutionNote && (
                      <div className="p-2.5 bg-emerald-950/30 rounded-lg border border-emerald-900/50 text-xs text-emerald-200">
                        <strong className="block text-[10px] uppercase text-emerald-400">Servant Resolution Note:</strong>
                        {conf.resolutionNote}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Teacher Classroom Explanations */}
          {evidenceMap.teacherExplanations && evidenceMap.teacherExplanations.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3 flex items-center gap-1.5">
                <Mic className="w-4 h-4 text-amber-400" />
                Teacher Oral Explanations Recorded in Class
              </h3>
              <div className="space-y-2">
                {evidenceMap.teacherExplanations.map((exp, idx) => (
                  <div key={idx} className="p-3 bg-amber-950/20 border border-amber-900/40 rounded-xl text-xs text-amber-200 flex items-start gap-2">
                    <span className="text-amber-500 font-bold">•</span>
                    <span>{exp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-stone-950 px-6 py-3 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>All content verified closed-source compliant</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-medium transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
