import React from 'react';
import { Shield, X } from 'lucide-react';
import { motion } from 'motion/react';
import { Language } from '../../types';

export function PrivacyPolicy({ lang, onClose }: { lang: Language, onClose: () => void }) {
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
             <div className="w-10 h-10 bg-[var(--color-church-blue)] rounded-xl flex items-center justify-center text-white">
               <Shield size={20} />
             </div>
             <h1 className="text-xl font-bold text-[var(--color-church-blue)]">
               {lang === 'copt' ? 'Ϯⲡⲟⲗⲓⲧⲓⲁ ⲛ̀ⲧⲉ ⲛⲓⲙⲩⲥⲧⲏⲣⲓⲟⲛ' : lang === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
             </h1>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 md:p-10 flex-1 overflow-y-auto space-y-8" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          {lang === 'copt' || lang === 'cop' ? (
            <>
              <section>
                <h2 className="text-lg font-bold text-[var(--color-church-blue)] mb-3">ⲁ̅. Ⲑⲱⲟⲩϯ ⲛ̀ⲛⲓⲥⲁϫⲓ</h2>
                <p className="text-gray-600 leading-relaxed">
                  Ⲧⲉⲛⲑⲱⲟⲩϯ ⲙ̀ⲡⲓⲥⲁϫⲓ ⲉⲧⲉⲣⲭⲣⲓⲁ ⲙ̀ⲙⲟϥ ⲙ̀ⲙⲁⲩⲁⲧϥ ⲉ̀ⲡⲉⲣϩⲱⲃ ⲛ̀ϯⲡⲗⲁⲧⲫⲟⲣⲙⲁ: ⲡⲉⲕⲣⲁⲛ, ⲡⲉⲕⲧⲁⲭⲩⲇⲣⲟⲙⲟⲥ, ⲛⲉⲙ ⲡⲉⲕⲧⲁⲝⲓⲥ (ⲁⲗⲟⲩ, ⲇⲓⲁⲕⲟⲛ, ⲓⲱⲧ). Ⲉⲑⲃⲉ ⲛⲓⲁⲗⲱⲟⲩⲓ, ⲧⲉⲛⲙⲟϣⲓ ⲛ̀ⲥⲁ ⲛⲓⲥⲃⲱ ⲛⲉⲙ ⲛⲓⲧⲁⲓⲟ ⲉ̀ⲧⲁϫⲣⲟ ⲡⲟⲩⲥⲃⲱ.
                </p>
              </section>
              <section>
                <h2 className="text-lg font-bold text-[var(--color-church-blue)] mb-3">ⲃ̅. Ⲡⲓⲉⲣϩⲱⲃ ⲙ̀ⲡⲓⲥⲁϫⲓ</h2>
                <p className="text-gray-600 leading-relaxed">
                  Ⲥⲉⲉⲣϩⲱⲃ ⲛ̀ⲛⲉⲕⲥⲁϫⲓ ϧⲉⲛ ⲡⲓⲥⲩⲥⲧⲏⲙⲁ ⲛ̀ⲧⲉ ϯⲉⲕⲕⲗⲏⲥⲓⲁ ⲙ̀ⲙⲁⲩⲁⲧϥ:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Ⲥⲉⲃⲧⲱⲧ ⲛ̀ⲛⲓⲥⲃⲱ ⲛ̀ⲧⲉ ⲡⲓⲁⲗⲟⲩ.</li>
                    <li>Ⲫⲓⲣⲓ ⲉ̀ⲃⲟⲗ ⲛ̀ⲛⲓⲧⲁⲓⲟ ⲛⲉⲙ ⲛⲓⲇⲱⲣⲟⲛ.</li>
                    <li>Ⲑⲣⲉ ⲛⲓⲓⲟϯ ⲛⲁⲩ ⲉ̀ⲡⲓϫⲫⲟ ⲛ̀ⲧⲉ ⲛⲟⲩϣⲏⲣⲓ ϧⲉⲛ ⲟⲩϩⲓⲣⲏⲛⲏ.</li>
                  </ul>
                </p>
              </section>
              <section>
                <h2 className="text-lg font-bold text-[var(--color-church-blue)] mb-3">ⲅ̅. Ⲧⲁϫⲣⲟ ⲛ̀ⲛⲓⲙⲩⲥⲧⲏⲣⲓⲟⲛ</h2>
                <p className="text-gray-600 leading-relaxed">
                  Ⲧⲉⲛⲉⲣϩⲱⲃ ϧⲉⲛ ϩⲁⲛⲧⲉⲭⲛⲏ ⲉⲧϭⲟⲥⲓ ⲉ̀ⲁⲣⲉϩ ⲉ̀ⲛⲉⲕⲥⲁϫⲓ. Ⲙⲡⲉⲛϯ ⲛⲉⲕⲥⲁϫⲓ ⲉ̀ⲃⲟⲗ ⲉ̀ϩⲗⲓ ⲛ̀ⲕⲉⲟⲩⲁⲓ ⲛ̀ⲉⲙⲡⲟⲣⲓⲕⲟⲛ.
                </p>
              </section>
              <section>
                <h2 className="text-lg font-bold text-[var(--color-church-blue)] mb-3">ⲇ̅. Ⲛⲓⲇⲓⲕⲁⲓⲟⲛ ⲛ̀ⲧⲉ ⲛⲓⲓⲟϯ</h2>
                <p className="text-gray-600 leading-relaxed">
                  Ⲟⲩⲟⲛ ⲛ̀ⲧⲉ ⲛⲓⲓⲟϯ ⲡⲓⲇⲓⲕⲁⲓⲟⲛ ⲧⲏⲣϥ ⲉ̀ⲛⲁⲩ ⲉ̀ⲛⲓⲥⲁϫⲓ ⲛ̀ⲧⲉ ⲛⲟⲩϣⲏⲣⲓ, ⲉ̀ϯⲙⲁϯ ⲉ̀ⲛⲓⲧⲁⲓⲟ, ⲟⲩⲟϩ ⲉ̀ⲱⲗⲓ ⲙ̀ⲡⲓⲕⲗⲟⲙ ⲥⲟⲡ ⲛⲓⲃⲉⲛ.
                </p>
              </section>
            </>
          ) : lang === 'ar' ? (
            <>
              <section>
                <h2 className="text-lg font-bold text-[var(--color-church-blue)] mb-3">١. جمع المعلومات</h2>
                <p className="text-gray-600 leading-relaxed">
                  نحن نجمع المعلومات الضرورية فقط لتشغيل المنصة، والتي تشمل: اسمك، بريدك الإلكتروني، ودورك (طالب، خادم، أو ولي أمر). بالنسبة للطلاب، نقوم بتتبع تقدمك في الدروس، النقاط، ومستوى تفاعلك لتحسين تجربتك التعليمية.
                </p>
              </section>
              <section>
                <h2 className="text-lg font-bold text-[var(--color-church-blue)] mb-3">٢. استخدام البيانات</h2>
                <p className="text-gray-600 leading-relaxed">
                  تُستخدم بياناتك حصرياً داخل نظام الكنيسة بهدف:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>تخصيص المحتوى والدروس.</li>
                    <li>إدارة نظام النقاط والمكافآت.</li>
                    <li>السماح لأولياء الأمور بمتابعة تقدم أبنائهم بآمان.</li>
                  </ul>
                </p>
              </section>
              <section>
                <h2 className="text-lg font-bold text-[var(--color-church-blue)] mb-3">٣. حماية البيانات</h2>
                <p className="text-gray-600 leading-relaxed">
                  نحن نستخدم تقنيات التشفير المتقدمة لحماية بياناتك الشخصية من الوصول غير المصرح به. لا نقوم أبداً ببيع أو مشاركة بياناتك مع أطراف ثالثة تجارية. 
                </p>
              </section>
              <section>
                <h2 className="text-lg font-bold text-[var(--color-church-blue)] mb-3">٤. حقوق الوالدين</h2>
                <p className="text-gray-600 leading-relaxed">
                  بموجب قوانين حماية الطفل، يمتلك أولياء الأمور الحق الكامل في الوصول إلى بيانات أبنائهم، التحكم في الموافقات على المكافآت، وطلب حذف الحساب في أي وقت.
                </p>
              </section>
            </>
          ) : (
            <>
              <section>
                <h2 className="text-lg font-bold text-[var(--color-church-blue)] mb-3">1. Information Collection</h2>
                <p className="text-gray-600 leading-relaxed">
                  We collect only the information necessary to operate the platform, including: your name, email address, and role (student, teacher, or parent). For students, we track lesson progress, points, and engagement to improve your educational experience.
                </p>
              </section>
              <section>
                <h2 className="text-lg font-bold text-[var(--color-church-blue)] mb-3">2. Use of Data</h2>
                <p className="text-gray-600 leading-relaxed">
                  Your data is used exclusively within the church system for the purposes of:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Personalizing content and lessons.</li>
                    <li>Managing the points and rewards system.</li>
                    <li>Allowing parents to safely monitor their children's progress.</li>
                  </ul>
                </p>
              </section>
              <section>
                <h2 className="text-lg font-bold text-[var(--color-church-blue)] mb-3">3. Data Protection</h2>
                <p className="text-gray-600 leading-relaxed">
                  We use advanced encryption technologies to protect your personal data from unauthorized access. We never sell or share your data with commercial third parties.
                </p>
              </section>
              <section>
                <h2 className="text-lg font-bold text-[var(--color-church-blue)] mb-3">4. Parental Rights</h2>
                <p className="text-gray-600 leading-relaxed">
                  Under child protection laws, parents have the full right to access their children's data, control reward approvals, and request account deletion at any time.
                </p>
              </section>
            </>
          )}
          
          <div className="pt-6 border-t border-gray-100">
             <p className="text-sm text-gray-400 text-center">
               {lang === 'copt' || lang === 'cop' ? 'Ⲡⲓⲁⲣⲉϩ ⲉ̀ⲡⲓϧⲁⲉ̀: Ⲑⲱⲟⲩⲧ ⲁ̅ⲯ̅ⲕ̅ⲇ̅' : lang === 'ar' ? 'آخر تحديث: سبتمبر ٢٠٢٤' : 'Last Updated: September 2024'}
             </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
