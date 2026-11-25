insert into public.achievement_badges
  (slug,title_en,title_ar,description_en,description_ar,category,icon,style,criteria,points_reward,is_active,display_order)
values
('bookmark-keeper','Bookmark Keeper','حافظ الإشارات','Save five community posts for later.','احفظ خمسة منشورات للرجوع إليها لاحقاً.','community','bookmark-check','coral','{"event_type":"community_bookmark","count":5}'::jsonb,60,true,490)
on conflict (slug) do nothing;
