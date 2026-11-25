delete from public.achievement_category_milestones where category = 'service';

update public.achievement_category_milestones
set badge_count = 1
where category in ('attendance','community','consistency','quizzes') and badge_count = 3;
update public.achievement_category_milestones
set badge_count = 2
where category in ('attendance','community','consistency','quizzes') and badge_count = 6;
update public.achievement_category_milestones
set badge_count = 3
where category in ('attendance','community','consistency','quizzes') and badge_count = 10;

update public.achievement_category_milestones set badge_count = 2 where category in ('prayer','taxis') and badge_count = 3;
update public.achievement_category_milestones set badge_count = 3 where category in ('prayer','taxis') and badge_count = 6;
update public.achievement_category_milestones set badge_count = 4 where category in ('prayer','taxis') and badge_count = 10;

update public.achievement_category_milestones set badge_count = 2 where category = 'hymns' and badge_count = 3;
update public.achievement_category_milestones set badge_count = 4 where category = 'hymns' and badge_count = 6;
update public.achievement_category_milestones set badge_count = 5 where category = 'hymns' and badge_count = 10;

update public.achievement_category_milestones set badge_count = 5 where category = 'learning' and badge_count = 6;
update public.achievement_category_milestones set badge_count = 7 where category = 'learning' and badge_count = 10;
