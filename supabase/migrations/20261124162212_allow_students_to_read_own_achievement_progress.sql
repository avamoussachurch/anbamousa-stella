grant select on public.achievement_events to authenticated;
drop policy if exists achievement_events_read_own on public.achievement_events;
create policy achievement_events_read_own on public.achievement_events
for select to authenticated using (student_id = (select auth.uid()));