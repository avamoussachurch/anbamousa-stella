-- Track the active time for the current Cairo calendar day separately from lifetime app time.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS screen_time_today_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS screen_time_date date;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_screen_time_today_seconds_nonnegative;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_screen_time_today_seconds_nonnegative
  CHECK (screen_time_today_seconds >= 0);

COMMENT ON COLUMN public.profiles.screen_time_today_seconds IS
  'Active seconds accumulated during screen_time_date in Africa/Cairo; refreshed while the student is actively using the app.';
COMMENT ON COLUMN public.profiles.screen_time_date IS
  'Africa/Cairo local date associated with screen_time_today_seconds.';
