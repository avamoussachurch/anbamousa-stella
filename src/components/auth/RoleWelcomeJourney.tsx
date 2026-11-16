import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, BookOpen, CalendarCheck, CheckCircle2, ChevronRight, GraduationCap, HeartHandshake, LayoutDashboard, MessageCircle, ShieldCheck, Sparkles, Users, X } from 'lucide-react';

type JourneyRole = 'teacher' | 'parent';
type Language = 'ar' | 'en' | 'cop' | 'copt';

interface RoleWelcomeJourneyProps {
  role: JourneyRole;
  lang: Language;
  onNavigate: (tab: string) => void;
  onClose: () => void;
}

const copy = {
  teacher: {
    en: {
      eyebrow: 'YOUR SERVANT JOURNEY', title: 'Welcome to your servant studio!', intro: 'A little guided tour to help you care for your class and make every lesson count.',
      steps: [
        { icon: LayoutDashboard, title: 'Your class at a glance', body: 'Start at your overview to see your teaching workspace and the tools available to your assigned role.', tab: 'home', cta: 'Open my studio' },
        { icon: Users, title: 'Know your students', body: 'Visit class management to review your assigned classes and student roster. Access is limited by your permissions.', tab: 'classManagement', cta: 'Explore my classes' },
        { icon: CalendarCheck, title: 'Care beyond the lesson', body: 'Use attendance and visits to keep track of class participation and pastoral follow-up.', tab: 'attendance', cta: 'See attendance' },
        { icon: BookOpen, title: 'Prepare and publish', body: 'Open the curriculum studio to create, review and publish lessons for your students.', tab: 'studio', cta: 'Open curriculum' },
        { icon: MessageCircle, title: 'Stay connected', body: 'Student help requests and class communication help you respond and support your learners.', tab: 'help-requests', cta: 'View help requests' }
      ],
      finish: 'Your class is ready for you. You can replay this tour any time from your profile.', button: 'Let’s serve!'
    },
    ar: {
      eyebrow: 'رحلتك كخادم', title: 'أهلاً بيك في استوديو الخادم!', intro: 'جولة بسيطة تساعدك تتابع فصلك وتخلي كل درس له معنى.',
      steps: [
        { icon: LayoutDashboard, title: 'فصلك في لمحة', body: 'ابدأ من النظرة العامة علشان تشوف مساحة عملك والأدوات المتاحة حسب صلاحياتك.', tab: 'home', cta: 'افتح الاستوديو' },
        { icon: Users, title: 'اعرف تلاميذك', body: 'افتح إدارة الفصول لمراجعة الفصول المسندة ليك وقائمة التلاميذ.', tab: 'classManagement', cta: 'استكشف فصولي' },
        { icon: CalendarCheck, title: 'اهتمام مستمر', body: 'استخدم الحضور والافتقاد لمتابعة المشاركة والرعاية.', tab: 'attendance', cta: 'شوف الحضور' },
        { icon: BookOpen, title: 'حضّر وانشر', body: 'افتح استوديو المناهج لإنشاء الدروس ومراجعتها ونشرها للتلاميذ.', tab: 'studio', cta: 'افتح المناهج' },
        { icon: MessageCircle, title: 'خليك قريب', body: 'طلبات المساعدة وتواصل الفصل بيساعدوك ترد وتدعم التلاميذ.', tab: 'help-requests', cta: 'طلبات المساعدة' }
      ],
      finish: 'فصلك مستنيك. تقدر تعيد الجولة في أي وقت من ملفك الشخصي.', button: 'يلا نخدم!'
    }
  },
  parent: {
    en: {
      eyebrow: 'YOUR FAMILY JOURNEY', title: 'Welcome, family!', intro: 'Follow your child’s growth, celebrate progress and stay connected with church life.',
      steps: [
        { icon: LayoutDashboard, title: 'Your family home', body: 'Your overview brings together family updates and the next useful steps for your account.', tab: 'home', cta: 'Open family home' },
        { icon: ShieldCheck, title: 'Connect safely', body: 'Link your child with their family QR code or secure code. Only verified links reveal a child’s private progress.', tab: 'family', cta: 'Connect a child' },
        { icon: GraduationCap, title: 'Follow the learning journey', body: 'See the learning journey for children securely linked to your account.', tab: 'journey', cta: 'View learning journey' },
        { icon: Users, title: 'Celebrate progress', body: 'Explore your children’s rankings and achievements in their eligible class context.', tab: 'leaderboard', cta: 'See progress' },
        { icon: HeartHandshake, title: 'Stay in the loop', body: 'Check church events, announcements and family notification settings to stay informed.', tab: 'events', cta: 'See news and events' }
      ],
      finish: 'Your family journey starts here. You can replay this tour any time from your profile.', button: 'Let’s begin!'
    },
    ar: {
      eyebrow: 'رحلة العيلة', title: 'أهلاً بيكم!', intro: 'تابع نمو أولادك واحتفل بتقدمهم وخليك متواصل مع حياة الكنيسة.',
      steps: [
        { icon: LayoutDashboard, title: 'الصفحة الرئيسية للعيلة', body: 'هتلاقي هنا ملخص أخبار العيلة والخطوات المهمة لحسابك.', tab: 'home', cta: 'افتح الرئيسية' },
        { icon: ShieldCheck, title: 'اربط حساب طفلك بأمان', body: 'اربط طفلك عن طريق QR أو الكود السري. بيانات الطفل الخاصة بتظهر بعد تأكيد الربط فقط.', tab: 'family', cta: 'اربط طفل' },
        { icon: GraduationCap, title: 'تابع رحلة التعلّم', body: 'شوف رحلة التعلّم لأولادك المرتبطين بحسابك بشكل موثّق.', tab: 'journey', cta: 'شوف رحلة التعلّم' },
        { icon: Users, title: 'احتفل بالتقدم', body: 'تابع ترتيب وإنجازات أولادك داخل الفصل المناسب لصلاحياتهم.', tab: 'leaderboard', cta: 'شوف التقدم' },
        { icon: HeartHandshake, title: 'خليك على اطلاع', body: 'تابع أخبار الكنيسة والفعاليات وإعدادات إشعارات العيلة.', tab: 'events', cta: 'الأخبار والفعاليات' }
      ],
      finish: 'رحلة عيلتكم بتبدأ من هنا. تقدروا تعيدوا الجولة في أي وقت من الملف الشخصي.', button: 'يلا نبدأ!'
    }
  }
} as const;

export function RoleWelcomeJourney({ role, lang, onNavigate, onClose }: RoleWelcomeJourneyProps) {
  const [step, setStep] = useState(0);
  const reducedMotion = useReducedMotion();
  const isArabic = lang === 'ar';
  const data = copy[role][isArabic ? 'ar' : 'en'];
  const current = data.steps[step];
  const Icon = current?.icon || CheckCircle2;
  const isFinished = step >= data.steps.length;
  const progress = isFinished ? 100 : ((step + 1) / data.steps.length) * 100;
  const next = () => setStep(value => Math.min(value + 1, data.steps.length));
  const previous = () => setStep(value => Math.max(0, value - 1));
  const openDestination = () => {
    if (current?.tab) onNavigate(current.tab);
    onClose();
  };
  const direction = isArabic ? 'rtl' : 'ltr';

  return (
    <div dir={direction} className="fixed inset-0 z-[110] flex items-center justify-center overflow-hidden bg-slate-950/75 p-3 backdrop-blur-md sm:p-6">
      <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <motion.div className="absolute left-1/2 top-1/2 h-[min(82vw,620px)] w-[min(82vw,620px)] -translate-x-1/2 -translate-y-1/2 rounded-full border-[18px] border-amber-300/15 shadow-[0_0_100px_rgba(251,191,36,0.18)]"
          animate={reducedMotion ? {} : { rotate: 360, scale: [0.96, 1.04, 0.96] }} transition={{ rotate: { duration: 32, repeat: Infinity, ease: 'linear' }, scale: { duration: 5, repeat: Infinity } }} />
        <motion.div className="absolute left-1/2 top-1/2 h-[min(64vw,470px)] w-[min(64vw,470px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-200/30"
          animate={reducedMotion ? {} : { scale: [0.88, 1.12, 0.88], opacity: [0.25, 0.75, 0.25] }} transition={{ duration: 4, repeat: Infinity }} />
      </motion.div>

      <motion.section role="dialog" aria-modal="true" aria-labelledby="role-journey-title"
        initial={reducedMotion ? false : { opacity: 0, scale: 0.82, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 180, damping: 20 }}
        className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-amber-200/50 bg-[#fffaf0] text-stone-900 shadow-[0_25px_100px_rgba(0,0,0,0.5)] dark:bg-[#211a14] dark:text-stone-50">
        <div className="h-2 w-full bg-stone-200 dark:bg-stone-700"><motion.div className="h-full bg-gradient-to-r from-amber-400 to-yellow-200" animate={{ width: progress + '%' }} transition={{ duration: 0.45 }} /></div>
        <div className="flex items-center justify-between px-5 pt-4 sm:px-7">
          <span className="text-[10px] font-black tracking-[0.2em] text-amber-700 dark:text-amber-300">{data.eyebrow}</span>
          <button type="button" onClick={onClose} aria-label={isArabic ? 'تخطي الجولة' : 'Skip tour'} className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/10"><X size={18} /></button>
        </div>
        <div className="px-5 pb-6 pt-3 sm:px-8 sm:pb-8">
          <div className="relative mx-auto mb-5 flex h-36 w-36 items-center justify-center">
            <motion.div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-200 to-orange-100 dark:from-amber-800/50 dark:to-orange-950/50"
              animate={reducedMotion ? {} : { scale: [0.92, 1.06, 0.92], rotate: [0, 8, -8, 0] }} transition={{ duration: 4, repeat: Infinity }} />
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={reducedMotion ? false : { opacity: 0, scale: 0.5, rotate: -25 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={{ opacity: 0, scale: 0.5, rotate: 25 }} transition={{ type: 'spring', stiffness: 220, damping: 16 }} className="relative z-10 flex h-24 w-24 items-center justify-center rounded-[2rem] border-4 border-white bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-xl">
                {isFinished ? <Sparkles size={46} /> : <Icon size={46} />}
              </motion.div>
            </AnimatePresence>
            <motion.span className="absolute -right-1 top-3 text-2xl" animate={reducedMotion ? {} : { y: [0, -9, 0], rotate: [0, 12, 0] }} transition={{ duration: 2.2, repeat: Infinity }}>✦</motion.span>
            <motion.span className="absolute -bottom-1 left-1 text-xl" animate={reducedMotion ? {} : { y: [0, 7, 0], rotate: [0, -12, 0] }} transition={{ duration: 2.7, repeat: Infinity }}>✧</motion.span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={step} initial={reducedMotion ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
              <p className="mb-2 text-center text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">{isFinished ? '✦' : (isArabic ? `الخطوة ${step + 1} من ${data.steps.length}` : `STEP ${step + 1} OF ${data.steps.length}`)}</p>
              <h2 id="role-journey-title" className="text-center text-2xl font-black sm:text-3xl">{isFinished ? data.button : data.title}</h2>
              <h3 className="mt-2 text-center text-lg font-extrabold">{isFinished ? (isArabic ? 'بوابتك مفتوحة!' : 'Your portal is open!') : current.title}</h3>
              <p className="mx-auto mt-3 max-w-md text-center text-sm leading-7 text-stone-700 dark:text-stone-200">{isFinished ? data.finish : current.body}</p>
            </motion.div>
          </AnimatePresence>

          <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={previous} disabled={step === 0} className="min-h-11 rounded-xl px-3 text-sm font-bold text-stone-600 underline disabled:opacity-30 dark:text-stone-300">{isArabic ? 'السابق' : 'Back'}</button>
            <div className="flex gap-1.5" aria-label={isArabic ? 'تقدم الجولة' : 'Tour progress'}>{data.steps.map((_, index) => <span key={index} className={`h-2 rounded-full transition-all ${index === step ? 'w-6 bg-amber-500' : 'w-2 bg-stone-300 dark:bg-stone-600'}`} />)}</div>
            {!isFinished ? (
              <div className="flex items-center gap-2">
                <button type="button" onClick={openDestination} className="min-h-11 rounded-xl border border-amber-600/40 px-3 text-xs font-bold text-amber-800 dark:text-amber-200">{current.cta}</button>
                <button type="button" onClick={next} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#173b55] px-4 text-sm font-black text-white shadow-lg hover:bg-[#225575]">{isArabic ? 'التالي' : 'Next'}{isArabic ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}</button>
              </div>
            ) : <button type="button" onClick={onClose} className="min-h-11 rounded-xl bg-amber-500 px-5 text-sm font-black text-stone-950 shadow-lg">{data.button}</button>}
          </div>
        </div>
      </motion.section>
    </div>
  );
}
