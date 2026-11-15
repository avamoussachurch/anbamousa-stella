create or replace function private.notify_student_help_request()
returns trigger language plpgsql security definer set search_path = pg_catalog, public, private as $$
declare v_staff record; v_student_name text;
begin
  select coalesce(p.name,'A student') into v_student_name from public.profiles p where p.id=new.student_id;
  for v_staff in
    select distinct sca.servant_id
    from public.class_memberships cm
    join public.church_years cy on cy.id=cm.church_year_id and cy.is_active=true
    join public.servant_class_assignments sca on sca.class_instance_id=cm.class_instance_id
      and sca.church_year_id=cm.church_year_id and sca.is_active=true
    where cm.student_id=new.student_id and cm.status='active'
  loop
    perform private.enqueue_notification(v_staff.servant_id,'help_request','A student needs help','تلميذ محتاج مساعدة',
      coalesce(v_student_name,'A student')||' sent a help request: '||new.subject,
      coalesce(v_student_name,'أحد التلاميذ')||' بعت طلب مساعدة: '||new.subject,
      'help-request:'||new.id::text,'help-requests',jsonb_build_object('requestId',new.id,'studentId',new.student_id));
  end loop;
  for v_staff in
    select p.id from public.profiles p
    where p.role='admin' or exists (
      select 1 from public.profile_role_assignments pra
      where pra.user_id=p.id and pra.role='admin' and pra.revoked_at is null
    )
  loop
    perform private.enqueue_notification(v_staff.id,'moderation','New student help request','طلب مساعدة جديد من تلميذ',
      coalesce(v_student_name,'A student')||' sent a help request that may need review.',
      coalesce(v_student_name,'أحد التلاميذ')||' أرسل طلب مساعدة يحتاج للمراجعة.',
      'help-request-admin:'||new.id::text,'help-requests',jsonb_build_object('requestId',new.id));
  end loop;
  return new;
end; $$;
