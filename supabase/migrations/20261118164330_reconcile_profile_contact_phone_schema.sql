ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS contact_phone text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_contact_phone_format_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_contact_phone_format_check
  CHECK (
    contact_phone IS NULL OR (
      length(contact_phone) <= 32
      AND contact_phone ~ '^[+0-9(). -]+$'
      AND length(regexp_replace(contact_phone, '[^0-9]', '', 'g')) BETWEEN 7 AND 15
    )
  );
