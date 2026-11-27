-- Cache auth.uid() once per statement instead of re-evaluating it for every row.
do $$
declare
  policy_row record;
  next_using text;
  next_check text;
  statement text;
begin
  for policy_row in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'feed_post_class_targets',
        'profile_follows',
        'feed_post_poll_votes',
        'church_event_rsvps',
        'feed_post_polls',
        'feed_post_poll_options',
        'profile_customizations',
        'hymn_practice_submissions',
        'feed_post_grade_targets'
      )
      and (
        coalesce(qual, '') like '%auth.uid()%'
        or coalesce(with_check, '') like '%auth.uid()%'
      )
  loop
    next_using := case when policy_row.qual is null then null
      else replace(policy_row.qual, 'auth.uid()', '(select auth.uid())') end;
    next_check := case when policy_row.with_check is null then null
      else replace(policy_row.with_check, 'auth.uid()', '(select auth.uid())') end;

    statement := format('alter policy %I on %I.%I',
      policy_row.policyname, policy_row.schemaname, policy_row.tablename);
    if next_using is not null then
      statement := statement || format(' using (%s)', next_using);
    end if;
    if next_check is not null then
      statement := statement || format(' with check (%s)', next_check);
    end if;
    execute statement;
  end loop;
end
$$;

-- Keep SELECT access in the dedicated read policies. Split write-only policies
-- so they do not also grant a second permissive SELECT path.

drop policy if exists church_event_rsvps_write_own on public.church_event_rsvps;
create policy church_event_rsvps_insert_own
  on public.church_event_rsvps for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy church_event_rsvps_update_own
  on public.church_event_rsvps for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy church_event_rsvps_delete_own
  on public.church_event_rsvps for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists feed_post_class_targets_author_write on public.feed_post_class_targets;
create policy feed_post_class_targets_author_insert
  on public.feed_post_class_targets for insert to authenticated
  with check (
    exists (
      select 1 from public.feed_posts p
      where p.id = feed_post_class_targets.post_id
        and (p.author_id = (select auth.uid()) or has_role('admin'))
    )
    and (
      has_role('admin')
      or exists (
        select 1
        from public.servant_class_assignments a
        join public.class_instances ci on ci.id = a.class_instance_id and ci.church_year_id = a.church_year_id
        join public.church_years cy on cy.id = a.church_year_id and cy.is_active = true
        where a.class_instance_id = feed_post_class_targets.class_instance_id
          and a.servant_id = (select auth.uid()) and a.is_active = true
      )
      or exists (
        select 1
        from public.class_memberships m
        join public.class_instances ci on ci.id = m.class_instance_id and ci.church_year_id = m.church_year_id
        join public.church_years cy on cy.id = m.church_year_id and cy.is_active = true
        where m.class_instance_id = feed_post_class_targets.class_instance_id
          and m.student_id = (select auth.uid()) and m.status = 'active'
      )
    )
  );
create policy feed_post_class_targets_author_update
  on public.feed_post_class_targets for update to authenticated
  using (
    exists (
      select 1 from public.feed_posts p
      where p.id = feed_post_class_targets.post_id
        and (p.author_id = (select auth.uid()) or has_role('admin'))
    )
  )
  with check (
    exists (
      select 1 from public.feed_posts p
      where p.id = feed_post_class_targets.post_id
        and (p.author_id = (select auth.uid()) or has_role('admin'))
    )
    and (
      has_role('admin')
      or exists (
        select 1
        from public.servant_class_assignments a
        join public.class_instances ci on ci.id = a.class_instance_id and ci.church_year_id = a.church_year_id
        join public.church_years cy on cy.id = a.church_year_id and cy.is_active = true
        where a.class_instance_id = feed_post_class_targets.class_instance_id
          and a.servant_id = (select auth.uid()) and a.is_active = true
      )
      or exists (
        select 1
        from public.class_memberships m
        join public.class_instances ci on ci.id = m.class_instance_id and ci.church_year_id = m.church_year_id
        join public.church_years cy on cy.id = m.church_year_id and cy.is_active = true
        where m.class_instance_id = feed_post_class_targets.class_instance_id
          and m.student_id = (select auth.uid()) and m.status = 'active'
      )
    )
  );
create policy feed_post_class_targets_author_delete
  on public.feed_post_class_targets for delete to authenticated
  using (
    exists (
      select 1 from public.feed_posts p
      where p.id = feed_post_class_targets.post_id
        and (p.author_id = (select auth.uid()) or has_role('admin'))
    )
  );

drop policy if exists feed_post_grade_targets_author_write on public.feed_post_grade_targets;
create policy feed_post_grade_targets_author_insert
  on public.feed_post_grade_targets for insert to authenticated
  with check (
    exists (
      select 1 from public.feed_posts p
      where p.id = feed_post_grade_targets.post_id
        and (p.author_id = (select auth.uid()) or has_role('admin'))
    )
    and (
      has_role('admin')
      or exists (
        select 1
        from public.servant_class_assignments a
        join public.class_instances ci on ci.id = a.class_instance_id and ci.church_year_id = a.church_year_id
        join public.church_years cy on cy.id = a.church_year_id and cy.is_active = true
        where a.is_active = true and a.servant_id = (select auth.uid())
          and ci.class_group_id = feed_post_grade_targets.grade
      )
      or exists (
        select 1 from public.profiles p
        where p.id = (select auth.uid())
          and profile_grade_class_group(p.grade) = feed_post_grade_targets.grade
      )
    )
  );
create policy feed_post_grade_targets_author_update
  on public.feed_post_grade_targets for update to authenticated
  using (
    exists (
      select 1 from public.feed_posts p
      where p.id = feed_post_grade_targets.post_id
        and (p.author_id = (select auth.uid()) or has_role('admin'))
    )
  )
  with check (
    exists (
      select 1 from public.feed_posts p
      where p.id = feed_post_grade_targets.post_id
        and (p.author_id = (select auth.uid()) or has_role('admin'))
    )
    and (
      has_role('admin')
      or exists (
        select 1
        from public.servant_class_assignments a
        join public.class_instances ci on ci.id = a.class_instance_id and ci.church_year_id = a.church_year_id
        join public.church_years cy on cy.id = a.church_year_id and cy.is_active = true
        where a.is_active = true and a.servant_id = (select auth.uid())
          and ci.class_group_id = feed_post_grade_targets.grade
      )
      or exists (
        select 1 from public.profiles p
        where p.id = (select auth.uid())
          and profile_grade_class_group(p.grade) = feed_post_grade_targets.grade
      )
    )
  );
create policy feed_post_grade_targets_author_delete
  on public.feed_post_grade_targets for delete to authenticated
  using (
    exists (
      select 1 from public.feed_posts p
      where p.id = feed_post_grade_targets.post_id
        and (p.author_id = (select auth.uid()) or has_role('admin'))
    )
  );
