import React from 'react';
import { HelpCircle, X, ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';
import { Language } from '../../types';

export function FAQ({ lang, onClose }: { lang: Language, onClose: () => void }) {
  const isCop = lang === 'cop' || lang === 'copt';

  const faqs = [
    {
      qAr: 'إزاي أكسب نقاط؟',
      aAr: 'هتكسب نقاط لما تكمّل الدروس وتنجح في الاختبارات القصيرة وتتفاعل بشكل إيجابي مع مجتمع الكنيسة. النقاط بتتضاف لحسابك تلقائي.',
      qEn: 'How can I earn points?',
      aEn: 'You can earn points by successfully completing lessons, passing quizzes, and interacting positively in the community feed. Points are added to your account automatically.',
      qCop: 'Ⲡⲱⲥ ⲟⲩⲟⲛ ϣϫⲟⲙ ⲉ̀ϫⲫⲟ ⲛ̀ϩⲁⲛⲧⲁⲓⲟ;',
      aCop: 'Ⲟⲩⲟⲛ ϣϫⲟⲙ ⲉ̀ϫⲫⲟ ⲛ̀ⲛⲓⲧⲁⲓⲟ ⲉ̀ⲃⲟⲗ ϩⲓⲧⲉⲛ ⲡϫⲱⲕ ⲉ̀ⲃⲟⲗ ⲛ̀ⲛⲓⲥⲃⲱ ⲛⲉⲙ ⲛⲓⲇⲟⲕⲓⲙⲏ ⲛⲉⲙ ϯⲙⲉⲧϣⲫⲏⲣ ϧⲉⲛ ϯⲕⲟⲓⲛⲱⲛⲓⲁ. Ⲥⲉⲟⲩⲁϩ ⲛⲓⲧⲁⲓⲟ ⲉ̀ⲡⲉⲕⲕⲗⲟⲙ ⲉ̀ⲃⲟⲗ ϩⲓⲧⲟⲟⲧϥ.'
    },
    {
      qAr: 'أقدر أغيّر كلمة السر؟',
      aAr: 'أيوه. تقدر تطلب تغيير كلمة السر من صفحة تسجيل الدخول، أو من إعدادات حسابك لو إنت مسجّل دخول.',
      qEn: 'Can I change my password?',
      aEn: 'Yes, you can request a password change from the login screen, or from your account settings if you are already logged in.',
      qCop: 'Ⲟⲩⲟⲛ ϣϫⲟⲙ ⲉ̀ϣⲉⲃⲓⲱ ⲙ̀ⲡⲁⲗⲟⲅⲟⲥ ⲛ̀ⲕⲉⲗⲉⲯ;',
      aCop: 'Ⲁϩⲁ, ⲟⲩⲟⲛ ϣϫⲟⲙ ⲉ̀ⲧⲱⲃϩ ⲉ̀ϣⲉⲃⲓⲱ ⲙ̀ⲡⲓⲗⲟⲅⲟⲥ ⲛ̀ⲕⲉⲗⲉⲯ ⲉ̀ⲃⲟⲗ ϩⲓⲧⲉⲛ ⲡⲓⲡⲩⲗⲏ ⲛ̀ϣⲉ ⲉ̀ϧⲟⲩⲛ ⲓⲉ ⲛⲓⲥⲉⲃⲧⲱⲧ ⲛ̀ⲧⲉ ⲡⲉⲕⲣⲁⲛ.'
    },
    {
      qAr: 'موافقة ولي الأمر بتشتغل إزاي؟',
      aAr: 'لو ولي أمرك فعّل الخاصية دي، أي مكافأة تطلبها بنقاطك هتروحله الأول للموافقة. بعد ما يوافق، النقاط هتتخصم وتقدر تستلم المكافأة من الكنيسة.',
      qEn: 'How does the Parental Approval system work?',
      aEn: 'If your parent has enabled this feature, any reward you request with your points will first go as a request to your parent\'s account. Once they approve, the points will be deducted and you can receive the reward from the church.',
      qCop: 'Ⲡⲱⲥ ⲣⲁϧⲧ ⲡⲓⲧⲁⲝⲓⲥ ⲛ̀ϯϯⲙⲁϯ ⲛ̀ⲧⲉ ⲛⲓⲓⲟϯ;',
      aCop: 'Ⲉϣⲱⲡ ⲁⲣⲉ ⲡⲉⲕⲓⲱⲧ ⲉⲣϩⲱⲃ ⲙ̀ⲡⲁⲓⲧⲁⲝⲓⲥ, ⲧⲁⲓⲟ ⲛⲓⲃⲉⲛ ⲉⲧⲉⲕⲉⲣⲉⲧⲓⲛ ⲙ̀ⲙⲟϥ ϥⲛⲁϣⲉ ⲛ̀ϣⲟⲣⲡ ⲉ̀ⲡⲓⲕⲗⲟⲙ ⲛ̀ⲧⲉ ⲡⲉⲕⲓⲱⲧ. Ⲉϣⲱⲡ ⲁϥϯⲙⲁϯ, ⲥⲉⲛⲁϭⲓ ⲛⲓⲧⲁⲓⲟ ⲟⲩⲟϩ ⲕⲛⲁϭⲓ ⲡⲓⲧⲁⲓⲟ ⲉ̀ⲃⲟⲗ ϧⲉⲛ ϯⲉⲕⲕⲗⲏⲥⲓⲁ.'
    },
    {
      qAr: 'الألحان اللي في التطبيق معتمدة؟',
      aAr: 'الألحان المعروضة هنا من مصادر كنسية معتمدة وموثوقة. بنحافظ على أسمائها ونصوصها ومرجعها الكنسي زي ما هي.',
      qEn: 'Is the music in the app official?',
      aEn: 'Yes, all the hymns in the music player are approved and authentic Coptic Orthodox hymns, gathered from official church sources like St-Takla and Tasbeha.',
      qCop: 'Ⲁⲛ ⲛⲓϩⲱⲥ ⲉⲧϧⲉⲛ ⲡⲁⲓⲥⲕⲉⲩⲟⲥ ϩⲁⲛⲕⲁⲛⲟⲛⲓⲕⲟⲛ ⲛⲉ;',
      aCop: 'Ⲁϩⲁ, ⲛⲓϩⲱⲥ ⲧⲏⲣⲟⲩ ϩⲁⲛϩⲱⲥ ⲛ̀ⲣⲉⲙⲛ̀ⲭⲏⲙⲓ ⲛ̀ⲟⲣⲑⲟⲇⲟⲝⲟⲥ ⲉⲧⲧⲁϫⲣⲏⲟⲩⲧ ⲉ̀ⲃⲟⲗ ϧⲉⲛ ⲛⲓⲡⲏⲅⲏ ⲉⲑⲟⲩⲁⲃ ⲛ̀ⲧⲉ ϯⲉⲕⲕⲗⲏⲥⲓⲁ.'
    },
    {
      qAr: 'إيه هو كود ربط الأسرة؟',
      aAr: 'كل طالب له كود من ٥ حروف أو أرقام فقط. انسخه كما هو وشاركه مع ولي أمرك فقط، أو استخدم QR. لا تنشره في المنشورات أو المجموعات العامة.',
      qEn: 'What is my family connection code?',
      aEn: 'Every student has a five-character code made only of letters and numbers. Copy it exactly and share it only with your parent, or use the QR code. Never post it publicly.'
    },
    {
      qAr: 'هل ولي الأمر يقدر يشوف وقت استخدام التطبيق؟',
      aAr: 'نعم. وقت النشاط اليومي يُحسب أثناء بقاء التطبيق ظاهراً ونشطاً، ويتوقف عند إخفاء الصفحة. يظهر إجمالي اليوم بتوقيت القاهرة في بوابة ولي الأمر بعد مزامنة البيانات.',
      qEn: 'Can my parent see my active time?',
      aEn: 'Yes. Daily active time is counted while the app is visible and pauses when the page is hidden. The Cairo-day total appears in the Parent Portal after it syncs.'
    },
    {
      qAr: 'إزاي أغيّر لغة الإشعارات؟',
      aAr: 'لغة الإشعارات تتبع لغة التطبيق تلقائياً. لو غيّرت التطبيق للعربية أو الإنجليزية، الإشعارات الجديدة هتستخدم نفس اللغة. تقدر تتحكم في أنواع الإشعارات والهدوء من إعدادات الإشعارات.',
      qEn: 'How do I change notification language?',
      aEn: 'Notification language follows the app language automatically. Switch the app to Arabic or English and new notifications will use that language. You can manage categories and quiet hours in Notification Preferences.'
    },
    {
      qAr: 'إزاي أبعت تسجيل تسميع اللحن للخادم؟',
      aAr: 'بعد ما توقف التسجيل وتسمعه، اضغط «إرسال التسميع للخادم». التسجيل الخاص هيظهر للخدام المكلّفين بفصلك فقط، ويقدروا يسمعوه ويعلّموا إنه اتراجع.',
      qEn: 'How do I send a hymn practice recording to my teacher?',
      aEn: 'After stopping and replaying your take, press “Send practice to teacher”. The private recording is available only to servants assigned to your class, who can listen and mark it reviewed.'
    },
    {
      qAr: 'فين الحاجات اللي اشتريتها من متجر الملف الشخصي؟',
      aAr: 'كل عنصر تشتريه بيتحفظ في المخزون. من المخزون تقدر تطبّقه على ملفك، والمعاينة المباشرة بتوريك شكله على ملفك قبل الشراء أو التطبيق.',
      qEn: 'Where do my profile store purchases go?',
      aEn: 'Purchased items are stored in your inventory. You can equip them from there, and the live preview lets you see how an item looks on your profile before buying or equipping it.'
    },
    {
      qAr: 'إزاي أطلب مساعدة من فريق الكنيسة؟',
      aAr: 'استخدم زر «المساعدة» في الشريط العلوي لإرسال طلب خاص. خدام ومسؤولو المنصة المصرّح لهم يراجعوا الطلب. وللرعاية الروحية، تواصل مباشرة مع خادم فصلك أو الأب الكاهن.',
      qEn: 'How do I contact the church support team?',
      aEn: 'Use the Help button in the top bar to send a private support request for review by authorized servants or platform administrators. For pastoral care, speak directly with your class servant or priest.'
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed inset-0 z-50 bg-white md:bg-gray-50/90 flex flex-col items-center justify-start md:py-12 overflow-y-auto"
    >
      <div className="w-full max-w-3xl bg-white md:rounded-3xl md:shadow-2xl overflow-hidden min-h-screen md:min-h-0 relative flex flex-col">
        <div className="sticky top-0 bg-white/90 backdrop-blur-sm p-4 border-b border-gray-100 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-[var(--color-church-gold)] rounded-xl flex items-center justify-center text-[var(--color-church-blue)]">
               <HelpCircle size={20} />
             </div>
             <h1 className="text-xl font-bold text-[var(--color-church-blue)]">
               {isCop ? 'Ⲛⲓϣⲉⲛϩⲏⲧ' : lang === 'ar' ? 'الأسئلة الشائعة' : 'FAQ'}
             </h1>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 md:p-10 flex-1 overflow-y-auto space-y-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          {faqs.map((faq, index) => (
            <details key={index} className="group bg-gray-50 rounded-2xl border border-gray-100 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex items-center justify-between p-5 font-bold text-[var(--color-church-blue)] cursor-pointer hover:bg-gray-100 rounded-2xl transition-colors">
                <span>{isCop ? (faq.qCop || faq.qAr) : lang === 'ar' ? faq.qAr : faq.qEn}</span>
                <ChevronDown size={20} className="text-gray-400 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="px-5 pb-5 text-gray-600 text-sm md:text-base leading-relaxed border-t border-gray-100 pt-4 mt-2">
                {isCop ? (faq.aCop || faq.aAr) : lang === 'ar' ? faq.aAr : faq.aEn}
              </div>
            </details>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
