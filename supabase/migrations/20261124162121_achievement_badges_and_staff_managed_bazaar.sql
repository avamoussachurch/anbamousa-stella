-- Configurable achievement engine and staff-managed Points Bazaar.
create table if not exists public.achievement_badges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9_-]{1,79}$'),
  title_en text not null check (char_length(title_en) between 1 and 100),
  title_ar text not null check (char_length(title_ar) between 1 and 120),
  description_en text not null default '' check (char_length(description_en) <= 500),
  description_ar text not null default '' check (char_length(description_ar) <= 500),
  category text not null check (category in ('learning','hymns','taxis','prayer','quizzes','community','attendance','consistency','service')),
  icon text not null default 'award' check (char_length(icon) <= 40),
  style text not null default 'gold' check (style in ('gold','teal','coral','violet','blue','green','rose')),
  criteria jsonb not null default '{}'::jsonb check (jsonb_typeof(criteria) = 'object'),
  points_reward integer not null default 0 check (points_reward between 0 and 10000),
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.achievement_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in ('lesson_opened','lesson_completed','hymn_opened','hymn_mastered','taxis_opened','taxis_completed','prayer_day','quiz_passed','attendance_present','community_post','community_reaction','memory_verse','class_participation','learning_day')),
  source_key text not null check (char_length(source_key) between 1 and 180),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  occurred_at timestamptz not null default now(),
  unique(student_id, source_key)
);
create table if not exists public.achievement_unlocks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.achievement_badges(id) on delete restrict,
  earned_at timestamptz not null default now(),
  points_awarded integer not null default 0 check (points_awarded >= 0),
  evidence jsonb not null default '{}'::jsonb,
  unique(student_id, badge_id)
);
create table if not exists public.achievement_category_milestones (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('learning','hymns','taxis','prayer','quizzes','community','attendance','consistency','service')),
  badge_count integer not null check (badge_count between 1 and 100),
  title_en text not null check (char_length(title_en) between 1 and 100),
  title_ar text not null check (char_length(title_ar) between 1 and 120),
  points_reward integer not null check (points_reward between 0 and 10000),
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique(category, badge_count)
);
create table if not exists public.achievement_milestone_awards (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  milestone_id uuid not null references public.achievement_category_milestones(id) on delete restrict,
  awarded_at timestamptz not null default now(),
  points_awarded integer not null check (points_awarded >= 0),
  unique(student_id, milestone_id)
);
create table if not exists public.reward_catalog (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9_-]{1,79}$'),
  title_en text not null check (char_length(title_en) between 1 and 120),
  title_ar text not null check (char_length(title_ar) between 1 and 140),
  description_en text not null default '' check (char_length(description_en) <= 500),
  description_ar text not null default '' check (char_length(description_ar) <= 500),
  points_cost integer not null check (points_cost between 1 and 100000),
  icon text not null default 'gift' check (char_length(icon) <= 40),
  image_url text,
  stock_remaining integer check (stock_remaining is null or stock_remaining >= 0),
  is_active boolean not null default true,
  display_order integer not null default 0,
  fulfillment_note text not null default '' check (char_length(fulfillment_note) <= 500),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.reward_requests add column if not exists fulfilled_at timestamptz, add column if not exists fulfilled_by uuid references auth.users(id) on delete set null, add column if not exists fulfillment_note text;
create index if not exists achievement_events_student_type_time_idx on public.achievement_events(student_id,event_type,occurred_at desc);
create index if not exists achievement_unlocks_student_category_idx on public.achievement_unlocks(student_id,badge_id);
create index if not exists achievement_badges_active_order_idx on public.achievement_badges(is_active,display_order);
create index if not exists reward_catalog_active_order_idx on public.reward_catalog(is_active,display_order);
create index if not exists reward_requests_fulfillment_queue_idx on public.reward_requests(status,fulfilled_at,created_at desc);
alter table public.achievement_badges enable row level security;
alter table public.achievement_events enable row level security;
alter table public.achievement_unlocks enable row level security;
alter table public.achievement_category_milestones enable row level security;
alter table public.achievement_milestone_awards enable row level security;
alter table public.reward_catalog enable row level security;
revoke all on public.achievement_events from anon,authenticated;
grant select on public.achievement_badges,public.achievement_category_milestones,public.reward_catalog to authenticated;
grant insert,update,delete on public.achievement_badges,public.achievement_category_milestones,public.reward_catalog to authenticated;
grant select on public.achievement_unlocks,public.achievement_milestone_awards to authenticated;
drop policy if exists achievement_badges_read_active_or_staff on public.achievement_badges;
create policy achievement_badges_read_active_or_staff on public.achievement_badges for select to authenticated using (is_active or public.has_role('teacher') or public.is_church_admin());
drop policy if exists achievement_badges_staff_manage on public.achievement_badges;
create policy achievement_badges_staff_manage on public.achievement_badges for all to authenticated using (public.has_role('teacher') or public.is_church_admin()) with check (public.has_role('teacher') or public.is_church_admin());
drop policy if exists achievement_events_no_client_access on public.achievement_events;
create policy achievement_events_no_client_access on public.achievement_events for all to authenticated using (false) with check (false);
drop policy if exists achievement_unlocks_read_own_or_staff_scope on public.achievement_unlocks;
create policy achievement_unlocks_read_own_or_staff_scope on public.achievement_unlocks for select to authenticated using (student_id=(select auth.uid()) or public.is_church_admin() or (public.has_role('teacher') and public.can_access_student_data(student_id)));
drop policy if exists achievement_milestones_read_active_or_staff on public.achievement_category_milestones;
create policy achievement_milestones_read_active_or_staff on public.achievement_category_milestones for select to authenticated using (is_active or public.has_role('teacher') or public.is_church_admin());
drop policy if exists achievement_milestones_staff_manage on public.achievement_category_milestones;
create policy achievement_milestones_staff_manage on public.achievement_category_milestones for all to authenticated using (public.has_role('teacher') or public.is_church_admin()) with check (public.has_role('teacher') or public.is_church_admin());
drop policy if exists achievement_milestone_awards_read_own_or_staff_scope on public.achievement_milestone_awards;
create policy achievement_milestone_awards_read_own_or_staff_scope on public.achievement_milestone_awards for select to authenticated using (student_id=(select auth.uid()) or public.is_church_admin() or (public.has_role('teacher') and public.can_access_student_data(student_id)));
drop policy if exists reward_catalog_read_active_or_staff on public.reward_catalog;
create policy reward_catalog_read_active_or_staff on public.reward_catalog for select to authenticated using (is_active or public.has_role('teacher') or public.is_church_admin());
drop policy if exists reward_catalog_staff_manage on public.reward_catalog;
create policy reward_catalog_staff_manage on public.reward_catalog for all to authenticated using (public.has_role('teacher') or public.is_church_admin()) with check (public.has_role('teacher') or public.is_church_admin());
drop policy if exists reward_requests_select_related on public.reward_requests;
create policy reward_requests_select_related on public.reward_requests for select to authenticated using (
  student_id=(select auth.uid()) or public.is_church_admin()
  or exists (select 1 from public.user_relationships ur where ur.parent_id=(select auth.uid()) and ur.child_id=reward_requests.student_id and ur.relationship_type in ('parent_child','guardian_student') and ur.verified_at is not null)
  or (public.has_role('teacher') and public.can_access_student_data(student_id))
);
create or replace function public.record_achievement_event(p_event_type text,p_source_key text,p_metadata jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_student_id uuid := (select auth.uid());
  v_badge record;
  v_milestone record;
  v_count integer;
  v_points integer := 0;
  v_new_badges jsonb := '[]'::jsonb;
  v_new_milestones jsonb := '[]'::jsonb;
  v_inserted_id uuid;
begin
  if v_student_id is null or not public.has_role('student') then raise exception 'STUDENT_AUTHENTICATION_REQUIRED' using errcode='42501'; end if;
  if p_event_type not in ('lesson_opened','lesson_completed','hymn_opened','hymn_mastered','taxis_opened','taxis_completed','prayer_day','quiz_passed','attendance_present','community_post','community_reaction','memory_verse','class_participation','learning_day') then raise exception 'INVALID_ACHIEVEMENT_EVENT' using errcode='22023'; end if;
  if p_source_key is null or char_length(p_source_key) not between 1 and 180 or p_metadata is null or pg_catalog.jsonb_typeof(p_metadata)<>'object' or pg_catalog.pg_column_size(p_metadata)>8192 then raise exception 'INVALID_ACHIEVEMENT_EVENT_PAYLOAD' using errcode='22023'; end if;
  insert into public.achievement_events(student_id,event_type,source_key,metadata) values(v_student_id,p_event_type,p_source_key,p_metadata) on conflict(student_id,source_key) do nothing;
  if not found then return pg_catalog.jsonb_build_object('success',true,'duplicate',true,'new_badges',v_new_badges,'new_milestones',v_new_milestones,'points_awarded',0); end if;
  for v_badge in
    select b.id,b.slug,b.title_en,b.title_ar,b.category,b.icon,b.style,b.points_reward,coalesce((b.criteria->>'count')::integer,1) required_count
    from public.achievement_badges b where b.is_active=true and b.criteria->>'event_type'=p_event_type and coalesce((b.criteria->>'count')::integer,1)>0 order by b.display_order,b.created_at
  loop
    select count(*)::integer into v_count from public.achievement_events e where e.student_id=v_student_id and e.event_type=p_event_type;
    if v_count>=v_badge.required_count then
      v_inserted_id:=null;
      insert into public.achievement_unlocks(student_id,badge_id,points_awarded,evidence) values(v_student_id,v_badge.id,v_badge.points_reward,pg_catalog.jsonb_build_object('event_type',p_event_type,'count',v_count)) on conflict(student_id,badge_id) do nothing returning id into v_inserted_id;
      if v_inserted_id is not null then
        update public.profiles set points=coalesce(points,0)+v_badge.points_reward where id=v_student_id;
        v_points:=v_points+v_badge.points_reward;
        v_new_badges:=v_new_badges||pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('id',v_badge.id,'slug',v_badge.slug,'title_en',v_badge.title_en,'title_ar',v_badge.title_ar,'category',v_badge.category,'icon',v_badge.icon,'style',v_badge.style,'points_reward',v_badge.points_reward));
      end if;
    end if;
  end loop;
  for v_milestone in select m.id,m.category,m.badge_count,m.title_en,m.title_ar,m.points_reward from public.achievement_category_milestones m where m.is_active=true order by m.badge_count
  loop
    select count(*)::integer into v_count from public.achievement_unlocks u join public.achievement_badges b on b.id=u.badge_id where u.student_id=v_student_id and b.category=v_milestone.category;
    if v_count>=v_milestone.badge_count then
      v_inserted_id:=null;
      insert into public.achievement_milestone_awards(student_id,milestone_id,points_awarded) values(v_student_id,v_milestone.id,v_milestone.points_reward) on conflict(student_id,milestone_id) do nothing returning id into v_inserted_id;
      if v_inserted_id is not null then
        update public.profiles set points=coalesce(points,0)+v_milestone.points_reward where id=v_student_id;
        v_points:=v_points+v_milestone.points_reward;
        v_new_milestones:=v_new_milestones||pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('id',v_milestone.id,'category',v_milestone.category,'badge_count',v_milestone.badge_count,'title_en',v_milestone.title_en,'title_ar',v_milestone.title_ar,'points_reward',v_milestone.points_reward));
      end if;
    end if;
  end loop;
  return pg_catalog.jsonb_build_object('success',true,'duplicate',false,'new_badges',v_new_badges,'new_milestones',v_new_milestones,'points_awarded',v_points);
end;
$$;
revoke all on function public.record_achievement_event(text,text,jsonb) from public,anon;
grant execute on function public.record_achievement_event(text,text,jsonb) to authenticated;
create or replace function public.mark_reward_request_fulfilled(p_request_id uuid,p_note text default null)
returns public.reward_requests language plpgsql security definer set search_path='' as $$
declare v_request public.reward_requests%rowtype; v_actor uuid := (select auth.uid());
begin
  if v_actor is null or not (public.has_role('teacher') or public.is_church_admin()) then raise exception 'STAFF_REQUIRED' using errcode='42501'; end if;
  if p_note is not null and char_length(p_note)>500 then raise exception 'FULFILLMENT_NOTE_TOO_LONG' using errcode='22023'; end if;
  update public.reward_requests set fulfilled_at=now(),fulfilled_by=v_actor,fulfillment_note=nullif(pg_catalog.btrim(p_note),'') where id=p_request_id and status='approved' and fulfilled_at is null returning * into v_request;
  if not found then raise exception 'APPROVED_UNFULFILLED_REQUEST_NOT_FOUND' using errcode='P0002'; end if;
  return v_request;
end;
$$;
revoke all on function public.mark_reward_request_fulfilled(uuid,text) from public,anon;
grant execute on function public.mark_reward_request_fulfilled(uuid,text) to authenticated;
create or replace function public.decrement_reward_catalog_stock()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_catalog_id uuid; v_stock integer;
begin
  if new.status='approved' and coalesce(old.status,'')<>'approved' then
    select c.id,c.stock_remaining into v_catalog_id,v_stock from public.reward_catalog c where c.id::text=new.reward_id and c.is_active=true for update;
    if v_catalog_id is not null and v_stock is not null then
      if v_stock<=0 then raise exception 'REWARD_OUT_OF_STOCK'; end if;
      update public.reward_catalog set stock_remaining=stock_remaining-1,updated_at=now() where id=v_catalog_id;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.decrement_reward_catalog_stock() from public,anon,authenticated;
drop trigger if exists reward_catalog_stock_on_approval on public.reward_requests;
create trigger reward_catalog_stock_on_approval before update of status on public.reward_requests for each row execute function public.decrement_reward_catalog_stock();

insert into public.achievement_badges(slug,title_en,title_ar,description_en,description_ar,category,icon,style,criteria,points_reward,display_order) values
('first-steps','First Steps','أول خطوة','Open your first Sunday School lesson.','افتح أول درس في مدارس الأحد.','learning','book-open','teal','{"event_type":"lesson_opened","count":1}',10,10),
('curious-mind','Curious Mind','عقل فضولي','Explore five lessons.','استكشف خمسة دروس.','learning','compass','blue','{"event_type":"lesson_opened","count":5}',20,20),
('lesson-legend','Lesson Legend','بطل الدروس','Open twenty lessons.','افتح عشرين درسًا.','learning','graduation-cap','gold','{"event_type":"lesson_opened","count":20}',60,30),
('faithful-finisher','Faithful Finisher','المثابر','Complete your first lesson.','أكمل أول درس.','learning','book-check','green','{"event_type":"lesson_completed","count":1}',20,40),
('knowledge-builder','Knowledge Builder','باني المعرفة','Complete ten lessons.','أكمل عشرة دروس.','learning','library','violet','{"event_type":"lesson_completed","count":10}',80,50),
('first-hymn','First Hymn','أول لحن','Open your first hymn.','افتح أول لحن.','hymns','music','rose','{"event_type":"hymn_opened","count":1}',10,60),
('hymn-explorer','Hymn Explorer','مستكشف الألحان','Explore ten hymns.','استكشف عشرة ألحان.','hymns','audio-lines','gold','{"event_type":"hymn_opened","count":10}',40,70),
('hymn-heart','Hymn Heart','قلب التسبيح','Master five hymns.','أتقن خمسة ألحان.','hymns','heart','coral','{"event_type":"hymn_mastered","count":5}',60,80),
('taxis-starter','Ritual Explorer','مستكشف الطقس','Open your first Coptic Taxis item.','افتح أول موضوع في الطقس القبطي.','taxis','scroll-text','teal','{"event_type":"taxis_opened","count":1}',10,90),
('taxis-scholar','Taxis Scholar','دارس الطقس','Explore ten Taxis items.','استكشف عشرة موضوعات في الطقس.','taxis','book-open-check','blue','{"event_type":"taxis_opened","count":10}',40,100),
('prayer-beginning','A Quiet Beginning','بداية هادئة','Record your first prayer day.','سجل أول يوم صلاة.','prayer','heart-handshake','violet','{"event_type":"prayer_day","count":1}',15,110),
('prayer-seven','Seven Days of Prayer','سبعة أيام صلاة','Keep seven recorded prayer days.','سجل الصلاة في سبعة أيام.','prayer','calendar-heart','gold','{"event_type":"prayer_day","count":7}',60,120),
('prayer-thirty','Faithful in Prayer','أمين في الصلاة','Record thirty prayer days.','سجل الصلاة في ثلاثين يومًا.','prayer','church','green','{"event_type":"prayer_day","count":30}',150,130),
('quiz-spark','Quick Thinker','ذهن متقد','Pass your first quiz.','اجتز أول اختبار.','quizzes','brain','blue','{"event_type":"quiz_passed","count":1}',20,140),
('quiz-champion','Quiz Champion','بطل الاختبارات','Pass ten quizzes.','اجتز عشرة اختبارات.','quizzes','trophy','gold','{"event_type":"quiz_passed","count":10}',100,150),
('present-heart','Present Heart','قلب حاضر','Attend your first recorded class.','احضر أول فصل مسجل.','attendance','calendar-check','green','{"event_type":"attendance_present","count":1}',20,160),
('community-light','Community Light','نور المجتمع','Share your first community post.','شارك أول منشور في المجتمع.','community','messages-square','coral','{"event_type":"community_post","count":1}',15,170),
('kind-reaction','Kindness Spark','شرارة محبة','React to five community posts.','تفاعل مع خمسة منشورات.','community','heart','rose','{"event_type":"community_reaction","count":5}',25,180),
('memory-keeper','Memory Keeper','حافظ الآيات','Save five memory verses.','احفظ خمس آيات.','learning','bookmark-check','violet','{"event_type":"memory_verse","count":5}',40,190),
('class-helper','Class Helper','مساعد الفصل','Join five class activities.','شارك في خمسة أنشطة للفصل.','service','hand-heart','teal','{"event_type":"class_participation","count":5}',40,200)
on conflict(slug) do nothing;
insert into public.achievement_category_milestones(category,badge_count,title_en,title_ar,points_reward,display_order) values
('learning',3,'Learning Trailblazer','رائد التعلم',50,10),('learning',6,'Learning Champion','بطل التعلم',120,20),('learning',10,'Learning Master','ماهر التعلم',250,30),
('hymns',3,'Hymn Explorer','مستكشف الألحان',50,40),('hymns',6,'Hymn Champion','بطل الألحان',120,50),('hymns',10,'Hymn Master','ماهر الألحان',250,60),
('taxis',3,'Ritual Pathfinder','رائد الطقس',50,70),('taxis',6,'Ritual Champion','بطل الطقس',120,80),('taxis',10,'Ritual Scholar','دارس الطقس',250,90),
('prayer',3,'Prayer Companion','رفيق الصلاة',50,100),('prayer',6,'Prayer Champion','بطل الصلاة',120,110),('prayer',10,'Prayer Pillar','عمود الصلاة',250,120),
('quizzes',3,'Quiz Adventurer','مغامر الاختبارات',50,130),('quizzes',6,'Quiz Champion','بطل الاختبارات',120,140),('quizzes',10,'Quiz Master','ماهر الاختبارات',250,150),
('community',3,'Community Builder','باني المجتمع',50,160),('community',6,'Community Star','نجم المجتمع',120,170),('community',10,'Community Hero','بطل المجتمع',250,180),
('attendance',3,'Faithful Presence','الحضور الأمين',50,190),('attendance',6,'Always There','دائم الحضور',120,200),('attendance',10,'Steadfast Servant','خادم أمين',250,210),
('service',3,'Helpful Hands','أيادٍ محبة',50,220),('service',6,'Service Star','نجم الخدمة',120,230),('service',10,'Service Champion','بطل الخدمة',250,240)
on conflict(category,badge_count) do nothing;
insert into public.reward_catalog(slug,title_en,title_ar,description_en,description_ar,points_cost,icon,stock_remaining,display_order) values
('saint-picture','Small Saint Picture','صورة قديس صغيرة','A small printed saint picture.','صورة مطبوعة صغيرة لقديس.',50,'image',null,10),
('wooden-icon','Wooden Icon','أيقونة خشبية','A small wooden icon.','أيقونة خشبية صغيرة.',100,'church',null,20),
('church-notebook','Church Notebook','كشكول الكنيسة','A notebook for notes and reflections.','كشكول لتدوين الملاحظات والتأملات.',150,'notebook-pen',null,30),
('cross-necklace','Cross Necklace','سلسلة صليب','A church-approved cross necklace.','سلسلة صليب معتمدة من الكنيسة.',200,'cross',null,40)
on conflict(slug) do nothing;
