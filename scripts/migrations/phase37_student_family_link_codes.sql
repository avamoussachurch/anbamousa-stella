-- Phase 37: server-issued, high-entropy student family-link codes.
-- Codes are readable only by the trusted application server. Never expose this table
-- through the Supabase Data API or Realtime publication.

CREATE TABLE IF NOT EXISTS public.student_family_link_codes (
  student_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_family_link_codes_format
    CHECK (code ~ '^ST-[A-Z0-9]{10}$')
);

ALTER TABLE public.student_family_link_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.student_family_link_codes FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.student_family_link_codes TO service_role;

COMMENT ON TABLE public.student_family_link_codes IS
  'Private server-only student family connection codes. Codes are random, unique, and must never be selected by browser clients.';
