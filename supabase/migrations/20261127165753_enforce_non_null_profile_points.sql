update public.profiles set points = 0 where points is null;
alter table public.profiles alter column points set default 0;
alter table public.profiles alter column points set not null;
