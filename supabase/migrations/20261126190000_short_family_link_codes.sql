-- Replace legacy ST- plus ten-character codes with five alphanumeric characters.
-- Existing codes are rotated because the old format is incompatible with the new input rule.
ALTER TABLE public.student_family_link_codes
  DROP CONSTRAINT IF EXISTS student_family_link_codes_format;

DO $$
DECLARE
  v_student_id uuid;
  v_code text;
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_attempt integer;
BEGIN
  FOR v_student_id IN SELECT student_id FROM public.student_family_link_codes LOOP
    FOR v_attempt IN 1..30 LOOP
      SELECT string_agg(substr(v_alphabet, floor(random() * length(v_alphabet))::integer + 1, 1), '')
        INTO v_code
      FROM generate_series(1, 5);
      BEGIN
        UPDATE public.student_family_link_codes
        SET code = v_code, updated_at = now()
        WHERE student_id = v_student_id;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        IF v_attempt = 30 THEN RAISE; END IF;
      END;
    END LOOP;
  END LOOP;
END $$;

ALTER TABLE public.student_family_link_codes
  ADD CONSTRAINT student_family_link_codes_format
  CHECK (code ~ '^[A-Z0-9]{5}$');

COMMENT ON COLUMN public.student_family_link_codes.code IS
  'Five-character uppercase alphanumeric family connection code; private server-only value.';
