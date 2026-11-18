CREATE TABLE IF NOT EXISTS public.class_attendance_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_year_id text NOT NULL REFERENCES public.church_years(id) ON DELETE CASCADE,
  class_instance_id text NOT NULL REFERENCES public.class_instances(id) ON DELETE CASCADE,
  attendance_date date NOT NULL,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_instance_id, attendance_date)
);

CREATE TABLE IF NOT EXISTS public.class_attendance_records (
  attendance_session_id uuid NOT NULL REFERENCES public.class_attendance_sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('present', 'late', 'excused', 'absent')),
  marked_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  marked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (attendance_session_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.class_visitation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_instance_id text NOT NULL REFERENCES public.class_instances(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  visit_date date NOT NULL,
  method text NOT NULL CHECK (method IN ('call', 'visit', 'whatsapp')),
  notes text NOT NULL DEFAULT '',
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT class_visitation_notes_length CHECK (char_length(notes) <= 1500)
);

CREATE INDEX IF NOT EXISTS class_attendance_sessions_year_date_idx
  ON public.class_attendance_sessions (church_year_id, attendance_date DESC);
CREATE INDEX IF NOT EXISTS class_attendance_records_student_idx
  ON public.class_attendance_records (student_id, marked_at DESC);
CREATE INDEX IF NOT EXISTS class_visitation_logs_class_date_idx
  ON public.class_visitation_logs (class_instance_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS class_visitation_logs_student_idx
  ON public.class_visitation_logs (student_id, visit_date DESC);

ALTER TABLE public.class_attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_visitation_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.class_attendance_sessions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.class_attendance_records FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.class_visitation_logs FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.class_attendance_sessions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.class_attendance_records TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.class_visitation_logs TO service_role;