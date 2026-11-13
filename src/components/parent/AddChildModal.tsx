import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Link2, 
  Lock, 
  ShieldCheck, 
  QrCode, 
  AlertCircle, 
  Check, 
  Sparkles, 
  Smartphone, 
  KeyRound,
  Camera
} from 'lucide-react';
import { ChildProfile, User } from '../../types';
import { 
  linkChildByCode, 
  linkChildByCodeAsync,
  extractSecretCodeFromInput,
  sundaySchoolRoster,
  RosterStudent,
  getOrCreateChildLinkCode
} from '../../lib/parentChildService';
import { useAuth } from '../../context/AuthContext';
import { hasRole } from '../../lib/workspaces';
import { QrCodeScanner } from './QrCodeScanner';

interface AddChildModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChildLinked: (child: ChildProfile) => void;
  existingChildren: ChildProfile[];
  lang: 'en' | 'ar';
  parentId: string;
  parentName: string;
  parentEmail: string;
  initialCode?: string;
  initialTab?: 'qr' | 'code' | 'link';
}

export function AddChildModal({
  isOpen,
  onClose,
  onChildLinked,
  existingChildren,
  lang,
  parentId,
  parentName,
  parentEmail,
  initialCode,
  initialTab = 'qr'
}: AddChildModalProps) {
  const { userData } = useAuth();
  const isParentAccount = hasRole(userData, 'parent');
  const [activeTab, setActiveTab] = useState<'qr' | 'code' | 'link'>(initialTab);
  
  // Code Input Tab
  const [codeInputValue, setCodeInputValue] = useState(initialCode || '');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [detectedChild, setDetectedChild] = useState<RosterStudent | User | null>(null);

  // Link Input Tab
  const [linkInputValue, setLinkInputValue] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);

  // Success state for QR auto-link
  const [justLinkedChild, setJustLinkedChild] = useState<ChildProfile | null>(null);

  useEffect(() => {
    if (initialCode) {
      setCodeInputValue(initialCode.toUpperCase());
      handleCodeChange(initialCode);
      setActiveTab('code');
    } else if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialCode, initialTab]);

  if (!isOpen) return null;

  const isChildAlreadyLinked = (code: string) => {
    return existingChildren.some(
      c => c.linkCode?.toUpperCase() === code.toUpperCase() || c.id.toUpperCase() === code.toUpperCase()
    );
  };

  const handleCodeChange = (val: string) => {
    setCodeInputValue(val.toUpperCase());
    setCodeError(null);
    const clean = extractSecretCodeFromInput(val);

    if (clean.length >= 4) {
      if (isParentAccount) {
        setDetectedChild(null);
        return;
      }
      if (isChildAlreadyLinked(clean)) {
        setCodeError(lang === 'ar' ? 'هذا الطفل مرتبط بحسابك بالفعل.' : 'This child is already linked to your account.');
        setDetectedChild(null);
        return;
      }

      // Check if current user in student mode has this code
      if (hasRole(userData, 'student') && (clean === getOrCreateChildLinkCode(userData).toUpperCase() || clean === userData.id.toUpperCase())) {
        setDetectedChild(userData);
        return;
      }

      // Check registered student codes (strictly by secret link code, NOT by browsing names)
      const match = sundaySchoolRoster.find(
        r => r.linkCode.toUpperCase() === clean || r.id.toUpperCase() === clean
      );
      setDetectedChild(match || null);
    } else {
      setDetectedChild(null);
    }
  };

  const handleLinkPasteChange = (val: string) => {
    setLinkInputValue(val);
    setLinkError(null);
    const extracted = extractSecretCodeFromInput(val);

    if (extracted.length >= 4) {
      if (isParentAccount) {
        setDetectedChild(null);
        return;
      }
      if (isChildAlreadyLinked(extracted)) {
        setLinkError(lang === 'ar' ? 'هذا الطفل مرتبط بحسابك بالفعل.' : 'This child is already linked to your account.');
        setDetectedChild(null);
        return;
      }

      if (hasRole(userData, 'student') && (extracted === getOrCreateChildLinkCode(userData).toUpperCase() || extracted === userData.id.toUpperCase())) {
        setDetectedChild(userData);
        return;
      }

      const match = sundaySchoolRoster.find(
        r => r.linkCode.toUpperCase() === extracted || r.id.toUpperCase() === extracted
      );
      setDetectedChild(match || null);
    } else {
      setDetectedChild(null);
    }
  };

  const submitLink = async (rawInput: string, isFromUrlTab: boolean = false) => {
    const code = extractSecretCodeFromInput(rawInput);
    if (!code) {
      const msg = lang === 'ar' ? 'من فضلك أدخل الرمز السري أو رابط الربط' : 'Please enter child secret code or connect link';
      if (isFromUrlTab) setLinkError(msg);
      else setCodeError(msg);
      return;
    }

    setIsLinking(true);
    if (isFromUrlTab) setLinkError(null);
    else setCodeError(null);

    try {
      const res = await linkChildByCodeAsync(parentId, parentName, parentEmail, code, userData);
      setIsLinking(false);

      if (res.success && res.child) {
        setJustLinkedChild(res.child);
        onChildLinked(res.child);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        const errorMsg = res.error || (lang === 'ar' ? 'تعذر التحقق من هذا الرمز السري' : 'Could not verify secret code');
        if (isFromUrlTab) setLinkError(errorMsg);
        else setCodeError(errorMsg);
      }
    } catch (err: any) {
      setIsLinking(false);
      const errorMsg = err?.message || (lang === 'ar' ? 'حدث خطأ أثناء الربط' : 'An error occurred while linking');
      if (isFromUrlTab) setLinkError(errorMsg);
      else setCodeError(errorMsg);
    }
  };

  // Called when QR Scanner successfully reads a code
  const handleQrCodeDetected = (scannedRaw: string) => {
    const code = extractSecretCodeFromInput(scannedRaw);
    setCodeInputValue(code);
    submitLink(code, false);
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
        dir="rtl"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-[var(--color-church-cream-dark)] overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[var(--color-church-blue)] to-[var(--color-church-burgundy)] text-white p-5 sm:p-6 relative shrink-0">
            <button
              onClick={onClose}
              className={`absolute top-4 sm:top-5 ${lang === 'ar' ? 'left-4 sm:left-5' : 'right-4 sm:right-5'} p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer`}
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-amber-300">
                <Lock size={22} />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                  {lang === 'ar' ? 'ربط حساب ابنك بأمان' : 'Connect Your Child Securely'}
                </h2>
                <p className="text-xs sm:text-sm text-amber-100/90 font-medium">
                  {lang === 'ar' 
                    ? 'مسح رمز QR فوري أو إدخال الرمز السري' 
                    : 'Instant QR Code Scan or Secret Alphanumeric Code'}
                </p>
              </div>
            </div>

            {/* Sub Tabs: QR Code vs Secret Code vs Direct Link */}
            <div className="grid grid-cols-3 gap-1.5 mt-5 bg-black/20 p-1 rounded-2xl">
              {/* Tab 1: QR Scanner */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('qr');
                  setCodeError(null);
                  setLinkError(null);
                }}
                className={`py-2 px-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'qr' 
                    ? 'bg-white text-[var(--color-church-blue)] shadow-sm' 
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <Camera size={15} />
                <span>{lang === 'ar' ? 'مسح QR' : 'Scan QR'}</span>
              </button>

              {/* Tab 2: Secret Text Code */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('code');
                  setDetectedChild(null);
                  setCodeError(null);
                }}
                className={`py-2 px-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'code' 
                    ? 'bg-white text-[var(--color-church-blue)] shadow-sm' 
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <KeyRound size={15} />
                <span>{lang === 'ar' ? 'الرمز السري' : 'Code'}</span>
              </button>

              {/* Tab 3: Direct Link */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('link');
                  setDetectedChild(null);
                  setLinkError(null);
                }}
                className={`py-2 px-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'link' 
                    ? 'bg-white text-[var(--color-church-blue)] shadow-sm' 
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <Link2 size={15} />
                <span>{lang === 'ar' ? 'رابط الربط' : 'Link'}</span>
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">

            {/* Success Celebration state */}
            {justLinkedChild && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-5 text-center space-y-3"
              >
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <Check size={32} />
                </div>
                <h3 className="text-lg font-black text-emerald-950">
                  {lang === 'ar' ? 'تم ربط الحساب بنجاح! 🎉' : 'Account Linked Successfully! 🎉'}
                </h3>
                <p className="text-xs text-emerald-800 font-semibold">
                  {lang === 'ar'
                    ? `أصبح حساب ${justLinkedChild.nameAr} متصلاً الآن بالبوابة لمتابعة الدروس والدرجات.`
                    : `${justLinkedChild.nameEn}'s profile is now connected to your Parent Dashboard.`}
                </p>
              </motion.div>
            )}

            {!justLinkedChild && (
              <>
                {/* Privacy Guarantee Banner */}
                <div className="bg-emerald-50/90 border border-emerald-200/80 rounded-2xl p-3.5 flex items-start gap-3 text-xs text-emerald-950">
                  <ShieldCheck size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 leading-relaxed">
                    <strong className="block font-bold text-emerald-900">
                      {lang === 'ar' ? '🔒 أمان عائلي تام وحماية من الأخطاء:' : '🔒 Family Security & Anti-Mistake Protection:'}
                    </strong>
                    <span>
                      {lang === 'ar' 
                        ? 'لحماية أبنائنا ومنع ربط أي طفل آخر بالخطأ، لا توجد قائمة عامة لأسماء الأطفال. الربط يتم فقط بمسح رمز QR الفريد للطفل أو إدخال رمزه السري.' 
                        : 'To protect children and prevent linking other students by error, there is no public student directory. Linking requires your child’s QR code or private alphanumeric secret.'}
                    </span>
                  </div>
                </div>

                {/* TAB 1: QR CODE SCANNER */}
                {activeTab === 'qr' && (
                  <div className="space-y-4">
                    <QrCodeScanner
                      onCodeDetected={handleQrCodeDetected}
                      onSwitchToManual={() => setActiveTab('code')}
                      lang={lang}
                    />
                  </div>
                )}

                {/* TAB 2: SECRET CODE INPUT */}
                {activeTab === 'code' && (
                  <div className="space-y-4">
                    <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-amber-950">
                      <Smartphone size={16} className="text-amber-700 shrink-0 mt-0.5" />
                      <span>
                        {lang === 'ar' 
                          ? 'يفتح الطفل التطبيق > تبويب "حسابي" > يجد الرمز السري المخصص له (مثل ST-4921).' 
                          : 'The child opens app > Profile tab > finds their Secret Code (e.g. ST-4921).'}
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                        {lang === 'ar' ? 'أدخل الرمز السري للطفل:' : 'Enter Child’s Secret Code:'}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={codeInputValue}
                          onChange={(e) => handleCodeChange(e.target.value)}
                          placeholder="ST-4921"
                          className="w-full text-center tracking-widest text-xl font-mono font-extrabold bg-gray-50 border-2 border-gray-200 rounded-2xl py-3 px-4 outline-none focus:border-[var(--color-church-blue)] focus:bg-white transition-all uppercase placeholder:text-gray-300"
                          maxLength={12}
                          autoFocus
                        />
                        <div className="absolute inset-y-0 right-3.5 rtl:right-auto rtl:left-3.5 flex items-center pointer-events-none text-gray-400">
                          <KeyRound size={20} />
                        </div>
                      </div>
                      {codeError && (
                        <p className="text-xs text-red-600 font-bold mt-2 flex items-center gap-1.5 bg-red-50 p-2.5 rounded-xl border border-red-200">
                          <AlertCircle size={15} className="shrink-0" />
                          <span>{codeError}</span>
                        </p>
                      )}
                    </div>

                    {/* Preview Detected Student Card ONLY when the exact secret code matches */}
                    {detectedChild && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-2xl border-2 border-emerald-400 bg-emerald-50/70 flex items-center justify-between gap-3 shadow-xs"
                      >
                        <div className="flex items-center gap-3">
                          <img 
                            src={'avatarUrl' in detectedChild ? detectedChild.avatarUrl : ''} 
                            alt="Child" 
                            className="w-12 h-12 rounded-xl object-cover border border-emerald-400/40 bg-white"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-sm text-emerald-950">
                                {'nameAr' in detectedChild ? (lang === 'ar' ? detectedChild.nameAr : detectedChild.nameEn) : detectedChild.fullName}
                              </span>
                              <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Check size={11} />
                                {lang === 'ar' ? 'تم التحقق من الرمز ✓' : 'Code Verified ✓'}
                              </span>
                            </div>
                            <p className="text-xs text-emerald-800 font-medium mt-0.5">
                              {'gradeAr' in detectedChild ? (lang === 'ar' ? detectedChild.gradeAr : detectedChild.gradeEn) : detectedChild.grade}
                            </p>
                          </div>
                        </div>

                        <span className="font-bold text-xs text-emerald-900 font-mono bg-white px-2.5 py-1 rounded-xl border border-emerald-200 shadow-2xs">
                          {detectedChild.points} {lang === 'ar' ? 'نقطة' : 'pts'}
                        </span>
                      </motion.div>
                    )}

                    <button
                      type="button"
                      onClick={() => submitLink(codeInputValue, false)}
                      disabled={isLinking || !codeInputValue.trim()}
                      className={`w-full py-3.5 rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        isLinking || !codeInputValue.trim()
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-[var(--color-church-blue)] to-[var(--color-church-burgundy)] text-white hover:opacity-95'
                      }`}
                    >
                      {isLinking ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <ShieldCheck size={18} />
                          <span>{lang === 'ar' ? 'تأكيد وربط حساب الطفل الآن' : 'Verify & Connect Child Now'}</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* TAB 3: DIRECT LINK INPUT */}
                {activeTab === 'link' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                        {lang === 'ar' ? 'الصق رابط الدعوة أو رسالة الواتساب:' : 'Paste Invitation Link or WhatsApp Message:'}
                      </label>
                      <div className="relative">
                        <textarea
                          value={linkInputValue}
                          onChange={(e) => handleLinkPasteChange(e.target.value)}
                          placeholder={lang === 'ar' 
                            ? 'الصق هنا الرابط الذي أرسله لك ابنك، مثلاً:\nhttps://.../?connectChild=ST-4921' 
                            : 'Paste the link sent by your child here, e.g.:\nhttps://.../?connectChild=ST-4921'}
                          rows={3}
                          className="w-full text-xs font-mono bg-gray-50 border-2 border-gray-200 rounded-2xl p-3 outline-none focus:border-[var(--color-church-blue)] focus:bg-white transition-all resize-none"
                          autoFocus
                        />
                      </div>
                      {linkError && (
                        <p className="text-xs text-red-600 font-bold mt-2 flex items-center gap-1.5 bg-red-50 p-2.5 rounded-xl border border-red-200">
                          <AlertCircle size={15} className="shrink-0" />
                          <span>{linkError}</span>
                        </p>
                      )}
                    </div>

                    {/* Detected Child via Link */}
                    {detectedChild && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-2xl border-2 border-emerald-400 bg-emerald-50/70 flex items-center justify-between gap-3 shadow-xs"
                      >
                        <div className="flex items-center gap-3">
                          <img 
                            src={'avatarUrl' in detectedChild ? detectedChild.avatarUrl : ''} 
                            alt="Child" 
                            className="w-12 h-12 rounded-xl object-cover border border-emerald-400/40 bg-white"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-sm text-emerald-950">
                                {'nameAr' in detectedChild ? (lang === 'ar' ? detectedChild.nameAr : detectedChild.nameEn) : detectedChild.fullName}
                              </span>
                              <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Check size={11} />
                                {lang === 'ar' ? 'تم استخراج الرابط بنجاح ✓' : 'Link Verified ✓'}
                              </span>
                            </div>
                            <p className="text-xs text-emerald-800 font-medium mt-0.5">
                              {'gradeAr' in detectedChild ? (lang === 'ar' ? detectedChild.gradeAr : detectedChild.gradeEn) : detectedChild.grade}
                            </p>
                          </div>
                        </div>

                        <span className="font-bold text-xs text-emerald-900 font-mono bg-white px-2.5 py-1 rounded-xl border border-emerald-200 shadow-2xs">
                          {detectedChild.points} {lang === 'ar' ? 'نقطة' : 'pts'}
                        </span>
                      </motion.div>
                    )}

                    <button
                      type="button"
                      onClick={() => submitLink(linkInputValue, true)}
                      disabled={isLinking || !linkInputValue.trim()}
                      className={`w-full py-3.5 rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        isLinking || !linkInputValue.trim()
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-[var(--color-church-blue)] to-[var(--color-church-burgundy)] text-white hover:opacity-95'
                      }`}
                    >
                      {isLinking ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Link2 size={18} />
                          <span>{lang === 'ar' ? 'تأكيد الربط عبر الرابط' : 'Connect via Link Now'}</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}

          </div>

          {/* Footer note */}
          <div className="p-3.5 bg-gray-50 border-t border-gray-100 text-center text-[11px] text-gray-500 font-medium">
            ⛪ {lang === 'ar' 
              ? 'نظام الأمان الأسري المشفر — كنيسة السيدة العذراء والشهيد مارمينا' 
              : 'Encrypted Family Safety System — St. Mary & St. Mina Coptic Church'}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
