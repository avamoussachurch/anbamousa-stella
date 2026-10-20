import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Lesson, 
  QuizQuestion,
  ClassSession,
  LessonSource,
  EvidenceMap,
  LessonOutline,
  LessonVersion,
  ServantComment,
  StudentContentProgress,
  StudentQuizAttempt,
  StudentMastery,
  MasteryStatus,
  SearchAuditLog
} from '../types';
import { 
  mockLessons, 
  mockClassSessions, 
  mockSources, 
  mockEvidenceMaps, 
  mockLessonOutlines, 
  mockLessonVersions, 
  mockServantComments, 
  mockStudentContentProgress, 
  mockStudentQuizAttempts, 
  mockStudentMastery 
} from '../data';
import { useAuth } from './AuthContext';
import { 
  getPublishedLessonsForCurrentUser, 
  getTeacherLessonVersions,
  getLessonSourcesForLesson
} from '../lib/curriculumService';
import { 
  getTeacherCurriculumLessons, 
  updateLessonDraft, 
  updateLessonSection 
} from '../lib/lessonAuthoringService';
import { 
  addLessonSource, 
  removeLessonSource, 
  updateLessonSource 
} from '../lib/lessonSourceService';
import { 
  saveEvidenceMap as saveEvidenceMapService, 
  getEvidenceMap 
} from '../lib/evidenceMapService';
import { 
  saveLessonOutline as saveLessonOutlineService, 
  getLessonOutline, 
  saveLessonDraft as saveLessonDraftService 
} from '../lib/lessonGenerationService';
import {
  submitVersionForReview as submitVersionForReviewService,
  requestRevision as requestRevisionService,
  approveLessonVersion as approveLessonVersionService
} from '../lib/lessonReviewService';
import {
  publishLessonVersion as publishLessonVersionService
} from '../lib/lessonPublishingService';
import {
  updateClaimVerification as updateClaimVerificationService,
  resolveSourceConflict as resolveSourceConflictService
} from '../lib/evidenceMapService';
import { getStudentProgressSummary } from '../lib/studentProgressService';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

interface LessonsContextType {
  // Class Sessions
  classSessions: ClassSession[];
  activeClassSessionId: string;
  setActiveClassSessionId: (id: string) => void;
  createClassSession: (data: Partial<ClassSession>) => ClassSession;
  updateClassSession: (id: string, updates: Partial<ClassSession>) => void;
  
  // Lessons
  lessons: Lesson[];
  addLesson: (lesson: Omit<Lesson, 'id'> & { id?: string }) => Lesson;
  updateLesson: (id: string, updates: Partial<Lesson>) => void;
  deleteLesson: (id: string) => void;
  togglePublish: (id: string) => void;
  markCompleted: (id: string) => void;
  publishLesson: (id: string) => void;

  // Sources
  sources: LessonSource[];
  addSource: (source: Omit<LessonSource, 'id' | 'createdAt'>) => LessonSource;
  updateSource: (id: string, updates: Partial<LessonSource>) => void;
  deleteSource: (id: string) => void;
  getLessonSources: (lessonId: string) => LessonSource[];

  // Evidence Maps
  evidenceMaps: Record<string, EvidenceMap>;
  saveEvidenceMap: (lessonId: string, map: EvidenceMap) => void;

  // Outlines
  outlines: Record<string, LessonOutline>;
  saveOutline: (lessonId: string, outline: LessonOutline) => void;
  approveOutline: (lessonId: string) => void;

  // Versions
  lessonVersions: Record<string, LessonVersion[]>;
  saveLessonVersion: (lessonId: string, version: LessonVersion) => void;
  submitVersionForReview: (lessonId: string, versionId: string, notes?: string) => Promise<void>;
  requestVersionRevision: (lessonId: string, versionId: string, feedback: string) => Promise<void>;
  approveLessonVersion: (lessonId: string, versionId: string, approvedBy: string, approvalNote?: string) => void;
  updateSectionInVersion: (lessonId: string, versionId: string, updatedSection: any) => void;
  updateClaimVerification: (lessonId: string, claimId: string, isVerified: boolean, reviewStatus?: any, note?: string) => Promise<void>;
  resolveSourceConflict: (lessonId: string, conflictId: string, resolutionNote: string) => Promise<void>;

  // Servant Comments
  servantComments: Record<string, ServantComment[]>;
  addServantComment: (comment: Omit<ServantComment, 'id' | 'createdAt'>) => ServantComment;
  resolveServantComment: (versionId: string, commentId: string, note: string) => void;

  // Student Content Progress (SEPARATE FROM QUIZ)
  contentProgress: Record<string, StudentContentProgress>;
  markSectionRead: (studentId: string, lessonId: string, sectionId: string, totalSections: number) => void;
  completeLessonContent: (studentId: string, lessonId: string) => void;
  getStudentContentProgress: (studentId: string, lessonId: string) => StudentContentProgress | undefined;

  // Student Quizzes (SEPARATE FROM LESSON CONTENT)
  quizAttempts: Record<string, StudentQuizAttempt[]>;
  recordQuizAttempt: (attempt: Omit<StudentQuizAttempt, 'id' | 'submittedAt'>) => StudentQuizAttempt;
  getStudentQuizAttempts: (studentId: string, lessonId: string) => StudentQuizAttempt[];

  // Teacher Mastery Evaluations (SEPARATE FROM QUIZ SCORE)
  masteries: Record<string, StudentMastery>;
  setStudentMastery: (studentId: string, lessonId: string, status: MasteryStatus, evaluatedBy: string, teacherNotes?: string) => void;
  getStudentMastery: (studentId: string, lessonId: string) => StudentMastery | undefined;

  // Search Audit Logs
  searchAuditLogs: SearchAuditLog[];
  addSearchAuditLog: (log: SearchAuditLog) => void;

  // Aliases & Convenience Helpers
  lessonSources: LessonSource[];
  lessonOutlines: Record<string, LessonOutline>;
  studentProgress: Record<string, StudentContentProgress>;
  studentMasteries: Record<string, StudentMastery>;
  addClassSession: (data: Partial<ClassSession>) => ClassSession;
  addLessonSource: (source: Omit<LessonSource, 'id' | 'createdAt'>) => LessonSource;
  deleteLessonSource: (id: string) => void;
  saveLessonOutline: (lessonId: string, outline: LessonOutline) => void;
  approveLessonOutline: (lessonId: string) => void;
  publishLessonVersion: (lessonId: string, versionId: string) => Promise<{ success: boolean; error?: string }> | void;
  updateStudentContentProgress: (studentId: string, lessonId: string, sections: string[], pct: number) => void;
  updateStudentMastery: (studentId: string, lessonId: string, status: MasteryStatus, notes?: string) => void;

  // Normalized Curriculum Online Status
  curriculumLoading?: boolean;
  curriculumError?: string | null;
  refreshCurriculum?: () => Promise<void>;
  refreshProgressSummary?: () => Promise<void>;

  // Global Reset
  resetToDefault: () => void;
}

const LessonsContext = createContext<LessonsContextType | undefined>(undefined);

const PREFIX = 'coptic_ss_v3_';

export function LessonsProvider({ children }: { children: React.ReactNode }) {
  // 1. Class Sessions
  const [classSessions, setClassSessions] = useState<ClassSession[]>(() => {
    try {
      const stored = localStorage.getItem(PREFIX + 'classSessions');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Error reading classSessions', e);
    }
    return mockClassSessions;
  });

  const [activeClassSessionId, setActiveClassSessionId] = useState<string>(() => {
    return mockClassSessions[0]?.id || '';
  });

  // 2. Lessons
  const [lessons, setLessons] = useState<Lesson[]>(() => {
    try {
      const stored = localStorage.getItem(PREFIX + 'lessons');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Error reading lessons', e);
    }
    return mockLessons;
  });

  // 3. Sources
  const [sources, setSources] = useState<LessonSource[]>(() => {
    try {
      const stored = localStorage.getItem(PREFIX + 'sources');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Error reading sources', e);
    }
    return mockSources;
  });

  // 4. Evidence Maps
  const [evidenceMaps, setEvidenceMaps] = useState<Record<string, EvidenceMap>>(() => {
    try {
      const stored = localStorage.getItem(PREFIX + 'evidenceMaps');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Error reading evidenceMaps', e);
    }
    return mockEvidenceMaps;
  });

  // 5. Outlines
  const [outlines, setOutlines] = useState<Record<string, LessonOutline>>(() => {
    try {
      const stored = localStorage.getItem(PREFIX + 'outlines');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Error reading outlines', e);
    }
    return mockLessonOutlines;
  });

  // 6. Lesson Versions
  const [lessonVersions, setLessonVersions] = useState<Record<string, LessonVersion[]>>(() => {
    try {
      const stored = localStorage.getItem(PREFIX + 'lessonVersions');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Error reading lessonVersions', e);
    }
    return mockLessonVersions;
  });

  // 7. Servant Comments
  const [servantComments, setServantComments] = useState<Record<string, ServantComment[]>>(() => {
    try {
      const stored = localStorage.getItem(PREFIX + 'servantComments');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Error reading servantComments', e);
    }
    return mockServantComments;
  });

  // 8. Student Content Progress
  const [contentProgress, setContentProgress] = useState<Record<string, StudentContentProgress>>(() => {
    try {
      const stored = localStorage.getItem(PREFIX + 'contentProgress');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Error reading contentProgress', e);
    }
    return mockStudentContentProgress;
  });

  // 9. Student Quiz Attempts
  const [quizAttempts, setQuizAttempts] = useState<Record<string, StudentQuizAttempt[]>>(() => {
    try {
      const stored = localStorage.getItem(PREFIX + 'quizAttempts');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Error reading quizAttempts', e);
    }
    return mockStudentQuizAttempts;
  });

  // 10. Student Masteries
  const [masteries, setMasteries] = useState<Record<string, StudentMastery>>(() => {
    try {
      const stored = localStorage.getItem(PREFIX + 'masteries');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Error reading masteries', e);
    }
    return mockStudentMastery;
  });

  // 11. Search Audit Logs
  const [searchAuditLogs, setSearchAuditLogs] = useState<SearchAuditLog[]>([]);

  // 12. Online Normalized Curriculum State
  const { userData, isGuest, setUserDirectly } = useAuth();
  const [curriculumLoading, setCurriculumLoading] = useState<boolean>(false);
  const [curriculumError, setCurriculumError] = useState<string | null>(null);

  const loadOnlineCurriculum = React.useCallback(async () => {
    // Only attempt online fetch if user is authenticated and not in guest/demo mode
    if (isGuest || !userData || !isSupabaseConfigured || !supabase) {
      return;
    }

    setCurriculumLoading(true);
    setCurriculumError(null);

    try {
      const isTeacher = userData.role === 'teacher' || userData.role === 'admin';
      const result = isTeacher 
        ? await getTeacherCurriculumLessons()
        : await getPublishedLessonsForCurrentUser();

      if (result.error) {
        console.error('Online curriculum load error from Supabase:', result.error);
        setCurriculumError(result.error.message);
        setCurriculumLoading(false);
        // Do NOT silently fall back to mock curriculum data for authenticated online users!
        return;
      }

      let onlineLessons = result.data || [];

      // Authoritative Progress Synchronization:
      // Fetch authoritative student progress summary from server to survive refreshes & cross-device sessions
      try {
        const summaryData = await getStudentProgressSummary(userData.id);
        if (summaryData?.completedLessonIds) {
          const completedSet = new Set(summaryData.completedLessonIds);
          onlineLessons = onlineLessons.map(l => ({
            ...l,
            isCompleted: completedSet.has(l.id)
          }));
        }
        if (summaryData?.allProgress) {
          setContentProgress(prev => {
            const next = { ...prev };
            for (const [lessonId, p] of Object.entries(summaryData.allProgress)) {
              next[`${userData.id}_${lessonId}`] = p as any;
            }
            return next;
          });
        }
      } catch (sumErr) {
        console.warn('Note on summary load in LessonsContext:', sumErr);
      }

      setLessons(onlineLessons);

      // Hydrate version map and sources from normalized database
      const newVersionMap: Record<string, LessonVersion[]> = {};
      const newSourcesList: LessonSource[] = [];

      for (const l of onlineLessons) {
        if (isTeacher) {
          const versionsResult = await getTeacherLessonVersions(l.id);
          if (versionsResult.data && versionsResult.data.length > 0) {
            newVersionMap[l.id] = versionsResult.data;
          } else if (l.latestVersion) {
            newVersionMap[l.id] = [l.latestVersion];
          }
        } else if (l.latestVersion) {
          // For students/parents: strictly the authoritative active version
          newVersionMap[l.id] = [l.latestVersion];
        }

        const srcResult = await getLessonSourcesForLesson(l.id);
        if (srcResult.data) {
          newSourcesList.push(...srcResult.data);
        }

        if (isTeacher) {
          const eMapRes = await getEvidenceMap(l.id);
          if (eMapRes.data) {
            setEvidenceMaps(prev => ({
              ...prev,
              [l.id]: eMapRes.data!
            }));
          }
          const outRes = await getLessonOutline(l.id);
          if (outRes.data) {
            setOutlines(prev => ({
              ...prev,
              [l.id]: outRes.data!
            }));
          }
        }
      }

      setLessonVersions((prev) => ({
        ...prev,
        ...newVersionMap,
      }));

      if (newSourcesList.length > 0) {
        setSources((prev) => {
          const existingIds = new Set(newSourcesList.map((s) => s.id));
          return [...newSourcesList, ...prev.filter((s) => !existingIds.has(s.id))];
        });
      }
    } catch (e: any) {
      console.error('Failed to load online curriculum:', e);
      setCurriculumError(e?.message || 'Failed to load online curriculum');
    } finally {
      setCurriculumLoading(false);
    }
  }, [userData?.id, userData?.role, isGuest]);

  useEffect(() => {
    loadOnlineCurriculum();
  }, [loadOnlineCurriculum]);

  // Authoritative progress summary sync for student across reloads & sessions
  useEffect(() => {
    if (userData?.id) {
      getStudentProgressSummary(userData.id).then(summaryData => {
        if (summaryData?.completedLessonIds) {
          const completedSet = new Set(summaryData.completedLessonIds);
          setLessons(prev => prev.map(l => ({
            ...l,
            isCompleted: completedSet.has(l.id)
          })));
        }
        if (summaryData?.allProgress) {
          setContentProgress(prev => {
            const next = { ...prev };
            for (const [lessonId, p] of Object.entries(summaryData.allProgress)) {
              next[`${userData.id}_${lessonId}`] = p as any;
            }
            return next;
          });
        }
        if (summaryData?.streak && setUserDirectly) {
          const serverStreak = summaryData.streak.currentStreak ?? 0;
          const serverPoints = summaryData.points ?? userData.points;
          if (userData.currentStreak !== serverStreak || userData.points !== serverPoints) {
            setUserDirectly({
              ...userData,
              currentStreak: serverStreak,
              longestStreak: summaryData.streak.longestStreak ?? userData.longestStreak,
              points: serverPoints
            });
          }
        }
      }).catch(err => {
        console.warn('Note on initial progress summary sync:', err);
      });
    }
  }, [userData?.id]);

  // LocalStorage sync
  useEffect(() => {
    try {
      localStorage.setItem(PREFIX + 'classSessions', JSON.stringify(classSessions));
      localStorage.setItem(PREFIX + 'lessons', JSON.stringify(lessons));
      localStorage.setItem(PREFIX + 'sources', JSON.stringify(sources));
      localStorage.setItem(PREFIX + 'evidenceMaps', JSON.stringify(evidenceMaps));
      localStorage.setItem(PREFIX + 'outlines', JSON.stringify(outlines));
      localStorage.setItem(PREFIX + 'lessonVersions', JSON.stringify(lessonVersions));
      localStorage.setItem(PREFIX + 'servantComments', JSON.stringify(servantComments));
      localStorage.setItem(PREFIX + 'contentProgress', JSON.stringify(contentProgress));
      localStorage.setItem(PREFIX + 'quizAttempts', JSON.stringify(quizAttempts));
      localStorage.setItem(PREFIX + 'masteries', JSON.stringify(masteries));
    } catch (e) {
      console.warn('Could not save to localStorage', e);
    }
  }, [classSessions, lessons, sources, evidenceMaps, outlines, lessonVersions, servantComments, contentProgress, quizAttempts, masteries]);

  // Class Session Helpers
  const createClassSession = (data: Partial<ClassSession>): ClassSession => {
    const newSession: ClassSession = {
      id: `cs-${Date.now()}`,
      classId: data.classId || 'grade-4-st-musa',
      teacherId: data.teacherId || 't-mina-1',
      teacherName: data.teacherName || 'Servant Mina',
      title: data.title || 'Untitled Sunday School Session',
      topic: data.topic || 'Spiritual Lesson',
      description: data.description || '',
      date: data.date || new Date().toISOString().split('T')[0],
      ageGroup: data.ageGroup || '9-11 Years (Grades 4-5)',
      grade: data.grade || '4th Grade',
      status: data.status || 'DRAFT',
      allowInternetSearch: data.allowInternetSearch ?? false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setClassSessions(prev => [newSession, ...prev]);
    setActiveClassSessionId(newSession.id);
    return newSession;
  };

  const updateClassSession = (id: string, updates: Partial<ClassSession>) => {
    setClassSessions(prev => prev.map(cs => cs.id === id ? { ...cs, ...updates, updatedAt: new Date().toISOString() } : cs));
  };

  // Lesson Helpers
  const addLesson = (newLessonData: Omit<Lesson, 'id'> & { id?: string }): Lesson => {
    const newLesson: Lesson = {
      ...newLessonData,
      id: newLessonData.id || `l-${Date.now()}`,
      status: newLessonData.status || 'published',
      pointsAvailable: newLessonData.pointsAvailable || 150,
      isCompleted: false,
    };
    setLessons(prev => [newLesson, ...prev]);
    return newLesson;
  };

  const updateLesson = (id: string, updates: Partial<Lesson>) => {
    setLessons(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const deleteLesson = (id: string) => {
    setLessons(prev => prev.filter(l => l.id !== id));
  };

  const isOnlineAuth = !isGuest && Boolean(userData) && isSupabaseConfigured;

  const togglePublish = (id: string) => {
    if (isOnlineAuth) {
      console.warn('Publication protection: direct publishing is prohibited for online curriculum');
      return;
    }
    setLessons(prev => prev.map(l => l.id === id ? { ...l, status: l.status === 'published' ? 'draft' : 'published' } : l));
  };

  const publishLesson = (id: string) => {
    if (isOnlineAuth) {
      console.warn('Publication protection: direct publishing is prohibited for online curriculum');
      return;
    }
    setLessons(prev => prev.map(l => l.id === id ? { ...l, status: 'published' } : l));
    // Also update associated class session status
    setClassSessions(prev => prev.map(cs => cs.activeLessonId === id ? { ...cs, status: 'PUBLISHED' } : cs));
  };

  const markCompleted = (id: string) => {
    setLessons(prev => prev.map(l => l.id === id ? { ...l, isCompleted: true } : l));
  };

  // Source Helpers
  const addSource = (sourceData: Omit<LessonSource, 'id' | 'createdAt'>): LessonSource => {
    const tempId = `src-${Date.now()}`;
    const newSource: LessonSource = {
      ...sourceData,
      id: tempId,
      createdAt: new Date().toISOString()
    };
    setSources(prev => [...prev, newSource]);

    if (isOnlineAuth && sourceData.lessonId) {
      addLessonSource({
        lessonId: sourceData.lessonId,
        sessionId: sourceData.sessionId,
        type: sourceData.type,
        originalFilename: sourceData.originalFilename,
        mimeType: sourceData.mimeType,
        fileUrl: sourceData.fileUrl,
        fileSize: sourceData.fileSize,
        description: sourceData.description,
        teacherNotes: sourceData.teacherNotes,
        rightsStatus: sourceData.rightsStatus,
        processingStatus: sourceData.processingStatus,
        priority: sourceData.priority,
        transcript: sourceData.transcript,
        extractedContent: sourceData.extractedContent,
        pageCount: sourceData.pageCount,
        slideCount: sourceData.slideCount,
        durationSeconds: sourceData.durationSeconds,
        youtubeId: sourceData.youtubeId
      }).then((res) => {
        if (res.data) {
          setSources(prev => prev.map(s => s.id === tempId ? res.data! : s));
        } else if (res.error) {
          console.warn('Note on online source persistence:', res.error.message);
        }
      }).catch(err => {
        console.warn('Error persisting online source:', err);
      });
    }

    return newSource;
  };

  const updateSource = (id: string, updates: Partial<LessonSource>) => {
    setSources(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    if (isOnlineAuth) {
      updateLessonSource(id, updates as any).catch(err => {
        console.warn('Note on online source update:', err);
      });
    }
  };

  const deleteSource = (id: string) => {
    setSources(prev => prev.filter(s => s.id !== id));
    if (isOnlineAuth) {
      removeLessonSource(id).catch(err => {
        console.warn('Note on online source removal:', err);
      });
    }
  };

  const getLessonSources = (lessonId: string) => {
    return sources.filter(s => s.lessonId === lessonId);
  };

  // Evidence Map Helpers
  const saveEvidenceMap = (lessonId: string, map: EvidenceMap) => {
    setEvidenceMaps(prev => ({ ...prev, [lessonId]: map }));
    if (isOnlineAuth) {
      saveEvidenceMapService({
        lessonId,
        versionId: map.lessonVersionId,
        evidenceMap: map
      }).then(res => {
        if (res.data) {
          setEvidenceMaps(prev => ({ ...prev, [lessonId]: res.data! }));
        } else if (res.error) {
          console.warn('Note on online evidence map persistence:', res.error.message);
        }
      }).catch(err => {
        console.warn('Error persisting online evidence map:', err);
      });
    }
  };

  // Outline Helpers
  const saveOutline = (lessonId: string, outline: LessonOutline) => {
    setOutlines(prev => ({ ...prev, [lessonId]: outline }));
    if (isOnlineAuth && outline.draftVersionId) {
      saveLessonOutlineService({
        lessonId,
        draftVersionId: outline.draftVersionId,
        outline
      }).catch(err => {
        console.warn('Note on online outline persistence:', err);
      });
    }
  };

  const approveOutline = (lessonId: string) => {
    setOutlines(prev => {
      const existing = prev[lessonId];
      if (!existing) return prev;
      const updated = {
        ...existing,
        isApprovedByTeacher: true,
        approvedAt: new Date().toISOString()
      };
      if (isOnlineAuth && updated.draftVersionId) {
        saveLessonOutlineService({
          lessonId,
          draftVersionId: updated.draftVersionId,
          outline: updated
        }).catch(err => {
          console.warn('Note on online outline approval persistence:', err);
        });
      }
      return {
        ...prev,
        [lessonId]: updated
      };
    });
  };

  // Version Helpers
  const saveLessonVersion = (lessonId: string, version: LessonVersion) => {
    setLessonVersions(prev => {
       const existing = prev[lessonId] || [];
       const index = existing.findIndex(v => v.id === version.id);
       if (index >= 0) {
         const copy = [...existing];
         copy[index] = version;
         return { ...prev, [lessonId]: copy };
       }
       return { ...prev, [lessonId]: [...existing, version] };
     });

    if (isOnlineAuth) {
      saveLessonDraftService({
        lessonId,
        draftVersionId: version.id,
        version
      }).catch(err => {
        console.warn('Note on online lesson draft persistence:', err);
      });
      updateLessonDraft(lessonId, {
        versionId: version.id,
        summaryEn: version.summaryEn,
        summaryAr: version.summaryAr,
        summaryCop: version.summaryCop,
        bigIdeaEn: version.bigIdeaEn,
        bigIdeaAr: version.bigIdeaAr,
        objectivesEn: version.objectivesEn,
        objectivesAr: version.objectivesAr,
        recapEn: version.recapEn,
        recapAr: version.recapAr,
        narrationScriptEn: version.narrationScriptEn,
        narrationScriptAr: version.narrationScriptAr,
        quizDraft: version.quizDraft,
        slides: version.slides,
        flashcards: version.flashcards,
        sections: version.sections?.map(s => ({
          id: s.id,
          titleEn: s.titleEn,
          titleAr: s.titleAr,
          titleCop: s.titleCop,
          contentEn: s.contentEn,
          contentAr: s.contentAr,
          contentCop: s.contentCop,
          order: s.order,
          teacherNotes: s.teacherNotes
        }))
      }).catch(err => console.warn('Note on online draft version sync:', err));
    }

     // Also update the lesson object with latest version reference
     updateLesson(lessonId, {
       currentVersionId: version.id,
       latestVersion: version,
       versionsCount: (lessonVersions[lessonId]?.length || 0) + 1
     });
   };

   const submitVersionForReview = async (lessonId: string, versionId: string, notes?: string) => {
     setLessonVersions(prev => {
       const existing = prev[lessonId] || [];
       const updated = existing.map(v => {
         if (v.id === versionId) {
           return {
             ...v,
             status: 'SERVANT_REVIEW' as const,
             changeReason: notes || 'Submitted for servant review'
           };
         }
         return v;
       });
       return { ...prev, [lessonId]: updated };
     });

     if (isOnlineAuth) {
       await submitVersionForReviewService({
         lessonId,
         versionId,
         notes
       }).catch(err => console.warn('Online submit for review sync note:', err));
     }
   };

   const requestVersionRevision = async (lessonId: string, versionId: string, feedback: string) => {
     setLessonVersions(prev => {
       const existing = prev[lessonId] || [];
       const updated = existing.map(v => {
         if (v.id === versionId) {
           return {
             ...v,
             status: 'REVISION_REQUESTED' as const,
             changeReason: feedback
           };
         }
         return v;
       });
       return { ...prev, [lessonId]: updated };
     });

     if (isOnlineAuth) {
       await requestRevisionService({
         lessonId,
         versionId,
         feedbackComment: feedback
       }).catch(err => console.warn('Online request revision sync note:', err));
     }
   };

   const approveLessonVersion = (lessonId: string, versionId: string, approvedBy: string, approvalNote?: string) => {
     setLessonVersions(prev => {
       const existing = prev[lessonId] || [];
       const updated = existing.map(v => {
         if (v.id === versionId) {
           return {
             ...v,
             status: 'APPROVED' as const,
             approvedBy,
             approvedAt: new Date().toISOString(),
             approvalNote: approvalNote || 'Approved by servant.'
           };
         }
         return v;
       });
       return { ...prev, [lessonId]: updated };
     });

     // Update lesson metadata
     updateLesson(lessonId, {
       approvedServantName: approvedBy,
       approvedAt: new Date().toISOString()
     });

     // Update class session
     setClassSessions(prev => prev.map(cs => cs.activeLessonId === lessonId ? { ...cs, status: 'APPROVED' } : cs));

     if (isOnlineAuth) {
       approveLessonVersionService({
         lessonId,
         versionId,
         approvalNote,
         servantName: approvedBy
       }).catch(err => console.warn('Online approve version sync note:', err));
     }
   };

   const publishLessonVersion = async (
     lessonId: string,
     versionId: string
   ): Promise<{ success: boolean; error?: string }> => {
     // UX Pre-check against local state
     const existing = lessonVersions[lessonId] || [];
     const targetVersion = existing.find(v => v.id === versionId);

     if (targetVersion && targetVersion.status !== 'APPROVED') {
       const errMsg = `Cannot publish: Version status is "${targetVersion.status}". Version must be APPROVED before publication.`;
       console.warn(errMsg);
       return { success: false, error: errMsg };
     }

     if (isOnlineAuth) {
       try {
         const res = await publishLessonVersionService(lessonId, versionId);
         if (res.error) {
           console.error('Publish RPC rejected:', res.error);
           return { success: false, error: res.error.message };
         }

         // Authoritative refresh of curriculum and versions
         await loadOnlineCurriculum();

         // Confirmed state update
         setLessonVersions(prev => {
           const list = prev[lessonId] || [];
           const updated = list.map(v => {
             if (v.id === versionId) {
               return {
                 ...v,
                 status: 'PUBLISHED' as const,
                 publishedAt: res.data?.publishedAt || new Date().toISOString()
               };
             }
             return v;
           });
           return { ...prev, [lessonId]: updated };
         });

         updateLesson(lessonId, {
           currentVersionId: versionId,
           status: 'published'
         });

         setClassSessions(prev =>
           prev.map(cs => (cs.activeLessonId === lessonId ? { ...cs, status: 'PUBLISHED' } : cs))
         );

         return { success: true };
       } catch (err: any) {
         console.error('Failed to publish lesson version:', err);
         return { success: false, error: err?.message || 'Publication failed' };
       }
     } else {
       // Demo / Guest / Offline mode
       setLessonVersions(prev => {
         const list = prev[lessonId] || [];
         const updated = list.map(v => {
           if (v.id === versionId) {
             return {
               ...v,
               status: 'PUBLISHED' as const,
               publishedAt: new Date().toISOString()
             };
           }
           return v;
         });
         return { ...prev, [lessonId]: updated };
       });

       updateLesson(lessonId, {
         currentVersionId: versionId,
         status: 'published'
       });

       setClassSessions(prev =>
         prev.map(cs => (cs.activeLessonId === lessonId ? { ...cs, status: 'PUBLISHED' } : cs))
       );

       return { success: true };
     }
   };

   const updateClaimVerification = async (
     lessonId: string,
     claimId: string,
     isVerified: boolean,
     reviewStatus?: any,
     note?: string
   ) => {
     setEvidenceMaps(prev => {
       const eMap = prev[lessonId];
       if (!eMap) return prev;
       const updatedClaims = (eMap.importantClaims || []).map(c => {
         if (c.claimId === claimId) {
           return {
             ...c,
             verified: isVerified,
             servantReviewStatus: reviewStatus || (isVerified ? 'APPROVED' : 'PENDING'),
             servantReviewNote: note || c.servantReviewNote
           };
         }
         return c;
       });
       return {
         ...prev,
         [lessonId]: {
           ...eMap,
           importantClaims: updatedClaims
         }
       };
     });

     if (isOnlineAuth) {
       await updateClaimVerificationService({
         claimId,
         isVerified,
         servantReviewStatus: reviewStatus,
         servantReviewNote: note
       }).catch(err => console.warn('Online claim verification sync note:', err));
     }
   };

   const resolveSourceConflict = async (lessonId: string, conflictId: string, resolutionNote: string) => {
     setEvidenceMaps(prev => {
       const eMap = prev[lessonId];
       if (!eMap) return prev;
       const updatedConflicts = (eMap.conflicts || []).map(c => {
         if (c.id === conflictId) {
           return {
             ...c,
             status: 'RESOLVED' as const,
             resolutionNote
           };
         }
         return c;
       });
       return {
         ...prev,
         [lessonId]: {
           ...eMap,
           conflicts: updatedConflicts
         }
       };
     });

     if (isOnlineAuth) {
       await resolveSourceConflictService({
         conflictId,
         resolutionNote
       }).catch(err => console.warn('Online conflict resolution sync note:', err));
     }
   };

   const updateSectionInVersion = (lessonId: string, versionId: string, updatedSection: any) => {
     let isImmutable = false;
     setLessonVersions(prev => {
       const existing = prev[lessonId] || [];
       const target = existing.find(v => v.id === versionId);
       if (target && (target.status === 'APPROVED' || target.status === 'PUBLISHED')) {
         isImmutable = true;
         return prev;
       }
       const updated = existing.map(v => {
         if (v.id === versionId) {
           const newSections = v.sections.map(sec => sec.id === updatedSection.id ? updatedSection : sec);
           return {
             ...v,
             sections: newSections,
             status: 'SERVANT_REVIEW' as const
           };
         }
         return v;
       });
       return { ...prev, [lessonId]: updated };
     });

     if (isImmutable) {
       console.warn(`Cannot edit section: Version ${versionId} is immutable (${isImmutable}).`);
       return;
     }

    if (isOnlineAuth && updatedSection.id) {
      updateLessonSection(updatedSection.id, {
        titleEn: updatedSection.titleEn,
        titleAr: updatedSection.titleAr,
        titleCop: updatedSection.titleCop,
        contentEn: updatedSection.contentEn,
        contentAr: updatedSection.contentAr,
        contentCop: updatedSection.contentCop,
        order: updatedSection.order,
        teacherNotes: updatedSection.teacherNotes
      }).catch(err => console.warn('Note on online section update sync:', err));
    }
   };

  // Servant Comments Helpers
  const addServantComment = (commentData: Omit<ServantComment, 'id' | 'createdAt'>): ServantComment => {
    const newComment: ServantComment = {
      ...commentData,
      id: `comm-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setServantComments(prev => {
      const list = prev[commentData.lessonVersionId] || [];
      return {
        ...prev,
        [commentData.lessonVersionId]: [...list, newComment]
      };
    });
    return newComment;
  };

  const resolveServantComment = (versionId: string, commentId: string, note: string) => {
    setServantComments(prev => {
      const list = prev[versionId] || [];
      const updated = list.map(c => c.id === commentId ? { ...c, resolved: true, resolutionNote: note } : c);
      return {
        ...prev,
        [versionId]: updated
      };
    });
  };

  // Student Content Progress Helpers
  const markSectionRead = (studentId: string, lessonId: string, sectionId: string, totalSections: number) => {
    const key = `${studentId}_${lessonId}`;
    setContentProgress(prev => {
      const current = prev[key] || {
        studentId,
        lessonId,
        status: 'OPENED',
        sectionsCompleted: [],
        totalSections,
        completionPercent: 0,
        startedAt: new Date().toISOString()
      };

      const newSections = current.sectionsCompleted.includes(sectionId)
        ? current.sectionsCompleted
        : [...current.sectionsCompleted, sectionId];

      const pct = Math.round((newSections.length / Math.max(1, totalSections)) * 100);
      const isComplete = newSections.length >= totalSections;

      return {
        ...prev,
        [key]: {
          ...current,
          sectionsCompleted: newSections,
          totalSections,
          completionPercent: pct,
          status: isComplete ? 'COMPLETED' : 'IN_PROGRESS',
          completedAt: isComplete ? new Date().toISOString() : current.completedAt,
          lastPositionSectionId: sectionId
        }
      };
    });
  };

  const completeLessonContent = (studentId: string, lessonId: string) => {
    const key = `${studentId}_${lessonId}`;
    setContentProgress(prev => {
      const current = prev[key];
      return {
        ...prev,
        [key]: {
          studentId,
          lessonId,
          status: 'COMPLETED',
          sectionsCompleted: current?.sectionsCompleted || [],
          totalSections: current?.totalSections || 1,
          completionPercent: 100,
          startedAt: current?.startedAt || new Date().toISOString(),
          completedAt: new Date().toISOString()
        }
      };
    });
  };

  const getStudentContentProgress = (studentId: string, lessonId: string) => {
    return contentProgress[`${studentId}_${lessonId}`];
  };

  // Student Quiz Helpers
  const recordQuizAttempt = (attemptData: Omit<StudentQuizAttempt, 'id' | 'submittedAt'>): StudentQuizAttempt => {
    const newAttempt: StudentQuizAttempt = {
      ...attemptData,
      id: `att-${Date.now()}`,
      submittedAt: new Date().toISOString()
    };
    const key = `${attemptData.studentId}_${attemptData.lessonId}`;
    setQuizAttempts(prev => {
      const list = prev[key] || [];
      return {
        ...prev,
        [key]: [...list, newAttempt]
      };
    });
    return newAttempt;
  };

  const getStudentQuizAttempts = (studentId: string, lessonId: string) => {
    return quizAttempts[`${studentId}_${lessonId}`] || [];
  };

  // Student Mastery Helpers
  const setStudentMastery = (
    studentId: string, 
    lessonId: string, 
    status: MasteryStatus, 
    evaluatedBy: string, 
    teacherNotes?: string
  ) => {
    const key = `${studentId}_${lessonId}`;
    setMasteries(prev => ({
      ...prev,
      [key]: {
        studentId,
        lessonId,
        status,
        evaluatedBy,
        evaluatedAt: new Date().toISOString(),
        teacherNotes
      }
    }));
  };

  const getStudentMastery = (studentId: string, lessonId: string) => {
    return masteries[`${studentId}_${lessonId}`];
  };

  // Search Audit Logs
  const addSearchAuditLog = (log: SearchAuditLog) => {
    setSearchAuditLogs(prev => [log, ...prev]);
  };

  const resetToDefault = () => {
    setClassSessions(mockClassSessions);
    setLessons(mockLessons);
    setSources(mockSources);
    setEvidenceMaps(mockEvidenceMaps);
    setOutlines(mockLessonOutlines);
    setLessonVersions(mockLessonVersions);
    setServantComments(mockServantComments);
    setContentProgress(mockStudentContentProgress);
    setQuizAttempts(mockStudentQuizAttempts);
    setMasteries(mockStudentMastery);
    setSearchAuditLogs([]);
    localStorage.clear();
  };

  return (
    <LessonsContext.Provider value={{
      classSessions,
      activeClassSessionId,
      setActiveClassSessionId,
      createClassSession,
      updateClassSession,
      lessons,
      addLesson,
      updateLesson,
      deleteLesson,
      togglePublish,
      publishLesson,
      markCompleted,
      sources,
      addSource,
      updateSource,
      deleteSource,
      getLessonSources,
      evidenceMaps,
      saveEvidenceMap,
      outlines,
      saveOutline,
      approveOutline,
      lessonVersions,
      saveLessonVersion,
      submitVersionForReview,
      requestVersionRevision,
      approveLessonVersion,
      updateSectionInVersion,
      updateClaimVerification,
      resolveSourceConflict,
      servantComments,
      addServantComment,
      resolveServantComment,
      contentProgress,
      markSectionRead,
      completeLessonContent,
      getStudentContentProgress,
      quizAttempts,
      recordQuizAttempt,
      getStudentQuizAttempts,
      masteries,
      setStudentMastery,
      getStudentMastery,
      searchAuditLogs,
      addSearchAuditLog,
      lessonSources: sources,
      lessonOutlines: outlines,
      studentProgress: contentProgress,
      studentMasteries: masteries,
      addClassSession: createClassSession,
      addLessonSource: addSource,
      deleteLessonSource: deleteSource,
      saveLessonOutline: saveOutline,
      approveLessonOutline: approveOutline,
      publishLessonVersion,
      updateStudentContentProgress: (studentId: string, lessonId: string, sections: string[], pct: number) => {
        const key = `${studentId}_${lessonId}`;
        setContentProgress(prev => ({
          ...prev,
          [key]: {
            studentId,
            lessonId,
            status: pct >= 100 ? 'COMPLETED' : 'IN_PROGRESS',
            sectionsCompleted: sections,
            totalSections: Math.max(sections.length, 3),
            completionPercent: pct,
            completedAt: pct >= 100 ? new Date().toISOString() : undefined
          }
        }));
      },
      updateStudentMastery: (studentId: string, lessonId: string, status: MasteryStatus, notes?: string) => {
        setStudentMastery(studentId, lessonId, status, 'Servant', notes);
      },
      curriculumLoading,
      curriculumError,
      refreshCurriculum: loadOnlineCurriculum,
      refreshProgressSummary: async () => {
        if (!userData) return;
        try {
          const summaryData = await getStudentProgressSummary(userData.id);
          if (summaryData?.completedLessonIds) {
            const completedSet = new Set(summaryData.completedLessonIds);
            setLessons(prev => prev.map(l => ({
              ...l,
              isCompleted: completedSet.has(l.id)
            })));
          }
          if (summaryData?.allProgress) {
            setContentProgress(prev => {
              const next = { ...prev };
              for (const [lessonId, p] of Object.entries(summaryData.allProgress)) {
                next[`${userData.id}_${lessonId}`] = p as any;
              }
              return next;
            });
          }
          if (summaryData?.streak && setUserDirectly) {
            const serverStreak = summaryData.streak.currentStreak ?? 0;
            const serverPoints = summaryData.points ?? userData.points;
            if (userData.currentStreak !== serverStreak || userData.points !== serverPoints) {
              setUserDirectly({
                ...userData,
                currentStreak: serverStreak,
                longestStreak: summaryData.streak.longestStreak ?? userData.longestStreak,
                points: serverPoints
              });
            }
          }
        } catch (e) {
          console.warn('Could not refresh progress summary:', e);
        }
      },
      resetToDefault
    }}>
      {children}
    </LessonsContext.Provider>
  );
}

export function useLessons() {
  const context = useContext(LessonsContext);
  if (!context) {
    throw new Error('useLessons must be used within a LessonsProvider');
  }
  return context;
}
