-- Streak milestones, pre-expiry reminders, and event reminders.
create or replace function private.notify_streak_milestone()
returns trigger language plpgsql security definer set search_path = pg_catalog, public, private as $$
declare v_parent record; v_milestone integer;
begin
  if new.current_streak is not distinct from old.current_streak then return new; end if;
  v_milestone := coalesce(new.current_streak,0);
  if v_milestone not in (3,7,14,30,60,100) then return new; end if;
  perform private.enqueue_notification(new.id,'streak',
    'A new streak milestone!','إنجاز جديد في الاستمرارية!',
    'You have kept your learning streak for '||v_milestone::text||' days. Amazing consistency!',
    'حافظت على الاستمرارية لمدة '||v_milestone::text||' يوم. برافو عليك!',
    'streak-milestone:'||v_milestone::text,'points',jsonb_build_object('streakDays',v_milestone));
  for v_parent in select distinct ur.parent_id from public.user_relationships ur
    where ur.child_id=new.id and ur.verified_at is not null
      and ur.relationship_type in ('parent_child','guardian_student') loop
    perform private.enqueue_notification(v_parent.parent_id,'streak',
      'Your child reached a streak milestone','ابنك/بنتك حقق إنجاز استمرارية',
      coalesce(new.name,'Your child')||' has kept a learning streak for '||v_milestone::text||' days.',
      coalesce(new.name,'ابنك/بنتك')||' حافظ على الاستمرارية لمدة '||v_milestone::text||' يوم.',
      'child-streak-milestone:'||new.id::text||':'||v_milestone::text,'children',
      jsonb_build_object('childId',new.id,'streakDays',v_milestone));
  end loop;
  return new;
end; $$;
drop trigger if exists notifications_after_streak_milestone on public.profiles;
create trigger notifications_after_streak_milestone after update of current_streak on public.profiles
  for each row execute function private.notify_streak_milestone();

create or replace function private.generate_streak_reminders()
returns integer language plpgsql security definer set search_path = pg_catalog, public, private as $$
declare v_student record; v_local_now timestamp; v_today date; v_count integer := 0; v_parent record;
begin
  v_local_now := now() at time zone 'Africa/Cairo';
  v_today := v_local_now::date;
  -- Remind only during the evening, and only if yesterday was the last active day.
  -- This is a gentle nudge, never a loss/shame message.
  if extract(hour from v_local_now) < 18 or extract(hour from v_local_now) > 21 then return 0; end if;
  for v_student in
    select p.id,p.name,p.current_streak
    from public.profiles p
    where coalesce(p.current_streak,0) > 0
      and p.last_active is not null
      and (p.last_active at time zone 'Africa/Cairo')::date = v_today - 1
      and (p.role = 'student' or exists (
        select 1 from public.profile_role_assignments pra
        where pra.user_id=p.id and pra.role='student' and pra.revoked_at is null
      ))
  loop
    perform private.enqueue_notification(v_student.id,'streak',
      'Your learning streak is waiting for you','استمراريتك مستنياك',
      'A little learning today can keep your '||v_student.current_streak::text||'-day streak going. No pressure—one small step is enough.',
      'خطوة تعلم صغيرة النهارده ممكن تحافظ على استمراريتك لمدة '||v_student.current_streak::text||' يوم. براحتك، خطوة بسيطة كفاية.',
      'streak-reminder:'||v_today::text,'home',jsonb_build_object('streakDays',v_student.current_streak));
    for v_parent in select distinct ur.parent_id from public.user_relationships ur
      where ur.child_id=v_student.id and ur.verified_at is not null
        and ur.relationship_type in ('parent_child','guardian_student') loop
      perform private.enqueue_notification(v_parent.parent_id,'streak',
        'A gentle streak reminder for your child','تذكير لطيف باستمرارية ابنك/بنتك',
        coalesce(v_student.name,'Your child')||' has a learning streak that can continue with a small step today.',
        coalesce(v_student.name,'ابنك/بنتك')||' عنده استمرارية ممكن تكمل بخطوة بسيطة النهارده.',
        'child-streak-reminder:'||v_student.id::text||':'||v_today::text,'children',
        jsonb_build_object('childId',v_student.id,'streakDays',v_student.current_streak));
    end loop;
    v_count := v_count + 1;
  end loop;
  return v_count;
end; $$;
revoke all on function private.generate_streak_reminders() from public, anon, authenticated;

create or replace function private.generate_upcoming_event_reminders()
returns integer language plpgsql security definer set search_path = pg_catalog, public, private as $$
declare v_event record; v_profile record; v_count integer := 0;
begin
  for v_event in select id,title_en,title_ar,date_time from public.church_events
    where date_time > now() + interval '23 hours' and date_time <= now() + interval '24 hours'
  loop
    for v_profile in select id from public.profiles loop
      perform private.enqueue_notification(v_profile.id,'event',
        'Church event coming up tomorrow','فعالية الكنيسة بكرة',
        coalesce(v_event.title_en,'Church event')||' is coming up tomorrow.',
        coalesce(v_event.title_ar,'فعالية كنسية')||' موعدها بكرة.',
        'event-reminder:'||v_event.id::text,'calendar',
        jsonb_build_object('eventId',v_event.id,'dateTime',v_event.date_time));
      v_count := v_count + 1;
    end loop;
  end loop;
  return v_count;
end; $$;
revoke all on function private.generate_upcoming_event_reminders() from public, anon, authenticated;

do $$
declare v_job record;
begin
  for v_job in select jobid from cron.job where jobname in ('anba-mousa-streak-reminders','anba-mousa-event-reminders') loop
    perform cron.unschedule(v_job.jobid);
  end loop;
  perform cron.schedule('anba-mousa-streak-reminders','0 * * * *','select private.generate_streak_reminders();');
  perform cron.schedule('anba-mousa-event-reminders','0 * * * *','select private.generate_upcoming_event_reminders();');
end; $$;
