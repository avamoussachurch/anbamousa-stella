CREATE TABLE IF NOT EXISTS public.account_setup_completions (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('student', 'teacher', 'parent', 'admin')),
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);

ALTER TABLE public.account_setup_completions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.account_setup_completions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.account_setup_completions TO service_role;
