export interface LegacyStudentLessonProgress {
  student_id: string;
  lesson_id: string;
  completed: boolean;
  completed_at: string | null;
}

export interface SectionStudentLessonProgress {
  student_id: string;
  lesson_id: string;
  version_id: string;
  sections_completed: string[];
  total_sections: number;
  updated_at: string;
}

export interface TeacherStudentLessonProgress {
  student_id: string;
  lesson_id: string;
  completed: boolean;
  completed_at: string | null;
}

/**
 * Combines legacy lesson completion rows with the current-version section
 * reader. One student/lesson pair is counted once, and stale version reads
 * cannot mark the current lesson complete.
 */
export function mergeStudentLessonProgress(
  legacyRows: LegacyStudentLessonProgress[],
  sectionRows: SectionStudentLessonProgress[],
  activeVersionByLesson: ReadonlyMap<string, string | null | undefined>
): TeacherStudentLessonProgress[] {
  const byStudentLesson = new Map<string, TeacherStudentLessonProgress>();

  for (const row of legacyRows) {
    const key = JSON.stringify([row.student_id, row.lesson_id]);
    const existing = byStudentLesson.get(key);
    byStudentLesson.set(key, {
      student_id: row.student_id,
      lesson_id: row.lesson_id,
      completed: Boolean(existing?.completed || row.completed),
      completed_at: existing?.completed_at || row.completed_at || null
    });
  }

  for (const row of sectionRows) {
    if (activeVersionByLesson.get(row.lesson_id) !== row.version_id) continue;
    const key = JSON.stringify([row.student_id, row.lesson_id]);
    const existing = byStudentLesson.get(key);
    const totalSections = Number(row.total_sections) || 0;
    const completedSections = Array.isArray(row.sections_completed) ? row.sections_completed.length : 0;
    const sectionLessonCompleted = totalSections > 0 && completedSections >= totalSections;
    byStudentLesson.set(key, {
      student_id: row.student_id,
      lesson_id: row.lesson_id,
      completed: Boolean(existing?.completed || sectionLessonCompleted),
      completed_at: existing?.completed_at || (sectionLessonCompleted ? row.updated_at : null)
    });
  }

  return [...byStudentLesson.values()];
}
