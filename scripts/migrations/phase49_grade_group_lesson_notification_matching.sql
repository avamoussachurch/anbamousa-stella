create or replace function private.notify_lesson_recipients(p_lesson_id uuid,p_version_id uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public, private as $$
declare v_lesson record; v_student record; v_parent record;
begin
  select l.id,l.title_en,l.title_ar,l.grade_level,lv.status as version_status
  into v_lesson
  from public.lessons l
  join public.lesson_versions lv on lv.id=p_version_id and lv.lesson_id=l.id
  where l.id=p_lesson_id and l.active_version_id=p_version_id;
  if not found or upper(coalesce(v_lesson.version_status,'')) <> 'PUBLISHED' then return; end if;

  for v_student in
    select distinct p.id,p.name
    from public.profiles p
    left join public.class_memberships cm on cm.student_id=p.id and cm.status='active' and cm.left_at is null
    left join public.class_instances ci on ci.id=cm.class_instance_id and ci.church_year_id=cm.church_year_id
    where p.role='student'
      and (
        v_lesson.grade_level is null
        or p.grade=v_lesson.grade_level
        or cm.exact_grade=v_lesson.grade_level
        or (v_lesson.grade_level ilike '%5th-6th%' and ci.class_group_id='primary_2')
        or (v_lesson.grade_level ilike '%primary 1%3%' and ci.class_group_id='primary_1')
        or (v_lesson.grade_level ilike '%primary 4%6%' and ci.class_group_id='primary_2')
        or (v_lesson.grade_level ilike '%preparatory%' and ci.class_group_id='preparatory')
        or (v_lesson.grade_level ilike '%high school%' and ci.class_group_id='secondary')
        or (v_lesson.grade_level ilike '%university%' and ci.class_group_id='university')
        or (v_lesson.grade_level ilike '%youth%' and ci.class_group_id in ('secondary','university'))
      )
  loop
    perform private.enqueue_notification(v_student.id,'lesson','A new lesson is ready for you','درس جديد جاهز ليك',
      'A new Sunday School lesson has been published: '||coalesce(v_lesson.title_en,'New lesson'),
      'تم نشر درس جديد: '||coalesce(v_lesson.title_ar,v_lesson.title_en,'درس جديد'),
      'published-lesson:'||v_lesson.id::text||':'||p_version_id::text,
      'lessons',jsonb_build_object('lessonId',v_lesson.id,'versionId',p_version_id));
    for v_parent in select distinct ur.parent_id from public.user_relationships ur
      where ur.child_id=v_student.id and ur.verified_at is not null
        and ur.relationship_type in ('parent_child','guardian_student') loop
      perform private.enqueue_notification(v_parent.parent_id,'lesson','A new lesson is ready for your child','درس جديد جاهز لابنك/بنتك',
        'A new lesson is available for '||coalesce(v_student.name,'your child')||': '||coalesce(v_lesson.title_en,'New lesson'),
        'درس جديد متاح لـ '||coalesce(v_student.name,'ابنك/بنتك')||': '||coalesce(v_lesson.title_ar,v_lesson.title_en,'درس جديد'),
        'child-published-lesson:'||v_student.id::text||':'||v_lesson.id::text||':'||p_version_id::text,
        'children',jsonb_build_object('childId',v_student.id,'lessonId',v_lesson.id,'versionId',p_version_id));
    end loop;
  end loop;
end; $$;
