drop policy "Users can create their own Agpeya prayer records" on public.agpeya_prayers;
drop policy "Users can update their own Agpeya prayer records" on public.agpeya_prayers;

create policy "Users can create their own current Cairo day Agpeya record"
  on public.agpeya_prayers
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and date = (now() at time zone 'Africa/Cairo')::date
    and completed_hours - ARRAY['prime','terce','sext','none','vespers','compline','midnight']::text[] = '{}'::jsonb
    and not jsonb_path_exists(completed_hours, '$.* ? (@.type() != "boolean")')
  );

create policy "Users can update their own current Cairo day Agpeya record"
  on public.agpeya_prayers
  for update
  to authenticated
  using (
    (select auth.uid()) = user_id
    and date = (now() at time zone 'Africa/Cairo')::date
  )
  with check (
    (select auth.uid()) = user_id
    and date = (now() at time zone 'Africa/Cairo')::date
    and completed_hours - ARRAY['prime','terce','sext','none','vespers','compline','midnight']::text[] = '{}'::jsonb
    and not jsonb_path_exists(completed_hours, '$.* ? (@.type() != "boolean")')
  );
