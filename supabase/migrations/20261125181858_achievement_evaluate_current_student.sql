create or replace function public.evaluate_my_achievements()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_student_id uuid := auth.uid();
begin
  if v_student_id is null or not public.has_role('student') then
    raise exception 'STUDENT_AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;

  return public.evaluate_student_achievements(v_student_id);
end;
$function$;

revoke all on function public.evaluate_my_achievements() from public, anon;
grant execute on function public.evaluate_my_achievements() to authenticated;
