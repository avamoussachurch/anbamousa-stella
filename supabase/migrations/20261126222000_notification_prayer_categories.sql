ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_category_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_category_check
  CHECK (category = ANY (ARRAY[
    'announcement','event','lesson','assignment','progress','streak','achievement',
    'leaderboard','help_request','prayer','daily_verse','moderation','system','motivation','community'
  ]));
