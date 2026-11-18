-- Cover the creator/actor foreign keys introduced with attendance and visitation.
CREATE INDEX IF NOT EXISTS idx_class_attendance_records_marked_by_fk
  ON public.class_attendance_records (marked_by);
CREATE INDEX IF NOT EXISTS idx_class_attendance_sessions_created_by_fk
  ON public.class_attendance_sessions (created_by);
CREATE INDEX IF NOT EXISTS idx_class_visitation_logs_created_by_fk
  ON public.class_visitation_logs (created_by);

-- These helpers are server-only; pin the search path even though their grants are restricted.
ALTER FUNCTION public.publish_lesson_version(uuid, uuid)
  SET search_path = '';
ALTER FUNCTION public.set_lesson_section_read(uuid, text, text, text, boolean, integer)
  SET search_path = '';
