-- Keep achievement badge visuals within the Anba Mousa brand palette.
update public.achievement_badges
set style = case category
  when 'prayer' then 'teal'
  when 'hymns' then 'coral'
  when 'taxis' then 'green'
  when 'quizzes' then 'blue'
  when 'learning' then 'gold'
  else 'teal'
end
where style = 'violet';

alter table public.achievement_badges
  drop constraint if exists achievement_badges_style_check;

alter table public.achievement_badges
  add constraint achievement_badges_style_check
  check (style in ('gold','teal','coral','blue','green','rose'));
