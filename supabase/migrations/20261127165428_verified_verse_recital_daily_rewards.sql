create table if not exists public.verse_recital_daily_results (
  student_id uuid not null references public.profiles(id) on delete cascade,
  activity_date date not null,
  verse_reference text not null,
  accuracy_percentage integer not null check (accuracy_percentage between 0 and 100),
  passed boolean not null default false,
  points_awarded integer not null default 0 check (points_awarded in (0, 100)),
  transcription text not null default '',
  feedback text not null default '',
  ai_teacher_comment text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (student_id, activity_date)
);

alter table public.verse_recital_daily_results enable row level security;
revoke all on table public.verse_recital_daily_results from public, anon, authenticated;
grant all on table public.verse_recital_daily_results to service_role;

create or replace function public.record_verse_recital_daily_result(
  p_student_id uuid,
  p_activity_date date,
  p_verse_reference text,
  p_accuracy_percentage integer,
  p_passed boolean,
  p_transcription text,
  p_feedback text,
  p_ai_teacher_comment text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_points_awarded integer := 0;
  v_total_points integer;
  v_row_found boolean := false;
begin
  if p_student_id is null or p_activity_date is null then
    raise exception 'Student and activity date are required.';
  end if;
  if p_verse_reference is null or length(btrim(p_verse_reference)) = 0 or length(p_verse_reference) > 160 then
    raise exception 'A valid verse reference is required.';
  end if;
  if p_accuracy_percentage is null or p_accuracy_percentage < 0 or p_accuracy_percentage > 100 then
    raise exception 'Accuracy must be between 0 and 100.';
  end if;
  if p_passed and p_accuracy_percentage < 70 then
    raise exception 'A passing recital requires at least 70 percent accuracy.';
  end if;

  if p_passed then
    update public.verse_recital_daily_results
    set verse_reference = p_verse_reference,
        accuracy_percentage = greatest(accuracy_percentage, p_accuracy_percentage),
        passed = true,
        points_awarded = 100,
        transcription = left(coalesce(p_transcription, ''), 8000),
        feedback = left(coalesce(p_feedback, ''), 1200),
        ai_teacher_comment = left(coalesce(p_ai_teacher_comment, ''), 1200),
        updated_at = now()
    where student_id = p_student_id
      and activity_date = p_activity_date
      and passed = false
    returning true into v_row_found;

    if found then
      v_points_awarded := 100;
    else
      insert into public.verse_recital_daily_results (
        student_id, activity_date, verse_reference, accuracy_percentage,
        passed, points_awarded, transcription, feedback, ai_teacher_comment
      )
      values (
        p_student_id, p_activity_date, p_verse_reference, p_accuracy_percentage,
        true, 100, left(coalesce(p_transcription, ''), 8000),
        left(coalesce(p_feedback, ''), 1200), left(coalesce(p_ai_teacher_comment, ''), 1200)
      )
      on conflict (student_id, activity_date) do nothing
      returning true into v_row_found;

      if found then
        v_points_awarded := 100;
      end if;
    end if;
  else
    insert into public.verse_recital_daily_results (
      student_id, activity_date, verse_reference, accuracy_percentage,
      passed, points_awarded, transcription, feedback, ai_teacher_comment
    )
    values (
      p_student_id, p_activity_date, p_verse_reference, p_accuracy_percentage,
      false, 0, left(coalesce(p_transcription, ''), 8000),
      left(coalesce(p_feedback, ''), 1200), left(coalesce(p_ai_teacher_comment, ''), 1200)
    )
    on conflict (student_id, activity_date) do update
      set verse_reference = excluded.verse_reference,
          accuracy_percentage = greatest(public.verse_recital_daily_results.accuracy_percentage, excluded.accuracy_percentage),
          transcription = excluded.transcription,
          feedback = excluded.feedback,
          ai_teacher_comment = excluded.ai_teacher_comment,
          updated_at = now()
      where public.verse_recital_daily_results.passed = false;
  end if;

  if v_points_awarded > 0 then
    update public.profiles
    set points = coalesce(points, 0) + v_points_awarded
    where id = p_student_id
    returning points into v_total_points;
  else
    select points into v_total_points
    from public.profiles
    where id = p_student_id;
  end if;

  if v_total_points is null then
    raise exception 'Student profile was not found.';
  end if;

  return jsonb_build_object(
    'pointsAwarded', v_points_awarded,
    'totalPoints', v_total_points
  );
end;
$$;

revoke all on function public.record_verse_recital_daily_result(uuid, date, text, integer, boolean, text, text, text) from public, anon, authenticated;
grant execute on function public.record_verse_recital_daily_result(uuid, date, text, integer, boolean, text, text, text) to service_role;
