-- Phase 29: keep known placeholder curriculum records out of student publication.
-- Preserve the records and versions for teacher review; do not delete user-authored data.
UPDATE public.lessons
SET status = 'draft',
    lesson_status = 'draft'
WHERE id IN (
  'ba9eac43-4068-40a9-9457-11433168f3b7',
  'f4443f0b-7222-4a10-80bd-73515b56f508'
)
AND title_en = 'adadasd'
AND title_ar = 'asdasdasd'
AND status = 'published'
AND lesson_status = 'published';
