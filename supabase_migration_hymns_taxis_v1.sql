-- ==============================================================================
-- Coptic Sunday School Platform — Hymns & Coptic Taxis Migration v1
-- File: supabase_migration_hymns_taxis_v1.sql
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Helper Function: Ensure public.is_church_servant_or_admin() is present
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_church_servant_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('teacher', 'admin')
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_church_servant_or_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_church_servant_or_admin() TO authenticated, anon;

-- Helper to safely get the current student's approved hymns/deacons level
CREATE OR REPLACE FUNCTION public.get_current_student_level()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT COALESCE(
    (SELECT 3 FROM public.profiles WHERE id = auth.uid() AND (role IN ('teacher', 'admin') OR grade ILIKE '%deacon%' OR grade ILIKE '%servant%')),
    (SELECT 2 FROM public.profiles WHERE id = auth.uid() AND (grade ILIKE '%prep%' OR grade ILIKE '%secondary%' OR grade ILIKE '%uni%')),
    1
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_current_student_level() TO authenticated, anon;

-- ------------------------------------------------------------------------------
-- 2. Feed Cross-Device Visibility Fix (Public Read for Anonymous Visitors)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'feed_posts' AND policyname = 'Allow public read feed posts'
  ) THEN
    CREATE POLICY "Allow public read feed posts" ON public.feed_posts FOR SELECT TO anon USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'feed_comments' AND policyname = 'Allow public read feed comments'
  ) THEN
    CREATE POLICY "Allow public read feed comments" ON public.feed_comments FOR SELECT TO anon USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'feed_reactions' AND policyname = 'Allow public read feed reactions'
  ) THEN
    CREATE POLICY "Allow public read feed reactions" ON public.feed_reactions FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. Coptic Taxis Table (Liturgical Rubrics & Rites)
-- Note: 'references' renamed to 'source_references' to avoid SQL keyword collision.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coptic_taxis (
  id TEXT PRIMARY KEY,
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_copt TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('liturgy', 'incense', 'sacraments', 'feasts', 'pascha', 'occasions')),
  audience TEXT NOT NULL CHECK (audience IN ('all', 'deacons', 'preparatory', 'servants', 'clergy')),
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'under_review', 'approved', 'published', 'unpublished')),
  summary_ar TEXT,
  summary_en TEXT,
  version INTEGER DEFAULT 1 NOT NULL,
  created_by TEXT,
  created_by_name TEXT,
  published_by TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  source_references JSONB DEFAULT '[]'::jsonb NOT NULL,
  documents JSONB DEFAULT '[]'::jsonb NOT NULL,
  sections JSONB DEFAULT '[]'::jsonb NOT NULL,
  history JSONB DEFAULT '[]'::jsonb NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_coptic_taxis_category ON public.coptic_taxis(category);
CREATE INDEX IF NOT EXISTS idx_coptic_taxis_audience ON public.coptic_taxis(audience);
CREATE INDEX IF NOT EXISTS idx_coptic_taxis_status ON public.coptic_taxis(status);
CREATE INDEX IF NOT EXISTS idx_coptic_taxis_created_by ON public.coptic_taxis(created_by);

-- ------------------------------------------------------------------------------
-- 4. Hymns Table (Coptic Hymns School Curriculum)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hymns (
  id TEXT PRIMARY KEY,
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_coptic TEXT NOT NULL,
  season_ar TEXT NOT NULL,
  season_en TEXT NOT NULL,
  occasion_tag TEXT NOT NULL CHECK (occasion_tag IN ('annual', 'kiahk', 'lent', 'pascha', 'resurrection', 'st_mary')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'advanced')),
  level INTEGER NOT NULL CHECK (level IN (1, 2, 3)),
  audio_url TEXT,
  duration_sec INTEGER DEFAULT 0 NOT NULL,
  hazat_explanation_ar TEXT,
  hazat_explanation_en TEXT,
  lines JSONB DEFAULT '[]'::jsonb NOT NULL,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  version INTEGER DEFAULT 1 NOT NULL,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_hymns_level ON public.hymns(level);
CREATE INDEX IF NOT EXISTS idx_hymns_occasion_tag ON public.hymns(occasion_tag);
CREATE INDEX IF NOT EXISTS idx_hymns_status ON public.hymns(status);
CREATE INDEX IF NOT EXISTS idx_hymns_difficulty ON public.hymns(difficulty);

-- ------------------------------------------------------------------------------
-- 5. Enable Row-Level Security (RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.coptic_taxis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hymns ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 6. Granular RLS Policies for public.coptic_taxis
-- ------------------------------------------------------------------------------

-- SELECT Policies:
-- A. Servants & Admins have full read access to all rituals, drafts, and reviews
CREATE POLICY "Servants read all taxis"
ON public.coptic_taxis FOR SELECT
TO authenticated
USING (public.is_church_servant_or_admin());

-- B. Author may read their own draft/under_review items
CREATE POLICY "Authors read own taxis"
ON public.coptic_taxis FOR SELECT
TO authenticated
USING (created_by = (auth.uid())::text);

-- C. Published items with audience = 'all' are readable by everyone (authenticated & anonymous visitors)
CREATE POLICY "Public read general taxis"
ON public.coptic_taxis FOR SELECT
TO anon, authenticated
USING (status = 'published' AND audience = 'all');

-- D. Published items for 'preparatory' audience: accessible to Prep+ students or servants
CREATE POLICY "Preparatory read taxis"
ON public.coptic_taxis FOR SELECT
TO authenticated
USING (
  status = 'published' AND audience = 'preparatory' AND (
    public.is_church_servant_or_admin() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND (
        grade ILIKE '%prep%' OR
        grade ILIKE '%secondary%' OR
        grade ILIKE '%uni%' OR
        grade ILIKE '%deacon%'
      )
    )
  )
);

-- E. Published items for 'deacons' audience: accessible to deacons, advanced students, and servants
CREATE POLICY "Deacons read taxis"
ON public.coptic_taxis FOR SELECT
TO authenticated
USING (
  status = 'published' AND audience = 'deacons' AND (
    public.is_church_servant_or_admin() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND (
        grade ILIKE '%deacon%' OR
        grade ILIKE '%hymn%' OR
        role IN ('teacher', 'admin')
      )
    )
  )
);

-- Write Policies (Strictly restricted to verified church servants and administrators)
CREATE POLICY "Servants insert taxis"
ON public.coptic_taxis FOR INSERT
TO authenticated
WITH CHECK (public.is_church_servant_or_admin());

CREATE POLICY "Servants update taxis"
ON public.coptic_taxis FOR UPDATE
TO authenticated
USING (public.is_church_servant_or_admin())
WITH CHECK (public.is_church_servant_or_admin());

CREATE POLICY "Servants delete taxis"
ON public.coptic_taxis FOR DELETE
TO authenticated
USING (public.is_church_servant_or_admin());

-- ------------------------------------------------------------------------------
-- 7. Granular RLS Policies for public.hymns
-- ------------------------------------------------------------------------------

-- SELECT Policies:
-- A. Servants & Admins have full read access to all hymns, versions, and drafts
CREATE POLICY "Servants read all hymns"
ON public.hymns FOR SELECT
TO authenticated
USING (public.is_church_servant_or_admin());

-- B. Author can read own hymn drafts
CREATE POLICY "Authors read own hymn drafts"
ON public.hymns FOR SELECT
TO authenticated
USING (created_by = (auth.uid())::text);

-- C. Level 1 published hymns: accessible to all congregation members and visitors
CREATE POLICY "Public read level 1 hymns"
ON public.hymns FOR SELECT
TO anon, authenticated
USING (status = 'published' AND level = 1);

-- D. Level 2 & 3 published hymns: accessible according to student approved level
CREATE POLICY "Students read approved level hymns"
ON public.hymns FOR SELECT
TO authenticated
USING (
  status = 'published' AND (
    public.is_church_servant_or_admin() OR
    level <= public.get_current_student_level()
  )
);

-- Write Policies (Strictly restricted to verified church servants and administrators)
CREATE POLICY "Servants insert hymns"
ON public.hymns FOR INSERT
TO authenticated
WITH CHECK (public.is_church_servant_or_admin());

CREATE POLICY "Servants update hymns"
ON public.hymns FOR UPDATE
TO authenticated
USING (public.is_church_servant_or_admin())
WITH CHECK (public.is_church_servant_or_admin());

CREATE POLICY "Servants delete hymns"
ON public.hymns FOR DELETE
TO authenticated
USING (public.is_church_servant_or_admin());

-- ------------------------------------------------------------------------------
-- 8. Table & Function Grants
-- ------------------------------------------------------------------------------
GRANT SELECT ON public.coptic_taxis TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.coptic_taxis TO authenticated;

GRANT SELECT ON public.hymns TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.hymns TO authenticated;

-- ------------------------------------------------------------------------------
-- 9. Reconciled Canonical Data Seeding
-- Reconciles 3-vs-4 Taxis mismatch by seeding all 4 published canonical guides
-- PLUS 1 draft guide (Total: 5 items preserved).
-- Seeds all 9 canonical hymns PLUS 1 draft hymn.
-- Uses ON CONFLICT (id) DO UPDATE to guarantee idempotent execution.
-- ------------------------------------------------------------------------------

-- A. Coptic Taxis Seed
INSERT INTO public.coptic_taxis (
  id, title_ar, title_en, title_copt, category, audience, status,
  summary_ar, summary_en, version, created_by, created_by_name,
  published_by, published_at, source_references, documents, sections, history
) VALUES
(
  'taxis_incense_matins_vespers',
  'طقس رفع بخور عشية وباكر',
  'Offering of Incense (Matins & Vespers)',
  'Ⲡⲓⲧⲁⲝⲓⲥ ⲛ̀ⲧⲉ ⲡⲓⲟⲩⲱϣⲧ ⲛ̀ϣⲱⲡ ⲛⲉⲙ ⲣⲟⲩϩⲓ',
  'incense',
  'all',
  'published',
  'الترتيب الطقسي الكامل لصلوات رفع بخور عشية وباكر مع أدوار الكاهن، مردات الشماس، وألحان الخورس.',
  'Complete liturgical order for Matins & Vespers Incense service with priest actions, deacon responses, and choir chants.',
  1,
  'user_teacher_mina_101',
  'الخادم مينا',
  'user_teacher_mina_101',
  '2026-09-01T08:00:00.000Z',
  '["كتاب طقس الكنيسة القبطية الأرثوذكسية - الأنبا متاؤس", "الخلاجي المقدس"]'::jsonb,
  '[{"id": "doc_incense_guide", "title": "دليل الشمامسة في رفع بخور عشية وباكر (PDF)", "fileUrl": "/uploads/sample_cross_lesson_handout.pdf", "fileType": "pdf", "mimeType": "application/pdf"}]'::jsonb,
  '[
    {"id": "sec_1", "order": 1, "titleAr": "صلاة الشكر وفتح الستر", "titleEn": "Thanksgiving Prayer & Unveiling of the Sanctuary", "titleCopt": "Ⲡⲓϣⲗⲏⲗ ⲛ̀ϯϣⲉⲡϩ̀ⲙⲟⲧ", "contentAr": "يقف الكاهن أمام الهيكل خاشعاً، ويفتح الستر قائلاً: \"إرحمنا يا الله الآب ضابط الكل...\" ثم يتلو صلاة الشكر.", "contentEn": "The priest stands reverently before the sanctuary, opening the veil and praying the Thanksgiving Prayer.", "priestAction": "يسجد الكاهن أمام باب الهيكل، ثم يفتح الستر ويرشم الشعب بالصليب.", "deaconResponse": "مرد الشماس: \"صلوا من أجل صلاة الشكر المقدسة لكي ينعم الرب بإحسانه...\""},
    {"id": "sec_2", "order": 2, "titleAr": "دورة البخور وأواشي الصغار والكبار", "titleEn": "Circuits of Incense & Petitions", "titleCopt": "Ⲡⲓⲕⲱϯ ⲛ̀ⲧⲉ ⲡⲓⲥ̀ⲑⲟⲓⲛⲟⲩϥⲓ", "contentAr": "يضع الكاهن يد البخور في المجمرة ويرفع البخور أمام المذبح ۳ دفعات، ثم يصلي أوشية الراقدين في العشية وأوشية المرضى والمسافرين في باكر.", "contentEn": "The priest places incense in the censer, offers 3 circuits before the altar, praying for the departed in Vespers and for the sick/travelers in Matins.", "rubricNotes": "في أيام الآحاد والأعياد السيدية لا تقال أوشية المسافرين وتستبدل بأوشية القرابين."}
  ]'::jsonb,
  '[]'::jsonb
),
(
  'taxis_liturgy_st_basil',
  'طقس القداس الباسيلي المقدس',
  'The Divine Liturgy of St. Basil',
  'Ϯⲁ̀ⲛⲁⲫⲟⲣⲁ ⲛ̀ⲧⲉ ⲡⲓⲁ̀ⲅⲓⲟⲥ Ⲃⲁⲥⲓⲗⲓⲟⲥ',
  'liturgy',
  'all',
  'published',
  'طقس قداس المؤمنين من صلاة الصلح، والأنافورا، والاستدعاء، والتقديس، والمجمع، وقسمة الجسد والدم الطاهرين.',
  'The sacred order of the Liturgy of the Believers: Prayer of Reconciliation, Anaphora, Epiclesis, Commemoration, and Holy Fraction.',
  1,
  'user_teacher_mina_101',
  'الخادم مينا',
  'user_teacher_mina_101',
  '2026-09-05T09:00:00.000Z',
  '["كتاب القداسات الثلاثة - دير السريان العامر", "التقليد الليتورجي السكندري"]'::jsonb,
  '[{"id": "doc_basil_anaphora", "title": "نص الأنافورا الباسيلية بالقبطي والعربي (PDF)", "fileUrl": "/uploads/sample_cross_lesson_handout.pdf", "fileType": "pdf", "mimeType": "application/pdf"}]'::jsonb,
  '[
    {"id": "sec_b1", "order": 1, "titleAr": "صلاة الصلح ومرد القبلة المقدسة", "titleEn": "Prayer of Reconciliation & Holy Kiss", "titleCopt": "Ⲡⲓϣⲗⲏⲗ ⲛ̀ⲧⲉ ϯϩⲓⲣⲏⲛⲏ", "contentAr": "يصلي الكاهن صلاة الصلح طالباً السلام السمائي، وعند ختامها ينادي الشماس: \"قبلوا بعضكم بعضاً بقبلة مقدسة...\" ويرفع الإبروسفارين.", "contentEn": "The priest petitions for heavenly peace, followed by the deacon proclamation to greet one another with a holy kiss while lifting the Prospherin.", "deaconResponse": "مرد الشماس: \"قبلوا بعضكم بعضاً بقبلة مقدسة يا رب ارحم...\""},
    {"id": "sec_b2", "order": 2, "titleAr": "الرشومات والتقديس وحلول الروح القدس (الإبيكليسيس)", "titleEn": "Consecration & Epiclesis", "titleCopt": "Ⲡⲓϫⲓⲛⲧⲱⲃϩ ⲛ̀ⲧⲉ Ⲡⲓⲡ̀ⲛⲉⲩⲙⲁ Ⲉⲑⲟⲩⲁⲃ", "contentAr": "يسجد الكاهن والشعب في خشوع مهيب طلباً لحلول الروح القدس ليحول الخبز إلى جسد المسيح والخمر إلى دمه الأقدس.", "contentEn": "Reverent prostration by clergy and congregation calling down the Holy Spirit to consecrate the Holy Gifts.", "rubricNotes": "يسجد جميع من في الكنيسة إلى الأرض في صمت وخشوع تام."}
  ]'::jsonb,
  '[]'::jsonb
),
(
  'taxis_baptism_chrismation',
  'طقس سر المعمودية والميرون المقدس',
  'Sacrament of Holy Baptism & Chrismation',
  'Ⲡⲓⲧⲁⲝⲓⲥ ⲛ̀ⲧⲉ ⲡⲓⲱⲙⲥ ⲉⲑⲟⲩⲁⲃ ⲛⲉⲙ ⲡⲓⲙⲩⲣⲟⲛ',
  'sacraments',
  'all',
  'published',
  'طقس التغطيس الثلاثي باسم الثالوث القدوس، وجحد الشيطان، وقانون الإيمان، والمسح بست وثلاثين رشمة بالميرون.',
  'Sacramental rite of triple immersion in the name of the Trinity, renunciation of Satan, Creed, and 36 holy anointings with Chrism.',
  1,
  'user_teacher_mina_101',
  'الخادم مينا',
  'user_teacher_mina_101',
  '2026-09-10T10:00:00.000Z',
  '["كتاب أسرار الكنيسة السبعة - الكنيسة القبطية الأرثوذكسية"]'::jsonb,
  '[]'::jsonb,
  '[
    {"id": "sec_bapt_1", "order": 1, "titleAr": "صلوات تحليل الأم وجحد الشيطان وتلاوة الإيمان", "titleEn": "Absolution of the Mother & Renunciation of Satan", "contentAr": "تتجه الأم والعراب نحو الغرب لجحد إبليس، ثم يتجهان نحو الشرق لإعلان الإيمان بربنا يسوع المسيح وتلاوة قانون الإيمان.", "priestAction": "يدهن الكاهن جبهة الطفل بزيت الغاليلاون (الفرح)."}
  ]'::jsonb,
  '[]'::jsonb
),
(
  'taxis_pascha_good_friday',
  'طقس أسبوع الآلام والجمعة العظيمة المقدسة',
  'Holy Pascha & Good Friday Rite',
  'Ⲡⲓⲧⲁⲝⲓⲥ ⲛ̀ⲧⲉ ϯⲠⲁⲥⲭⲁ ⲉⲑⲟⲩⲁⲃ',
  'pascha',
  'deacons',
  'published',
  'ترتيب صلوات السواعي النهارية والمسائية في أسبوع البصخة، ونبوات العهد القديم، وألحان الجمعة الكبيرة ودفن المخلص.',
  'Liturgical order of day and night Pascha hours, Prophecies, solemn Great Friday hymns, and the icon burial rite.',
  1,
  'user_teacher_mina_101',
  'الخادم مينا',
  'user_teacher_mina_101',
  '2026-09-12T11:00:00.000Z',
  '["دلال أسبوع الآلام القبطي الأرثوذكسي"]'::jsonb,
  '[]'::jsonb,
  '[
    {"id": "sec_pascha_1", "order": 1, "titleAr": "تسبحة البصخة المقدسة (ثوك تي تي جوم)", "titleEn": "Paschal Doxology (Thok Te Ti Gom)", "contentAr": "ترتل تسبحة \"لك القوة والمجد والبركة والعزة إلى الأبد آمين.. عمانوئيل إلهنا وملكنا\" ۱۲ مرة في كل ساعة بصخة بدلاً من المزامير.", "rubricNotes": "تُرتل بنغمة الآلام المهيبة مع إطفاء الأنوار وإشعال الشموع أمام صليب المخلص."}
  ]'::jsonb,
  '[]'::jsonb
),
(
  'taxis_draft_sacrament',
  'مسودة طقس سر المعمودية والميرون المقدس',
  'Draft Sacrament of Holy Baptism & Chrismation',
  'Ⲡⲓⲧⲁⲝⲓⲥ ⲛ̀ⲧⲉ ⲡⲓⲱⲙⲥ ⲉⲑⲟⲩⲃ ⲛⲉⲙ ⲡⲓⲙⲩⲣⲟⲛ',
  'sacraments',
  'all',
  'draft',
  'مسودة قيد المراجعة لطقس سر المعمودية وتغطيس المعمد في جرن المعمودية ورشمه بالميرون المقدس.',
  'Draft under review for Baptism & Holy Chrismation.',
  1,
  'user_teacher_mina_101',
  'الخادم مينا',
  NULL,
  NULL,
  '["كتاب المعمودية والميرون - الكنيسة القبطية الأرثوذكسية"]'::jsonb,
  '[]'::jsonb,
  '[
    {"id": "sec_bap_1", "order": 1, "titleAr": "صلوات تحليل المرأة وصلاة تجنيد المعمد", "titleEn": "Absolution of the Mother & Enlistment", "contentAr": "يصلي الكاهن على المعمد صلوات الإيمان وجحد الشيطان متجهاً نحو الغرب.", "priestAction": "ينفخ الكاهن في وجه المعمد ۳ مرات قائلاً: \"اخرج أيتها الروح النجسة...\"", "deaconResponse": "مرد الشماس: \"أجحدك يا شيطان وكل أعمالك الشريرة...\""}
  ]'::jsonb,
  '[]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  title_ar = EXCLUDED.title_ar,
  title_en = EXCLUDED.title_en,
  title_copt = EXCLUDED.title_copt,
  category = EXCLUDED.category,
  audience = EXCLUDED.audience,
  status = EXCLUDED.status,
  summary_ar = EXCLUDED.summary_ar,
  summary_en = EXCLUDED.summary_en,
  source_references = EXCLUDED.source_references,
  documents = EXCLUDED.documents,
  sections = EXCLUDED.sections,
  updated_at = timezone('utc'::text, now());

-- B. Hymns Seed
INSERT INTO public.hymns (
  id, title_ar, title_en, title_coptic, season_ar, season_en, occasion_tag,
  difficulty, level, audio_url, duration_sec, hazat_explanation_ar,
  hazat_explanation_en, lines, status, version, created_by
) VALUES
(
  'ep_oro',
  'لحن إبؤورو (يا ملك السلام)',
  'Ep-Oro (O King of Peace)',
  'Ⲉⲡⲟⲩⲣⲟ ⲛ̀ⲧⲉ ϯϩⲓⲣⲏⲛⲏ',
  'طقس سنوي وفرايحي وخاتمة التسبحة والصلوات',
  'Annual & Festive / Conclusion of Praises',
  'annual',
  'easy',
  1,
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  135,
  'لحن شجي مريح بهزات ثلاثية هادئة (٣ هزات ناعمة على كلمة Ⲉⲡⲟⲩⲣⲟ ومقطع ⲙⲟⲓ ⲛⲁⲛ). يُرتل في ختام الصلوات لطلب السلام.',
  'A comforting, melodic hymn with gentle 3-beat rhythm pauses on "Ep-Oro" and "Moi Nan" asking the King of Peace for tranquility.',
  '[
    {"id": 1, "coptic": "Ⲉⲡⲟⲩⲣⲟ ⲛ̀ⲧⲉ ϯϩⲓⲣⲏⲛⲏ: ⲙⲟⲓ ⲛⲁⲛ ⲛ̀ⲧⲉⲕϩⲓⲣⲏⲛⲏ: ⲥⲉⲙⲛⲓ ⲛⲁⲛ ⲛ̀ⲧⲉⲕϩⲓⲣⲏⲛⲏ: ⲭⲁ ⲛⲉⲛⲛⲟⲃⲓ ⲛⲁⲛ ⲉ̀ⲃⲟⲗ.", "arabized": "إبـؤورو إنتي تي هيريني: موي نان إنتيـك هيريني: سيمني نان إنتيـك هيريني: خـا نين نوفي نان إيفول.", "arabic": "يا ملك السلام، أعطنا سلامك، قرر لنا سلامك، واغفر لنا خطايانا.", "hazatNotes": "٣ هزات متدرجة مع مد الصوت في إبـؤووورو", "startTimeSec": 0},
    {"id": 2, "coptic": "Ϫⲱⲣ ⲉ̀ⲃⲟⲗ ⲛ̀ⲛⲓϫⲁϫⲓ: ⲛ̀ⲧⲉ ϯⲈⲕⲕⲗⲏⲥⲓⲁ: ⲁ̀ⲣⲓⲥⲟⲃⲧ ⲉ̀ⲣⲟⲥ: ⲛ̀ⲛⲉⲥⲕⲓⲙ ϣⲁ ⲉ̀ⲛⲉϩ.", "arabized": "جور إيفول إن ني جاجي: إنتي تي إككليسيا: أري سوفت إيروس: إن نيس كيم شا إينيه.", "arabic": "فرق أعداء الكنيسة، وحصنها لكي لا تتزعزع إلى الأبد.", "hazatNotes": "وقفة هادئة عند نهاية إككليسيا", "startTimeSec": 35},
    {"id": 3, "coptic": "Ⲡⲓⲭ̀ⲣⲓⲥⲧⲟⲥ Ⲡⲉⲛⲛⲟⲩϯ: ⲁϥⲙⲟⲩ ϧⲁⲣⲟⲛ: ϧⲉⲛ ⲡⲉϥⲟⲩⲱϣ ⲙ̀ⲙⲓⲛ ⲙ̀ⲙⲟϥ: ⲁϥⲥⲱϯ ⲙ̀ⲙⲟⲛ.", "arabized": "بي خرستوس بين نوتي: إفمو خارون: خين بيف أوش إممين إمموف: إفسوتي إممون.", "arabic": "المسيح إلهنا مات عنا، بإرادته ومسرته، وفدانا.", "hazatNotes": "تأكيد بالنغمة على إفسوتي إممون (وفدانا)", "startTimeSec": 70},
    {"id": 4, "coptic": "Ⲙⲁⲣⲉⲛϩⲱⲥ ⲉ̀ⲣⲟϥ: ⲙⲁⲣⲉⲛϭⲓⲥⲓ ⲙ̀ⲡⲉϥⲣⲁⲛ: ϫⲉ ⲟⲩⲁ̀ⲅⲁⲑⲟⲥ ⲡⲉ: ⲟⲩⲟϩ ⲙ̀ⲙⲁⲓⲣⲱⲙⲓ.", "arabized": "مارين هوس إيروف: مارين تشيسي إمبيف ران: جي أو أغاثوس بي: أووه إمماي رومي.", "arabic": "فلنسبحه ونرفع اسمه، لأنه صالح ومحب للبشر.", "hazatNotes": "نغمة ختامية هادئة مع انخفاض النغمة", "startTimeSec": 105}
  ]'::jsonb,
  'published',
  1,
  'user_teacher_mina_101'
),
(
  'khen_efran',
  'لحن خين إفران (باسم الآب والابن والروح القدس)',
  'Khen Efran (In the Name of the Father)',
  'Ϧⲉⲛ ⲫ̀ⲣⲁⲛ ⲙ̀Ⲫⲓⲱⲧ',
  'مقدمة التبريك والصلوات الكنسية ومدارس الشمامسة للمبتدئين',
  'Opening of prayers and deacon initiation',
  'annual',
  'easy',
  1,
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  85,
  'اللحن الأساسي الأول لكل شماس مبتدئ. نغمة واضحة لتمكين النطق القبطي الأرثوذكسي السليم.',
  'The foundational liturgical initiation hymn for every novice deacon, ensuring pure Bohairic Coptic pronunciation.',
  '[
    {"id": 1, "coptic": "Ϧⲉⲛ ⲫ̀ⲣⲁⲛ ⲙ̀Ⲫⲓⲱⲧ: ⲛⲉⲙ Ⲡ̀ϣⲏⲣⲓ: ⲛⲉⲙ Ⲡⲓⲡ̀ⲛⲉⲩⲙⲁ Ⲉⲑⲟⲩⲁⲃ: ⲟⲩⲛⲟⲩϯ ⲛ̀ⲟⲩⲱⲧ: ⲁ̀ⲙⲏⲛ.", "arabized": "خين إفران إمفيوت: نيم بشيري: نيم بي بنيفما إثؤواب: أونوتي إن أوأوت: أمين.", "arabic": "باسم الآب والابن والروح القدس، إله واحد، آمين.", "hazatNotes": "مد رخيم هادئ عند خين إفرااان", "startTimeSec": 0}
  ]'::jsonb,
  'published',
  1,
  'user_teacher_mina_101'
),
(
  'agios',
  'لحن أجيوس الثلاث تقديسات (قدوس الله)',
  'Agios (The Thrice-Holy Hymn)',
  'Ⲁ̀ⲅⲓⲟⲥ ⲟ̀ Ⲑⲉⲟⲥ',
  'يُصلى في كل قداس إلهي قبل قراءة الإنجيل المقدس',
  'Every Divine Liturgy before Gospel',
  'annual',
  'medium',
  2,
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  120,
  'لحن خاشع مقدس يُعلن لاهوت وتجسد وفداء ربنا يسوع المسيح. في كل ربع هزتان خشوعيتان مع إحناء الرأس.',
  'Solemn hymn proclaiming Christ divinity, incarnation, crucifixion, and resurrection. Sung with deep reverence.',
  '[
    {"id": 1, "coptic": "Ⲁ̀ⲅⲓⲟⲥ ⲟ̀ Ⲑⲉⲟⲥ: Ⲁ̀ⲅⲓⲟⲥ Ⲓⲥⲭⲩⲣⲟⲥ: Ⲁ̀ⲅⲓⲟⲥ Ⲁ̀ⲑⲁⲛⲁⲧⲟⲥ: ⲟ̀ ⲉⲕ ⲡⲁⲣⲑⲉⲛⲟⲩ ⲅⲉⲛⲛⲏⲑⲓⲥ: ⲉ̀ⲗⲉⲏ̀ⲥⲟⲛ ⲏ̀ⲙⲁⲥ.", "arabized": "أجيوس أو ثيئوس: أجيوس إسشيروس: أجيوس أثاناتوس: أو إك بارثينو جينيثيس: إليسون إيماس.", "arabic": "قدوس الله، قدوس القوي، قدوس الذي لا يموت، الذي ولد من العذراء، ارحمنا.", "hazatNotes": "هزة مد عند \"إليسون إيماس\"", "startTimeSec": 0},
    {"id": 2, "coptic": "Ⲁ̀ⲅⲓⲟⲥ ⲟ̀ Ⲑⲉⲟⲥ: Ⲁ̀ⲅⲓⲟⲥ Ⲓⲥⲭⲩⲣⲟⲥ: Ⲁ̀ⲅⲓⲟⲥ Ⲁ̀ⲑⲁⲛⲁⲧⲟⲥ: ⲟ̀ ⲥⲧⲁⲩⲣⲱⲑⲓⲥ ⲇⲓ ⲏ̀ⲙⲁⲥ: ⲉ̀ⲗⲉⲏ̀ⲥⲟⲛ ⲏ̀ⲙⲁⲥ.", "arabized": "أجيوس أو ثيئوس: أجيوس إسشيروس: أجيوس أثاناتوس: أو ستافروثيس دي إيماس: إليسون إيماس.", "arabic": "قدوس الله، قدوس القوي، قدوس الذي لا يموت، الذي صُلب عنا، ارحمنا.", "hazatNotes": "رشم الصليب وإحناء الرأس عند \"ستافروثيس دي إيماس\"", "startTimeSec": 40},
    {"id": 3, "coptic": "Ⲁ̀ⲅⲓⲟⲥ ⲟ̀ Ⲑⲉⲟⲥ: Ⲁ̀ⲅⲓⲟⲥ Ⲓⲥⲭⲩⲣⲟⲥ: Ⲁ̀ⲅⲓⲟⲥ Ⲁ̀ⲑⲁⲛⲁⲧⲟⲥ: ⲟ̀ ⲁ̀ⲛⲁⲥⲧⲁⲥ ⲉⲕ ⲧⲱⲛ ⲛⲉⲕⲣⲱⲛ: ⲕⲉ ⲁ̀ⲛⲉⲗⲑⲱⲛ ⲓⲥ ⲧⲟⲩⲥ ⲟⲩⲣⲁⲛⲟⲩⲥ: ⲉ̀ⲗⲉⲏ̀ⲥⲟⲛ ⲏ̀ⲙⲁⲥ.", "arabized": "أجيوس أو ثيئوس: أجيوس إسشيروس: أجيوس أثاناتوس: أو أناستاس إك تون نيكرون: كيه أنيلثون إيس توس أورانوس: إليسون إيماس.", "arabic": "قدوس الله، قدوس القوي، قدوس الذي لا يموت، الذي قام من بين الأموات وصعد إلى السموات، ارحمنا.", "hazatNotes": "نغمة تصاعدية متهللة بالقيامة والصعود", "startTimeSec": 80}
  ]'::jsonb,
  'published',
  1,
  'user_teacher_mina_101'
),
(
  'teno_oosht',
  'لحن تين أو أووشت (فلنسجد للآب والابن)',
  'Teno-Oosht (Let Us Worship)',
  'Ⲧⲉⲛⲟⲩⲱϣⲧ ⲙ̀Ⲫⲓⲱⲧ ⲛⲉⲙ Ⲡϣⲏⲣⲓ',
  'مقدمة التسبحة الكنسية وقداس المؤمنين',
  'Introduction of Praises',
  'annual',
  'easy',
  1,
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
  90,
  'لحن سجود وتسبيح للثالوث القدوس. هزات انسيابية رقيقة.',
  'Reverent prostration hymn honoring the Holy Trinity.',
  '[
    {"id": 1, "coptic": "Ⲧⲉⲛⲟⲩⲱϣⲧ ⲙ̀Ⲫⲓⲱⲧ ⲛⲉⲙ Ⲡϣⲏⲣⲓ: ⲛⲉⲙ Ⲡⲓⲡ̀ⲛⲉⲩⲙⲁ Ⲉⲑⲟⲩⲁⲃ: ⲭⲉⲣⲉ ϯⲈⲕⲕⲗⲏⲥⲓⲁ: ⲡ̀ⲏⲓ ⲛ̀ⲧⲉ ⲛⲓⲁⲅⲅⲉⲗⲟⲥ.", "arabized": "تين أو أوشت إمفيوت نيم بشيري: نيم بي بنيفما إثؤواب: شيري تي إككليسيا: بي إي إنتي ني أنجيلوس.", "arabic": "نسجد للآب والابن والروح القدس، السلام للكنيسة بيت الملائكة.", "hazatNotes": "مد رخيم في تين أوووو أوشت", "startTimeSec": 0},
    {"id": 2, "coptic": "Ⲭⲉⲣⲉ ϯⲠⲁⲣⲑⲉⲛⲟⲥ: ⲉ̀ⲧⲁⲥⲙⲓⲥⲓ ⲙ̀Ⲡⲉⲛⲥⲱⲧⲏⲣ: ⲭⲉⲣⲉ Ⲙⲓⲭⲁⲏⲗ: ⲡⲓⲁⲣⲭⲏⲁⲅⲅⲉⲗⲟⲥ.", "arabized": "شيري تي بارثينوس: إي تاس ميسي إمبين سوتير: شيري ميخائيل: بي أرشي أنجيلوس.", "arabic": "السلام للعذراء التي ولدت مخلصنا، السلام لميخائيل رئيس الملائكة.", "hazatNotes": "توقف ناعم عند ختام كل اسم", "startTimeSec": 45}
  ]'::jsonb,
  'published',
  1,
  'user_teacher_mina_101'
),
(
  'hos_erof',
  'الهوس الثالث (هوس إيروف - سبحوه وزيدوه علواً)',
  'Hos Erof (Third Canticle)',
  'Ϩⲱⲥ ⲉ̀ⲣⲟϥ ⲁ̀ⲣⲓϩⲟⲩⲟ̀ ϭⲁⲥϥ',
  'تسبحة نصف الليل الكيهكية والسنوية (تسبحة الثلاثة فتية القديسين)',
  'Midnight Praises (Three Holy Youths)',
  'kiahk',
  'medium',
  2,
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
  180,
  'تسبحة الفتية الثلاثة في أتون النار. إيقاع بهيج بالدف والمثلث يملأ الروح حماساً وفرحاً.',
  'Praise of the Three Saintly Youths in the fiery furnace with joyous cymbals and triangle.',
  '[
    {"id": 1, "coptic": "Ϩⲱⲥ ⲉ̀ⲣⲟϥ ⲁ̀ⲣⲓϩⲟⲩⲟ̀ ϭⲁⲥϥ: ⲉ̀ⲛⲓⲉ̀ⲛⲉϩ: ⲁ̀ⲣⲓϩⲟⲩⲟ̀ ϭⲁⲥϥ ϣⲁ ⲛⲓⲉ̀ⲛⲉϩ.", "arabized": "هوس إيروف أري هو أو تشاسف: إينيه نيه: أري هو أو تشاسف شا ني إينيه.", "arabic": "سبحوه وزيدوه علواً إلى الآباد، زيدوه رفعة إلى كل الدهور.", "hazatNotes": "إيقاع ثنائي نشيط مع ضرب الدف والمثلث", "startTimeSec": 0},
    {"id": 2, "coptic": "Ϩⲱⲥ ⲉ̀Ⲡϭⲟⲓⲥ ⲛⲓϩⲃⲏⲟⲩⲓ̀ ⲧⲏⲣⲟⲩ ⲛ̀ⲧⲉ Ⲡϭⲟⲓⲥ: Ϩⲱⲥ ⲉ̀ⲣⲟϥ ⲁ̀ⲣⲓϩⲟⲩⲟ̀ ϭⲁⲥϥ ϣⲁ ⲛⲓⲉ̀ⲛⲉϩ.", "arabized": "هوس إيبشويس ني هفيؤوي تيرو إنتي إبشويس: هوس إيروف أري هو أو تشاسف شا ني إينيه.", "arabic": "سبحوا الرب يا جميع أعمال الرب، سبحوه وزيدوه علواً إلى الآباد.", "hazatNotes": "مرد جماعي مبهج لكل ربع", "startTimeSec": 45}
  ]'::jsonb,
  'published',
  1,
  'user_teacher_mina_101'
),
(
  'asomen',
  'لحن آصومن (فلنسبح الرب لأنه بالمجد قد تمجد)',
  'Asomen (Let Us Praise the Lord)',
  'Ⲁ̀ⲥⲱⲙⲉⲛ ⲧⲱ Ⲕⲩⲣⲓⲱ',
  'الهوس الأول ومقدمة تسابيح العبور والانتصار',
  'First Canticle / Triumph of the Red Sea',
  'annual',
  'medium',
  2,
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
  140,
  'تسبحة الخلاص والعبور العظيم في البحر الأحمر. نغمة تسبيح جهيرة حماسية بالدف.',
  'Chant of Exodus victory by Moses and the congregation praising God who triumphed gloriously.',
  '[
    {"id": 1, "coptic": "Ⲁ̀ⲥⲱⲙⲉⲛ ⲧⲱ Ⲕⲩⲣⲓⲱ: ⲉⲛⲇⲟⲝⲱⲥ ⲅⲁⲣ ⲇⲉⲇⲟⲝⲁⲥⲧⲉ.", "arabized": "آصومن تو كيريو: إندوكسوس غار ديذوكساستي.", "arabic": "فلنسبح الرب، لأنه بالمجد قد تمجد.", "hazatNotes": "نبرات متلاحقة قوية مع إيقاع الدف", "startTimeSec": 0}
  ]'::jsonb,
  'published',
  1,
  'user_teacher_mina_101'
),
(
  'pek_thronos',
  'لحن بيك إثرونوس (كرسيك يا الله إلى دهر الدهور)',
  'Pek-Thronos (Your Throne, O God)',
  'Ⲡⲉⲕⲑ̀ⲣⲟⲛⲟⲥ Ⲫϯ ϣⲁ ⲉ̀ⲛⲉϩ ⲛ̀ⲧⲉ ⲡⲓⲉ̀ⲛⲉϩ',
  'الجمعة العظيمة المقدسة (الساعة الثانية عشرة من يوم الجمعة العظيمة)',
  'Good Friday (12th Hour)',
  'pascha',
  'advanced',
  3,
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
  210,
  'من أروع وأطول ألحان الكنيسة القبطية على الإطلاق بالنغمة الحزايني المؤثرة. يعلن ملوكية المسيح حتى وهو على الصليب.',
  'One of the deepest masterworks of Coptic hymnology chanted on Good Friday, declaring the eternal Kingship of Christ.',
  '[
    {"id": 1, "coptic": "Ⲡⲉⲕⲑ̀ⲣⲟⲛⲟⲥ Ⲫϯ: ϣⲁ ⲉ̀ⲛⲉϩ ⲛ̀ⲧⲉ ⲡⲓⲉ̀ⲛⲉϩ: ⲡⲓϣ̀ⲃⲱⲧ ⲛ̀ⲧⲉ ⲡⲉⲕⲙⲉⲑⲙⲏⲓ.", "arabized": "بيك إثرونوس إفنوتي: شا إينيه إنتي بي إينيه: بي إشفوت إنتي بيك ميثمي.", "arabic": "كرسيك يا الله إلى دهر الدهور، قضيب الاستقامة هو قضيب ملكك.", "hazatNotes": "هزات بطيئة خاشعة تتصاعد بنغمة الآلام المهيبة", "startTimeSec": 0}
  ]'::jsonb,
  'published',
  1,
  'user_teacher_mina_101'
),
(
  'golgotha',
  'لحن غولغوثا (في الموضع الذي صلبوك فيه)',
  'Golgotha (At the Place of the Skull)',
  'Ⲅⲟⲗⲅⲟⲑⲁ ⲉ̀ⲧⲉ ⲡⲓⲙⲁ ⲙ̀ⲡⲓⲕⲣⲁⲛⲓⲟⲛ',
  'دفن المخلص في ختام الجمعة العظيمة المقدسة',
  'Burial Rite on Good Friday',
  'pascha',
  'advanced',
  3,
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
  240,
  'لحن فرعوني أثري قبطي أصيل تم تعميده لصلوات دفن المخلص. هزات متقنة عميقة تمس الوجدان.',
  'Ancient liturgical burial hymn with deep Coptic pharaonic heritage chanted during the icon burial of Christ on Good Friday.',
  '[
    {"id": 1, "coptic": "Ⲅⲟⲗⲅⲟⲑⲁ ⲉ̀ⲧⲉ ⲡⲓⲙⲁ ⲙ̀ⲡⲓⲕⲣⲁⲛⲓⲟⲛ: ⲡⲓⲙⲁ ⲉ̀ⲧⲁⲩⲁϣⲕ ⲉ̀ⲣⲟϥ Ⲡϭⲟⲓⲥ.", "arabized": "غولغوثا إيتي بيما إمبي كران يون: بيما إيتاف أشك إيروف إبشويس.", "arabic": "الجلجثة أي موضع الجمجمة، الموضع الذي صلبوك فيه يا رب.", "hazatNotes": "هزات وقورة خاشعة مع سكب البخور", "startTimeSec": 0}
  ]'::jsonb,
  'published',
  1,
  'user_teacher_mina_101'
),
(
  'tai_shouri',
  'لحن تي شوري (المجمرة الذهب النقي)',
  'Tai-Shouri (The Golden Censer)',
  'Ⲧⲁⲓϣⲟⲩⲣⲏ ⲛ̀ⲛⲟⲩⲃ ⲛ̀ⲕⲁⲑⲁⲣⲟⲥ',
  'صوم نينوى والصوم الكبير المقدس والقداس الإلهي',
  'Great Lent and Liturgical Incense Service',
  'lent',
  'advanced',
  3,
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3',
  195,
  'من أعمق ألحان التجسد الإلهي والصوم الكبير. هزات مركبة طويلة تشبه تصاعد البخور إلى عرش النعمة.',
  'Reverent Great Lent theological hymn comparing the Theotokos to the golden censer carrying the divine coal.',
  '[
    {"id": 1, "coptic": "Ⲧⲁⲓϣⲟⲩⲣⲏ ⲛ̀ⲛⲟⲩⲃ ⲛ̀ⲕⲁⲑⲁⲣⲟⲥ: ⲉⲧϥⲁⲓ ϧⲁ ⲡⲓϫⲉⲃⲥ ⲛ̀ⲭ̀ⲣⲱⲙ: ⲉ̀ⲧⲁ Ⲫⲓⲱⲧ ϣⲟⲡϥ ⲉ̀ⲣⲟϥ ⲉ̀ⲃⲟⲗ.", "arabized": "تاي شوري إن نوب إن كاثا روس: إت فاي خا بي جيفس إن إكروم: إيتا إفيوت شوبف إيروف إيفول.", "arabic": "هذه المجمرة الذهب النقي، الحاملة جمر النار، التي اشتمها الآب الصالح.", "hazatNotes": "مد لاهوتي خاشع في تاااي شووووري", "startTimeSec": 0}
  ]'::jsonb,
  'published',
  1,
  'user_teacher_mina_101'
),
(
  'draft_hymn_01',
  'مسودة لحن التوزيع الكيهكي',
  'Draft Kiahk Psalmody Hymn',
  'Ⲡⲓⲯⲁⲗⲙⲟⲥ ⲛ̀Ⲭⲟⲓⲁⲕ',
  'شهر كيهك المبارك',
  'Month of Kiahk',
  'kiahk',
  'medium',
  1,
  '/uploads/sample_cross_lesson_audio.mp3',
  90,
  'مسودة قيد الإعداد للمراجعة الكنسية.',
  'Draft under preparation for servant review.',
  '[]'::jsonb,
  'draft',
  1,
  'user_teacher_mina_101'
)
ON CONFLICT (id) DO UPDATE SET
  title_ar = EXCLUDED.title_ar,
  title_en = EXCLUDED.title_en,
  title_coptic = EXCLUDED.title_coptic,
  season_ar = EXCLUDED.season_ar,
  season_en = EXCLUDED.season_en,
  occasion_tag = EXCLUDED.occasion_tag,
  difficulty = EXCLUDED.difficulty,
  level = EXCLUDED.level,
  audio_url = EXCLUDED.audio_url,
  duration_sec = EXCLUDED.duration_sec,
  hazat_explanation_ar = EXCLUDED.hazat_explanation_ar,
  hazat_explanation_en = EXCLUDED.hazat_explanation_en,
  lines = EXCLUDED.lines,
  status = EXCLUDED.status,
  updated_at = timezone('utc'::text, now());
