-- Idempotently enforce the exact five-character code format used by the
-- parent Add Child screen. This also repairs older ST- plus ten-character rows
-- if the earlier short-code migration was not applied in an environment.
ALTER TABLE public.student_family_link_codes
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.student_family_link_codes
  DROP CONSTRAINT IF EXISTS student_family_link_codes_format;

DO $$
DECLARE
  v_student_id uuid;
  v_existing_code text;
  v_code text;
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_attempt integer;
BEGIN
  FOR v_student_id, v_existing_code IN
    SELECT student_id, code FROM public.student_family_link_codes
  LOOP
    IF v_existing_code ~ '^[A-Z0-9]{5}$' THEN
      CONTINUE;
    END IF;

    FOR v_attempt IN 1..50 LOOP
      SELECT string_agg(substr(v_alphabet, floor(random() * length(v_alphabet))::integer + 1, 1), '')
        INTO v_code
      FROM generate_series(1, 5);

      BEGIN
        UPDATE public.student_family_link_codes
        SET code = v_code, updated_at = now()
        WHERE student_id = v_student_id;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        IF v_attempt = 50 THEN RAISE; END IF;
      END;
    END LOOP;
  END LOOP;
END $$;

ALTER TABLE public.student_family_link_codes
  ADD CONSTRAINT student_family_link_codes_format
  CHECK (code ~ '^[A-Z0-9]{5}$');

COMMENT ON COLUMN public.student_family_link_codes.code IS
  'Five-character uppercase alphanumeric family connection code; private server-only value.';
