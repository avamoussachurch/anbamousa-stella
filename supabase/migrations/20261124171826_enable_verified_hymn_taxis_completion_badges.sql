-- Re-enable Hymns/Taxis completion badges only after their trusted server sources exist.
update public.achievement_badges
set is_active = true, updated_at = now()
where slug in ('hymn-heart','hymn-master','taxis-practitioner')
  and criteria->>'event_type' in ('hymn_mastered','taxis_completed');
