-- Remove rose/pink badge gradients; keep all achievement art within the brand palette.
update public.achievement_badges set style='red' where style='rose';

alter table public.achievement_badges
  drop constraint if exists achievement_badges_style_check;

alter table public.achievement_badges
  add constraint achievement_badges_style_check
  check (style in ('gold','teal','coral','blue','green','red'));
