-- Shared scripture source for the Verse of the Day card and scheduled notifications.
CREATE TABLE IF NOT EXISTS public.daily_scripture_verses (
  rotation_order smallint PRIMARY KEY CHECK (rotation_order > 0),
  text_en text NOT NULL,
  text_ar text NOT NULL,
  reference_en text NOT NULL,
  reference_ar text NOT NULL,
  source_label text NOT NULL DEFAULT 'Arabic Van Dyck text',
  source_url text NOT NULL DEFAULT 'https://ebible.org/arb-vd/',
  study_url text NOT NULL DEFAULT 'https://st-takla.org/Bibles/BibleSearch/',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.daily_scripture_verses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read active daily scripture" ON public.daily_scripture_verses;
CREATE POLICY "Public can read active daily scripture" ON public.daily_scripture_verses
  FOR SELECT TO anon, authenticated USING (is_active = true);
GRANT SELECT ON public.daily_scripture_verses TO anon, authenticated;

INSERT INTO public.daily_scripture_verses (rotation_order,text_en,text_ar,reference_en,reference_ar)
VALUES
(1,'The Lord is my shepherd; I shall not want.','الرَّبُّ رَاعِيَّ فَلَا يُعْوِزُنِي شَيْءٌ.','Psalm 23:1','مزمور ٢٣: ١'),
(2,'The Lord is my light and my salvation; whom shall I fear?','الرَّبُّ نُورِي وَخَلَاصِي، مِمَّنْ أَخَافُ؟ الرَّبُّ حِصْنُ حَيَاتِي، مِمَّنْ أَرْتَعِبُ؟','Psalm 27:1','مزمور ٢٧: ١'),
(3,'God is our refuge and strength, a very present help in trouble.','اَللهُ لَنَا مَلْجَأٌ وَقُوَّةٌ. عَوْنًا فِي الضِّيقَاتِ وُجِدَ شَدِيدًا.','Psalm 46:1','مزمور ٤٦: ١'),
(4,'Your word is a lamp to my feet and a light to my path.','سِرَاجٌ لِرِجْلِي كَلَامُكَ وَنُورٌ لِسَبِيلِي.','Psalm 119:105','مزمور ١١٩: ١٠٥'),
(5,'Trust in the Lord with all your heart, and lean not on your own understanding.','تَوَكَّلْ عَلَى الرَّبِّ بِكُلِّ قَلْبِكَ، وَعَلَى فَهْمِكَ لَا تَعْتَمِدْ.','Proverbs 3:5','أمثال ٣: ٥'),
(6,'Those who wait on the Lord shall renew their strength.','وَأَمَّا مُنْتَظِرُو الرَّبِّ فَيُجَدِّدُونَ قُوَّةً. يَرْفَعُونَ أَجْنِحَةً كَالنُّسُورِ. يَرْكُضُونَ وَلَا يَتْعَبُونَ. يَمْشُونَ وَلَا يُعْيُونَ.','Isaiah 40:31','إشعياء ٤٠: ٣١'),
(7,'Let your light so shine before men, that they may see your good works.','فَلْيُضِئْ نُورُكُمْ هكَذَا قُدَّامَ النَّاسِ، لِكَيْ يَرَوْا أَعْمَالَكُمُ الْحَسَنَةَ وَيُمَجِّدُوا أَبَاكُمُ الَّذِي فِي السَّمَاوَاتِ.','Matthew 5:16','متى ٥: ١٦'),
(8,'Seek first the kingdom of God and His righteousness.','لكِنِ اطْلُبُوا أَوَّلًا مَلَكُوتَ اللهِ وَبِرَّهُ، وَهذِهِ كُلُّهَا تُزَادُ لَكُمْ.','Matthew 6:33','متى ٦: ٣٣'),
(9,'Come to Me, all you who labor and are heavy laden, and I will give you rest.','تَعَالَوْا إِلَيَّ يَا جَمِيعَ الْمُتْعَبِينَ وَالثَّقِيلِي الأَحْمَالِ، وَأَنَا أُرِيحُكُمْ.','Matthew 11:28','متى ١١: ٢٨'),
(10,'I am the light of the world. He who follows Me shall not walk in darkness.','أَنَا هُوَ نُورُ الْعَالَمِ. مَنْ يَتْبَعْنِي فَلَا يَمْشِي فِي الظُّلْمَةِ بَلْ يَكُونُ لَهُ نُورُ الْحَيَاةِ.','John 8:12','يوحنا ٨: ١٢'),
(11,'Peace I leave with you, My peace I give to you; let not your heart be troubled.','سَلَامًا أَتْرُكُ لَكُمْ. سَلَامِي أُعْطِيكُمْ. لَيْسَ كَمَا يُعْطِي الْعَالَمُ أُعْطِيكُمْ أَنَا. لَا تَضْطَرِبْ قُلُوبُكُمْ وَلَا تَرْهَبْ.','John 14:27','يوحنا ١٤: ٢٧'),
(12,'I am the vine, you are the branches. He who abides in Me bears much fruit.','أَنَا الْكَرْمَةُ وَأَنْتُمُ الأَغْصَانُ. الَّذِي يَثْبُتُ فِيَّ وَأَنَا فِيهِ هذَا يَأْتِي بِثَمَرٍ كَثِيرٍ.','John 15:5','يوحنا ١٥: ٥'),
(13,'We know that all things work together for good to those who love God.','وَنَحْنُ نَعْلَمُ أَنَّ كُلَّ الأَشْيَاءِ تَعْمَلُ مَعًا لِلْخَيْرِ لِلَّذِينَ يُحِبُّونَ اللهَ، الَّذِينَ هُمْ مَدْعُوُّونَ حَسَبَ قَصْدِهِ.','Romans 8:28','رومية ٨: ٢٨'),
(14,'The fruit of the Spirit is love, joy, peace, longsuffering, kindness, goodness, faithfulness, gentleness, self-control.','وَأَمَّا ثَمَرُ الرُّوحِ فَهُوَ: مَحَبَّةٌ فَرَحٌ سَلَامٌ، طُولُ أَنَاةٍ لُطْفٌ صَلَاحٌ، إِيمَانٌ وَدَاعَةٌ تَعَفُّفٌ.','Galatians 5:22–23','غلاطية ٥: ٢٢–٢٣'),
(15,'Be strong in the Lord and in the power of His might.','تَقَوَّوْا فِي الرَّبِّ وَفِي شِدَّةِ قُوَّتِهِ.','Ephesians 6:10','أفسس ٦: ١٠'),
(16,'Be anxious for nothing, but in everything by prayer and supplication let your requests be made known to God.','لَا تَهْتَمُّوا بِشَيْءٍ، بَلْ فِي كُلِّ شَيْءٍ بِالصَّلَاةِ وَالدُّعَاءِ مَعَ الشُّكْرِ، لِتُعْلَمْ طِلْبَاتُكُمْ لَدَى اللهِ.','Philippians 4:6','فيلبي ٤: ٦'),
(17,'The peace of God, which surpasses all understanding, will guard your hearts and minds through Christ Jesus.','وَسَلَامُ اللهِ الَّذِي يَفُوقُ كُلَّ عَقْلٍ، يَحْفَظُ قُلُوبَكُمْ وَأَفْكَارَكُمْ فِي الْمَسِيحِ يَسُوعَ.','Philippians 4:7','فيلبي ٤: ٧'),
(18,'Whatever you do, do it heartily, as to the Lord and not to men.','وَكُلُّ مَا فَعَلْتُمْ، فَاعْمَلُوا مِنَ الْقَلْبِ، كَمَا لِلرَّبِّ لَيْسَ لِلنَّاسِ.','Colossians 3:23','كولوسي ٣: ٢٣'),
(19,'Casting all your care upon Him, for He cares for you.','مُلْقِينَ كُلَّ هَمِّكُمْ عَلَيْهِ، لأَنَّهُ هُوَ يَعْتَنِي بِكُمْ.','1 Peter 5:7','١ بطرس ٥: ٧'),
(20,'We love Him because He first loved us.','نَحْنُ نُحِبُّهُ لأَنَّهُ هُوَ أَحَبَّنَا أَوَّلًا.','1 John 4:19','١ يوحنا ٤: ١٩'),
(21,'If any of you lacks wisdom, let him ask of God, who gives to all liberally.','وَإِنَّمَا إِنْ كَانَ أَحَدُكُمْ تُعْوِزُهُ حِكْمَةٌ، فَلْيَطْلُبْ مِنَ اللهِ الَّذِي يُعْطِي الْجَمِيعَ بِسَخَاءٍ وَلَا يُعَيِّرُ، فَسَيُعْطَى لَهُ.','James 1:5','يعقوب ١: ٥'),
(22,'The effective, fervent prayer of a righteous man avails much.','طَلِبَةُ الْبَارِّ تَقْتَدِرُ كَثِيرًا فِي فِعْلِهَا.','James 5:16','يعقوب ٥: ١٦'),
(23,'God has not given us a spirit of fear, but of power and of love and of a sound mind.','لأَنَّ اللهَ لَمْ يُعْطِنَا رُوحَ الْفَشَلِ، بَلْ رُوحَ الْقُوَّةِ وَالْمَحَبَّةِ وَالنُّصْحِ.','2 Timothy 1:7','٢ تيموثاوس ١: ٧'),
(24,'Now faith is the substance of things hoped for, the evidence of things not seen.','وَأَمَّا الإِيمَانُ فَهُوَ الثِّقَةُ بِمَا يُرْجَى وَالإِيقَانُ بِأُمُورٍ لَا تُرَى.','Hebrews 11:1','عبرانيين ١١: ١'),
(25,'Let all that you do be done with love.','لِتَصِرْ كُلُّ أُمُورِكُمْ فِي مَحَبَّةٍ.','1 Corinthians 16:14','١ كورنثوس ١٦: ١٤'),
(26,'Oh, taste and see that the Lord is good; blessed is the man who trusts in Him!','ذُوقُوا وَانْظُرُوا مَا أَطْيَبَ الرَّبَّ! طُوبَى لِلرَّجُلِ الْمُتَوَكِّلِ عَلَيْهِ.','Psalm 34:8','مزمور ٣٤: ٨'),
(27,'He who dwells in the secret place of the Most High shall abide under the shadow of the Almighty.','السَّاكِنُ فِي سِتْرِ الْعَلِيِّ، فِي ظِلِّ الْقَدِيرِ يَبِيتُ.','Psalm 91:1','مزمور ٩١: ١'),
(28,'I will lift up my eyes to the hills—from whence comes my help? My help comes from the Lord.','أَرْفَعُ عَيْنَيَّ إِلَى الْجِبَالِ، مِنْ حَيْثُ يَأْتِي عَوْنِي. مَعُونَتِي مِنْ عِنْدِ الرَّبِّ، صَانِعِ السَّمَاوَاتِ وَالأَرْضِ.','Psalm 121:1–2','مزمور ١٢١: ١–٢'),
(29,'Through the Lord’s mercies we are not consumed, because His compassions fail not. They are new every morning.','إِنَّهُ مِنْ إِحْسَانَاتِ الرَّبِّ أَنَّنَا لَمْ نَفْنَ، لأَنَّ مَرَاحِمَهُ لَا تَزُولُ. هِيَ جَدِيدَةٌ فِي كُلِّ صَبَاحٍ. كَثِيرَةٌ أَمَانَتُكَ.','Lamentations 3:22–23','مراثي ٣: ٢٢–٢٣'),
(30,'He has shown you, O man, what is good; and what does the Lord require of you but to do justly, to love mercy, and to walk humbly with your God?','قَدْ أَخْبَرَكَ أَيُّهَا الإِنْسَانُ مَا هُوَ صَالِحٌ، وَمَاذَا يَطْلُبُهُ مِنْكَ الرَّبُّ، إِلَّا أَنْ تَصْنَعَ الْحَقَّ وَتُحِبَّ الرَّحْمَةَ وَتَسْلُكَ مُتَوَاضِعًا مَعَ إِلهِكَ.','Micah 6:8','ميخا ٦: ٨'),
(31,'The Lord is near to those who have a broken heart, and saves such as have a contrite spirit.','قَرِيبٌ هُوَ الرَّبُّ مِنَ الْمُنْكَسِرِي الْقُلُوبِ، وَيُخَلِّصُ الْمُنْسَحِقِي الرُّوحِ.','Psalm 34:18','مزمور ٣٤: ١٨'),
(32,'I can do all things through Christ who strengthens me.','أَسْتَطِيعُ كُلَّ شَيْءٍ فِي الْمَسِيحِ الَّذِي يُقَوِّينِي.','Philippians 4:13','فيلبي ٤: ١٣')
ON CONFLICT (rotation_order) DO UPDATE SET
  text_en=excluded.text_en,text_ar=excluded.text_ar,
  reference_en=excluded.reference_en,reference_ar=excluded.reference_ar,
  is_active=true;

CREATE OR REPLACE FUNCTION private.generate_daily_verse_notifications()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog','public','private'
AS $function$
DECLARE
  v_now timestamp := now() at time zone 'Africa/Cairo';
  v_today date := (now() at time zone 'Africa/Cairo')::date;
  v_index integer;
  v_verse record;
  v_student record;
  v_count integer := 0;
BEGIN
  IF extract(hour FROM v_now) <> 7 THEN RETURN 0; END IF;
  SELECT count(*)::integer INTO v_index FROM public.daily_scripture_verses WHERE is_active;
  IF v_index = 0 THEN RETURN 0; END IF;
  v_index := ((extract(doy FROM v_today)::integer - 1) % v_index);
  SELECT * INTO v_verse FROM public.daily_scripture_verses
    WHERE is_active ORDER BY rotation_order OFFSET v_index LIMIT 1;
  IF v_verse.rotation_order IS NULL THEN RETURN 0; END IF;

  FOR v_student IN
    SELECT p.id
    FROM public.profiles p
    WHERE (p.role = 'student' OR EXISTS (
      SELECT 1 FROM public.profile_role_assignments pra
      WHERE pra.user_id=p.id AND pra.role='student' AND pra.revoked_at IS NULL
    ))
    AND NOT EXISTS (
      SELECT 1 FROM public.notification_preferences np
      WHERE np.user_id=p.id AND (
        np.in_app_enabled = false OR np.category_settings->>'daily_verse' = 'false'
      )
    )
  LOOP
    PERFORM private.enqueue_notification(
      v_student.id,'daily_verse','Your verse of the day · '||v_verse.reference_en,'آية اليوم · '||v_verse.reference_ar,
      v_verse.text_en,'«'||v_verse.text_ar||'»',
      'daily-verse:'||v_today::text,'home',
      jsonb_build_object('verseOrder',v_verse.rotation_order,'referenceEn',v_verse.reference_en,'referenceAr',v_verse.reference_ar,'date',v_today)
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$function$;

CREATE OR REPLACE FUNCTION private.generate_prayer_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog','public','private'
AS $function$
DECLARE
  v_now timestamp := now() at time zone 'Africa/Cairo';
  v_today date := (now() at time zone 'Africa/Cairo')::date;
  v_student record;
  v_count integer := 0;
BEGIN
  IF extract(hour FROM v_now) <> 18 THEN RETURN 0; END IF;
  FOR v_student IN
    SELECT p.id,p.name
    FROM public.profiles p
    WHERE (p.role = 'student' OR EXISTS (
      SELECT 1 FROM public.profile_role_assignments pra
      WHERE pra.user_id=p.id AND pra.role='student' AND pra.revoked_at IS NULL
    ))
    AND NOT EXISTS (
      SELECT 1 FROM public.achievement_events ae
      WHERE ae.student_id=p.id AND ae.event_type='prayer_day'
        AND (ae.occurred_at at time zone 'Africa/Cairo')::date=v_today
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.notification_preferences np
      WHERE np.user_id=p.id AND (
        np.in_app_enabled = false OR np.category_settings->>'prayer' = 'false'
      )
    )
  LOOP
    PERFORM private.enqueue_notification(
      v_student.id,'prayer','A gentle prayer reminder','تذكرة صلاة بمحبة',
      'If you have a quiet moment, take one small step with God today. One Agpeya hour or a personal prayer is enough.',
      'لو عندك دقيقة هادية، خد خطوة صغيرة مع ربنا النهارده. ساعة أجبية واحدة أو صلاة شخصية كفاية.',
      'prayer-reminder:'||v_today::text,'prayer',
      jsonb_build_object('date',v_today,'prayerDayComplete',false)
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$function$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname='anba-mousa-daily-verse') THEN
    PERFORM cron.schedule('anba-mousa-daily-verse','0 * * * *','select private.generate_daily_verse_notifications();');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname='anba-mousa-prayer-reminders') THEN
    PERFORM cron.schedule('anba-mousa-prayer-reminders','0 * * * *','select private.generate_prayer_reminders();');
  END IF;
END $$;
