insert into public.achievement_badges(slug,title_en,title_ar,description_en,description_ar,category,icon,style,criteria,points_reward,display_order) values
('steady-learner','A Week of Learning','أسبوع من التعلم','Open learning content on seven different Cairo days.','افتح محتوى تعليميًا في سبعة أيام قاهرية مختلفة.','consistency','calendar-check','teal','{"event_type":"learning_day","count":7}',40,210),
('learning-regular','A Month of Growth','شهر من النمو','Build a learning habit across thirty days.','ابنِ عادة تعلم على مدار ثلاثين يومًا.','consistency','calendar-heart','violet','{"event_type":"learning_day","count":30}',100,220),
('learning-devotee','Lifelong Learner','محب التعلم','Show up to learn on ninety different days.','اظهر للتعلم في تسعين يومًا مختلفًا.','consistency','graduation-cap','gold','{"event_type":"learning_day","count":90}',200,230),
('lesson-scout','Lesson Explorer','مستكشف الدروس','Complete five Sunday School lessons.','أكمل خمسة دروس في مدارس الأحد.','learning','compass','blue','{"event_type":"lesson_completed","count":5}',40,240),
('lesson-master','Lesson Master','ماهر الدروس','Complete twenty-five lessons.','أكمل خمسة وعشرين درسًا.','learning','book-open-check','gold','{"event_type":"lesson_completed","count":25}',150,250),
('hymn-devotee','Hymn Devotee','محب الألحان','Explore twenty different hymns.','استكشف عشرين لحنًا مختلفًا.','hymns','music','violet','{"event_type":"hymn_opened","count":20}',80,260),
('hymn-master','Hymn Master','ماهر الألحان','Master three hymns.','أتقن ثلاثة ألحان.','hymns','audio-lines','gold','{"event_type":"hymn_mastered","count":3}',40,270),
('taxis-practitioner','Ritual Practitioner','ممارس الطقس','Complete five Taxis items.','أكمل خمسة موضوعات في الطقس القبطي.','taxis','scroll-text','green','{"event_type":"taxis_completed","count":5}',50,280),
('taxis-journey','Ritual Journey','رحلة الطقس','Explore twenty Taxis items.','استكشف عشرين موضوعًا في الطقس القبطي.','taxis','book-open-check','violet','{"event_type":"taxis_opened","count":20}',80,290),
('prayer-steadfast','Steadfast in Prayer','ثابت في الصلاة','Record ninety prayer days.','سجل الصلاة في تسعين يومًا.','prayer','heart-handshake','gold','{"event_type":"prayer_day","count":90}',250,300),
('quiz-pro','Quiz Pro','محترف الاختبارات','Pass twenty-five quizzes.','اجتز خمسة وعشرين اختبارًا.','quizzes','brain','violet','{"event_type":"quiz_passed","count":25}',180,310),
('attendance-ten','Always Present','دائم الحضور','Be marked present in ten classes.','سجل حضورك في عشرة فصول.','attendance','calendar-check','blue','{"event_type":"attendance_present","count":10}',70,320),
('attendance-twenty-five','Faithful Regular','مواظب أمين','Be marked present in twenty-five classes.','سجل حضورك في خمسة وعشرين فصلًا.','attendance','church','gold','{"event_type":"attendance_present","count":25}',160,330),
('community-voice','Community Voice','صوت المجتمع','Share ten community posts.','شارك عشرة منشورات في المجتمع.','community','messages-square','coral','{"event_type":"community_post","count":10}',70,340),
('community-heart','A Heart for Others','قلب للآخرين','React kindly to twenty-five posts.','تفاعل بمحبة مع خمسة وعشرين منشورًا.','community','heart','rose','{"event_type":"community_reaction","count":25}',100,350)
on conflict(slug) do nothing;

insert into public.achievement_category_milestones(category,badge_count,title_en,title_ar,points_reward,display_order) values
('consistency',3,'Steady Steps','خطوات ثابتة',50,250),
('consistency',6,'Rhythm Keeper','صاحب المواظبة',120,260),
('consistency',10,'Unshakable Habit','عادة راسخة',250,270)
on conflict(category,badge_count) do nothing;
