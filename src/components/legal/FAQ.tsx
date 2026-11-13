import React from 'react';
import { HelpCircle, X, ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';
import { Language } from '../../types';

export function FAQ({ lang, onClose }: { lang: Language, onClose: () => void }) {
  const isCop = lang === 'cop' || lang === 'copt';

  const faqs = [
    {
      qAr: 'كيف يمكنني كسب النقاط؟',
      aAr: 'يمكنك كسب النقاط من خلال إكمال الدروس بنجاح، اجتياز الاختبارات القصيرة، والتفاعل بشكل إيجابي في المجتمع (Feed). يتم إضافة النقاط إلى حسابك تلقائياً.',
      qEn: 'How can I earn points?',
      aEn: 'You can earn points by successfully completing lessons, passing quizzes, and interacting positively in the community feed. Points are added to your account automatically.',
      qCop: 'Ⲡⲱⲥ ⲟⲩⲟⲛ ϣϫⲟⲙ ⲉ̀ϫⲫⲟ ⲛ̀ϩⲁⲛⲧⲁⲓⲟ;',
      aCop: 'Ⲟⲩⲟⲛ ϣϫⲟⲙ ⲉ̀ϫⲫⲟ ⲛ̀ⲛⲓⲧⲁⲓⲟ ⲉ̀ⲃⲟⲗ ϩⲓⲧⲉⲛ ⲡϫⲱⲕ ⲉ̀ⲃⲟⲗ ⲛ̀ⲛⲓⲥⲃⲱ ⲛⲉⲙ ⲛⲓⲇⲟⲕⲓⲙⲏ ⲛⲉⲙ ϯⲙⲉⲧϣⲫⲏⲣ ϧⲉⲛ ϯⲕⲟⲓⲛⲱⲛⲓⲁ. Ⲥⲉⲟⲩⲁϩ ⲛⲓⲧⲁⲓⲟ ⲉ̀ⲡⲉⲕⲕⲗⲟⲙ ⲉ̀ⲃⲟⲗ ϩⲓⲧⲟⲟⲧϥ.'
    },
    {
      qAr: 'هل يمكنني تغيير كلمة المرور الخاصة بي؟',
      aAr: 'نعم، يمكنك طلب تغيير كلمة المرور من خلال صفحة تسجيل الدخول، أو من إعدادات الحساب إذا كنت مسجلاً للدخول بالفعل.',
      qEn: 'Can I change my password?',
      aEn: 'Yes, you can request a password change from the login screen, or from your account settings if you are already logged in.',
      qCop: 'Ⲟⲩⲟⲛ ϣϫⲟⲙ ⲉ̀ϣⲉⲃⲓⲱ ⲙ̀ⲡⲁⲗⲟⲅⲟⲥ ⲛ̀ⲕⲉⲗⲉⲯ;',
      aCop: 'Ⲁϩⲁ, ⲟⲩⲟⲛ ϣϫⲟⲙ ⲉ̀ⲧⲱⲃϩ ⲉ̀ϣⲉⲃⲓⲱ ⲙ̀ⲡⲓⲗⲟⲅⲟⲥ ⲛ̀ⲕⲉⲗⲉⲯ ⲉ̀ⲃⲟⲗ ϩⲓⲧⲉⲛ ⲡⲓⲡⲩⲗⲏ ⲛ̀ϣⲉ ⲉ̀ϧⲟⲩⲛ ⲓⲉ ⲛⲓⲥⲉⲃⲧⲱⲧ ⲛ̀ⲧⲉ ⲡⲉⲕⲣⲁⲛ.'
    },
    {
      qAr: 'كيف يعمل نظام موافقة ولي الأمر؟',
      aAr: 'إذا قام ولي أمرك بتفعيل هذه الميزة، فإن أي جائزة تطلبها بنقاطك ستذهب أولاً كطلب إلى حساب ولي أمرك. بمجرد موافقته، سيتم خصم النقاط ويمكنك استلام الجائزة من الكنيسة.',
      qEn: 'How does the Parental Approval system work?',
      aEn: 'If your parent has enabled this feature, any reward you request with your points will first go as a request to your parent\'s account. Once they approve, the points will be deducted and you can receive the reward from the church.',
      qCop: 'Ⲡⲱⲥ ⲣⲁϧⲧ ⲡⲓⲧⲁⲝⲓⲥ ⲛ̀ϯϯⲙⲁϯ ⲛ̀ⲧⲉ ⲛⲓⲓⲟϯ;',
      aCop: 'Ⲉϣⲱⲡ ⲁⲣⲉ ⲡⲉⲕⲓⲱⲧ ⲉⲣϩⲱⲃ ⲙ̀ⲡⲁⲓⲧⲁⲝⲓⲥ, ⲧⲁⲓⲟ ⲛⲓⲃⲉⲛ ⲉⲧⲉⲕⲉⲣⲉⲧⲓⲛ ⲙ̀ⲙⲟϥ ϥⲛⲁϣⲉ ⲛ̀ϣⲟⲣⲡ ⲉ̀ⲡⲓⲕⲗⲟⲙ ⲛ̀ⲧⲉ ⲡⲉⲕⲓⲱⲧ. Ⲉϣⲱⲡ ⲁϥϯⲙⲁϯ, ⲥⲉⲛⲁϭⲓ ⲛⲓⲧⲁⲓⲟ ⲟⲩⲟϩ ⲕⲛⲁϭⲓ ⲡⲓⲧⲁⲓⲟ ⲉ̀ⲃⲟⲗ ϧⲉⲛ ϯⲉⲕⲕⲗⲏⲥⲓⲁ.'
    },
    {
      qAr: 'هل الموسيقى الموجودة في التطبيق رسمية؟',
      aAr: 'نعم، جميع الألحان الموجودة في مشغل الموسيقى هي ألحان قبطية أرثوذكسية معتمدة وموثوقة، تم جمعها من مصادر كنسية رسمية مثل موقع الأنبا تكلا وتسبحة.',
      qEn: 'Is the music in the app official?',
      aEn: 'Yes, all the hymns in the music player are approved and authentic Coptic Orthodox hymns, gathered from official church sources like St-Takla and Tasbeha.',
      qCop: 'Ⲁⲛ ⲛⲓϩⲱⲥ ⲉⲧϧⲉⲛ ⲡⲁⲓⲥⲕⲉⲩⲟⲥ ϩⲁⲛⲕⲁⲛⲟⲛⲓⲕⲟⲛ ⲛⲉ;',
      aCop: 'Ⲁϩⲁ, ⲛⲓϩⲱⲥ ⲧⲏⲣⲟⲩ ϩⲁⲛϩⲱⲥ ⲛ̀ⲣⲉⲙⲛ̀ⲭⲏⲙⲓ ⲛ̀ⲟⲣⲑⲟⲇⲟⲝⲟⲥ ⲉⲧⲧⲁϫⲣⲏⲟⲩⲧ ⲉ̀ⲃⲟⲗ ϧⲉⲛ ⲛⲓⲡⲏⲅⲏ ⲉⲑⲟⲩⲁⲃ ⲛ̀ⲧⲉ ϯⲉⲕⲕⲗⲏⲥⲓⲁ.'
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

        <div className="p-6 md:p-10 flex-1 overflow-y-auto space-y-4" dir="rtl">
          {faqs.map((faq, index) => (
            <details key={index} className="group bg-gray-50 rounded-2xl border border-gray-100 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex items-center justify-between p-5 font-bold text-[var(--color-church-blue)] cursor-pointer hover:bg-gray-100 rounded-2xl transition-colors">
                <span>{isCop ? faq.qCop : lang === 'ar' ? faq.qAr : faq.qEn}</span>
                <ChevronDown size={20} className="text-gray-400 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="px-5 pb-5 text-gray-600 text-sm md:text-base leading-relaxed border-t border-gray-100 pt-4 mt-2">
                {isCop ? faq.aCop : lang === 'ar' ? faq.aAr : faq.aEn}
              </div>
            </details>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
