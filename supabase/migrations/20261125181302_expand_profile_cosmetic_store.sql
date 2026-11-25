insert into public.profile_cosmetic_catalog
  (id,kind,title_en,title_ar,description_en,description_ar,preview_start,preview_end,points_cost,rarity,display_order)
values
('frame-archangel-sapphire','frame','Archangel Sapphire','ياقوت ميخائيل','A sapphire frame inspired by the heavenly hosts.','إطار ياقوتي مستوحى من رؤساء الملائكة.','#0F3D6E','#6FA8DC',600,'rare',130),
('frame-martyr-ruby','frame','Martyr Ruby','ياقوت الشهداء','A bold ruby frame for courageous faith.','إطار ياقوتي قوي لشجاعة الإيمان.','#5C1B28','#D95D5D',650,'rare',140),
('frame-olive-crown','frame','Olive Crown','إكليل الزيتون','An olive-and-gold crown frame.','إطار بإكليل الزيتون والذهب.','#1B5E20','#C7D86A',800,'epic',150),
('banner-nile-moonlight','banner','Nile Moonlight','ضوء القمر على النيل','A calm Nile night in deep blue and teal.','ليلة هادئة على النيل بالأزرق والفيروزي.','#0F3448','#38A6A8',500,'rare',160),
('banner-kiahk-candlelight','banner','Kiahk Candlelight','شموع كيهك','Warm candlelight for the Kiahk season.','دفء الشموع في شهر كيهك.','#2E1C43','#F6C86F',650,'epic',170),
('banner-golden-desert','banner','Golden Desert','البرية الذهبية','Golden light across the desert hills.','نور ذهبي فوق تلال البرية.','#7A3E1D','#F0C16B',450,'rare',180),
('badge-gospel-light','badge','Gospel Light','نور الإنجيل','A badge for growing in the Word.','شارة للنمو في كلمة الله.','#9A6A1F','#FDE68A',350,'rare',190),
('badge-servant-heart','badge','Servant Heart','قلب الخادم','A badge celebrating service and kindness.','شارة تحتفل بالخدمة والمحبة.','#9F1239','#FDA4AF',400,'rare',200),
('badge-cross-victory','badge','Cross of Victory','صليب النصرة','A bright sign of hope in the Cross.','علامة مضيئة للرجاء في الصليب.','#1D4ED8','#93C5FD',600,'epic',210),
('effect-emerald-aura','effect','Emerald Aura','هالة الزمرد','A soft emerald aura around your profile.','هالة زمردية هادئة حول ملفك.','#065F46','#6EE7B7',900,'epic',220),
('effect-golden-radiance','effect','Golden Radiance','الإشراق الذهبي','A radiant golden profile glow.','إشراق ذهبي مضيء للملف الشخصي.','#92400E','#FDE68A',1200,'legendary',230),
('effect-celestial-blue','effect','Celestial Blue','الأزرق السماوي','A celestial blue shimmer around your profile.','لمعة زرقاء سماوية حول ملفك الشخصي.','#1D4ED8','#A5B4FC',1100,'legendary',240)
on conflict (id) do nothing;
