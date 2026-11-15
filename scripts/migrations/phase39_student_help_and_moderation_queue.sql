-- Student help and moderation queue, scoped to the student's assigned class.
create table if not exists public.student_help_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('lesson','audio','wrong_answer','account','confusion','other')),
  subject text not null check (length(trim(subject)) between 3 and 140),
  message text not null check (length(trim(message)) between 5 and 2000),
  context jsonb not null default '{}'::jsonb check (jsonb_typeof(context) = 'object'),
  status text not null default 'open' check (status in ('open','in_review','resolved')),
  assigned_to uuid references public.profiles(id) on delete set null,
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists student_help_requests_student_created_idx
  on public.student_help_requests(student_id, created_at desc);
create index if not exists student_help_requests_open_created_idx
  on public.student_help_requests(created_at desc) where status <> 'resolved';

alter table public.student_help_requests enable row level security;
drop policy if exists student_help_requests_student_insert on public.student_help_requests;
create policy student_help_requests_student_insert on public.student_help_requests
  for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'student')
  );
drop policy if exists student_help_requests_student_read on public.student_help_requests;
create policy student_help_requests_student_read on public.student_help_requests
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or (is_church_servant_or_admin() and can_access_student_data(student_id))
  );
drop policy if exists student_help_requests_staff_update on public.student_help_requests;
create policy student_help_requests_staff_update on public.student_help_requests
  for update to authenticated
  using (is_church_servant_or_admin() and can_access_student_data(student_id))
  with check (is_church_servant_or_admin() and can_access_student_data(student_id));

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
  for v_staff in select p.id from public.profiles p where p.role='admin' loop
    perform private.enqueue_notification(v_staff.id,'moderation','New student help request','طلب مساعدة جديد من تلميذ',
      coalesce(v_student_name,'A student')||' sent a help request that may need review.',
      coalesce(v_student_name,'أحد التلاميذ')||' أرسل طلب مساعدة يحتاج للمراجعة.',
      'help-request-admin:'||new.id::text,'help-requests',jsonb_build_object('requestId',new.id));
  end loop;
  return new;
end; $$;
drop trigger if exists notifications_after_student_help_request on public.student_help_requests;
create trigger notifications_after_student_help_request
  after insert on public.student_help_requests
  for each row execute function private.notify_student_help_request();

create or replace function private.notify_student_help_resolution()
returns trigger language plpgsql security definer set search_path = pg_catalog, public, private as $$
begin
  if new.status is distinct from old.status or new.resolution_note is distinct from old.resolution_note then
    perform private.enqueue_notification(new.student_id,'help_request',
      case when new.status='resolved' then 'Your help request was resolved' else 'Your help request was updated' end,
      case when new.status='resolved' then 'تم حل طلب المساعدة' else 'تم تحديث طلب المساعدة' end,
      coalesce(new.resolution_note,'A teacher has updated your help request.'),
      coalesce(new.resolution_note,'قام الخادم بتحديث طلب المساعدة.'),
      'help-request-update:'||new.id::text||':'||new.updated_at::text,'home',
      jsonb_build_object('requestId',new.id,'status',new.status));
  end if;
  return new;
end; $$;
drop trigger if exists notifications_after_student_help_update on public.student_help_requests;
create trigger notifications_after_student_help_update
  after update on public.student_help_requests
  for each row execute function private.notify_student_help_resolution();
