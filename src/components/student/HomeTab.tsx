import React, { useEffect } from 'react';
import { mockLessons } from '../../data';
import { useAuth } from '../../context/AuthContext';
import { useLessons } from '../../context/LessonsContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import { getClassGroupForGrade } from '../../lib/classGroups';
import type { Lesson } from '../../types';
import { StudentAdventureHome } from './StudentAdventureHome';

interface HomeTabProps {
  onNavigate: (tab: string, lessonId?: string) => void;
  lang: import('../../types').Language;
}

export function HomeTab({ onNavigate, lang }: HomeTabProps) {
  const { userData, isGuest } = useAuth();
  const {
    lessons,
    curriculumLoading,
    curriculumError,
    curriculumLoadedForUserId,
    refreshCurriculum,
    contentProgress,
    refreshProgressSummary
  } = useLessons();

  useEffect(() => {
    if (!refreshProgressSummary || !userData?.id) return;
    refreshProgressSummary().catch(error => {
      console.warn('Could not refresh student progress for Home:', error);
    });
  }, [userData?.id, refreshProgressSummary]);

  if (!userData) return null;

  const isOnlineAuth = !isGuest && isSupabaseConfigured;
  const curriculumReadyForUser = !isOnlineAuth || curriculumLoadedForUserId === userData.id;
  const curriculumUnavailable = Boolean(
    curriculumError ||
    (!isGuest && !isSupabaseConfigured && curriculumLoadedForUserId !== userData.id)
  );
  const curriculumIsLoading = Boolean(
    isOnlineAuth && (curriculumLoading || !curriculumReadyForUser)
  );
  const sourceLessons = isGuest
    ? (lessons?.length ? lessons : mockLessons)
    : isOnlineAuth
      ? (curriculumIsLoading || curriculumError ? [] : lessons)
      : curriculumLoadedForUserId === userData.id && !curriculumError
        ? lessons
        : [];
  const requestedGrade = userData.requestedGrade || userData.grade;
  const classGroupId = userData.requestedClassGroupId ||
    (requestedGrade ? getClassGroupForGrade(requestedGrade)?.id : null);

  const isLessonFinished = (lesson: Lesson) => {
    if (lesson.isCompleted) return true;
    const progress = contentProgress?.[`${userData.id}_${lesson.id}`];
    return Boolean(progress && (
      progress.status === 'COMPLETED' || progress.completionPercent === 100
    ));
  };

  const studentLessons = sourceLessons
    .filter(lesson => {
      // Online lessons have already been scoped to the student's active class membership by curriculumService.
      if (isOnlineAuth) return true;
      const lessonGroup = lesson.classGroupId ||
        (lesson.grade ? getClassGroupForGrade(lesson.grade)?.id : null);
      return !classGroupId || !lessonGroup || lessonGroup === classGroupId;
    })
    .map(lesson => ({ ...lesson, isCompleted: isLessonFinished(lesson) }))
    .sort((left, right) => left.date && right.date
      ? left.date.localeCompare(right.date)
      : 0);

  const completedLessons = studentLessons.filter(isLessonFinished);
  const nextLesson = studentLessons.find(lesson => !isLessonFinished(lesson)) || null;

  return (
    <StudentAdventureHome
      user={userData}
      isGuest={isGuest}
      lang={lang}
      lessons={studentLessons}
      nextLesson={nextLesson}
      completedLessons={completedLessons}
      totalLessons={studentLessons.length}
      curriculumLoading={curriculumIsLoading}
      curriculumError={curriculumUnavailable ? curriculumError : null}
      onNavigate={onNavigate}
      onRetryCurriculum={() => { void refreshCurriculum?.(); }}
    />
  );
}
