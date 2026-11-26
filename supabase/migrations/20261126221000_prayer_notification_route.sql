CREATE OR REPLACE FUNCTION private.generate_prayer_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog','public','private'
AS $function$
DECLARE
  v_now timestamp := now() at time zone 'Africa/Cairo';
  v_today date := (now() at time zone 'Africa/Cairo')::date;
  v_student record;
  v_count integer := 0;
BEGIN
  IF extract(hour FROM v_now) <> 18 THEN RETURN 0; END IF;
  FOR v_student IN
    SELECT p.id,p.name
    FROM public.profiles p
    WHERE (p.role = 'student' OR EXISTS (
      SELECT 1 FROM public.profile_role_assignments pra
      WHERE pra.user_id=p.id AND pra.role='student' AND pra.revoked_at IS NULL
    ))
    AND NOT EXISTS (
      SELECT 1 FROM public.achievement_events ae
      WHERE ae.student_id=p.id AND ae.event_type='prayer_day'
        AND (ae.occurred_at at time zone 'Africa/Cairo')::date=v_today
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.notification_preferences np
      WHERE np.user_id=p.id AND (
        np.in_app_enabled = false OR np.category_settings->>'prayer' = 'false'
      )
    )
  LOOP
    PERFORM private.enqueue_notification(
      v_student.id,'prayer','A gentle prayer reminder','تذكرة صلاة بمحبة',
      'If you have a quiet moment, take one small step with God today. One Agpeya hour or a personal prayer is enough.',
      'لو عندك دقيقة هادية، خد خطوة صغيرة مع ربنا النهارده. ساعة أجبية واحدة أو صلاة شخصية كفاية.',
      'prayer-reminder:'||v_today::text,'agpeya',
      jsonb_build_object('date',v_today,'prayerDayComplete',false)
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$function$;
