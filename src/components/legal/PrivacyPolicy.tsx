import React from 'react';
import { Shield, X, Database, Users, Bell, Mic, Sparkles, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Language } from '../../types';

export function PrivacyPolicy({ lang, onClose }: { lang: Language, onClose: () => void }) {
  const isArabic = lang !== 'en';
  const sections = isArabic ? [
    { icon: Database, title: '١. البيانات التي نجمعها', body: 'قد يعالج التطبيق بيانات الحساب مثل الاسم والبريد الإلكتروني والدور والصف الدراسي والصورة الرمزية؛ وبيانات الاستخدام التعليمي مثل الدروس والاختبارات والنقاط وشعلات الصلاة والتعلّم ووقت النشاط اليومي؛ وبيانات المجتمع مثل المنشورات والتعليقات والتفاعلات والصور والفيديو والتسجيلات الصوتية التي تختار رفعها؛ وكذلك رمز ربط الأسرة وتفضيلات الإشعارات وبيانات الاشتراك اللازمة لإرسال التنبيهات.' },
    { icon: Sparkles, title: '٢. لماذا نستخدم البيانات؟', body: 'نستخدم البيانات لتشغيل الحسابات ومساحات الطلاب وأولياء الأمور والخدام، وتقديم الدروس والصلوات والألحان، وحفظ التقدم والنقاط والإنجازات، وربط ولي الأمر بالطفل بعد التحقق، وإدارة المنشورات وطلبات المساعدة، وإرسال الإشعارات التي تختار تفعيلها. عند استخدام ميزة ذكاء اصطناعي، يُرسل المحتوى الذي تختار إدخاله إلى مزود الذكاء الاصطناعي لمعالجة طلبك.' },
    { icon: Database, title: '٣. مزودو الخدمة والتخزين', body: 'تستخدم المنصة Supabase للمصادقة وقاعدة البيانات وتخزين الملفات، ومزود ذكاء اصطناعي عند طلب ميزة الذكاء الاصطناعي، وخدمات المتصفح والإشعارات لتوصيل التنبيهات. هذه الخدمات تعالج البيانات اللازمة لتقديم الميزة المطلوبة. لا نبيع البيانات الشخصية ولا نستخدمها لإنشاء إعلانات تجارية. لا تكتب كلمات مرور أو أسراراً أو معلومات شديدة الحساسية داخل طلبات الذكاء الاصطناعي.' },
    { icon: Users, title: '٤. من يمكنه رؤية البيانات؟', body: 'يستطيع المستخدم الوصول إلى بيانات حسابه. يستطيع ولي الأمر رؤية بيانات الطفل بعد إنشاء علاقة أسرية موثّقة. يقتصر وصول الخادم على الطلاب والفصول المكلّف بها، ويقتصر وصول الإدارة على المهام الإدارية المصرّح بها. نستخدم ضوابط صلاحيات على مستوى الحساب والفصل، لكن لا توجد خدمة إلكترونية يمكن ضمان أمانها بنسبة ١٠٠٪.' },
    { icon: Mic, title: '٥. الأطفال والتسجيلات والوسائط', body: 'يجب أن يشارك الطفل رمز الأسرة المكوّن من خمسة أحرف أو أرقام مع ولي أمره فقط، وألا ينشره علناً. التسجيلات الصوتية التي يرسلها الطالب للخادم تكون مخصصة لمراجعة الخدام المكلّفين بفصله. لا ترفع صوراً أو تسجيلات أو معلومات خاصة بأشخاص آخرين دون إذن مناسب.' },
    { icon: Bell, title: '٦. الإشعارات والتحكم', body: 'يمكنك التحكم في الإشعارات وفئاتها وساعات الهدوء من إعدادات الإشعارات. لغة الإشعارات الجديدة تتبع لغة التطبيق تلقائياً. يمكنك إيقاف الإشعارات الفورية أو حذف اشتراك المتصفح من إعدادات جهازك.' },
    { icon: Trash2, title: '٧. تصحيح البيانات والاحتفاظ والحذف', body: 'يمكنك طلب تصحيح بيانات الحساب أو إغلاقه أو حذف البيانات من إدارة الكنيسة. لا توفر المنصة حالياً حذفاً ذاتياً شاملاً، ولا تنشر مدة احتفاظ موحدة لكل نوع من البيانات؛ لذلك يجب على إدارة الكنيسة اعتماد مدد الاحتفاظ وإجراءات الحذف الخاصة بالسجلات الكنسية قبل الإطلاق العام. قد تتطلب بعض السجلات الكنسية مراجعة إدارية قبل حذفها.' },
    { icon: Shield, title: '٨. التواصل والمراجعة', body: 'للمساعدة داخل التطبيق، استخدم زر «المساعدة» في الشريط العلوي أو تواصل مع خادم فصلك أو مسؤول المنصة. لا يوجد حالياً رقم هاتف أو بريد إلكتروني عام موثّق مضاف إلى التطبيق؛ يجب على الكنيسة إضافة وسيلة التواصل الرسمية واعتماد هذه السياسة ومراجعتها قانونياً قبل الإطلاق العام. هذه الصفحة بيان شفافية وليست استشارة قانونية.' }
  ] : [
    { icon: Database, title: '1. Information we collect', body: 'The app may process account details such as name, email, role, grade and avatar; learning data such as lessons, quizzes, points, prayer and learning streaks and daily active time; community data such as posts, comments, reactions, and photos, videos or voice recordings you choose to upload; plus family-link codes, notification preferences and the subscription data required to deliver notifications.' },
    { icon: Sparkles, title: '2. How we use information', body: 'We use information to operate student, parent and servant workspaces; provide lessons, prayers and hymns; save progress, points and achievements; verify parent-child links; manage community posts and help requests; and send notifications you enable. When you use an AI feature, the content you choose to submit is sent to the AI provider to process that request.' },
    { icon: Database, title: '3. Service providers and storage', body: 'The platform uses Supabase for authentication, database and file storage; Google Gemini AI when you request an AI feature; and browser/push services to deliver notifications. These services process the information needed for the feature you request. We do not sell personal data or use it for commercial advertising. Do not enter passwords, secrets or highly sensitive information into AI prompts.' },
    { icon: Users, title: '4. Who can see information?', body: 'Users can access their own account information. A parent can view a child after a verified family relationship is created. Servant access is limited to students and classes assigned to them; administrator access is limited to authorized duties. The app uses account- and class-level access controls, but no online service can guarantee absolute security.' },
    { icon: Mic, title: '5. Children, recordings and media', body: 'A child should share their five-character family code only with their parent and never post it publicly. Student hymn-practice recordings are intended for review by servants assigned to the student’s class. Do not upload another person’s photos, recordings or private information without appropriate permission.' },
    { icon: Bell, title: '6. Notifications and controls', body: 'You can manage notification categories and quiet hours in Notification Preferences. New notifications automatically follow the app language. You can disable push notifications or remove the browser subscription through your device settings.' },
    { icon: Trash2, title: '7. Corrections, retention and deletion', body: 'You may ask the church administrator to correct account information, close an account or request deletion. The platform does not currently provide a complete self-service deletion feature and does not publish a fixed retention period for every data category. The church must approve retention periods and deletion procedures for ministry records before public launch; some church records may require administrative review before deletion.' },
    { icon: Shield, title: '8. Contact and review', body: 'For in-app support, use the Help button in the top bar or contact your assigned servant or platform administrator. No verified public phone number or email address is currently configured in the app; the church must add its official contact route and approve and legally review this policy before public launch. This page is a transparency notice, not legal advice.' }
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-start overflow-y-auto bg-white md:bg-gray-50/90 md:py-12">
      <div className="relative flex min-h-screen w-full max-w-3xl flex-col overflow-hidden bg-white md:min-h-0 md:rounded-3xl md:shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/90 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-church-blue)] text-white"><Shield size={20} /></div>
            <div>
              <h1 className="text-xl font-bold text-[var(--color-church-blue)]">{isArabic ? 'الخصوصية وحماية البيانات' : 'Privacy & Data Protection'}</h1>
              <p className="text-[10px] text-gray-500">{isArabic ? 'آخر تحديث: ٢٦ نوفمبر ٢٠٢٦' : 'Last updated: 26 November 2026'}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label={isArabic ? 'إغلاق' : 'Close'} className="rounded-full bg-gray-50 p-2 text-gray-600 transition-colors hover:bg-gray-100"><X size={24} /></button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-8" dir={isArabic ? 'rtl' : 'ltr'}>
          <p className="rounded-2xl border border-amber-300/50 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950">
            {isArabic
              ? 'نوضح هنا البيانات التي يتعامل معها التطبيق ومزودي الخدمة والحقوق المتاحة. يجب على إدارة الكنيسة اعتماد مدد الاحتفاظ ووسيلة التواصل الرسمية ومراجعة السياسة قانونياً قبل الإطلاق العام.'
              : 'This notice explains the information the app processes, its service providers and available requests. The church must approve retention periods and an official contact route and obtain legal review before public launch.'}
          </p>
          {sections.map(section => {
            const Icon = section.icon;
            return <section key={section.title} className="space-y-2 border-b border-gray-100 pb-5 last:border-0">
              <h2 className="flex items-center gap-2 text-base font-black text-[var(--color-church-blue)]"><Icon size={18} className="shrink-0 text-[var(--color-church-gold)]"/>{section.title}</h2>
              <p className="text-sm leading-7 text-gray-700">{section.body}</p>
            </section>;
          })}
          <p className="pt-2 text-center text-xs text-gray-400">Anba Mousa · Growing in Faith, Learning in Love</p>
        </div>
      </div>
    </motion.div>
  );
}
