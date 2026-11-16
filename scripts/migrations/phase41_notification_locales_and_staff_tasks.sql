-- Notification locale and staff-facing publishing/review attention signals.
alter table public.notification_preferences
  add column if not exists language text not null default 'en'
  check (language in ('en','ar'));

create or replace function private.notify_publication_job_failure()
returns trigger language plpgsql security definer set search_path = pg_catalog, public, private as $$
declare v_admin record; v_lesson_title text;
begin
  if lower(coalesce(new.status,'')) not in ('failed','error') then return new; end if;
  if tg_op='UPDATE' and lower(coalesce(old.status,'')) in ('failed','error') then return new; end if;
  select coalesce(title_en,'a lesson') into v_lesson_title from public.lessons where id=new.lesson_id;
  if new.scheduled_by is not null then
    perform private.enqueue_notification(new.scheduled_by,'system','Lesson publishing needs attention','نشر الدرس محتاج مراجعة',
      'Publishing '||coalesce(v_lesson_title,'a lesson')||' failed. Please review the publishing job.',
      'تعذر نشر '||coalesce(v_lesson_title,'الدرس')||'. راجع مهمة النشر.',
      'publication-failed:'||new.id::text,'studio',jsonb_build_object('jobId',new.id,'lessonId',new.lesson_id));
  end if;
  for v_admin in
    select p.id from public.profiles p
    where p.role='admin' or exists (
      select 1 from public.profile_role_assignments pra
      where pra.user_id=p.id and pra.role='admin' and pra.revoked_at is null
    )
  loop
    perform private.enqueue_notification(v_admin.id,'system','A lesson publishing job failed','فشلت مهمة نشر درس',
      'Publishing '||coalesce(v_lesson_title,'a lesson')||' failed and may need administrator review.',
      'فشلت مهمة نشر '||coalesce(v_lesson_title,'درس')||' وقد تحتاج لمراجعة الإدارة.',
      'publication-failed-admin:'||new.id::text,'curriculum',jsonb_build_object('jobId',new.id,'lessonId',new.lesson_id));
  end loop;
  return new;
end; $$;
drop trigger if exists notifications_after_publication_failure on public.lesson_publication_jobs;
create trigger notifications_after_publication_failure
  after insert or update on public.lesson_publication_jobs
  for each row execute function private.notify_publication_job_failure();

create or replace function private.notify_unresolved_lesson_review_comment()
returns trigger language plpgsql security definer set search_path = pg_catalog, public, private as $$
declare v_creator uuid; v_title text;
begin
  if new.resolved is true then return new; end if;
  select l.created_by,coalesce(l.title_en,'a lesson') into v_creator,v_title
  from public.lessons l where l.id=new.lesson_id;
  if v_creator is not null and v_creator <> new.author_id then
    perform private.enqueue_notification(v_creator,'assignment','A lesson review comment needs attention','تعليق مراجعة درس محتاج متابعة',
      'A teacher left a review comment on '||coalesce(v_title,'your lesson')||'.',
      'أضاف أحد الخدام تعليق مراجعة على '||coalesce(v_title,'درسك')||'.',
      'lesson-review-comment:'||new.id::text,'studio',
      jsonb_build_object('commentId',new.id,'lessonId',new.lesson_id,'versionId',new.lesson_version_id));
  end if;
  return new;
end; $$;
drop trigger if exists notifications_after_review_comment on public.servant_review_comments;
create trigger notifications_after_review_comment
  after insert on public.servant_review_comments
  for each row execute function private.notify_unresolved_lesson_review_comment();
