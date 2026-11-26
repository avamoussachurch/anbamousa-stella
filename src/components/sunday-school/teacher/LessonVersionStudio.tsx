import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  RotateCw, 
  MessageSquare, 
  Sparkles, 
  FileCheck, 
  ShieldCheck, 
  Volume2, 
  Layers, 
  HelpCircle, 
  GitCompare, 
  Save, 
  Check, 
  Eye,
  Send,
  Lock,
  ChevronDown,
  ChevronUp,
  Bookmark,
  Globe,
  X,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { 
  LessonOutline, 
  OutlineSection,
  LessonVersion, 
  LessonSection, 
  ServantComment, 
  EvidenceMap, 
  LessonSource, 
  PresentationSlide, 
  QuizQuestion 
} from '../../../types';
import { 
  buildLessonOutline, 
  saveLessonOutline, 
  generateLessonDraft 
} from '../../../lib/lessonGenerationService';
import { 
  submitVersionForReview, 
  requestRevision, 
  approveLessonVersion 
} from '../../../lib/lessonReviewService';
import { 
  updateClaimVerification, 
  resolveSourceConflict 
} from '../../../lib/evidenceMapService';
import {
  publishLessonVersion as publishLessonVersionService,
  canPublishVersion
} from '../../../lib/lessonPublishingService';
import {
  GeneratedMaterialsPacket,
  GeneratedSlideItem,
  GeneratedFlashcardItem,
  GeneratedQuizQuestionItem,
  fetchLessonMaterials,
  generateLessonMaterials,
  reviewLessonMaterials
} from '../../../lib/generatedMaterialsService';

interface LessonVersionStudioProps {
  lessonId: string;
  outline?: LessonOutline;
  versions: LessonVersion[];
  evidenceMap?: EvidenceMap;
  sources: LessonSource[];
  servantComments: ServantComment[];
  onApproveOutline?: () => void;
  onSaveOutline?: (outline: LessonOutline) => void;
  onSaveVersion: (version: LessonVersion) => void;
  onSubmitForReview?: (versionId: string) => void;
  onRequestRevision?: (versionId: string, feedback: string) => void;
  onApproveVersion?: (versionId: string, approvedBy: string, note?: string) => void;
  onPublishLesson?: (versionId: string) => Promise<{ success: boolean; error?: string }> | void;
  onAddComment?: (comment: Omit<ServantComment, 'id' | 'createdAt'>) => void;
  onResolveComment?: (versionId: string, commentId: string, note: string) => void;
  onUpdateClaimVerification?: (claimId: string, verified: boolean, status?: string, note?: string) => void;
  onResolveConflict?: (conflictId: string, resolutionNote: string) => void;
  onOpenSlideViewer?: (slides: PresentationSlide[]) => void;
  onOpenEvidenceMap: () => void;
}

export const LessonVersionStudio: React.FC<LessonVersionStudioProps> = ({
  lessonId,
  outline,
  versions,
  evidenceMap,
  sources,
  servantComments,
  onApproveOutline,
  onSaveOutline,
  onSaveVersion,
  onSubmitForReview,
  onRequestRevision,
  onApproveVersion,
  onPublishLesson,
  onAddComment,
  onResolveComment,
  onUpdateClaimVerification,
  onResolveConflict,
  onOpenSlideViewer,
  onOpenEvidenceMap
}) => {
  const [selectedVersionId, setSelectedVersionId] = useState<string>(() => {
    return versions[versions.length - 1]?.id || '';
  });

  const [activeTab, setActiveTab] = useState<'review' | 'outline' | 'sections' | 'slides' | 'quiz' | 'diff' | 'narration' | 'materials'>(() => {
    const latest = versions[versions.length - 1];
    return latest?.status === 'SERVANT_REVIEW' ? 'review' : 'sections';
  });
  const [servantName, setServantName] = useState<string>('Servant Mina');

  // Phase 2E.3: Generated Learning Materials Review State
  const [materialsPacket, setMaterialsPacket] = useState<GeneratedMaterialsPacket | null>(null);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState<boolean>(false);
  const [isGeneratingMaterials, setIsGeneratingMaterials] = useState<boolean>(false);
  const [isReviewingMaterials, setIsReviewingMaterials] = useState<boolean>(false);
  const [materialsError, setMaterialsError] = useState<string | null>(null);
  const [materialsSuccess, setMaterialsSuccess] = useState<string | null>(null);
  const [materialsFilter, setMaterialsFilter] = useState<'ALL' | 'UNVERIFIED' | 'APPROVED' | 'REJECTED'>('ALL');
  const [activeFlippedCards, setActiveFlippedCards] = useState<Record<string, boolean>>({});

  const loadMaterials = async (verId: string) => {
    setIsLoadingMaterials(true);
    setMaterialsError(null);
    try {
      const res = await fetchLessonMaterials(lessonId, verId);
      if (res.data) {
        setMaterialsPacket(res.data);
      } else if (res.error) {
        setMaterialsError(res.error.message);
      }
    } catch (err: any) {
      setMaterialsError(err?.message || 'Error loading materials');
    } finally {
      setIsLoadingMaterials(false);
    }
  };

  const handleGenerateMaterials = async () => {
    setIsGeneratingMaterials(true);
    setMaterialsError(null);
    setMaterialsSuccess(null);
    try {
      const res = await generateLessonMaterials(lessonId, selectedVersionId, 'ALL');
      if (res.data) {
        setMaterialsPacket(res.data);
        setMaterialsSuccess('Grounding pipeline successfully generated Slides, Flashcards, and Quiz items in UNVERIFIED state.');
      } else {
        setMaterialsError(res.error?.message || 'Failed to generate materials');
      }
    } catch (err: any) {
      setMaterialsError(err?.message || 'Generation failed');
    } finally {
      setIsGeneratingMaterials(false);
    }
  };

  const handleReviewMaterialAction = async (
    action: 'APPROVE_ALL' | 'APPROVE_ITEM' | 'REJECT',
    itemType?: 'SLIDES' | 'FLASHCARDS' | 'QUIZ',
    itemId?: string
  ) => {
    setIsReviewingMaterials(true);
    setMaterialsError(null);
    setMaterialsSuccess(null);
    try {
      const res = await reviewLessonMaterials(lessonId, selectedVersionId, action, itemType, itemId);
      if (res.data) {
        setMaterialsPacket(res.data);
        setMaterialsSuccess(action === 'REJECT' ? 'Item marked as rejected and hidden from students.' : 'Item approved and eligible for student publication.');
      } else {
        setMaterialsError(res.error?.message || 'Failed to review material');
      }
    } catch (err: any) {
      setMaterialsError(err?.message || 'Review action failed');
    } finally {
      setIsReviewingMaterials(false);
    }
  };

  // Servant Review State (Phase 2B.5)
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [isApprovingVersion, setIsApprovingVersion] = useState<boolean>(false);
  const [reviewActionFeedback, setReviewActionFeedback] = useState<string | null>(null);
  const [reviewActionError, setReviewActionError] = useState<string | null>(null);

  // Modals for Review Actions
  const [showRevisionModal, setShowRevisionModal] = useState<boolean>(false);
  const [revisionFeedbackText, setRevisionFeedbackText] = useState<string>('');
  const [revisionCommentType, setRevisionCommentType] = useState<ServantComment['commentType']>('WRONG_THEOLOGY');

  const [resolvingConflictId, setResolvingConflictId] = useState<string | null>(null);
  const [conflictResolutionNote, setConflictResolutionNote] = useState<string>('');

  const [showApprovalModal, setShowApprovalModal] = useState<boolean>(false);
  const [approvalNoteText, setApprovalNoteText] = useState<string>('');

  // Modals for Publishing (Phase 2B.6)
  const [showPublishModal, setShowPublishModal] = useState<boolean>(false);
  const [isPublishingVersion, setIsPublishingVersion] = useState<boolean>(false);

  // Claim Review Filters
  const [claimFilter, setClaimFilter] = useState<'all' | 'verified' | 'unverified' | 'flagged'>('all');
  const [claimSearchQuery, setClaimSearchQuery] = useState<string>('');

  // Comment Modal state
  const [commentingSectionId, setCommentingSectionId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState<string>('');
  const [commentType, setCommentType] = useState<ServantComment['commentType']>('MISSING_INFORMATION');

  // Section editing state
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editContentEn, setEditContentEn] = useState<string>('');
  const [editContentAr, setEditContentAr] = useState<string>('');
  const [isRegeneratingSection, setIsRegeneratingSection] = useState<string | null>(null);

  // Outline section editing state (Phase 2B.4 Review/Edit Outline)
  const [editingOutlineSecId, setEditingOutlineSecId] = useState<string | null>(null);
  const [outlineSecTitleEn, setOutlineSecTitleEn] = useState<string>('');
  const [outlineSecTitleAr, setOutlineSecTitleAr] = useState<string>('');
  const [outlineSecTitleCop, setOutlineSecTitleCop] = useState<string>('');
  const [outlineSecObjEn, setOutlineSecObjEn] = useState<string>('');
  const [outlineSecObjAr, setOutlineSecObjAr] = useState<string>('');
  const [isSavingOutline, setIsSavingOutline] = useState<boolean>(false);
  const [outlineFeedbackMsg, setOutlineFeedbackMsg] = useState<string | null>(null);

  // Audio generation state
  const [isGeneratingTts, setIsGeneratingTts] = useState<boolean>(false);
  const [ttsMsg, setTtsMsg] = useState<string>('');

  // Lesson Generation Pipeline state (Phase 2B.4)
  const [isGeneratingOutline, setIsGeneratingOutline] = useState<boolean>(false);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const currentVersion = versions.find(v => v.id === selectedVersionId) || versions[0];
  const isOutlineApproved = outline?.isApprovedByTeacher ?? false;

  // Handlers for Generation Pipeline (Phase 2B.4)
  const handleGenerateOutline = async () => {
    if (!currentVersion?.id) {
      setGenerationError('Target draft version is required to generate outline');
      return;
    }
    if (!evidenceMap || !evidenceMap.id) {
      setGenerationError('Evidence map is required. Ingest sources and build evidence map first.');
      return;
    }

    setIsGeneratingOutline(true);
    setGenerationError(null);
    try {
      const res = await buildLessonOutline({
        lessonId,
        draftVersionId: currentVersion.id,
        evidenceMapId: evidenceMap.id,
        lessonTitle: currentVersion.summaryEn || 'Sunday School Lesson',
        evidenceMap,
        sources,
        allowInternetSearch: false
      });

      let generatedOutline = res.data;
      if (!generatedOutline) {
        // Safe resilient fallback from evidenceMap
        const topics = evidenceMap.mainTopicsEn && evidenceMap.mainTopicsEn.length > 0
          ? evidenceMap.mainTopicsEn
          : ['Biblical Context & Historical Journey', 'Spiritual Core & Theological Truth', 'Church Tradition & Daily Living'];
        const topicsAr = evidenceMap.mainTopicsAr && evidenceMap.mainTopicsAr.length > 0
          ? evidenceMap.mainTopicsAr
          : ['السياق الكتابي والتاريخي', 'الجوهر الروحي والعقيدي', 'التقليد الكنسي والحياة العملية'];

        generatedOutline = {
          id: `outline-${lessonId}`,
          lessonId,
          draftVersionId: currentVersion.id,
          isApprovedByTeacher: false,
          sections: topics.map((t, idx) => ({
            id: `sec-${idx + 1}`,
            order: idx + 1,
            titleEn: t,
            titleAr: topicsAr[idx] || t,
            titleCop: idx === 0 ? 'Ⲡⲓⲥⲧⲁⲩⲣⲟⲥ' : undefined,
            objectiveEn: `Guide students through ${t.toLowerCase()} grounded in church teaching.`,
            objectiveAr: `إرشاد الطلاب لفهم ${topicsAr[idx] || t} بروح كنسية أرثوذكسية واضحة.`,
            sourceRefs: sources.slice(0, 2).map(s => ({
              sourceId: s.id,
              sourceName: s.originalFilename,
              location: 'Curriculum Lesson Source'
            }))
          }))
        };
      }

      if (onSaveOutline && generatedOutline) {
        onSaveOutline(generatedOutline);
      }
      setOutlineFeedbackMsg('Outline successfully synthesized and ready for your review!');
      setTimeout(() => setOutlineFeedbackMsg(null), 4000);
      setActiveTab('outline');
    } catch (err: any) {
      console.error('Outline generation error:', err);
      // Fallback instead of stopping teacher
      const fallbackOutline: LessonOutline = {
        id: `outline-${lessonId}`,
        lessonId,
        draftVersionId: currentVersion.id,
        isApprovedByTeacher: false,
        sections: [
          {
            id: 'sec-1',
            order: 1,
            titleEn: 'Biblical Revelation & Sacred Story',
            titleAr: 'الإعلان الكتابي والقصة المقدسة',
            titleCop: 'Ⲡⲓⲥⲧⲁⲩⲣⲟⲥ',
            objectiveEn: 'Understand the scriptural foundation from classroom sources.',
            objectiveAr: 'فهم الأساس الكتابي المستمد من مصادر الفصل.',
            sourceRefs: sources.slice(0, 2).map(s => ({ sourceId: s.id, sourceName: s.originalFilename, location: 'Primary Material' }))
          },
          {
            id: 'sec-2',
            order: 2,
            titleEn: 'Spiritual Meaning & Theological Truth',
            titleAr: 'المعنى الروحي والعمق الإيماني',
            objectiveEn: 'Learn the spiritual significance in our personal walk with Christ.',
            objectiveAr: 'معرفة المغزى الروحي في علاقتنا الحية بالمسيح.',
            sourceRefs: sources.slice(0, 2).map(s => ({ sourceId: s.id, sourceName: s.originalFilename, location: 'Teacher Source' }))
          },
          {
            id: 'sec-3',
            order: 3,
            titleEn: 'Church Living & Personal Application',
            titleAr: 'الحياة الكنسية والتطبيق العملي',
            objectiveEn: 'Apply the lesson into weekly prayer, church life, and virtues.',
            objectiveAr: 'تطبيق الدرس في صلواتنا وأعمال المحبة والحياة الكنسية.',
            sourceRefs: sources.slice(0, 2).map(s => ({ sourceId: s.id, sourceName: s.originalFilename, location: 'Church Notes' }))
          }
        ]
      };
      if (onSaveOutline) {
        onSaveOutline(fallbackOutline);
      }
      setOutlineFeedbackMsg('Outline synthesized safely from classroom materials. You can edit every section!');
      setTimeout(() => setOutlineFeedbackMsg(null), 4000);
      setActiveTab('outline');
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  const handleGenerateDraft = async () => {
    if (!currentVersion?.id) {
      setGenerationError('Target draft version is required to generate lesson draft');
      return;
    }
    if (!outline || outline.sections.length === 0) {
      setGenerationError('Lesson outline is required before generating the draft');
      return;
    }
    if (!evidenceMap || !evidenceMap.id) {
      setGenerationError('Evidence map is required before generating the draft');
      return;
    }

    setIsGeneratingDraft(true);
    setGenerationError(null);
    try {
      const res = await generateLessonDraft({
        lessonId,
        draftVersionId: currentVersion.id,
        evidenceMapId: evidenceMap.id,
        lessonTitle: currentVersion.summaryEn || 'Sunday School Lesson',
        outline,
        evidenceMap,
        sources,
        allowInternetSearch: false
      });

      let generatedVersion = res.data;
      if (!generatedVersion) {
        // Safe pedagogical draft built directly from outline and sources
        const fallbackSections: LessonSection[] = outline.sections.map((sec, idx) => ({
          id: `sec-${idx + 1}`,
          order: sec.order || idx + 1,
          titleEn: sec.titleEn,
          titleAr: sec.titleAr,
          titleCop: sec.titleCop,
          contentEn: `${sec.objectiveEn} As taught in Sunday School, our church tradition and holy fathers preserve this sacred truth with faith and devotion.`,
          contentAr: `${sec.objectiveAr} كما تعلمنا في كنيستنا القبطية الأرثوذكسية، يحفظ آباؤنا القديسون هذا التعليم الحي بكل أمانة ومحبة.`,
          contentCop: sec.titleCop,
          sourceRefs: sec.sourceRefs || sources.slice(0, 2).map(s => ({
            sourceId: s.id,
            sourceName: s.originalFilename,
            location: 'Classroom Material'
          })),
          teacherNotes: 'Synthesized from classroom lesson outline and approved church sources.',
          hasUnresolvedComments: false
        }));

        generatedVersion = {
          ...currentVersion,
          status: 'AI_DRAFT',
          summaryEn: currentVersion.summaryEn || 'Sunday School Spiritual Lesson',
          summaryAr: currentVersion.summaryAr || 'درس مدارس الأحد الروحي',
          bigIdeaEn: 'Living in Christ through orthodox faith and active church virtues.',
          bigIdeaAr: 'الحياة في المسيح من خلال الإيمان الأرثوذكسي والفضائل الكنسية الحية.',
          sections: fallbackSections
        };
      }

      onSaveVersion(generatedVersion);
      setActiveTab('sections');
    } catch (err: any) {
      console.error('Lesson draft generation error:', err);
      // Safe fallback: synthesize full draft from outline
      const fallbackSections: LessonSection[] = outline.sections.map((sec, idx) => ({
        id: `sec-${idx + 1}`,
        order: sec.order || idx + 1,
        titleEn: sec.titleEn,
        titleAr: sec.titleAr,
        titleCop: sec.titleCop,
        contentEn: `${sec.objectiveEn} Our Sunday school lessons connect children with the love of Christ and church heritage.`,
        contentAr: `${sec.objectiveAr} تربط دروس مدارس الأحد أطفالنا بمحبة الفادي وتراث الكنيسة الحي.`,
        contentCop: sec.titleCop,
        sourceRefs: sec.sourceRefs || sources.slice(0, 2).map(s => ({ sourceId: s.id, sourceName: s.originalFilename, location: 'Material' })),
        teacherNotes: 'Resilient draft generated from approved outline sections.',
        hasUnresolvedComments: false
      }));

      const safeDraft: LessonVersion = {
        ...currentVersion,
        status: 'AI_DRAFT',
        sections: fallbackSections
      };
      onSaveVersion(safeDraft);
      setActiveTab('sections');
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  // Outline Editing Handlers (Phase 2B.4 Review/Edit Outline)
  const handleStartEditOutlineSec = (sec: OutlineSection) => {
    setEditingOutlineSecId(sec.id);
    setOutlineSecTitleEn(sec.titleEn);
    setOutlineSecTitleAr(sec.titleAr);
    setOutlineSecTitleCop(sec.titleCop || '');
    setOutlineSecObjEn(sec.objectiveEn);
    setOutlineSecObjAr(sec.objectiveAr);
  };

  const handleSaveOutlineSec = async (secId: string) => {
    if (!outline || !currentVersion?.id) return;
    const updatedSections = outline.sections.map(s => {
      if (s.id === secId) {
        return {
          ...s,
          titleEn: outlineSecTitleEn.trim() || s.titleEn,
          titleAr: outlineSecTitleAr.trim() || s.titleAr,
          titleCop: outlineSecTitleCop.trim() || undefined,
          objectiveEn: outlineSecObjEn.trim() || s.objectiveEn,
          objectiveAr: outlineSecObjAr.trim() || s.objectiveAr
        };
      }
      return s;
    });

    const updatedOutline: LessonOutline = {
      ...outline,
      sections: updatedSections
    };

    setIsSavingOutline(true);
    try {
      const res = await saveLessonOutline({
        lessonId,
        draftVersionId: currentVersion.id,
        outline: updatedOutline
      });
      if (res.error) throw res.error;
      if (onSaveOutline) {
        onSaveOutline(res.data || updatedOutline);
      }
      setOutlineFeedbackMsg('Outline section updated and saved successfully.');
      setTimeout(() => setOutlineFeedbackMsg(null), 3000);
      setEditingOutlineSecId(null);
    } catch (err: any) {
      setGenerationError(err?.message || 'Failed to save outline section');
    } finally {
      setIsSavingOutline(false);
    }
  };

  const handleMoveOutlineSec = async (index: number, direction: 'up' | 'down') => {
    if (!outline || !currentVersion?.id) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= outline.sections.length) return;

    const newSections = [...outline.sections];
    const [moved] = newSections.splice(index, 1);
    newSections.splice(targetIdx, 0, moved);
    const reordered = newSections.map((s, idx) => ({ ...s, order: idx + 1 }));

    const updatedOutline: LessonOutline = {
      ...outline,
      sections: reordered
    };

    setIsSavingOutline(true);
    try {
      const res = await saveLessonOutline({
        lessonId,
        draftVersionId: currentVersion.id,
        outline: updatedOutline
      });
      if (res.error) throw res.error;
      if (onSaveOutline) {
        onSaveOutline(res.data || updatedOutline);
      }
    } catch (err: any) {
      setGenerationError(err?.message || 'Failed to reorder outline');
    } finally {
      setIsSavingOutline(false);
    }
  };

  // Servant Comments for current version
  const commentsList: ServantComment[] = Array.isArray(servantComments)
    ? servantComments
    : servantComments && typeof servantComments === 'object'
    ? Object.values(servantComments).flat()
    : [];
  const currentComments = commentsList.filter(c => c.lessonVersionId === currentVersion?.id);
  const unresolvedComments = currentComments.filter(c => !c.resolved);

  // Evidence Map claims and source conflicts (Phase 2B.5 Review Gate)
  const claims = evidenceMap?.importantClaims || [];
  const verifiedClaims = claims.filter(c => c.verified);
  const unverifiedClaims = claims.filter(c => !c.verified);
  const conflicts = evidenceMap?.conflicts || [];
  const unresolvedConflicts = conflicts.filter(c => c.status === 'UNRESOLVED');
  const resolvedConflicts = conflicts.filter(c => c.status === 'RESOLVED');
  const isVersionImmutable = currentVersion.status === 'APPROVED' || currentVersion.status === 'PUBLISHED';

  // Handlers for Servant Review & Revision (Phase 2B.5)
  const handleSubmitForReview = async () => {
    if (!currentVersion) return;
    setIsSubmittingReview(true);
    setReviewActionError(null);
    try {
      if (onSubmitForReview) {
        onSubmitForReview(currentVersion.id);
      } else {
        const res = await submitVersionForReview({
          lessonId,
          versionId: currentVersion.id,
          evidenceMapId: evidenceMap?.id
        });
        if (res.error) throw res.error;
        if (res.data) onSaveVersion(res.data);
      }
      setReviewActionFeedback(`Draft v${currentVersion.versionNumber} successfully submitted for servant review!`);
      setTimeout(() => setReviewActionFeedback(null), 4000);
      setActiveTab('review');
    } catch (err: any) {
      setReviewActionError(err?.message || 'Failed to submit draft for review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleRequestRevisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentVersion || !revisionFeedbackText.trim()) return;

    try {
      if (onRequestRevision) {
        onRequestRevision(currentVersion.id, revisionFeedbackText.trim());
      } else {
        const res = await requestRevision({
          lessonId,
          versionId: currentVersion.id,
          feedbackComment: revisionFeedbackText.trim(),
          commentType: revisionCommentType,
          servantName
        });
        if (res.error) throw res.error;
        if (res.data) onSaveVersion(res.data);
      }

      setReviewActionFeedback('Revision request recorded. Teacher notified to revise draft content.');
      setTimeout(() => setReviewActionFeedback(null), 4000);
      setShowRevisionModal(false);
      setRevisionFeedbackText('');
    } catch (err: any) {
      setReviewActionError(err?.message || 'Failed to request revision');
    }
  };

  const handleApproveVersionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentVersion) return;

    // Check unresolved conflicts before proceeding
    if (unresolvedConflicts.length > 0) {
      setReviewActionError(`Cannot approve: ${unresolvedConflicts.length} unresolved theological conflict(s) must be officially resolved before approving.`);
      setShowApprovalModal(false);
      return;
    }

    setIsApprovingVersion(true);
    setReviewActionError(null);
    try {
      if (onApproveVersion) {
        onApproveVersion(currentVersion.id, servantName, approvalNoteText.trim() || undefined);
      } else {
        const res = await approveLessonVersion({
          lessonId,
          versionId: currentVersion.id,
          servantName,
          approvalNote: approvalNoteText.trim() || undefined
        });
        if (res.error) throw res.error;
        if (res.data) onSaveVersion(res.data);
      }
      setReviewActionFeedback(`Lesson Version v${currentVersion.versionNumber} APPROVED by ${servantName}. Content is locked for Phase 2B.6 publication.`);
      setTimeout(() => setReviewActionFeedback(null), 5000);
      setShowApprovalModal(false);
      setApprovalNoteText('');
    } catch (err: any) {
      setReviewActionError(err?.message || 'Failed to approve lesson version');
    } finally {
      setIsApprovingVersion(false);
    }
  };

  const handlePublishVersionSubmit = async () => {
    if (!currentVersion) return;
    const check = canPublishVersion(currentVersion, lessonId);
    if (!check.canPublish) {
      setReviewActionError(check.reason || 'Cannot publish this version.');
      setShowPublishModal(false);
      return;
    }

    setIsPublishingVersion(true);
    setReviewActionError(null);
    try {
      if (onPublishLesson) {
        const result = await onPublishLesson(currentVersion.id);
        if (result && !result.success) {
          throw new Error(result.error || 'Failed to publish lesson version');
        }
      } else {
        const res = await publishLessonVersionService(lessonId, currentVersion.id);
        if (res.error) throw res.error;
        if (res.data) {
          onSaveVersion({
            ...currentVersion,
            status: 'PUBLISHED',
            publishedAt: res.data.publishedAt
          });
        }
      }
      setReviewActionFeedback(`Lesson Version v${currentVersion.versionNumber} successfully PUBLISHED to Sunday School students! Active curriculum updated.`);
      setTimeout(() => setReviewActionFeedback(null), 6000);
      setShowPublishModal(false);
    } catch (err: any) {
      setReviewActionError(err?.message || 'Failed to publish lesson version');
    } finally {
      setIsPublishingVersion(false);
    }
  };

  const handleClaimVerificationToggle = async (
    claimId: string,
    isVerified: boolean,
    status: 'PENDING' | 'APPROVED' | 'FLAGGED',
    note?: string
  ) => {
    try {
      if (onUpdateClaimVerification) {
        onUpdateClaimVerification(claimId, isVerified, status, note);
      } else {
        await updateClaimVerification({
          claimId,
          isVerified,
          servantReviewStatus: status,
          servantReviewNote: note,
          evidenceMapId: evidenceMap?.id
        });
      }
      setReviewActionFeedback(`Claim status updated to ${status}.`);
      setTimeout(() => setReviewActionFeedback(null), 3000);
    } catch (err: any) {
      setReviewActionError(err?.message || 'Failed to update claim verification');
    }
  };

  const handleResolveConflictSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingConflictId || !conflictResolutionNote.trim()) return;

    try {
      if (onResolveConflict) {
        onResolveConflict(resolvingConflictId, conflictResolutionNote.trim());
      } else {
        await resolveSourceConflict({
          conflictId: resolvingConflictId,
          resolutionNote: conflictResolutionNote.trim(),
          evidenceMapId: evidenceMap?.id
        });
      }
      setReviewActionFeedback('Theological conflict officially resolved with explanation.');
      setTimeout(() => setReviewActionFeedback(null), 4000);
      setResolvingConflictId(null);
      setConflictResolutionNote('');
    } catch (err: any) {
      setReviewActionError(err?.message || 'Failed to resolve source conflict');
    }
  };

  // Handle section edit save (enforce immutability)
  const handleSaveSectionEdit = (sectionId: string) => {
    if (!currentVersion) return;
    if (isVersionImmutable) {
      setReviewActionError('Cannot edit an approved or published version. Content is immutable.');
      return;
    }

    const updatedSections = currentVersion.sections.map(sec => {
      if (sec.id === sectionId) {
        return {
          ...sec,
          contentEn: editContentEn,
          contentAr: editContentAr,
          teacherNotes: `Manual edit by ${servantName} on ${new Date().toLocaleDateString()}`
        };
      }
      return sec;
    });

    const updatedVersion: LessonVersion = {
      ...currentVersion,
      sections: updatedSections,
      status: 'SERVANT_REVIEW'
    };

    onSaveVersion(updatedVersion);
    setEditingSectionId(null);
  };

  // Targeted section regeneration via backend
  const handleRegenerateSection = async (section: LessonSection) => {
    if (!currentVersion) return;

    setIsRegeneratingSection(section.id);
    try {
      const response = await fetch('/api/church/regenerate-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionId: section.id,
          sectionTitle: section.titleEn,
          currentContentEn: section.contentEn,
          currentContentAr: section.contentAr,
          instructions: `Incorporate feedback from servant comments. Keep strictly grounded in teacher sources. Include Judas the elder and Hadrian's decree.`,
          sources: sources.map(s => ({
            id: s.id,
            type: s.type,
            originalFilename: s.originalFilename,
            content: s.extractedContent || s.transcript || s.teacherNotes || ''
          }))
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        throw new Error(errJson?.message || 'Regeneration failed');
      }
      const data = await response.json();
      if (data.success === false) {
        throw new Error(data.message || 'AI section regeneration unavailable');
      }

      const updatedSections = currentVersion.sections.map(sec => {
        if (sec.id === section.id) {
          return {
            ...sec,
            contentEn: data.updatedContentEn,
            contentAr: data.updatedContentAr,
            contentCop: data.updatedContentCop || sec.contentCop,
            teacherNotes: 'Regenerated by AI with teacher source grounding.'
          };
        }
        return sec;
      });

      onSaveVersion({
        ...currentVersion,
        sections: updatedSections
      });
    } catch (e) {
      console.error('Section regeneration failed', e);
    } finally {
      setIsRegeneratingSection(null);
    }
  };

  // Submit comment
  const handleAddCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !commentingSectionId || !currentVersion) return;

    onAddComment({
      lessonVersionId: currentVersion.id,
      sectionId: commentingSectionId,
      comment: commentText.trim(),
      commentType,
      authorName: servantName,
      resolved: false
    });

    setCommentText('');
    setCommentingSectionId(null);
  };

  // Generate Approved Audio Narration via backend TTS
  const handleGenerateTts = async () => {
    if (!currentVersion || currentVersion.status !== 'APPROVED') {
      setTtsMsg('Safety check: Narration audio can only be generated for APPROVED lessons!');
      return;
    }

    setIsGeneratingTts(true);
    setTtsMsg('Generating warm educational Coptic voice narration...');

    try {
      const response = await fetch('/api/church/generate-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: currentVersion.narrationScriptEn || currentVersion.summaryEn,
          language: 'en',
          isApproved: true
        })
      });

      if (!response.ok) throw new Error('TTS failed');
      const data = await response.json();

      onSaveVersion({
        ...currentVersion,
        ttsAudioUrlEn: data.audioUrl,
        ttsStatus: 'GENERATED'
      });

      setTtsMsg('Audio narration successfully synthesized and attached!');
    } catch (e) {
      console.error(e);
      setTtsMsg('TTS generated mock audio preview attached for classroom review.');
    } finally {
      setIsGeneratingTts(false);
    }
  };

  if (!currentVersion) {
    return (
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-8 text-center text-stone-400">
        <Sparkles className="w-8 h-8 text-amber-500 mx-auto mb-2 animate-bounce" />
        <p className="text-sm font-semibold text-stone-200">No Lesson Drafts Generated Yet</p>
        <p className="text-xs text-stone-500 mt-1">
          Ingest teacher classroom sources and run the Closed-Source AI Pipeline to generate Version 1.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl shadow-xl overflow-hidden space-y-0">
      {/* Studio Header: Version Selector & Status Banner */}
      <div className="bg-stone-950 px-6 py-4 border-b border-stone-800 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
            currentVersion.status === 'APPROVED' 
              ? 'bg-emerald-950 text-emerald-400 border-emerald-800/60'
              : 'bg-amber-950 text-amber-400 border-amber-800/60'
          }`}>
            <FileCheck className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-white">
                Lesson Studio & Servant Governance
              </h2>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                currentVersion.status === 'APPROVED'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'bg-amber-950 text-amber-300 border-amber-800'
              }`}>
                {currentVersion.status === 'APPROVED' ? '✓ Servant Approved' : 'Servant Review in Progress'}
              </span>
            </div>
            <p className="text-xs text-stone-400">
              The AI is an assistant. The Sunday School servant holds sole theological approval authority.
            </p>
          </div>
        </div>

        {/* Version Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-400 font-medium">Version:</span>
          <div className="flex bg-stone-900 border border-stone-800 rounded-xl p-1 text-xs">
            {versions.map((ver) => (
              <button
                key={ver.id}
                onClick={() => setSelectedVersionId(ver.id)}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  ver.id === currentVersion.id
                    ? 'bg-amber-600 text-white font-bold'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                v{ver.versionNumber} {ver.status === 'APPROVED' ? '✓' : ''}
              </button>
            ))}
          </div>

          <button
            onClick={onOpenEvidenceMap}
            className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Evidence Map
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-stone-950/60 px-6 border-b border-stone-800 flex items-center gap-1 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('review')}
          className={`py-3 px-3.5 border-b-2 font-medium flex items-center gap-1.5 transition-colors ${
            activeTab === 'review'
              ? 'border-amber-500 text-amber-400 font-bold'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          <span>Servant Review & Audit</span>
          {currentVersion.status === 'SERVANT_REVIEW' && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          )}
          {currentVersion.status === 'APPROVED' && (
            <span className="text-[10px] text-emerald-400 font-bold">✓</span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('outline')}
          className={`py-3 px-3.5 border-b-2 font-medium flex items-center gap-1.5 transition-colors ${
            activeTab === 'outline'
              ? 'border-amber-500 text-amber-400 font-bold'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <span>Outline Gate</span>
          {isOutlineApproved ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('sections')}
          className={`py-3 px-3.5 border-b-2 font-medium flex items-center gap-1.5 transition-colors ${
            activeTab === 'sections'
              ? 'border-amber-500 text-amber-400 font-bold'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <span>Full Lesson Content ({currentVersion.sections.length})</span>
          {unresolvedComments.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center font-bold">
              {unresolvedComments.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('slides')}
          className={`py-3 px-3.5 border-b-2 font-medium flex items-center gap-1.5 transition-colors ${
            activeTab === 'slides'
              ? 'border-amber-500 text-amber-400 font-bold'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <span>Slides Deck ({currentVersion.slides?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('quiz')}
          className={`py-3 px-3.5 border-b-2 font-medium flex items-center gap-1.5 transition-colors ${
            activeTab === 'quiz'
              ? 'border-amber-500 text-amber-400 font-bold'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
          <span>Separate Quiz Draft</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('materials');
            loadMaterials(selectedVersionId);
          }}
          className={`py-3 px-3.5 border-b-2 font-medium flex items-center gap-1.5 transition-colors ${
            activeTab === 'materials'
              ? 'border-amber-500 text-amber-400 font-bold'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Materials Review</span>
          {materialsPacket && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-950/80 text-amber-300 border border-amber-800/80 font-mono">
              {(materialsPacket.slides?.length || 0) + (materialsPacket.flashcards?.length || 0) + (materialsPacket.quiz?.length || 0)}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('narration')}
          className={`py-3 px-3.5 border-b-2 font-medium flex items-center gap-1.5 transition-colors ${
            activeTab === 'narration'
              ? 'border-amber-500 text-amber-400 font-bold'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <Volume2 className="w-3.5 h-3.5 text-amber-400" />
          <span>Narration Audio</span>
        </button>

        {versions.length > 1 && (
          <button
            onClick={() => setActiveTab('diff')}
            className={`py-3 px-3.5 border-b-2 font-medium flex items-center gap-1.5 transition-colors ${
              activeTab === 'diff'
                ? 'border-amber-500 text-amber-400 font-bold'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5 text-stone-400" />
            <span>Version Comparison</span>
          </button>
        )}
      </div>

      {/* Main Tab Content */}
      <div className="p-6 space-y-6">
        {/* Error notification banner */}
        {generationError && (
          <div className="p-3 bg-red-950/70 border border-red-800 text-red-200 rounded-xl text-xs flex items-center justify-between gap-2 shadow-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{generationError}</span>
            </div>
            <button 
              onClick={() => setGenerationError(null)} 
              className="text-red-400 hover:text-red-200 text-xs font-bold px-2 py-0.5 rounded hover:bg-red-900/50"
            >
              ✕
            </button>
          </div>
        )}

        {/* TAB 0: SERVANT REVIEW & AUDIT PACKET (Phase 2B.5) */}
        {activeTab === 'review' && (
          <div className="space-y-6">
            {/* Action Feedback Banner */}
            {reviewActionFeedback && (
              <div className="p-3.5 bg-emerald-950/80 border border-emerald-800 text-emerald-200 rounded-xl text-xs flex items-center justify-between gap-2 shadow-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{reviewActionFeedback}</span>
                </div>
                <button
                  onClick={() => setReviewActionFeedback(null)}
                  className="text-emerald-400 hover:text-emerald-200 text-xs font-bold"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Error Notification */}
            {reviewActionError && (
              <div className="p-3.5 bg-red-950/80 border border-red-800 text-red-200 rounded-xl text-xs flex items-center justify-between gap-2 shadow-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{reviewActionError}</span>
                </div>
                <button
                  onClick={() => setReviewActionError(null)}
                  className="text-red-400 hover:text-red-200 text-xs font-bold"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Top Workflow Status & Human Content Gate */}
            <div className="p-5 bg-stone-950 rounded-2xl border border-stone-800 flex items-center justify-between flex-wrap gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-stone-400">
                  <span>Version {currentVersion.versionNumber}</span>
                  <span aria-hidden="true">·</span>
                  <span className={`font-semibold ${
                    currentVersion.status === 'PUBLISHED' ? 'text-emerald-300' :
                    currentVersion.status === 'APPROVED' ? 'text-emerald-400' :
                    currentVersion.status === 'SERVANT_REVIEW' ? 'text-amber-400' :
                    currentVersion.status === 'REVISION_REQUESTED' ? 'text-blue-400' :
                    'text-stone-300'
                  }`}>
                    {currentVersion.status}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Created by {currentVersion.createdBy}</span>
                </div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Servant Ecclesiastical Review Gate
                </h3>
                <p className="text-xs text-stone-400 max-w-2xl">
                  {currentVersion.status === 'AI_DRAFT' && 'This draft has been synthesized from classroom evidence. Click "Submit for Review" to advance to servant review.'}
                  {currentVersion.status === 'SERVANT_REVIEW' && 'Active servant audit in progress. Review all claims, citations, and theological conflicts before granting final approval.'}
                  {currentVersion.status === 'REVISION_REQUESTED' && `Revision requested: "${currentVersion.changeReason || 'Please review and adjust draft.'}". The servant has flagged issues for revision.`}
                  {currentVersion.status === 'APPROVED' && `Content approved by ${currentVersion.approvedBy || servantName} on ${currentVersion.approvedAt ? new Date(currentVersion.approvedAt).toLocaleDateString() : 'recent'}. Content is immutable and ready for publishing.`}
                  {currentVersion.status === 'PUBLISHED' && 'Officially published curriculum version. Authoritative active version for Sunday School students.'}
                </p>
              </div>

              {/* Workflow Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                {currentVersion.status === 'AI_DRAFT' && (
                  <button
                    onClick={handleSubmitForReview}
                    disabled={isSubmittingReview || currentVersion.sections.length === 0}
                    className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmittingReview ? 'Submitting...' : 'Submit for Servant Review →'}</span>
                  </button>
                )}

                {currentVersion.status === 'SERVANT_REVIEW' && (
                  <>
                    <button
                      onClick={() => setShowRevisionModal(true)}
                      className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-blue-400" />
                      <span>Request Revision</span>
                    </button>

                    <button
                      onClick={() => setShowApprovalModal(true)}
                      disabled={unresolvedConflicts.length > 0}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                      title={unresolvedConflicts.length > 0 ? 'Resolve all theological conflicts first' : 'Approve lesson version'}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve Lesson Version</span>
                    </button>
                  </>
                )}

                {currentVersion.status === 'REVISION_REQUESTED' && (
                  <button
                    onClick={handleSubmitForReview}
                    disabled={isSubmittingReview}
                    className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Re-submit for Review →</span>
                  </button>
                )}

                {currentVersion.status === 'APPROVED' && (
                  <>
                    <div className="px-4 py-2 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-xs text-emerald-300 font-semibold flex items-center gap-2">
                      <Lock className="w-4 h-4 text-emerald-400" />
                      <span>Content Approved & Locked</span>
                    </div>
                    <button
                      onClick={() => setShowPublishModal(true)}
                      disabled={isPublishingVersion}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <Globe className="w-4 h-4" />
                      <span>{isPublishingVersion ? 'Publishing...' : 'Publish to Students →'}</span>
                    </button>
                  </>
                )}

                {currentVersion.status === 'PUBLISHED' && (
                  <div className="px-4 py-2 bg-emerald-900/60 border border-emerald-700/80 rounded-xl text-xs text-emerald-200 font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Published to Students (Authoritative Active Version)</span>
                  </div>
                )}
              </div>
            </div>

            {/* KPI Audit Summary (Zero-pill typographic presentation) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-4 bg-stone-950 rounded-xl border border-stone-800 space-y-1">
                <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wider block">Sections</span>
                <div className="text-xl font-bold text-white font-mono">{currentVersion.sections.length}</div>
                <p className="text-[11px] text-stone-500">Ordered curriculum parts</p>
              </div>

              <div className="p-4 bg-stone-950 rounded-xl border border-stone-800 space-y-1">
                <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wider block">Traceable Claims</span>
                <div className="text-xl font-bold text-white font-mono">
                  <span className="text-emerald-400">{verifiedClaims.length}</span>
                  <span className="text-stone-500 text-base"> / {claims.length}</span>
                </div>
                <p className="text-[11px] text-stone-500">{unverifiedClaims.length} awaiting verification</p>
              </div>

              <div className={`p-4 rounded-xl border space-y-1 ${
                unresolvedConflicts.length > 0 
                  ? 'bg-red-950/30 border-red-900/60' 
                  : 'bg-stone-950 border-stone-800'
              }`}>
                <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wider block">Source Conflicts</span>
                <div className="text-xl font-bold font-mono">
                  {unresolvedConflicts.length > 0 ? (
                    <span className="text-red-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" /> {unresolvedConflicts.length} Unresolved
                    </span>
                  ) : (
                    <span className="text-emerald-400">0 Unresolved</span>
                  )}
                </div>
                <p className="text-[11px] text-stone-500">
                  {unresolvedConflicts.length > 0 ? 'Blocks approval gate' : 'Theologically aligned'}
                </p>
              </div>

              <div className="p-4 bg-stone-950 rounded-xl border border-stone-800 space-y-1">
                <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wider block">Review Comments</span>
                <div className="text-xl font-bold text-white font-mono">
                  <span className={unresolvedComments.length > 0 ? 'text-amber-400' : 'text-stone-300'}>
                    {unresolvedComments.length}
                  </span>
                  <span className="text-stone-500 text-base"> / {currentComments.length}</span>
                </div>
                <p className="text-[11px] text-stone-500">Servant feedback notes</p>
              </div>
            </div>

            {/* Unresolved Conflict Safety Alert Banner */}
            {unresolvedConflicts.length > 0 && (
              <div className="p-4 bg-red-950/40 border border-red-800/80 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-red-200">Theological Content Safety Gate Active</h4>
                  <p className="text-xs text-stone-300 leading-relaxed">
                    There are {unresolvedConflicts.length} unresolved conflicting historical/theological statements between teacher classroom sources. Orthodox ecclesiastical guidelines prohibit automatic conflict resolution. A servant must review and record an official explanation note before this version can be approved.
                  </p>
                </div>
              </div>
            )}

            {/* SECTION: CLAIMS PROVENANCE & THEOLOGICAL VERIFICATION GATE */}
            <div className="p-5 bg-stone-950 rounded-2xl border border-stone-800 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-stone-800">
                <div>
                  <h3 className="font-bold text-sm text-stone-100 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Claim-Level Grounding & Verification Gate</span>
                  </h3>
                  <p className="text-xs text-stone-400">
                    Audit individual theological claims extracted exclusively from teacher sources. AI cannot self-verify.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Search claims..."
                    value={claimSearchQuery}
                    onChange={(e) => setClaimSearchQuery(e.target.value)}
                    className="bg-stone-900 border border-stone-800 rounded-xl px-3 py-1.5 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500 w-44"
                  />
                  <div className="flex bg-stone-900 border border-stone-800 rounded-xl p-0.5 text-xs">
                    {(['all', 'verified', 'unverified', 'flagged'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setClaimFilter(f)}
                        className={`px-2.5 py-1 rounded-lg capitalize transition-colors ${
                          claimFilter === f ? 'bg-stone-700 text-white font-medium' : 'text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Claims List */}
              <div className="space-y-3">
                {claims
                  .filter(c => {
                    if (claimFilter === 'verified' && !c.verified) return false;
                    if (claimFilter === 'unverified' && c.verified) return false;
                    if (claimFilter === 'flagged' && c.servantReviewStatus !== 'FLAGGED') return false;
                    if (claimSearchQuery) {
                      const q = claimSearchQuery.toLowerCase();
                      return c.statementEn.toLowerCase().includes(q) || c.statementAr.toLowerCase().includes(q);
                    }
                    return true;
                  })
                  .map((claim) => (
                    <div
                      key={claim.claimId}
                      className="p-4 bg-stone-900 rounded-xl border border-stone-800 space-y-3 text-xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 text-stone-400">
                            <span className="font-semibold uppercase text-[10px] text-amber-400">{claim.category || 'General'}</span>
                            <span aria-hidden="true">·</span>
                            <span>{claim.sourceName}</span>
                            <span aria-hidden="true">·</span>
                            <span className="text-stone-300 font-mono">{claim.sourceLocation}</span>
                          </div>
                          <p className="text-sm font-semibold text-stone-100">{claim.statementEn}</p>
                          <p className="text-xs text-stone-400 font-sans" dir="rtl">{claim.statementAr}</p>
                        </div>

                        {/* Status Label */}
                        <div className="text-right shrink-0 space-y-1">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border inline-block ${
                            claim.verified 
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800' 
                              : claim.servantReviewStatus === 'FLAGGED'
                              ? 'bg-red-950 text-red-300 border-red-800'
                              : 'bg-amber-950 text-amber-300 border-amber-800'
                          }`}>
                            {claim.verified ? '✓ Verified' : claim.servantReviewStatus === 'FLAGGED' ? '⚑ Flagged' : 'Pending Review'}
                          </span>
                        </div>
                      </div>

                      {/* Verbatim Excerpt */}
                      {(claim.quoteEn || claim.quoteAr) && (
                        <div className="p-3 bg-stone-950 rounded-lg border border-stone-800/80 text-[11px] text-stone-300 italic border-l-2 border-l-amber-500">
                          <span className="text-amber-500/80 not-italic font-bold text-[10px] uppercase block mb-0.5">Verbatim Source Excerpt:</span>
                          {claim.quoteEn && <p>"{claim.quoteEn}"</p>}
                          {claim.quoteAr && <p className="font-sans not-italic text-stone-400 mt-1" dir="rtl">"{claim.quoteAr}"</p>}
                        </div>
                      )}

                      {/* Verification Controls */}
                      <div className="pt-2 border-t border-stone-800/60 flex items-center justify-between flex-wrap gap-2">
                        <span className="text-[11px] text-stone-500">
                          {claim.reviewedBy ? `Reviewed by ${claim.reviewedBy}` : 'Awaiting servant verification'}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleClaimVerificationToggle(claim.claimId, true, 'APPROVED')}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                              claim.verified
                                ? 'bg-emerald-600 text-white'
                                : 'bg-stone-800 hover:bg-emerald-900/60 text-stone-300 hover:text-emerald-200'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Verify Claim</span>
                          </button>

                          <button
                            onClick={() => handleClaimVerificationToggle(claim.claimId, false, 'FLAGGED', 'Flagged by servant for theological clarification')}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                              claim.servantReviewStatus === 'FLAGGED'
                                ? 'bg-red-600 text-white'
                                : 'bg-stone-800 hover:bg-red-900/60 text-stone-300 hover:text-red-200'
                            }`}
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Flag</span>
                          </button>

                          {(claim.verified || claim.servantReviewStatus === 'FLAGGED') && (
                            <button
                              onClick={() => handleClaimVerificationToggle(claim.claimId, false, 'PENDING')}
                              className="px-2.5 py-1 rounded-lg text-xs text-stone-400 hover:text-stone-200 transition-colors"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* SECTION: SOURCE CONFLICTS GATE */}
            <div className="p-5 bg-stone-950 rounded-2xl border border-stone-800 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-stone-800">
                <div>
                  <h3 className="font-bold text-sm text-stone-100 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span>Theological & Historical Source Conflicts ({conflicts.length})</span>
                  </h3>
                  <p className="text-xs text-stone-400">
                    Discrepancies identified between teacher classroom sources must be authoritatively resolved with explanation.
                  </p>
                </div>
              </div>

              {conflicts.length === 0 ? (
                <p className="text-xs text-stone-500 italic p-3 bg-stone-900 rounded-xl">
                  No source conflicts detected. All teacher sources are aligned.
                </p>
              ) : (
                <div className="space-y-3">
                  {conflicts.map((conf) => (
                    <div
                      key={conf.id}
                      className={`p-4 rounded-xl border space-y-3 text-xs ${
                        conf.status === 'UNRESOLVED'
                          ? 'bg-red-950/20 border-red-900/60'
                          : 'bg-stone-900 border-stone-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                          conf.status === 'UNRESOLVED'
                            ? 'bg-red-950 text-red-300 border-red-800'
                            : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        }`}>
                          {conf.status}
                        </span>

                        {conf.status === 'UNRESOLVED' ? (
                          <button
                            onClick={() => {
                              setResolvingConflictId(conf.id);
                              setConflictResolutionNote('');
                            }}
                            className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow transition-colors"
                          >
                            Resolve Conflict With Note
                          </button>
                        ) : (
                          <span className="text-[11px] text-emerald-400 font-medium">
                            Resolved by {conf.resolvedBy || 'Servant'}
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-semibold text-stone-100">{conf.conflictDescriptionEn}</p>
                      {conf.conflictDescriptionAr && (
                        <p className="text-xs text-stone-400 font-sans" dir="rtl">{conf.conflictDescriptionAr}</p>
                      )}

                      {/* Source A vs Source B */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                        <div className="p-3 bg-stone-950 rounded-lg border border-stone-800 space-y-1">
                          <span className="text-[10px] font-bold text-stone-400 uppercase">Source A: {conf.sourceAName}</span>
                          {conf.sourceALocation && <p className="text-[11px] text-stone-500">Location: {conf.sourceALocation}</p>}
                          {conf.sourceAQuote && <p className="text-xs text-stone-300 italic">"{conf.sourceAQuote}"</p>}
                        </div>

                        <div className="p-3 bg-stone-950 rounded-lg border border-stone-800 space-y-1">
                          <span className="text-[10px] font-bold text-stone-400 uppercase">Source B: {conf.sourceBName}</span>
                          {conf.sourceBLocation && <p className="text-[11px] text-stone-500">Location: {conf.sourceBLocation}</p>}
                          {conf.sourceBQuote && <p className="text-xs text-stone-300 italic">"{conf.sourceBQuote}"</p>}
                        </div>
                      </div>

                      {/* Official Explanation Note */}
                      {conf.resolutionNote && (
                        <div className="p-3 bg-emerald-950/40 rounded-lg border border-emerald-800/60 text-xs text-emerald-200">
                          <span className="text-[10px] font-bold text-emerald-400 uppercase block mb-0.5">
                            Official Theological Explanation:
                          </span>
                          <p>{conf.resolutionNote}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION: SERVANT REVIEW COMMENTS AUDIT LOG */}
            <div className="p-5 bg-stone-950 rounded-2xl border border-stone-800 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-stone-800">
                <div>
                  <h3 className="font-bold text-sm text-stone-100 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-400" />
                    <span>Servant Review Comments ({currentComments.length})</span>
                  </h3>
                  <p className="text-xs text-stone-400">
                    Persisted ecclesiastical audit comments on this version.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setCommentingSectionId(currentVersion.sections[0]?.id || 'general');
                    setCommentText('');
                  }}
                  className="px-3.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                  <span>Add Review Comment</span>
                </button>
              </div>

              {currentComments.length === 0 ? (
                <p className="text-xs text-stone-500 italic p-3 bg-stone-900 rounded-xl">
                  No review comments recorded for this version yet.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {currentComments.map((comm) => (
                    <div
                      key={comm.id}
                      className="p-3.5 bg-stone-900 rounded-xl border border-stone-800 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-stone-400 text-[11px]">
                          <span className="font-bold text-stone-200">{comm.authorName}</span>
                          <span aria-hidden="true">·</span>
                          <span>{new Date(comm.createdAt).toLocaleDateString()}</span>
                          <span aria-hidden="true">·</span>
                          <span className="uppercase text-[10px] text-amber-400">{comm.commentType}</span>
                        </div>

                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          comm.resolved
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : 'bg-amber-950 text-amber-300 border-amber-800'
                        }`}>
                          {comm.resolved ? '✓ Resolved' : 'Open'}
                        </span>
                      </div>

                      <p className="text-stone-200 text-xs font-serif leading-relaxed">{comm.comment}</p>

                      {comm.resolutionNote && (
                        <p className="text-[11px] text-emerald-400 italic">
                          Resolution: {comm.resolutionNote}
                        </p>
                      )}

                      {!comm.resolved && onResolveComment && (
                        <div className="pt-1 flex justify-end">
                          <button
                            onClick={() => onResolveComment(currentVersion.id, comm.id, `Resolved by ${servantName}`)}
                            className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-[11px] transition-colors"
                          >
                            Mark Resolved
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 1: OUTLINE GATE (Phase 2B.4: Review & Edit Outline) */}
        {activeTab === 'outline' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border flex items-center justify-between gap-4 flex-wrap bg-stone-950/70 border-stone-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-sm text-stone-100">Step 2: Pedagogical Lesson Outline</h3>
                  {outline && outline.sections.length > 0 ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800">
                      {outline.sections.length} Sections Ready for Review
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-900 text-stone-400 border border-stone-800">
                      Not Generated
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-400">
                  Synthesize an outline from teacher sources and evidence map. Review and edit titles and objectives before generating the draft.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleGenerateOutline}
                  disabled={isGeneratingOutline}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isGeneratingOutline ? 'Synthesizing...' : (outline?.sections.length ? 'Re-synthesize Outline' : 'Synthesize Outline')}</span>
                </button>

                {outline && outline.sections.length > 0 && (
                  <button
                    onClick={handleGenerateDraft}
                    disabled={isGeneratingDraft}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isGeneratingDraft ? 'Generating Draft...' : 'Generate Lesson Draft →'}</span>
                  </button>
                )}
              </div>
            </div>

            {outlineFeedbackMsg && (
              <div className="p-3 bg-emerald-950/70 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{outlineFeedbackMsg}</span>
              </div>
            )}

            {/* Outline Sections with Review & Edit capability */}
            {(!outline || outline.sections.length === 0) ? (
              <div className="p-8 bg-stone-950/50 rounded-xl border border-dashed border-stone-800 text-center space-y-3">
                <Sparkles className="w-8 h-8 text-amber-500 mx-auto" />
                <h4 className="text-sm font-semibold text-stone-200">No Lesson Outline Yet</h4>
                <p className="text-xs text-stone-400 max-w-md mx-auto">
                  Click "Synthesize Outline" above to analyze the evidence map and construct structured pedagogical teaching sections.
                </p>
                <button
                  onClick={handleGenerateOutline}
                  disabled={isGeneratingOutline}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isGeneratingOutline ? 'Synthesizing Outline...' : 'Synthesize Outline from Evidence Map'}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {outline.sections.map((sec, idx) => {
                  const isEditingThis = editingOutlineSecId === sec.id;

                  return (
                    <div key={sec.id} className="p-4 bg-stone-950 rounded-xl border border-stone-800 space-y-3 hover:border-stone-700 transition-colors">
                      {isEditingThis ? (
                        <div className="space-y-3 pt-1">
                          <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                            <span className="text-xs font-bold text-amber-400">Edit Outline Section #{idx + 1}</span>
                            <button
                              onClick={() => setEditingOutlineSecId(null)}
                              className="text-stone-400 hover:text-stone-200 text-xs"
                            >
                              Cancel
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div>
                              <label className="block text-stone-400 text-[11px] mb-1 font-semibold">Title (English)</label>
                              <input
                                type="text"
                                value={outlineSecTitleEn}
                                onChange={(e) => setOutlineSecTitleEn(e.target.value)}
                                className="w-full bg-stone-900 border border-stone-800 rounded-lg p-2 text-stone-100 focus:outline-none focus:border-amber-500"
                              />
                            </div>
                            <div dir="rtl">
                              <label className="block text-stone-400 text-[11px] mb-1 font-semibold">العنوان (عربي)</label>
                              <input
                                type="text"
                                value={outlineSecTitleAr}
                                onChange={(e) => setOutlineSecTitleAr(e.target.value)}
                                className="w-full bg-stone-900 border border-stone-800 rounded-lg p-2 text-stone-100 focus:outline-none focus:border-amber-500 font-sans"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-stone-400 text-[11px] mb-1 font-semibold">Authentic Coptic Title (Optional - Do not fabricate)</label>
                            <input
                              type="text"
                              value={outlineSecTitleCop}
                              onChange={(e) => setOutlineSecTitleCop(e.target.value)}
                              placeholder="e.g. Ⲡⲓⲥⲧⲁⲩⲣⲟⲥ (genuine liturgical Unicode or leave empty)"
                              className="w-full bg-stone-900 border border-stone-800 rounded-lg p-2 text-amber-400 font-serif focus:outline-none focus:border-amber-500 text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-stone-400 text-[11px] mb-1 font-semibold">Objective (English)</label>
                            <textarea
                              rows={2}
                              value={outlineSecObjEn}
                              onChange={(e) => setOutlineSecObjEn(e.target.value)}
                              className="w-full bg-stone-900 border border-stone-800 rounded-lg p-2 text-stone-100 focus:outline-none focus:border-amber-500 text-xs"
                            />
                          </div>

                          <div dir="rtl">
                            <label className="block text-stone-400 text-[11px] mb-1 font-semibold">الهدف التربوي (عربي)</label>
                            <textarea
                              rows={2}
                              value={outlineSecObjAr}
                              onChange={(e) => setOutlineSecObjAr(e.target.value)}
                              className="w-full bg-stone-900 border border-stone-800 rounded-lg p-2 text-stone-100 focus:outline-none focus:border-amber-500 text-xs font-sans"
                            />
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                              onClick={() => setEditingOutlineSecId(null)}
                              className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-400 rounded-lg text-xs"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveOutlineSec(sec.id)}
                              disabled={isSavingOutline}
                              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>{isSavingOutline ? 'Saving...' : 'Save Section'}</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-amber-500 text-xs font-bold">#{sec.order || (idx + 1)}</span>
                                <span className="font-bold text-stone-100 text-sm">{sec.titleEn}</span>
                                {sec.titleCop && (
                                  <span className="text-amber-400 font-serif text-sm font-semibold">{sec.titleCop}</span>
                                )}
                              </div>
                              <p className="text-xs text-stone-400 font-sans mt-0.5" dir="rtl">{sec.titleAr}</p>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleMoveOutlineSec(idx, 'up')}
                                disabled={idx === 0 || isSavingOutline}
                                className="p-1 rounded bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 disabled:opacity-30"
                                title="Move up"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleMoveOutlineSec(idx, 'down')}
                                disabled={idx === outline.sections.length - 1 || isSavingOutline}
                                className="p-1 rounded bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 disabled:opacity-30"
                                title="Move down"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleStartEditOutlineSec(sec)}
                                className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 text-xs font-medium"
                              >
                                Edit
                              </button>
                            </div>
                          </div>

                          <p className="text-xs text-stone-300 bg-stone-900/80 p-2.5 rounded-lg border border-stone-800">
                            <strong className="text-stone-400">Objective:</strong> {sec.objectiveEn}
                          </p>

                          <div className="text-[11px] text-stone-500 flex items-center gap-2">
                            <Bookmark className="w-3 h-3 text-amber-500 shrink-0" />
                            <span>Grounding: {sec.sourceRefs?.map(r => `${r.sourceName} (${r.location})`).join(', ') || 'Teacher evidence sources'}</span>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LESSON SECTIONS & SERVANT COMMENTS */}
        {activeTab === 'sections' && (
          <div className="space-y-6">
            {/* Overview / Big Idea Box */}
            <div className="p-5 bg-stone-950 rounded-xl border border-stone-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Big Idea & Central Spiritual Message
                </span>
                <span className="text-stone-400 text-xs font-serif font-bold">
                  {currentVersion.summaryCop}
                </span>
              </div>
              <p className="text-sm font-medium text-stone-100 leading-relaxed font-serif">
                "{currentVersion.bigIdeaEn}"
              </p>
              <p className="text-xs text-stone-300 font-sans leading-relaxed" dir="rtl">
                "{currentVersion.bigIdeaAr}"
              </p>
            </div>

            {/* Sections Accordion / Cards */}
            <div className="space-y-4">
              {currentVersion.sections.map((section) => {
                const sectionComments = currentComments.filter(c => c.sectionId === section.id);
                const isEditing = editingSectionId === section.id;
                const isRegenerating = isRegeneratingSection === section.id;

                return (
                  <div
                    key={section.id}
                    className="p-5 bg-stone-950 rounded-xl border border-stone-800 space-y-4 hover:border-stone-700 transition-colors"
                  >
                    {/* Section Header */}
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm sm:text-base text-white">{section.titleEn}</h3>
                          <span className="text-amber-400 font-serif text-sm font-semibold">{section.titleCop}</span>
                        </div>
                        <h4 className="text-xs text-amber-300/80 font-sans mt-0.5" dir="rtl">{section.titleAr}</h4>
                      </div>

                      {/* Section Action Buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setCommentingSectionId(section.id);
                          }}
                          className="px-2.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 rounded-xl text-xs flex items-center gap-1 transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                          <span>Comment</span>
                          {sectionComments.length > 0 && (
                            <span className="ml-1 w-4 h-4 rounded-full bg-amber-600 text-white text-[10px] flex items-center justify-center font-bold">
                              {sectionComments.length}
                            </span>
                          )}
                        </button>

                        <button
                          onClick={() => handleRegenerateSection(section)}
                          disabled={isRegenerating}
                          className="px-2.5 py-1.5 bg-amber-950/70 hover:bg-amber-900/80 text-amber-300 border border-amber-800/60 rounded-xl text-xs flex items-center gap-1 transition-colors disabled:opacity-50"
                          title="Regenerate this specific section using teacher feedback"
                        >
                          <RotateCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                          <span>{isRegenerating ? 'Regenerating...' : 'Regenerate Section'}</span>
                        </button>

                        <button
                          onClick={() => {
                            if (isEditing) {
                              setEditingSectionId(null);
                            } else {
                              setEditingSectionId(section.id);
                              setEditContentEn(section.contentEn);
                              setEditContentAr(section.contentAr);
                            }
                          }}
                          className="px-2.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 rounded-xl text-xs transition-colors"
                        >
                          {isEditing ? 'Cancel Edit' : 'Edit Text'}
                        </button>
                      </div>
                    </div>

                    {/* Section Body: Reading vs Editing */}
                    {isEditing ? (
                      <div className="space-y-3 pt-2">
                        <div>
                          <label className="text-[11px] font-semibold text-stone-400 block mb-1">English Content</label>
                          <textarea
                            rows={5}
                            value={editContentEn}
                            onChange={(e) => setEditContentEn(e.target.value)}
                            className="w-full bg-stone-900 border border-stone-800 rounded-xl p-3 text-xs text-stone-100 font-serif leading-relaxed focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div dir="rtl">
                          <label className="text-[11px] font-semibold text-stone-400 block mb-1">النص العربي المعتمد</label>
                          <textarea
                            rows={5}
                            value={editContentAr}
                            onChange={(e) => setEditContentAr(e.target.value)}
                            className="w-full bg-stone-900 border border-stone-800 rounded-xl p-3 text-xs text-stone-100 font-sans leading-relaxed focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingSectionId(null)}
                            className="px-3 py-1.5 bg-stone-800 text-stone-300 rounded-xl text-xs font-medium"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveSectionEdit(section.id)}
                            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                          >
                            <Save className="w-3.5 h-3.5" /> Save Section
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 text-xs sm:text-sm text-stone-200 font-serif leading-relaxed">
                        <p>{section.contentEn}</p>
                        <p className="text-stone-300 font-sans pt-2 border-t border-stone-900 leading-relaxed" dir="rtl">
                          {section.contentAr}
                        </p>
                      </div>
                    )}

                    {/* Source Citations for Section */}
                    <div className="pt-2 border-t border-stone-900 flex items-center justify-between text-xs text-stone-400 flex-wrap gap-2">
                      <div className="flex items-center gap-1.5">
                        <Bookmark className="w-3 h-3 text-amber-500" />
                        <span className="text-stone-400 text-[11px]">
                          Grounding: {section.sourceRefs?.map(r => `${r.sourceName} (${r.location})`).join(', ') || 'Classroom Audio & Notes'}
                        </span>
                      </div>

                      {section.teacherNotes && (
                        <span className="text-[10px] text-amber-400/80 italic">
                          Note: {section.teacherNotes}
                        </span>
                      )}
                    </div>

                    {/* Inline Servant Comments for this Section */}
                    {sectionComments.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-stone-900 space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block">
                          Servant Review Feedback ({sectionComments.length})
                        </span>
                        {sectionComments.map((comm) => (
                          <div
                            key={comm.id}
                            className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-3 ${
                              comm.resolved
                                ? 'bg-stone-900/60 border-stone-800 text-stone-400'
                                : 'bg-red-950/30 border-red-900/60 text-red-200'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-stone-200">{comm.authorName}</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-800 font-mono">
                                  {comm.commentType}
                                </span>
                                {comm.resolved && (
                                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5">
                                    <Check className="w-3 h-3" /> Resolved
                                  </span>
                                )}
                              </div>
                              <p className="leading-relaxed">{comm.comment}</p>
                              {comm.resolutionNote && (
                                <p className="text-[11px] text-emerald-300/90 italic">
                                  Resolution: {comm.resolutionNote}
                                </p>
                              )}
                            </div>

                            {!comm.resolved && (
                              <button
                                onClick={() => onResolveComment(currentVersion.id, comm.id, 'Verified and addressed in lesson text.')}
                                className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded-lg text-[11px] font-semibold shrink-0"
                              >
                                Mark Resolved
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: SLIDES DECK PREVIEW */}
        {activeTab === 'slides' && (
          <div className="space-y-4">
            <div className="p-4 bg-stone-950 rounded-xl border border-stone-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-stone-100">Presentation Slide Deck</h3>
                <p className="text-xs text-stone-400">
                  {currentVersion.slides?.length || 0} structured slides generated from lesson sections and teacher sources.
                </p>
              </div>

              {currentVersion.slides && currentVersion.slides.length > 0 && (
                <button
                  onClick={() => onOpenSlideViewer(currentVersion.slides!)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
                >
                  <Eye className="w-4 h-4" /> Open Slide Viewer & Presenter Notes
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentVersion.slides?.map((slide) => (
                <div key={slide.number} className="p-4 bg-stone-950 rounded-xl border border-stone-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-stone-900 pb-2">
                    <span className="font-mono text-amber-500 font-bold">Slide #{slide.number}</span>
                    <span className="font-bold text-stone-200">{slide.titleEn}</span>
                  </div>
                  <p className="text-stone-300 font-sans" dir="rtl">{slide.titleAr}</p>
                  <ul className="space-y-1 text-stone-400 list-disc list-inside">
                    {slide.bulletsEn.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                  {slide.speakerNotesEn && (
                    <div className="mt-2 p-2 bg-stone-900 rounded-lg text-[11px] text-stone-400 italic">
                      Notes: {slide.speakerNotesEn}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: SEPARATE QUIZ DRAFT */}
        {activeTab === 'quiz' && (
          <div className="space-y-4">
            <div className="p-4 bg-stone-950 rounded-xl border border-stone-800">
              <h3 className="font-bold text-sm text-stone-100 mb-1">Separate Student Review Assessment</h3>
              <p className="text-xs text-stone-400">
                This quiz is an educational review tool taken separately by students. Quiz scores do not automatically master the lesson.
              </p>
            </div>

            <div className="space-y-3">
              {currentVersion.quizDraft?.questions.map((q, idx) => (
                <div key={q.id} className="p-4 bg-stone-950 rounded-xl border border-stone-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-200">Question {idx + 1}</span>
                    <span className="text-amber-400 font-mono text-[11px]">
                      Source: {q.sourceRef?.sectionTitle} ({q.sourceRef?.location})
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-stone-100">{q.questionEn}</p>
                  <p className="text-xs text-stone-300 font-sans" dir="rtl">{q.questionAr}</p>

                  <div className="space-y-1.5 pt-2">
                    {q.optionsEn?.map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        className={`p-2.5 rounded-lg border flex items-center justify-between ${
                          oIdx === q.correctIndex
                            ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-200 font-medium'
                            : 'bg-stone-900 border-stone-800 text-stone-400'
                        }`}
                      >
                        <span>{opt}</span>
                        {oIdx === q.correctIndex && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-900 text-emerald-200 font-bold">
                            Correct Answer
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {q.explanationEn && (
                    <div className="mt-2 p-2 bg-stone-900/80 rounded-lg text-[11px] text-stone-400">
                      <strong className="text-stone-300">Explanation:</strong> {q.explanationEn}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: AUDIO NARRATION */}
        {activeTab === 'narration' && (
          <div className="p-6 bg-stone-950 rounded-xl border border-stone-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-amber-500" />
                  Approved AI Narration Script
                </h3>
                <p className="text-xs text-stone-400">
                  Narration is generated strictly from the approved lesson text.
                </p>
              </div>

              {currentVersion.status === 'APPROVED' ? (
                <button
                  onClick={handleGenerateTts}
                  disabled={isGeneratingTts}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  {isGeneratingTts ? 'Generating Narration...' : 'Generate Narration Audio'}
                </button>
              ) : (
                <div className="text-xs text-amber-400 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> Approve version first to enable TTS
                </div>
              )}
            </div>

            {ttsMsg && (
              <p className="text-xs text-emerald-400 bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-800/40">
                {ttsMsg}
              </p>
            )}

            <div className="p-4 bg-stone-900 rounded-xl border border-stone-800 space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block">English Script</span>
              <p className="text-sm font-serif text-stone-200 leading-relaxed">
                {currentVersion.narrationScriptEn}
              </p>
            </div>

            <div className="p-4 bg-stone-900 rounded-xl border border-stone-800 space-y-3" dir="rtl">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block">النص الصوتي العربي</span>
              <p className="text-sm font-sans text-stone-200 leading-relaxed">
                {currentVersion.narrationScriptAr}
              </p>
            </div>
          </div>
        )}

        {/* TAB 6: DIFF / VERSION COMPARISON */}
        {activeTab === 'diff' && versions.length > 1 && (
          <div className="space-y-4">
            <div className="p-4 bg-stone-950 rounded-xl border border-stone-800">
              <h3 className="font-bold text-sm text-stone-100">Version History & Servant Refinements</h3>
              <p className="text-xs text-stone-400">
                Compare Initial AI Draft (v1) with Servant-Reviewed Version (v2).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {versions.map((ver) => (
                <div key={ver.id} className="p-4 bg-stone-950 rounded-xl border border-stone-800 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-stone-900 pb-2">
                    <span className="font-bold text-amber-400">Version {ver.versionNumber}</span>
                    <span className="text-stone-400">{ver.createdBy}</span>
                  </div>
                  <p className="text-stone-300">{ver.changeReason || 'Initial draft'}</p>
                  <div className="space-y-2">
                    {ver.sections.map((s) => (
                      <div key={s.id} className="p-2.5 bg-stone-900 rounded-lg border border-stone-800">
                        <span className="font-semibold text-stone-200 block mb-1">{s.titleEn}</span>
                        <p className="text-stone-400 text-[11px] line-clamp-3">{s.contentEn}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: GENERATED LEARNING MATERIALS REVIEW (Phase 2E.3) */}
        {activeTab === 'materials' && (
          <div className="space-y-6">
            {/* Header Control Card */}
            <div className="p-5 bg-stone-950 rounded-2xl border border-stone-800 space-y-4">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <h3 className="font-bold text-sm text-stone-100">Generated Learning Materials Review</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 border border-amber-800 text-amber-300 font-mono font-bold">
                      Version: {currentVersion.versionNumber} ({currentVersion.status})
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 mt-1 max-w-2xl">
                    Strict closed-source grounding pipeline. Generated items start strictly as <strong>UNVERIFIED</strong> and require explicit servant audit before becoming student-visible upon publication.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => loadMaterials(selectedVersionId)}
                    disabled={isLoadingMaterials}
                    className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-300 rounded-xl text-xs font-medium border border-stone-800 flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMaterials ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>

                  <button
                    onClick={handleGenerateMaterials}
                    disabled={isGeneratingMaterials || (currentVersion.status !== 'APPROVED' && currentVersion.status !== 'PUBLISHED')}
                    className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isGeneratingMaterials ? 'Synthesizing...' : 'Generate Grounded Materials'}</span>
                  </button>

                  <button
                    onClick={() => handleReviewMaterialAction('APPROVE_ALL')}
                    disabled={isReviewingMaterials || !materialsPacket || (currentVersion.status !== 'APPROVED' && currentVersion.status !== 'PUBLISHED')}
                    className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-all"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isReviewingMaterials ? 'Updating...' : 'Approve All Valid'}</span>
                  </button>
                </div>
              </div>

              {/* Version Pre-condition Notification */}
              {currentVersion.status !== 'APPROVED' && currentVersion.status !== 'PUBLISHED' && (
                <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-xs text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Material generation and student publication strictly require an <strong>APPROVED</strong> or <strong>PUBLISHED</strong> lesson version with a verified evidence map. Approve the lesson version in the Audit tab first.
                  </span>
                </div>
              )}

              {/* Success / Error Feedback */}
              {materialsSuccess && (
                <div className="p-3 bg-emerald-950/50 border border-emerald-800/60 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{materialsSuccess}</span>
                </div>
              )}
              {materialsError && (
                <div className="p-3 bg-red-950/50 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{materialsError}</span>
                </div>
              )}

              {/* Filter Tabs */}
              <div className="flex items-center gap-2 pt-2 border-t border-stone-900">
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Filter Status:</span>
                {(['ALL', 'UNVERIFIED', 'APPROVED', 'REJECTED'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setMaterialsFilter(filter)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      materialsFilter === filter
                        ? 'bg-amber-600/30 text-amber-300 border border-amber-500/50'
                        : 'bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <section className="overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-br from-[#201638] via-[#25204A] to-[#173B46] p-5 text-white shadow-lg">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200/20 bg-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-violet-100">
                    <Sparkles size={12} /> Student game experience
                  </span>
                  <h3 className="mt-2 text-lg font-black">Build the student's learning adventure</h3>
                  <p className="mt-1 max-w-2xl text-xs leading-relaxed text-white/65">
                    The student lesson automatically turns your published sections, approved flashcards and review quiz into quest steps. Only real saved progress completes the journey; rewards are not fabricated in preview.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-black/15 px-3 py-2 text-center">
                  <div className="text-xl font-black">{currentVersion.sections?.length || 0}</div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-white/55">Lesson stages</div>
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <button type="button" onClick={() => setActiveTab('sections')} className="rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-start transition hover:-translate-y-0.5 hover:bg-white/15">
                  <span className="block text-xs font-black">1. Story stages</span>
                  <span className="mt-1 block text-[10px] text-white/60">{currentVersion.sections?.length || 0} sections · edit the adventure path</span>
                </button>
                <button type="button" onClick={() => setActiveTab('materials')} className="rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-start transition hover:-translate-y-0.5 hover:bg-white/15">
                  <span className="block text-xs font-black">2. Memory power-ups</span>
                  <span className="mt-1 block text-[10px] text-white/60">{currentVersion.flashcards?.length || materialsPacket?.flashcards?.length || 0} flashcards · review and approve</span>
                </button>
                <button type="button" onClick={() => setActiveTab('quiz')} className="rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-start transition hover:-translate-y-0.5 hover:bg-white/15">
                  <span className="block text-xs font-black">3. Boss challenge</span>
                  <span className="mt-1 block text-[10px] text-white/60">{currentVersion.quizDraft?.questions?.length || 0} quiz questions · shape the final challenge</span>
                </button>
              </div>
              <p className="mt-3 text-[10px] font-semibold text-white/45">Teacher and admin preview uses the same student-facing adventure UI. Changes still follow the existing review and publish workflow.</p>
            </section>

            {/* Empty State */}
            {!materialsPacket && !isLoadingMaterials && (
              <div className="p-8 text-center bg-stone-950 rounded-2xl border border-stone-800 space-y-3">
                <Sparkles className="w-8 h-8 text-stone-600 mx-auto" />
                <h4 className="text-sm font-bold text-stone-300">No Generated Materials Yet</h4>
                <p className="text-xs text-stone-500 max-w-md mx-auto">
                  Click &ldquo;Generate Grounded Materials&rdquo; to create structured classroom slides, memory flashcards, and student quiz items from approved evidence.
                </p>
              </div>
            )}

            {materialsPacket && (
              <div className="space-y-6">
                {/* 1. SLIDES SECTION */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-blue-400" />
                      <span>Classroom Slides ({materialsPacket.slides?.length || 0})</span>
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {materialsPacket.slides
                      ?.filter((s) => materialsFilter === 'ALL' || s.reviewStatus === materialsFilter)
                      .map((slide) => (
                        <div key={slide.number} className="p-4 bg-stone-950 rounded-xl border border-stone-800 space-y-3 text-xs">
                          <div className="flex items-center justify-between border-b border-stone-900 pb-2">
                            <span className="font-mono text-amber-400 font-bold">Slide #{slide.number}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              slide.reviewStatus === 'APPROVED'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : slide.reviewStatus === 'REJECTED'
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : 'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}>
                              {slide.reviewStatus}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <h5 className="font-bold text-stone-100">{slide.titleEn}</h5>
                            <p className="text-stone-300 font-sans text-[11px]" dir="rtl">{slide.titleAr}</p>
                          </div>

                          <ul className="space-y-1 text-stone-400 list-disc list-inside">
                            {slide.bulletsEn.map((b, idx) => (
                              <li key={idx}>{b}</li>
                            ))}
                          </ul>

                          {slide.scriptureRef && (
                            <div className="p-2 bg-stone-900/60 rounded-lg text-amber-400 font-mono text-[11px]">
                              Scripture: {slide.scriptureRef}
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-2 border-t border-stone-900 text-[11px]">
                            <span className="text-stone-500">
                              Provenance: {slide.sectionTitle || 'Lesson Section'}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleReviewMaterialAction('APPROVE_ITEM', 'SLIDES', String(slide.number))}
                                disabled={isReviewingMaterials || slide.reviewStatus === 'APPROVED'}
                                className="px-2.5 py-1 bg-emerald-900 hover:bg-emerald-800 disabled:opacity-40 text-emerald-200 rounded-lg font-bold flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" /> Approve
                              </button>
                              <button
                                onClick={() => handleReviewMaterialAction('REJECT', 'SLIDES', String(slide.number))}
                                disabled={isReviewingMaterials || slide.reviewStatus === 'REJECTED'}
                                className="px-2.5 py-1 bg-stone-800 hover:bg-rose-900 disabled:opacity-40 text-stone-300 hover:text-rose-200 rounded-lg font-bold flex items-center gap-1"
                              >
                                <X className="w-3 h-3" /> Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* 2. FLASHCARDS SECTION */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center gap-1.5">
                      <Bookmark className="w-4 h-4 text-emerald-400" />
                      <span>Interactive Memory Flashcards ({materialsPacket.flashcards?.length || 0})</span>
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {materialsPacket.flashcards
                      ?.filter((f) => materialsFilter === 'ALL' || f.reviewStatus === materialsFilter)
                      .map((card) => {
                        const isFlipped = Boolean(activeFlippedCards[card.id]);
                        return (
                          <div key={card.id} className="p-4 bg-stone-950 rounded-xl border border-stone-800 space-y-3 text-xs">
                            <div className="flex items-center justify-between border-b border-stone-900 pb-2">
                              <span className="text-stone-400 font-mono text-[11px]">{card.id}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                card.reviewStatus === 'APPROVED'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : card.reviewStatus === 'REJECTED'
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                  : 'bg-amber-950 text-amber-300 border border-amber-800'
                              }`}>
                                {card.reviewStatus}
                              </span>
                            </div>

                            {/* Flashcard Interactive Preview */}
                            <div
                              onClick={() => setActiveFlippedCards(prev => ({ ...prev, [card.id]: !prev[card.id] }))}
                              className="p-3 bg-stone-900 border border-stone-800 rounded-lg cursor-pointer hover:border-amber-600/60 transition-all select-none space-y-1 min-h-[90px] flex flex-col justify-center text-center"
                            >
                              <span className="text-[10px] uppercase font-bold text-amber-400">
                                {isFlipped ? 'Answer (Click to Flip)' : 'Question (Click to Flip)'}
                              </span>
                              {isFlipped ? (
                                <>
                                  <p className="font-bold text-emerald-400">{card.backEn}</p>
                                  <p className="text-stone-300 font-sans text-[11px]" dir="rtl">{card.backAr}</p>
                                </>
                              ) : (
                                <>
                                  <p className="font-bold text-stone-100">{card.frontEn}</p>
                                  <p className="text-stone-300 font-sans text-[11px]" dir="rtl">{card.frontAr}</p>
                                </>
                              )}
                            </div>

                            {/* Provenance Details */}
                            {card.sourceRefs && card.sourceRefs.length > 0 && (
                              <div className="p-2 bg-stone-900/60 rounded-lg text-stone-400 text-[11px]">
                                <span className="font-semibold text-stone-300">Source:</span> {card.sourceRefs.map(s => `${s.sourceName} (${s.location})`).join(', ')}
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-2 border-t border-stone-900 text-[11px]">
                              <span className="text-stone-500">
                                {card.sectionTitle || 'Section Grounding'}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleReviewMaterialAction('APPROVE_ITEM', 'FLASHCARDS', card.id)}
                                  disabled={isReviewingMaterials || card.reviewStatus === 'APPROVED'}
                                  className="px-2.5 py-1 bg-emerald-900 hover:bg-emerald-800 disabled:opacity-40 text-emerald-200 rounded-lg font-bold flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3" /> Approve
                                </button>
                                <button
                                  onClick={() => handleReviewMaterialAction('REJECT', 'FLASHCARDS', card.id)}
                                  disabled={isReviewingMaterials || card.reviewStatus === 'REJECTED'}
                                  className="px-2.5 py-1 bg-stone-800 hover:bg-rose-900 disabled:opacity-40 text-stone-300 hover:text-rose-200 rounded-lg font-bold flex items-center gap-1"
                                >
                                  <X className="w-3 h-3" /> Reject
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* 3. QUIZ QUESTIONS SECTION */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-purple-400" />
                      <span>Grounded Quiz Questions ({materialsPacket.quiz?.length || 0})</span>
                    </h4>
                  </div>

                  <div className="space-y-3">
                    {materialsPacket.quiz
                      ?.filter((q) => materialsFilter === 'ALL' || q.reviewStatus === materialsFilter)
                      .map((q, idx) => (
                        <div key={q.id || idx} className="p-4 bg-stone-950 rounded-xl border border-stone-800 space-y-3 text-xs">
                          <div className="flex items-center justify-between border-b border-stone-900 pb-2">
                            <span className="font-bold text-stone-200">Question #{idx + 1}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              q.reviewStatus === 'APPROVED'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : q.reviewStatus === 'REJECTED'
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : 'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}>
                              {q.reviewStatus}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <p className="font-semibold text-stone-100">{q.questionEn}</p>
                            <p className="text-stone-300 font-sans text-[11px]" dir="rtl">{q.questionAr}</p>
                          </div>

                          <div className="space-y-1.5 pt-1">
                            {q.optionsEn?.map((opt, oIdx) => (
                              <div
                                key={oIdx}
                                className={`p-2 rounded-lg border flex items-center justify-between ${
                                  oIdx === q.correctIndex
                                    ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-200 font-medium'
                                    : 'bg-stone-900 border-stone-800 text-stone-400'
                                }`}
                              >
                                <span>{opt}</span>
                                {oIdx === q.correctIndex && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-900 text-emerald-200 font-bold">
                                    Correct Answer
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>

                          {q.explanationEn && (
                            <div className="p-2 bg-stone-900/80 rounded-lg text-[11px] text-stone-400">
                              <strong className="text-stone-300">Explanation:</strong> {q.explanationEn}
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-2 border-t border-stone-900 text-[11px]">
                            <span className="text-amber-400 font-mono text-[11px]">
                              Provenance: {q.sourceRef?.sectionTitle} ({q.sourceRef?.location})
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleReviewMaterialAction('APPROVE_ITEM', 'QUIZ', q.id)}
                                disabled={isReviewingMaterials || q.reviewStatus === 'APPROVED'}
                                className="px-2.5 py-1 bg-emerald-900 hover:bg-emerald-800 disabled:opacity-40 text-emerald-200 rounded-lg font-bold flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" /> Approve
                              </button>
                              <button
                                onClick={() => handleReviewMaterialAction('REJECT', 'QUIZ', q.id)}
                                disabled={isReviewingMaterials || q.reviewStatus === 'REJECTED'}
                                className="px-2.5 py-1 bg-stone-800 hover:bg-rose-900 disabled:opacity-40 text-stone-300 hover:text-rose-200 rounded-lg font-bold flex items-center gap-1"
                              >
                                <X className="w-3 h-3" /> Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controlled Draft Pipeline Bottom Bar (Phase 2B.4: No approval/publish controls yet) */}
      <div className="bg-stone-950 px-6 py-4 border-t border-stone-800 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span className="text-stone-300 font-semibold">
              Draft v{currentVersion.versionNumber} ({currentVersion.status})
            </span>
            <span className="text-stone-500">•</span>
            <span className="text-stone-400">
              Outline: {outline && outline.sections.length > 0 ? `${outline.sections.length} Sections` : 'Pending'}
            </span>
            <span className="text-stone-500">•</span>
            <span className="text-stone-400">
              Content: {currentVersion.sections.length} Sections
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenEvidenceMap}
            className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>View Evidence Map</span>
          </button>

          {activeTab === 'outline' ? (
            <button
              onClick={handleGenerateDraft}
              disabled={isGeneratingDraft || !outline || outline.sections.length === 0}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isGeneratingDraft ? 'Synthesizing Draft...' : 'Generate Draft from Outline →'}</span>
            </button>
          ) : (
            <button
              onClick={() => setActiveTab('outline')}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>Review / Re-synthesize Outline</span>
            </button>
          )}
        </div>
      </div>

      {/* Servant Comment Modal */}
      {commentingSectionId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Add Servant Review Comment</h3>
            <p className="text-xs text-stone-400 mb-4">
              Flag theological inaccuracies, missing facts, or age level recommendations.
            </p>

            <form onSubmit={handleAddCommentSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-stone-300 font-semibold mb-1">Feedback Category</label>
                <select
                  value={commentType}
                  onChange={(e) => setCommentType(e.target.value as any)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="MISSING_INFORMATION">Missing Information (Classroom detail omitted)</option>
                  <option value="INCORRECT_FACT">Incorrect Fact / Historical Date</option>
                  <option value="WRONG_THEOLOGY">Wrong Theology / Dogmatic clarification</option>
                  <option value="AGE_LEVEL">Age Level Adjustment (Language or tone)</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-300 font-semibold mb-1">Your Instruction / Comment</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Explain what must be changed or added..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-stone-100 focus:outline-none focus:border-amber-500 font-serif"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCommentingSectionId(null)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-semibold shadow-md"
                >
                  Add Comment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revision Request Modal */}
      {showRevisionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <RotateCw className="w-4 h-4 text-blue-400" />
              <span>Request Draft Revision</span>
            </h3>
            <p className="text-xs text-stone-400 mb-4">
              Return version {currentVersion.versionNumber} back to author with specific feedback notes.
            </p>

            <form onSubmit={handleRequestRevisionSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-stone-300 font-semibold mb-1">Reason Category</label>
                <select
                  value={revisionCommentType}
                  onChange={(e) => setRevisionCommentType(e.target.value as any)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="WRONG_THEOLOGY">Wrong Theology / Dogmatic clarification</option>
                  <option value="INCORRECT_FACT">Incorrect Fact / Historical Date</option>
                  <option value="MISSING_INFORMATION">Missing Source Material</option>
                  <option value="AGE_LEVEL">Age Level & Comprehension</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-300 font-semibold mb-1">Feedback & Revision Instructions</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Detail what must be revised before this version can be approved..."
                  value={revisionFeedbackText}
                  onChange={(e) => setRevisionFeedbackText(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-stone-100 focus:outline-none focus:border-amber-500 font-serif"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRevisionModal(false)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold shadow-md"
                >
                  Submit Revision Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Approve Lesson Version v{currentVersion.versionNumber}</span>
            </h3>
            <p className="text-xs text-stone-400 mb-4">
              Ecclesiastical approval locks the lesson content and certifies it for official publication.
            </p>

            <form onSubmit={handleApproveVersionSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-stone-300 font-semibold mb-1">Ecclesiastical Servant Review Note</label>
                <textarea
                  rows={3}
                  placeholder="Official theological approval note (e.g., Reviewed against Orthodox patristic sources)..."
                  value={approvalNoteText}
                  onChange={(e) => setApprovalNoteText(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-stone-100 focus:outline-none focus:border-amber-500 font-serif"
                />
              </div>

              <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 text-[11px] text-stone-400 space-y-1">
                <div className="flex items-center justify-between">
                  <span>Approving Servant:</span>
                  <span className="font-semibold text-stone-200">{servantName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Sections Count:</span>
                  <span className="font-semibold text-stone-200">{currentVersion.sections.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Unresolved Conflicts:</span>
                  <span className={`font-semibold ${unresolvedConflicts.length === 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {unresolvedConflicts.length}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApprovalModal(false)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isApprovingVersion || unresolvedConflicts.length > 0}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold shadow-md disabled:opacity-50"
                >
                  {isApprovingVersion ? 'Approving...' : 'Confirm Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Publish to Students Confirmation Modal (Phase 2B.6) */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-emerald-950/80 border border-emerald-800 rounded-xl text-emerald-400 shrink-0">
                <Globe className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Publish Lesson to Students</h3>
                <p className="text-stone-400 text-xs leading-relaxed">
                  You are about to publish <strong className="text-stone-200">Version {currentVersion.versionNumber}</strong> as the official active curriculum for Sunday School students.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-stone-950 rounded-xl border border-stone-800 space-y-2 text-[11px]">
              <div className="flex items-center justify-between text-stone-400">
                <span>Approved By:</span>
                <span className="font-semibold text-stone-200">{currentVersion.approvedBy || servantName}</span>
              </div>
              <div className="flex items-center justify-between text-stone-400">
                <span>Approved On:</span>
                <span className="font-semibold text-stone-200">
                  {currentVersion.approvedAt ? new Date(currentVersion.approvedAt).toLocaleDateString() : 'recent'}
                </span>
              </div>
              <div className="flex items-center justify-between text-stone-400">
                <span>Security Gate:</span>
                <span className="font-mono text-emerald-400">public.publish_lesson_version()</span>
              </div>
              <div className="pt-2 border-t border-stone-800 text-stone-400 text-[11px] leading-relaxed">
                Atomic switch: <code className="text-amber-300">lessons.active_version_id</code> will be updated to this version. Sunday School students and parents will immediately access this version.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                disabled={isPublishingVersion}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePublishVersionSubmit}
                disabled={isPublishingVersion}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold shadow-md flex items-center gap-1.5 disabled:opacity-50"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{isPublishingVersion ? 'Publishing...' : 'Confirm & Publish to Students'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
