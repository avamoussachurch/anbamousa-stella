create or replace function private.generate_daily_activity_summaries()
returns integer language plpgsql security definer set search_path = pg_catalog, public, private as $$
declare
  v_now timestamp := now() at time zone 'Africa/Cairo';
  v_today date := (now() at time zone 'Africa/Cairo')::date;
  v_assignment record;
  v_student record;
  v_parent record;
  v_admin record;
  v_student_count integer;
  v_completion_count integer;
  v_platform_completions integer;
  v_open_help integer;
  v_failed_jobs integer;
  v_sent integer := 0;
begin
  if extract(hour from v_now) <> 20 then return 0; end if;

  for v_assignment in
    select distinct sca.servant_id,sca.class_instance_id,sca.church_year_id
    from public.servant_class_assignments sca
    join public.church_years cy on cy.id=sca.church_year_id and cy.is_active=true
    where sca.is_active=true
  loop
    select count(*)::integer into v_student_count
    from public.class_memberships cm
    join public.profiles p on p.id=cm.student_id and p.role='student'
    where cm.class_instance_id=v_assignment.class_instance_id
      and cm.church_year_id=v_assignment.church_year_id
      and cm.status='active' and cm.left_at is null;

    select count(*)::integer into v_completion_count
    from public.lesson_progress lp
    join public.class_memberships cm on cm.student_id=lp.student_id
      and cm.class_instance_id=v_assignment.class_instance_id
      and cm.church_year_id=v_assignment.church_year_id
      and cm.status='active' and cm.left_at is null
    where lp.completed=true and lp.completed_at is not null
      and (lp.completed_at at time zone 'Africa/Cairo')::date=v_today;

    perform private.enqueue_notification(v_assignment.servant_id,'progress','Your class daily learning summary','ملخص التعلّم اليومي لفصلك',
      v_completion_count::text||' lesson completions today across '||v_student_count::text||' active students. Keep encouraging every learner.',
      'تم إكمال '||v_completion_count::text||' درس النهارده من إجمالي '||v_student_count::text||' تلميذ نشط. شجّع كل تلميذ على خطوته الجاية.',
      'teacher-class-digest:'||v_assignment.class_instance_id||':'||v_today::text,
      'home',jsonb_build_object('classInstanceId',v_assignment.class_instance_id,'completedToday',v_completion_count,'activeStudents',v_student_count));
    v_sent := v_sent + 1;

    for v_student in
      select distinct p.id,p.name from public.class_memberships cm
      join public.profiles p on p.id=cm.student_id
      where cm.class_instance_id=v_assignment.class_instance_id
        and cm.church_year_id=v_assignment.church_year_id
        and cm.status='active' and cm.left_at is null and p.role='student'
        and p.last_active < now() - interval '7 days'
    loop
      perform private.enqueue_notification(v_assignment.servant_id,'progress','A student may need a gentle check-in','تلميذ ممكن يحتاج افتقاد لطيف',
        coalesce(v_student.name,'A student')||' has not been active for more than a week. Consider a kind check-in.',
        coalesce(v_student.name,'أحد التلاميذ')||' مش نشط من أكتر من أسبوع. ممكن تفتقده بمحبة.',
        'teacher-inactive-student:'||v_student.id::text||':'||v_today::text,
        'classManagement',jsonb_build_object('studentId',v_student.id,'classInstanceId',v_assignment.class_instance_id));
      for v_parent in select distinct ur.parent_id from public.user_relationships ur
        where ur.child_id=v_student.id and ur.verified_at is not null
          and ur.relationship_type in ('parent_child','guardian_student') loop
        perform private.enqueue_notification(v_parent.parent_id,'progress','A gentle learning check-in for your child','متابعة لطيفة لتعلّم ابنك/بنتك',
          coalesce(v_student.name,'Your child')||' has been away from learning for a little while. A calm encouragement can help.',
          coalesce(v_student.name,'ابنك/بنتك')||' بقاله فترة بعيد عن التعلّم. تشجيع هادي ممكن يساعد.',
          'parent-inactive-child:'||v_student.id::text||':'||v_today::text,
          'children',jsonb_build_object('childId',v_student.id));
      end loop;
    end loop;
  end loop;

  select count(*)::integer into v_platform_completions
  from public.lesson_progress lp
  where lp.completed=true and lp.completed_at is not null
    and (lp.completed_at at time zone 'Africa/Cairo')::date=v_today;
  select count(*)::integer into v_open_help from public.student_help_requests where status <> 'resolved';
  select count(*)::integer into v_failed_jobs from public.lesson_publication_jobs where lower(coalesce(status,'')) in ('failed','error');

  for v_admin in
    select p.id from public.profiles p
    where p.role='admin' or exists (
      select 1 from public.profile_role_assignments pra
      where pra.user_id=p.id and pra.role='admin' and pra.revoked_at is null
    )
  loop
    perform private.enqueue_notification(v_admin.id,'system','Daily Anba Mousa activity summary','ملخص النشاط اليومي للأنبا موسى',
      v_platform_completions::text||' lesson completions today · '||v_open_help::text||' open help requests · '||v_failed_jobs::text||' failed publishing jobs.',
      v_platform_completions::text||' درس مكتمل النهارده · '||v_open_help::text||' طلب مساعدة مفتوح · '||v_failed_jobs::text||' مهمة نشر فاشلة.',
      'admin-daily-activity:'||v_today::text,'home',
      jsonb_build_object('completions',v_platform_completions,'openHelpRequests',v_open_help,'failedPublicationJobs',v_failed_jobs));
    v_sent := v_sent + 1;
  end loop;
  return v_sent;
end; $$;
revoke all on function private.generate_daily_activity_summaries() from public, anon, authenticated;

do $$
declare v_job record;
begin
  for v_job in select jobid from cron.job where jobname='anba-mousa-daily-activity-summaries' loop
    perform cron.unschedule(v_job.jobid);
  end loop;
  perform cron.schedule('anba-mousa-daily-activity-summaries','0 * * * *','select private.generate_daily_activity_summaries();');
end; $$;
