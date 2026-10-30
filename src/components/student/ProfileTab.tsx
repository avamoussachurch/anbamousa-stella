import React, { useState, useRef, useEffect } from 'react';
import { Settings, LogOut, Shield, Info, Edit3, ArrowLeft, Save, HelpCircle, FileText, Camera, Moon, Sun, Award, BookOpen, Heart, Flame, CheckCircle2, AlertCircle, Loader2, Mail, Phone, GraduationCap, X, Clock, QrCode, Copy, Check, HeartHandshake, Link as LinkIcon, Users, Sparkles, KeyRound, Share2, ShieldCheck, Upload, UserCheck, Calendar, Key, Cross } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { updateSupabaseProfile, uploadAvatarToSupabase } from '../../lib/supabaseDatabase';
import { syncStudentSessionToParent, getShareableChildLink, getWhatsAppShareUrl, getOrCreateChildLinkCode } from '../../lib/parentChildService';
import { ChildQrCodeModal } from '../common/ChildQrCodeModal';
import { StudentOnboardingModal } from '../auth/StudentOnboardingModal';
import { CLASS_GROUPS, getClassGroupForGrade } from '../../lib/classGroups';
import { COPTIC_AVATARS, DEFAULT_STUDENT_AVATAR } from '../../data/copticAvatars';
import { getCurrentChurchYear, joinClassWithCode, getStudentActiveMembership } from '../../lib/churchYearService';
import { Language, ClassGroupId } from '../../types';

type ProfileScreen = 'main' | 'edit' | 'settings' | 'help' | 'privacy';

export function ProfileTab({ 
  onLogout, 
  onOpenTeacherStudio,
  onOpenParentPortal,
  onNavigate,
  lang 
}: { 
  onLogout: () => void;
  onOpenTeacherStudio?: () => void;
  onOpenParentPortal?: () => void;
  onNavigate?: (tab: string) => void;
  lang: Language;
}) {
  const { userData, updateUserProfile, isGuest } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const [screen, setScreen] = useState<ProfileScreen>('main');
  const [userName, setUserName] = useState(userData?.fullName || '');
  const [avatar, setAvatar] = useState(userData?.avatarUrl || DEFAULT_STUDENT_AVATAR);
  const [email, setEmail] = useState(userData?.parentEmail || userData?.email || '');
  const [phone, setPhone] = useState(userData?.phone || '');
  const [grade, setGrade] = useState(userData?.grade || '');
  const [helpSubTab, setHelpSubTab] = useState<'guide' | 'faq' | 'contact'>('guide');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ userName?: string; email?: string; phone?: string; grade?: string }>({});
  const [toast, setToast] = useState<{ show: boolean; type: 'success' | 'error'; message: string } | null>(null);
  const [copiedLinkCode, setCopiedLinkCode] = useState(false);
  const [copiedDirectLink, setCopiedDirectLink] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [manualParentEmail, setManualParentEmail] = useState('');
  const [isLinkingParent, setIsLinkingParent] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);

  // Church Year & Student Join Code state
  const [churchYear, setChurchYear] = useState<string>('2026 / 2027');
  const [showJoinCodeModal, setShowJoinCodeModal] = useState<boolean>(false);
  const [inputJoinCode, setInputJoinCode] = useState<string>('');
  const [isJoiningCode, setIsJoiningCode] = useState<boolean>(false);
  const [joinCodeError, setJoinCodeError] = useState<string | null>(null);
  const [joinCodeSuccess, setJoinCodeSuccess] = useState<string | null>(null);

  // Phase 3C.2: Authoritative Student Class Membership State
  const [studentMembership, setStudentMembership] = useState<{
    isEnrolled: boolean;
    churchYearName?: string;
    churchYearId?: string;
    exactGrade?: string;
    classGroupNameEn?: string;
    classGroupNameAr?: string;
    classGroupId?: ClassGroupId;
    classInstanceId?: string;
    joinedAt?: string;
    membershipId?: string;
  } | null>(null);
  const [loadingMembership, setLoadingMembership] = useState<boolean>(false);

  const isStudent = !userData?.role || userData?.role === 'student';

  const loadMembership = async () => {
    if (!isStudent) return;
    setLoadingMembership(true);
    try {
      const res = await getStudentActiveMembership(userData?.id);
      if (res.success) {
        if (res.activeChurchYear?.name) {
          setChurchYear(res.activeChurchYear.name);
        }
        if (res.isEnrolled && res.membership) {
          setStudentMembership({
            isEnrolled: true,
            churchYearName: res.activeChurchYear?.name || churchYear,
            churchYearId: res.membership.churchYearId,
            exactGrade: res.membership.exactGrade,
            classGroupNameEn: res.classGroup?.nameEn,
            classGroupNameAr: res.classGroup?.nameAr,
            classGroupId: res.classGroup?.id,
            classInstanceId: res.membership.classInstanceId,
            joinedAt: res.membership.joinedAt,
            membershipId: res.membership.id
          });
        } else {
          setStudentMembership({
            isEnrolled: false,
            churchYearName: res.activeChurchYear?.name || churchYear,
            churchYearId: res.activeChurchYear?.id
          });
        }
      } else {
        if (isGuest) {
          setStudentMembership({
            isEnrolled: Boolean(userData?.grade),
            churchYearName: churchYear,
            exactGrade: userData?.grade,
            classGroupNameEn: userData?.grade ? getClassGroupForGrade(userData.grade)?.name.en : undefined,
            classGroupNameAr: userData?.grade ? getClassGroupForGrade(userData.grade)?.name.ar : undefined,
          });
        } else {
          setStudentMembership({
            isEnrolled: false,
            churchYearName: churchYear
          });
        }
      }
    } catch (_) {
      if (isGuest) {
        setStudentMembership({
          isEnrolled: Boolean(userData?.grade),
          churchYearName: churchYear,
          exactGrade: userData?.grade,
          classGroupNameEn: userData?.grade ? getClassGroupForGrade(userData.grade)?.name.en : undefined,
          classGroupNameAr: userData?.grade ? getClassGroupForGrade(userData.grade)?.name.ar : undefined,
        });
      }
    } finally {
      setLoadingMembership(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    getCurrentChurchYear().then((res) => {
      if (mounted && res.success && res.currentChurchYear) {
        setChurchYear(res.currentChurchYear);
      }
    }).catch(() => {});

    if (isStudent) {
      loadMembership();
    }
    return () => { mounted = false; };
  }, [userData?.id, isStudent, isGuest]);

  const handleJoinWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputJoinCode.trim()) return;
    setIsJoiningCode(true);
    setJoinCodeError(null);
    setJoinCodeSuccess(null);
    try {
      const res = await joinClassWithCode(inputJoinCode.trim());
      if (res.success) {
        setJoinCodeSuccess(lang === 'ar' ? `تم الانضمام بنجاح إلى ${res.classInstance?.nameAr || res.classInstance?.nameEn}!` : `Successfully joined ${res.classInstance?.nameEn}!`);
        showToast('success', lang === 'ar' ? 'تم الانضمام للفصل بنجاح! ✝️' : 'Successfully joined class! ✝️');
        await loadMembership();
        setTimeout(() => {
          setShowJoinCodeModal(false);
          setInputJoinCode('');
          setJoinCodeSuccess(null);
        }, 1500);
      } else {
        let msg = res.error || (lang === 'ar' ? 'فشل الانضمام بالكود' : 'Failed to join class');
        if (msg.includes('INCOMPATIBLE_GRADE')) {
          msg = lang === 'ar' ? 'مرحلتك الدراسية غير متوافقة مع هذا الفصل. تأكد من إدخال كود فصلك الصحيح.' : 'Your exact grade is not compatible with this class group.';
        } else if (msg.includes('ARCHIVED_YEAR_CODE')) {
          msg = lang === 'ar' ? 'هذا الكود ينتمي لعام كنسي سابق ومؤرشف. لا يمكن استخدامه.' : 'This code belongs to an archived church year and cannot be used.';
        } else if (msg.includes('CODE_NOT_FOUND')) {
          msg = lang === 'ar' ? 'رمز الفصل غير صحيح أو منتهي الصلاحية. يرجى التأكد من الخادم المسؤول.' : 'Class join code was not found or is invalid for the active year. Please verify with your servant.';
        } else if (msg.includes('ALREADY_ENROLLED')) {
          msg = lang === 'ar' ? 'أنت مسجل بالفعل في فصل نشط لهذا العام الكنسي.' : 'You already have an active class membership in this church year.';
        } else if (msg.includes('FORBIDDEN')) {
          msg = lang === 'ar' ? 'غير مصرح: حسابات الطلاب فقط يمكنها الانضمام للفصول بالكود.' : 'Forbidden: Only student accounts can join a class via code.';
        }
        setJoinCodeError(msg);
      }
    } catch (err: any) {
      setJoinCodeError(err?.message || 'Error joining class');
    } finally {
      setIsJoiningCode(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isParent = userData?.role === 'parent';
  const isTeacher = userData?.role === 'teacher';

  // Only students have unique child codes for parents to link them
  const studentLinkCode = isStudent ? getOrCreateChildLinkCode(userData) : '';

  const handleCopyLinkCode = () => {
    try {
      navigator.clipboard.writeText(studentLinkCode);
      setCopiedLinkCode(true);
      showToast('success', lang === 'ar' ? 'تم نسخ الرمز السري بنجاح! شاركه مع والدك فقط.' : 'Secret code copied! Share only with your parent.');
      setTimeout(() => setCopiedLinkCode(false), 2500);
    } catch (e) {
      showToast('success', studentLinkCode);
    }
  };

  const handleCopyDirectLink = () => {
    try {
      const shareUrl = getShareableChildLink(studentLinkCode);
      navigator.clipboard.writeText(shareUrl);
      setCopiedDirectLink(true);
      showToast('success', lang === 'ar' ? 'تم نسخ رابط الربط المباشر بنجاح! أرسله لوالديك.' : 'Direct invite link copied! Send it to your parent.');
      setTimeout(() => setCopiedDirectLink(false), 2500);
    } catch (e) {
      showToast('error', 'Could not copy link');
    }
  };

  const handleShareWhatsApp = () => {
    try {
      const url = getWhatsAppShareUrl(studentLinkCode, userData?.fullName || 'Child', lang);
      window.open(url, '_blank');
    } catch (e) {
      handleCopyDirectLink();
    }
  };

  const handleLinkParent = async () => {
    if (!manualParentEmail.trim() || !manualParentEmail.includes('@')) {
      showToast('error', lang === 'ar' ? 'يرجى إدخال بريد إلكتروني صالح لولي الأمر' : 'Please enter a valid parent email');
      return;
    }
    setIsLinkingParent(true);
    try {
      await updateUserProfile({
        parentEmail: manualParentEmail.trim(),
        parentId: 'parent-' + manualParentEmail.replace(/[^a-zA-Z0-9]/g, ''),
        parentName: lang === 'ar' ? 'ولي الأمر' : 'Parent / Guardian',
        isLinkedToParent: true
      });
      syncStudentSessionToParent({
        ...userData!,
        parentEmail: manualParentEmail.trim(),
        isLinkedToParent: true
      });
      showToast('success', lang === 'ar' ? 'تم ربط الحساب بولي الأمر بنجاح!' : 'Linked with parent successfully!');
      setManualParentEmail('');
    } catch (e) {
      showToast('error', lang === 'ar' ? 'حدث خطأ أثناء ربط الحساب' : 'Error linking parent');
    } finally {
      setIsLinkingParent(false);
    }
  };

  const handleOpenEdit = () => {
    if (userData) {
      setUserName(userData.fullName || '');
      setAvatar(userData.avatarUrl || DEFAULT_STUDENT_AVATAR);
      setEmail(isStudent ? (userData.parentEmail || '') : (userData.email || ''));
      setPhone(userData.phone || '');
      setGrade(userData.grade || '');
      setValidationErrors({});
    }
    setScreen('edit');
  };

  // Only initialize form fields when user ID changes (e.g. switching accounts)
  // NEVER overwrite form fields while the user is actively editing (screen === 'edit')
  const prevUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (userData && screen !== 'edit' && prevUserIdRef.current !== userData.id) {
      prevUserIdRef.current = userData.id;
      setUserName(userData.fullName || '');
      setAvatar(userData.avatarUrl || DEFAULT_STUDENT_AVATAR);
      setEmail(isStudent ? (userData.parentEmail || '') : (userData.email || ''));
      setPhone(userData.phone || '');
      setGrade(userData.grade || '');
    }
  }, [userData?.id, screen, isStudent]);

  if (!userData) return null;

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ show: true, type, message });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const validateForm = () => {
    const errors: { userName?: string; email?: string; phone?: string; grade?: string } = {};

    if (!userName.trim() || userName.trim().length < 2) {
      errors.userName = lang === 'ar' ? 'الاسم يجب أن يحتوي على حرفين على الأقل' : 'Full Name must be at least 2 characters';
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // For parents and teachers, email is required. For students, it's optional guardian contact
    if (!isStudent) {
      if (!email.trim()) {
        errors.email = lang === 'ar' ? 'البريد الإلكتروني مطلوب' : 'Email address is required';
      } else if (!emailPattern.test(email.trim())) {
        errors.email = lang === 'ar' ? 'يرجى إدخال بريد إلكتروني صالح (مثال: name@example.com)' : 'Please enter a valid email address';
      }
    } else if (email.trim() && !emailPattern.test(email.trim())) {
      errors.email = lang === 'ar' ? 'يرجى إدخال بريد إلكتروني صالح (مثال: name@example.com)' : 'Please enter a valid email address';
    }

    if (phone.trim() && !/^[0-9+() -]{7,20}$/.test(phone.trim())) {
      errors.phone = lang === 'ar' ? 'رقم الهاتف غير صالح (٧ أرقام على الأقل)' : 'Please enter a valid phone number (at least 7 digits)';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpdateProfile = async () => {
    if (!validateForm()) {
      showToast('error', lang === 'ar' ? 'يرجى مراجعة وتصحيح البيانات غير المكتملة' : 'Please fix the errors in your details before saving');
      return;
    }

    setIsSaving(true);
    try {
      const updates = {
        fullName: userName.trim(),
        avatarUrl: avatar,
        parentEmail: isStudent ? email.trim() : undefined,
        email: !isStudent ? email.trim() : (userData.email || undefined),
        phone: phone.trim(),
        grade: grade.trim()
      };

      const result = await updateUserProfile(updates);

      if (result.success) {
        showToast('success', lang === 'ar' ? 'تم حفظ التعديلات بنجاح في قاعدة البيانات! ✝️' : 'Profile successfully saved to the database! ✝️');
        setTimeout(() => {
          setScreen('main');
        }, 1000);
      } else {
        showToast('error', result.error || (lang === 'ar' ? 'فشل حفظ التعديلات' : 'Failed to save changes'));
      }
    } catch (err: any) {
      console.error(err);
      showToast('error', err?.message || (lang === 'ar' ? 'حدث خطأ أثناء الحفظ' : 'An error occurred while saving'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 8MB)
    if (file.size > 8 * 1024 * 1024) {
      showToast('error', lang === 'ar' ? 'حجم الصورة كبير جداً، الحد الأقصى ٨ ميجابايت' : 'Image is too large (max 8MB)');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const res = await uploadAvatarToSupabase(userData.id, file);
      if (res.success && res.url) {
        setAvatar(res.url);
        showToast('success', lang === 'ar' ? 'تم تجهيز ورفع صورة البروفايل بنجاح! 📸' : 'Avatar uploaded successfully! 📸');
      } else {
        // Fallback to local canvas compression
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) {
            setAvatar(reader.result as string);
            showToast('success', lang === 'ar' ? 'تم اختيار صورة البروفايل بنجاح! 📸' : 'Avatar selected successfully! 📸');
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.warn('Avatar upload error fallback:', err);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const formatScreenTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const Header = ({ title, onBack }: { title: string, onBack: () => void }) => (
    <div className="flex items-center gap-4 mb-6">
      <button 
        onClick={onBack} 
        className="p-2.5 bg-[var(--mousa-cream-surface)] dark:bg-stone-800 rounded-2xl shadow-xs text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB] hover:bg-[var(--mousa-sand-100)] border border-[var(--mousa-border-sand)] transition-colors cursor-pointer"
        aria-label={lang === 'ar' ? 'الرجوع' : 'Go back'}
      >
        <ArrowLeft size={20} className={lang === 'ar' ? 'rotate-180' : ''} />
      </button>
      <h1 className="text-xl md:text-2xl font-black text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB]">{title}</h1>
    </div>
  );

  return (
    <div className="pb-24 pt-6 px-4 w-full max-w-7xl mx-auto h-full relative overflow-hidden">
      {/* Dynamic Toast Feedback Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -25, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -25, scale: 0.95 }}
            className={`fixed top-5 left-1/2 -translate-x-1/2 z-[100] max-w-md w-[92%] px-4 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border ${
              toast.type === 'success'
                ? 'bg-emerald-900 text-white border-emerald-700 shadow-emerald-950/40'
                : 'bg-red-900 text-white border-red-700 shadow-red-950/40'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 size={22} className="text-emerald-300 shrink-0" />
            ) : (
              <AlertCircle size={22} className="text-red-300 shrink-0" />
            )}
            <p className="text-sm font-bold flex-1 leading-snug">{toast.message}</p>
            <button 
              onClick={() => setToast(null)} 
              className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {screen === 'main' && (
          <motion.div key="main" initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }} className="space-y-6">
            <h1 className="text-2xl font-black text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB] mb-6 md:text-3xl">{lang === 'ar' ? 'ملف المسافر في رحلة موسى' : 'Traveler Profile'}</h1>
            
            <div className="md:grid md:grid-cols-[1.5fr_1fr] md:gap-8 space-y-6 md:space-y-0">
              <div className="space-y-6">
                <div className="bg-[var(--mousa-cream-surface)] dark:bg-[var(--surface-primary)] rounded-3xl p-6 shadow-xs border-2 border-[var(--mousa-border-sand)] text-center relative">
                  <button onClick={handleOpenEdit} className={`absolute top-4 ${lang === 'ar' ? 'left-4' : 'right-4'} text-[var(--mousa-sand-500)] hover:text-[var(--mousa-coral)] p-2 rounded-xl hover:bg-[var(--mousa-sand-100)] transition-colors cursor-pointer`} title={lang === 'ar' ? 'تعديل الملف الشخصي' : 'Edit Profile'}>
                    <Edit3 size={20} />
                  </button>
                  <img src={userData.avatarUrl} alt="Avatar" className="w-24 h-24 md:w-32 md:h-32 mx-auto rounded-full border-4 border-[var(--mousa-gold)] bg-[var(--mousa-sand-100)] mb-4 shadow-sm object-cover" />
                  <h2 className="text-xl md:text-2xl font-black text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB]">{userData.fullName}</h2>
                  <p className="text-[var(--mousa-sand-500)] dark:text-[var(--mousa-sand-400)] font-bold md:text-lg">{lang === 'ar' ? 'رحلة القديس الأنبا موسى' : 'The Journey of Moses'}</p>
                  
                  <div className="flex justify-center gap-6 md:gap-12 mt-6 pt-6 border-t border-[var(--mousa-border-sand)]/60">
                    <div>
                      <p className="text-2xl md:text-3xl font-black text-[var(--mousa-gold)] dark:text-[var(--mousa-gold-light)]">{userData.points}</p>
                      <p className="text-xs md:text-sm text-[var(--mousa-sand-500)] dark:text-[var(--text-muted)] font-black uppercase tracking-wider">{lang === 'ar' ? 'نقاط البركة' : 'Points'}</p>
                    </div>
                    <div>
                      <p className="text-2xl md:text-3xl font-black text-[var(--mousa-coral-dark)] dark:text-[var(--mousa-coral-glow)]">{userData.currentStreak}</p>
                      <p className="text-xs md:text-sm text-[var(--mousa-sand-500)] dark:text-[var(--text-muted)] font-black uppercase tracking-wider">{lang === 'ar' ? 'شعلة الأيام' : 'Streak'}</p>
                    </div>
                    <div>
                      <p className="text-2xl md:text-3xl font-black text-[var(--mousa-teal)] dark:text-[var(--mousa-teal-glow)]">{userData.longestStreak}</p>
                      <p className="text-xs md:text-sm text-[var(--mousa-sand-500)] dark:text-[var(--text-muted)] font-black uppercase tracking-wider">{lang === 'ar' ? 'أعلى إنجاز' : 'Best'}</p>
                    </div>
                  </div>

                  {/* Active Screen / Study Time */}
                  <div className="mt-4 pt-3.5 border-t border-[var(--mousa-border-sand)]/60 flex items-center justify-between text-xs text-[var(--mousa-sand-500)] font-medium px-1">
                    <span className="flex items-center gap-1.5 text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB] font-bold">
                      <Clock size={15} className="text-[var(--mousa-gold)] animate-pulse" />
                      {lang === 'ar' ? 'وقت التعلم النشط اليوم' : 'Active Learning Time Today'}
                    </span>
                    <span className="font-black text-xs md:text-sm text-[var(--mousa-teal-deep)] dark:text-[var(--text-primary)] bg-[var(--mousa-sand-100)] dark:bg-[var(--surface-secondary)] px-3 py-1 rounded-full border border-[var(--mousa-border-sand)] dark:border-[var(--border-default)]">
                      {formatScreenTime(userData.screenTimeSeconds || 0)}
                    </span>
                  </div>
                </div>

                {/* Achievement Badges Section */}
                <div className="bg-white dark:bg-[var(--surface-primary)] rounded-3xl p-6 shadow-sm border border-[var(--mousa-border-sand)]">
                  <h3 className="font-bold text-lg md:text-xl text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB] mb-4 flex items-center gap-2">
                    <Award size={20} className="text-[var(--mousa-gold)]" />
                    {lang === 'ar' ? 'الأوسمة والإنجازات' : 'Achievements'}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                    {[
                      {
                        id: 'early_bird',
                        title: { en: 'Early Bird', ar: 'مبكر' },
                        description: { en: 'Completed a morning lesson', ar: 'أنهى درس الصباح' },
                        icon: Sun,
                        color: 'text-amber-500',
                        bg: 'bg-amber-100',
                        border: 'border-amber-200',
                        isUnlocked: userData.points > 0, // Unlocks after any activity
                      },
                      {
                        id: 'studious',
                        title: { en: 'Studious', ar: 'مجتهد' },
                        description: { en: 'Reached 300 points', ar: 'الوصول لـ ٣٠٠ نقطة' },
                        icon: BookOpen,
                        color: 'text-[var(--mousa-teal-deep)]',
                        bg: 'bg-blue-50',
                        border: 'border-blue-200',
                        isUnlocked: userData.points >= 300,
                      },
                      {
                        id: 'community_helper',
                        title: { en: 'Community Helper', ar: 'مساعد المجتمع' },
                        description: { en: 'Shared 5 replies in feed', ar: 'شارك ٥ تعليقات' },
                        icon: Heart,
                        color: 'text-[var(--color-church-burgundy)]',
                        bg: 'bg-red-50',
                        border: 'border-red-200',
                        isUnlocked: false,
                      },
                      {
                        id: 'consistent',
                        title: { en: 'Consistent', ar: 'مستمر' },
                        description: { en: '3-day streak', ar: '٣ أيام متتالية' },
                        icon: Flame,
                        color: 'text-[var(--mousa-gold)]',
                        bg: 'bg-amber-50',
                        border: 'border-amber-200',
                        isUnlocked: userData.longestStreak >= 3,
                      }
                    ].map(badge => (
                      <div 
                        key={badge.id} 
                        className={`flex items-center gap-3 p-3 md:p-4 rounded-2xl border ${badge.isUnlocked ? `${badge.bg} ${badge.border}` : 'bg-gray-50 dark:bg-[var(--surface-secondary)] border-gray-200 dark:border-[var(--border-default)]'} transition-all`}
                      >
                        <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center shrink-0 ${badge.isUnlocked ? 'bg-white shadow-sm' : 'bg-gray-200 dark:bg-[var(--surface-overlay)]'}`}>
                          <badge.icon size={24} className={badge.isUnlocked ? badge.color : 'text-gray-500 dark:text-[var(--text-muted)]'} />
                        </div>
                        <div>
                          <p className={`font-bold text-sm md:text-base ${badge.isUnlocked ? badge.color : 'text-gray-700 dark:text-[var(--text-secondary)]'}`}>
                            {badge.title[lang]}
                          </p>
                          <p className="text-xs md:text-sm text-gray-600 dark:text-[var(--text-muted)] mt-0.5 font-medium leading-tight">{badge.description[lang]}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Role-Specific Connection Card */}
              {isStudent && (
                <div className="bg-white dark:bg-[var(--surface-primary)] rounded-3xl p-5 md:p-6 shadow-sm border border-[var(--mousa-border-sand)] space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-stone-850 text-[var(--mousa-teal-deep)] dark:text-[var(--mousa-gold)] flex items-center justify-center font-bold">
                        <HeartHandshake size={22} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-[#FAF5EB] text-sm md:text-base">
                          {lang === 'ar' ? 'ربط الحساب بولي الأمر والمزامنة' : 'Parent Link & Live Sync'}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-[#C5B5A0]">
                          {userData.isLinkedToParent || userData.parentEmail
                            ? (lang === 'ar' ? `مرتبط بحساب: ${userData.parentName || userData.parentEmail}` : `Linked with: ${userData.parentName || userData.parentEmail}`)
                            : (lang === 'ar' ? 'شارك رمزك مع ولي أمرك لربط الحساب' : 'Share code with your parent to link')}
                        </p>
                      </div>
                    </div>

                    {userData.isLinkedToParent || userData.parentEmail ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 size={13} />
                        {lang === 'ar' ? 'متصل' : 'Linked'}
                      </span>
                    ) : (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        {lang === 'ar' ? 'غير مرتبط' : 'Not Linked'}
                      </span>
                    )}
                  </div>

                  {/* Parent blessing card if exists */}
                  {userData.parentBlessingMessage && (
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50/50 dark:from-amber-950/50 dark:to-orange-950/30 border border-amber-200/80 dark:border-amber-800 rounded-2xl p-3.5 flex items-start gap-3">
                      <span className="text-2xl">🕊️</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1">
                            <Sparkles size={12} className="text-amber-600" />
                            {lang === 'ar' ? 'بركة وتشجيع من ولي الأمر' : 'Parent Blessing & Encouragement'}
                          </span>
                          <span className="text-[10px] text-amber-800 dark:text-amber-300 font-semibold">{lang === 'ar' ? 'اليوم' : 'Today'}</span>
                        </div>
                        <p className="text-xs text-amber-950 dark:text-amber-100 mt-1 font-medium italic">
                          "{userData.parentBlessingMessage}"
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Child Secret Code & Direct Link Section */}
                  <div className="bg-gradient-to-br from-gray-50 to-blue-50/30 dark:from-[var(--surface-secondary)] dark:to-[var(--surface-secondary)] rounded-2xl p-4 border border-blue-100/80 dark:border-[var(--border-default)] space-y-3.5">
                    {/* Security Notice */}
                    <div className="flex items-start gap-2.5 text-xs text-blue-950 dark:text-[var(--text-primary)] bg-white dark:bg-[var(--surface-overlay)] p-2.5 rounded-xl border border-blue-100 dark:border-[var(--border-default)] shadow-2xs">
                      <ShieldCheck size={18} className="text-[var(--mousa-teal-deep)] shrink-0 mt-0.5" />
                      <span className="leading-relaxed">
                        {lang === 'ar'
                          ? '🔒 هذا الرمز السري خاص بحساب الطفل فقط، يتيح لولي الأمر ربطه ومتابعة تقدمه في مدارس الأحد.'
                          : '🔒 This secret code is specific to your child account so your parent can link and follow your progress.'}
                      </span>
                    </div>

                    {/* Secret Code Display & Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-[var(--surface-overlay)] p-3 rounded-xl border border-gray-200 dark:border-[var(--border-default)]">
                      <div className="flex items-center gap-2.5 w-full sm:w-auto">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-[var(--mousa-teal-deep)] flex items-center justify-center shrink-0">
                          <KeyRound size={20} />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-gray-600 dark:text-[var(--text-muted)] uppercase tracking-wider block">
                            {lang === 'ar' ? 'الرمز السري الخاص بالطفل' : 'Child Unique Secret Code'}
                          </span>
                          <span className="font-mono font-black text-lg text-[var(--mousa-teal-deep)] tracking-wider">
                            {studentLinkCode}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => setShowQrModal(true)}
                          className="flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-[var(--mousa-teal-deep)] hover:bg-blue-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                        >
                          <QrCode size={14} className="text-amber-300" />
                          <span>{lang === 'ar' ? 'عرض رمز QR' : 'Show QR Code'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleCopyLinkCode}
                          className="flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-gray-50 dark:bg-[var(--surface-secondary)] hover:bg-gray-100 dark:hover:bg-[var(--state-hover)] border border-gray-200 dark:border-[var(--border-default)] text-gray-800 dark:text-[var(--text-primary)] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          {copiedLinkCode ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                          <span>{copiedLinkCode ? (lang === 'ar' ? 'تم نسخ الرمز!' : 'Copied!') : (lang === 'ar' ? 'نسخ الرمز' : 'Copy Code')}</span>
                        </button>
                      </div>
                    </div>

                    {/* Direct Link Share Actions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleCopyDirectLink}
                        className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-[var(--surface-overlay)] hover:bg-gray-50 dark:hover:bg-[var(--state-hover)] border border-blue-200 dark:border-[var(--border-default)] text-[var(--mousa-teal-deep)] dark:text-[var(--text-primary)] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      >
                        {copiedDirectLink ? <Check size={14} className="text-emerald-600" /> : <LinkIcon size={14} />}
                        <span>{copiedDirectLink ? (lang === 'ar' ? 'تم نسخ الرابط!' : 'Link Copied!') : (lang === 'ar' ? 'نسخ رابط الربط المباشر' : 'Copy Direct Link')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleShareWhatsApp}
                        className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Share2 size={14} />
                        <span>{lang === 'ar' ? 'إرسال لوالديك عبر واتساب 💬' : 'Send to Parent via WhatsApp 💬'}</span>
                      </button>
                    </div>
                  </div>

                  {/* If not linked yet, allow quick linking via parent email */}
                  {(!userData.isLinkedToParent && !userData.parentEmail) && (
                    <div className="pt-1">
                      <div className="flex gap-2">
                        <input
                          type="email"
                          value={manualParentEmail}
                          onChange={(e) => setManualParentEmail(e.target.value)}
                          placeholder={lang === 'ar' ? 'أدخل إيميل ولي الأمر للربط...' : 'Enter parent email to link...'}
                          className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-[var(--mousa-teal-deep)]"
                        />
                        <button
                          onClick={handleLinkParent}
                          disabled={isLinkingParent}
                          className="px-4 py-2 rounded-xl bg-[var(--mousa-teal-deep)] text-white text-xs font-bold hover:bg-blue-800 disabled:opacity-50 flex items-center gap-1.5 transition-all shadow-2xs shrink-0"
                        >
                          {isLinkingParent ? <Loader2 size={13} className="animate-spin" /> : <LinkIcon size={13} />}
                          <span>{lang === 'ar' ? 'ربط الآن' : 'Link Now'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* For Students: Sunday School Class & Grade Card */}
              {isStudent && (
                <div className="bg-white dark:bg-[var(--surface-primary)] rounded-3xl p-5 md:p-6 shadow-sm border border-[var(--mousa-border-sand)] space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-stone-850 text-[var(--mousa-teal-deep)] dark:text-[var(--mousa-gold)] flex items-center justify-center font-bold">
                        <GraduationCap size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-[#FAF5EB] text-base">
                          {lang === 'ar' ? 'فصل وصف مدارس الأحد' : 'Sunday School Class & Grade'}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-[#C5B5A0]">
                          {lang === 'ar' ? 'تسكين الكشف الرسمي واعتماد خادم الفصل' : 'Official roster enrollment & servant approval'}
                        </p>
                      </div>
                    </div>

                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      (isGuest ? (userData?.activationStatus === 'APPROVED' || (userData?.grade && userData?.activationStatus !== 'PENDING_APPROVAL')) : studentMembership?.isEnrolled)
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {(isGuest ? (userData?.activationStatus === 'APPROVED' || (userData?.grade && userData?.activationStatus !== 'PENDING_APPROVAL')) : studentMembership?.isEnrolled)
                        ? (lang === 'ar' ? 'مسجل بالكشف الرسمي ✅' : 'Roster Enrolled ✅')
                        : (lang === 'ar' ? 'غير مسجل في الكشف للعام الحالي ⏳' : 'Not Enrolled in Active Year ⏳')}
                    </span>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50/60 to-amber-50/50 dark:from-[var(--surface-secondary)] dark:to-[var(--surface-secondary)] rounded-2xl p-4 border border-blue-100 dark:border-[var(--border-default)] space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-gray-600 dark:text-[var(--text-muted)] block mb-0.5">{lang === 'ar' ? 'العام الكنسي:' : 'Church Year:'}</span>
                        <span className="font-bold text-amber-800 dark:text-amber-200 bg-amber-100/70 dark:bg-amber-950/60 px-2 py-0.5 rounded text-xs inline-flex items-center gap-1">
                          <Calendar size={11} className="text-amber-700 dark:text-amber-300" />
                          <span>{studentMembership?.churchYearName || churchYear}</span>
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-[var(--text-muted)] block mb-0.5">{lang === 'ar' ? 'الصف الدراسي المحدد:' : 'Exact Grade:'}</span>
                        <span className="font-bold text-gray-900 dark:text-[var(--text-primary)] text-sm">
                          {studentMembership?.exactGrade || userData?.requestedGrade || userData?.grade || (lang === 'ar' ? 'لم يتم التحديد بعد' : 'Not Selected')}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-[var(--text-muted)] block mb-0.5">{lang === 'ar' ? 'فصل مدارس الأحد الكنسي:' : 'Church Class Group:'}</span>
                        <span className="font-bold text-[var(--mousa-teal-deep)] dark:text-[var(--text-primary)] text-sm">
                          {(() => {
                            if (!isGuest && !studentMembership?.isEnrolled) {
                              return lang === 'ar' ? 'غير مسجل في فصل بعد' : 'Not Enrolled in Class';
                            }
                            if (studentMembership?.classGroupNameEn) {
                              return lang === 'ar' ? (studentMembership.classGroupNameAr || studentMembership.classGroupNameEn) : studentMembership.classGroupNameEn;
                            }
                            const g = userData?.requestedGrade || userData?.grade;
                            const group = g ? getClassGroupForGrade(g) : null;
                            return group ? group.name[lang === 'ar' ? 'ar' : 'en'] : (lang === 'ar' ? 'بانتظار الاختيار' : 'Pending Selection');
                          })()}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-blue-200/40 dark:border-[var(--border-default)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <p className="text-[11px] text-gray-700 dark:text-[var(--text-secondary)] leading-relaxed">
                        {studentMembership?.isEnrolled
                          ? (lang === 'ar'
                              ? `مسجل بنجاح في الفصل للعام الكنسي الحالي (${studentMembership.churchYearName || churchYear}).`
                              : `Officially enrolled in active church year (${studentMembership.churchYearName || churchYear}).`)
                          : (lang === 'ar' 
                              ? 'قم بإدخال كود الفصل المسلم لك من الخادم للانضمام الرسمي لكشف العام الحالي.' 
                              : 'Enter the class join code provided by your servant to officially enroll for the active church year.')}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            setShowJoinCodeModal(true);
                            setJoinCodeError(null);
                            setJoinCodeSuccess(null);
                          }}
                          className="px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/70 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs shrink-0"
                        >
                          <Key size={13} className="text-amber-700 dark:text-amber-300" />
                          <span>{lang === 'ar' ? 'الانضمام برمز الفصل' : 'Join with Class Code'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowOnboardingModal(true)}
                          className="px-3.5 py-2 rounded-xl bg-[var(--mousa-teal-deep)] hover:bg-blue-900 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs shrink-0"
                        >
                          <Edit3 size={13} />
                          <span>{lang === 'ar' ? 'تحديد / تعديل الصف' : 'Select / Change Grade'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Join Class with Code Modal for Students */}
                  <AnimatePresence>
                    {showJoinCodeModal && (
                      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
                        <motion.div
                          initial={{ scale: 0.95, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.95, opacity: 0 }}
                          className="bg-white dark:bg-[var(--surface-primary)] rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-[var(--border-default)] space-y-4 text-xs text-gray-900 dark:text-[var(--text-primary)]"
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[var(--border-default)]">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                                <Key size={18} />
                              </div>
                              <div>
                                <h4 className="font-bold text-sm text-gray-900 dark:text-[var(--text-primary)]">
                                  {lang === 'ar' ? 'الانضمام لكود الفصل للعام الحالي' : 'Join Current-Year Class Code'}
                                </h4>
                                <p className="text-[11px] text-gray-600 dark:text-[var(--text-muted)]">
                                  {lang === 'ar' ? `العام الكنسي: ${churchYear}` : `Church Year: ${churchYear}`}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowJoinCodeModal(false)}
                              className="text-gray-500 dark:text-[var(--text-muted)] hover:text-gray-800 dark:hover:text-[var(--text-primary)] p-1"
                            >
                              <X size={16} />
                            </button>
                          </div>

                          <form onSubmit={handleJoinWithCode} className="space-y-3">
                            <div>
                              <label className="block text-gray-700 dark:text-[var(--text-secondary)] font-bold mb-1">
                                {lang === 'ar' ? 'أدخل كود الفصل (من الخادم):' : 'Enter Class Code from Servant:'}
                              </label>
                              <input
                                type="text"
                                value={inputJoinCode}
                                onChange={(e) => setInputJoinCode(e.target.value)}
                                placeholder="e.g. MUSA-P46B"
                                className="w-full font-mono uppercase bg-gray-50 dark:bg-[var(--surface-secondary)] border border-gray-200 dark:border-[var(--border-default)] focus:border-[var(--mousa-teal-deep)] rounded-xl px-3.5 py-2.5 text-gray-900 dark:text-[var(--text-primary)] outline-none font-bold text-sm"
                                disabled={isJoiningCode}
                              />
                            </div>

                            {joinCodeError && (
                              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2">
                                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                                <span>{joinCodeError}</span>
                              </div>
                            )}

                            {joinCodeSuccess && (
                              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-start gap-2">
                                <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
                                <span>{joinCodeSuccess}</span>
                              </div>
                            )}

                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setShowJoinCodeModal(false)}
                                className="px-3.5 py-2 rounded-xl border border-gray-200 dark:border-[var(--border-default)] text-gray-700 dark:text-[var(--text-secondary)] hover:bg-gray-50 dark:hover:bg-[var(--state-hover)] font-semibold cursor-pointer"
                              >
                                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                              </button>
                              <button
                                type="submit"
                                disabled={isJoiningCode || !inputJoinCode.trim()}
                                className="px-4 py-2 rounded-xl bg-[var(--mousa-teal-deep)] hover:bg-blue-900 disabled:opacity-40 text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                {isJoiningCode ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : (
                                  <CheckCircle2 size={13} />
                                )}
                                <span>{lang === 'ar' ? 'تأكيد الانضمام' : 'Join Class'}</span>
                              </button>
                            </div>
                          </form>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* For Parents: Family Hub Card */}
              {isParent && (
                <div className="bg-white dark:bg-[var(--surface-primary)] rounded-3xl p-5 md:p-6 shadow-sm border border-[var(--mousa-border-sand)] space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-stone-850 text-amber-700 dark:text-[var(--mousa-gold)] flex items-center justify-center font-bold">
                        <Users size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-[#FAF5EB] text-base">
                          {lang === 'ar' ? 'بوابة ولي الأمر ومتابعة الأبناء' : 'Parent Family Portal'}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-[#C5B5A0]">
                          {lang === 'ar' ? 'متابعة حفظ الألحان والآيات والدروس لجميع أبنائك' : 'Monitor lessons, hymns and verses for all your children'}
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-amber-100/60 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded-full text-xs font-bold">
                      {lang === 'ar' ? 'حساب ولي أمر' : 'Parent Account'}
                    </span>
                  </div>

                  <div className="bg-gradient-to-r from-amber-50/50 to-orange-50/30 dark:from-stone-900 dark:to-stone-850 rounded-2xl p-4 border border-amber-200/60 dark:border-stone-700 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-xs text-gray-700 dark:text-[#D5C7B5] leading-relaxed">
                      {lang === 'ar' 
                        ? 'بصفتك ولي أمر، لا تحتاج إلى رمز طفل خاص بك؛ بدلاً من ذلك يمكنك إضافة أبنائك باستخدام الرمز السري أو QR الخاص بكل طفل.'
                        : 'As a parent, you manage and link children rather than having a child code yourself.'}
                    </div>
                    {onOpenParentPortal && (
                      <button
                        onClick={onOpenParentPortal}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[var(--color-church-burgundy)] hover:bg-red-950 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer shrink-0"
                      >
                        <Users size={15} />
                        <span>{lang === 'ar' ? 'فتح لوحة متابعة الأبناء' : 'Open Parent Dashboard'}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* For Teachers: Servant Studio Card */}
              {isTeacher && (
                <div className="bg-white dark:bg-[var(--surface-primary)] rounded-3xl p-5 md:p-6 shadow-sm border border-[var(--mousa-border-sand)] space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-stone-850 text-[var(--mousa-teal-deep)] dark:text-[var(--mousa-gold)] flex items-center justify-center font-bold">
                        <GraduationCap size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-[#FAF5EB] text-base">
                          {lang === 'ar' ? 'استوديو خادم مدارس الأحد' : 'Sunday School Servant Studio'}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-[#C5B5A0]">
                          {lang === 'ar' ? 'تحضير الدروس، متابعة الحضور والغياب، وإدارة الفصل' : 'Prepare lessons, take attendance, and track classes'}
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-blue-100/60 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 rounded-full text-xs font-bold">
                      {lang === 'ar' ? 'خادم مدارس الأحد' : 'Servant / Teacher'}
                    </span>
                  </div>

                  {onOpenTeacherStudio && (
                    <button
                      onClick={onOpenTeacherStudio}
                      className="w-full py-3 rounded-xl bg-[var(--mousa-teal-deep)] hover:bg-blue-900 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                    >
                      <GraduationCap size={16} />
                      <span>{lang === 'ar' ? 'فتح استوديو الخادم' : 'Open Servant Studio'}</span>
                    </button>
                  )}
                </div>
              )}

              <div>
                <div className="bg-white dark:bg-[#1E1914] rounded-3xl shadow-sm border border-[var(--mousa-border-sand)] overflow-hidden">
                  {/* Servant Studio (for teachers) */}
                  {(userData.role === 'teacher' || onOpenTeacherStudio) && (
                    <button 
                      onClick={onOpenTeacherStudio} 
                      className="w-full p-4 md:p-5 border-b border-gray-100 dark:border-[var(--border-default)] flex items-center gap-3 text-amber-900 dark:text-amber-100 bg-amber-50/50 dark:bg-amber-950/30 hover:bg-amber-100/60 dark:hover:bg-amber-950/60 transition-colors text-left cursor-pointer"
                    >
                      <span className="text-xl">⛪</span>
                      <div className="flex-1">
                        <span className="font-bold block md:text-lg">{lang === 'ar' ? 'استوديو الخادم ومدارس الأحد' : 'Sunday School Servant Studio'}</span>
                        <span className="text-xs text-amber-700 dark:text-amber-300">{lang === 'ar' ? 'تحضير الدروس بالذكاء الاصطناعي وتعديل الاختبارات' : 'AI lesson creator, quiz editor & moderation'}</span>
                      </div>
                      <span className="text-xs font-bold px-2 py-1 rounded-md bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100">
                        {lang === 'ar' ? 'فتح' : 'Open'}
                      </span>
                    </button>
                  )}

                  {/* Parent Portal (for parents or teachers who have children) */}
                  {(userData.role === 'parent' || userData.role === 'teacher' || onOpenParentPortal) && (
                    <button 
                      onClick={onOpenParentPortal} 
                      className="w-full p-4 md:p-5 border-b border-gray-100 dark:border-[var(--border-default)] flex items-center gap-3 text-emerald-900 dark:text-emerald-100 bg-emerald-50/40 dark:bg-emerald-950/30 hover:bg-emerald-100/60 dark:hover:bg-emerald-950/60 transition-colors text-left cursor-pointer"
                    >
                      <span className="text-xl">👨‍👩‍👧</span>
                      <div className="flex-1">
                        <span className="font-bold block md:text-lg">{lang === 'ar' ? 'بوابة ولي الأمر ومتابعة الأبناء' : 'Parent Portal & Child Monitoring'}</span>
                        <span className="text-xs text-emerald-700 dark:text-emerald-300">{lang === 'ar' ? 'متابعة وقت الشاشة، إتمام الدروس وموافقة الجوائز' : 'Screen time, lesson completions & reward approvals'}</span>
                      </div>
                      <span className="text-xs font-bold px-2 py-1 rounded-md bg-emerald-200/80 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-100">
                        {lang === 'ar' ? 'فتح' : 'Open'}
                      </span>
                    </button>
                  )}

                  <button onClick={() => setScreen('settings')} className="w-full p-4 md:p-5 border-b border-gray-100 dark:border-[var(--border-default)] flex items-center gap-3 text-gray-700 dark:text-[var(--text-primary)] hover:bg-gray-50 dark:hover:bg-[var(--state-hover)] transition-colors text-left cursor-pointer">
                    <Settings size={20} className="text-[var(--mousa-teal-deep)] dark:text-[var(--mousa-gold-light)] md:w-6 md:h-6" />
                    <span className="font-bold flex-1 md:text-lg">{lang === 'ar' ? 'الإعدادات والمظهر الكنسي' : 'Settings & Theme'}</span>
                    <span className="text-xs md:text-sm px-2.5 py-1 rounded-full font-bold bg-[var(--mousa-sand-100)] dark:bg-stone-800 text-[var(--mousa-teal-deep)] dark:text-[var(--mousa-gold-light)] flex items-center gap-1 border border-[var(--mousa-border-sand)]">
                      {isDark ? <><Moon size={12} className="fill-current" /> {lang === 'ar' ? 'ليلي' : 'Dark'}</> : <><Sun size={12} /> {lang === 'ar' ? 'نهاري' : 'Light'}</>}
                    </span>
                  </button>

                  <button onClick={() => setScreen('help')} className="w-full p-4 md:p-5 border-b border-gray-100 dark:border-[var(--border-default)] flex items-center gap-3 text-gray-700 dark:text-[var(--text-primary)] hover:bg-gray-50 dark:hover:bg-[var(--state-hover)] transition-colors text-left cursor-pointer">
                    <HelpCircle size={20} className="text-[var(--mousa-teal-deep)] dark:text-[var(--mousa-gold-light)] md:w-6 md:h-6" />
                    <span className="font-bold flex-1 md:text-lg">{lang === 'ar' ? 'دليل الاستخدام والتواصل مع الكنيسة' : 'Help, FAQs & Church Contact'}</span>
                  </button>

                  <button onClick={() => setScreen('privacy')} className="w-full p-4 md:p-5 border-b border-gray-100 dark:border-[var(--border-default)] flex items-center gap-3 text-gray-700 dark:text-[var(--text-primary)] hover:bg-gray-50 dark:hover:bg-[var(--state-hover)] transition-colors text-left cursor-pointer">
                    <ShieldCheck size={20} className="text-[var(--mousa-teal-deep)] dark:text-[var(--mousa-gold-light)] md:w-6 md:h-6" />
                    <span className="font-bold flex-1 md:text-lg">{lang === 'ar' ? 'سياسة الخصوصية وحماية البيانات' : 'Privacy & Data Protection'}</span>
                  </button>
                  <button 
                    onClick={() => setShowLogoutModal(true)} 
                    className="w-full p-4 md:p-5 flex items-center gap-3 text-[var(--color-church-burgundy)] dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors text-left"
                  >
                    <LogOut size={20} className="md:w-6 md:h-6" />
                    <span className="font-bold flex-1 md:text-lg">{lang === 'ar' ? 'تسجيل الخروج' : 'Log Out'}</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {screen === 'edit' && (
          <motion.div key="edit" initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 50, opacity: 0 }} className="space-y-6">
            <Header title={lang === 'ar' ? 'تعديل بيانات الحساب' : 'Edit Account Profile'} onBack={() => setScreen('main')} />
            <div className="bg-white dark:bg-[var(--surface-primary)] rounded-3xl p-6 md:p-8 shadow-sm border border-[var(--mousa-border-sand)] space-y-6">
               <div className="text-center">
                 <div className="relative inline-block">
                    <img 
                      src={avatar} 
                      alt="Avatar" 
                      className="w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-[var(--mousa-gold)] bg-amber-50 shadow-md object-cover" 
                    />
                    <button 
                      type="button"
                      disabled={isUploadingAvatar}
                      onClick={() => fileInputRef.current?.click()} 
                      className="absolute bottom-0 right-0 bg-[var(--mousa-teal-deep)] text-white p-2.5 rounded-full shadow-lg hover:bg-blue-800 transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
                      title={lang === 'ar' ? 'تحميل صورة من جهازك' : 'Upload photo from your device'}
                    >
                       {isUploadingAvatar ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      accept="image/*" 
                      className="hidden" 
                    />
                 </div>

                 {isUploadingAvatar && (
                   <p className="text-xs text-[var(--mousa-teal-deep)] font-bold mt-2 flex items-center justify-center gap-1.5 animate-pulse">
                     <Loader2 size={13} className="animate-spin" />
                     {lang === 'ar' ? 'جارٍ معالجة ورفع الصورة بجودة فائقة...' : 'Processing and uploading high-res avatar...'}
                   </p>
                 )}
                 
                 {/* Coptic Orthodox Avatars Gallery */}
                 <div className="mt-5">
                    <div className="flex items-center justify-between mb-2.5 px-2">
                      <p className="text-xs md:text-sm font-bold text-gray-700 flex items-center gap-1.5">
                        <Sparkles size={14} className="text-[var(--mousa-gold)]" />
                        {lang === 'ar' ? 'صور ورموز قبطية لمدارس الأحد:' : 'Coptic Sunday School Avatars:'}
                      </p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs text-[var(--mousa-teal-deep)] font-bold hover:underline flex items-center gap-1"
                      >
                        <Upload size={12} />
                        {lang === 'ar' ? 'أو ارفع صورتك الخاصة' : 'Or upload custom'}
                      </button>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2.5 max-w-xl mx-auto p-3 bg-[var(--color-church-cream)]/40 rounded-2xl border border-[var(--mousa-border-sand)]">
                       {COPTIC_AVATARS.map((preset) => (
                          <button 
                            key={preset.id} 
                            type="button"
                            onClick={() => setAvatar(preset.svgDataUri)} 
                            className={`group relative flex flex-col items-center gap-1 p-1.5 rounded-xl border-2 transition-all cursor-pointer ${
                              avatar === preset.svgDataUri 
                                ? 'border-[var(--mousa-teal-deep)] bg-white shadow-sm scale-105 ring-2 ring-blue-200' 
                                : 'border-transparent bg-white/60 hover:bg-white hover:border-gray-200 hover:scale-102'
                            }`}
                            title={lang === 'ar' ? preset.nameAr : preset.nameEn}
                          >
                             <div className="w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden shadow-2xs">
                               <img src={preset.svgDataUri} alt={lang === 'ar' ? preset.nameAr : preset.nameEn} className="w-full h-full object-cover" />
                             </div>
                             <span className="text-[10px] font-bold text-gray-700 dark:text-[var(--text-secondary)] truncate max-w-[64px] text-center leading-tight">
                               {lang === 'ar' ? preset.nameAr : preset.nameEn}
                             </span>
                             {avatar === preset.svgDataUri && (
                               <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--mousa-teal-deep)] text-white flex items-center justify-center text-[10px]">
                                 <Check size={10} strokeWidth={3} />
                               </div>
                             )}
                          </button>
                       ))}
                    </div>
                 </div>
               </div>

               <div className="space-y-4 pt-2">
                 {/* Full Name */}
                 <div>
                    <label className="text-xs md:text-sm font-bold text-gray-700 dark:text-[var(--text-secondary)] mb-1.5 flex items-center justify-between">
                      <span>{lang === 'ar' ? 'الاسم بالكامل *' : 'Full Name *'}</span>
                      {validationErrors.userName && (
                        <span className="text-xs text-red-600 font-medium flex items-center gap-1">
                          <AlertCircle size={12} /> {validationErrors.userName}
                        </span>
                      )}
                    </label>
                    <input 
                      type="text" 
                      value={userName} 
                      onChange={e => {
                        setUserName(e.target.value);
                        if (validationErrors.userName) setValidationErrors(prev => ({ ...prev, userName: undefined }));
                      }} 
                      placeholder={lang === 'ar' ? 'أدخل اسمك بالكامل' : 'Enter your full name'}
                      className={`w-full bg-gray-50 dark:bg-[var(--surface-secondary)] border-2 rounded-xl px-4 py-3 outline-none font-bold text-gray-800 dark:text-[var(--text-primary)] transition-colors ${
                        validationErrors.userName ? 'border-red-400 dark:border-red-700 bg-red-50/40 dark:bg-red-950/30 focus:border-red-500' : 'border-gray-200 dark:border-[var(--border-default)] focus:border-[var(--mousa-teal-deep)]'
                      }`} 
                    />
                 </div>

                 {/* Guardian / User Email */}
                 <div>
                    <label className="text-xs md:text-sm font-bold text-gray-700 dark:text-[var(--text-secondary)] mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Mail size={14} className="text-[var(--mousa-teal-deep)]" />
                        {isStudent 
                          ? (lang === 'ar' ? 'إيميل ولي الأمر (اختياري)' : 'Guardian Email (Optional)') 
                          : (lang === 'ar' ? 'البريد الإلكتروني *' : 'Email Address *')}
                      </span>
                      {validationErrors.email && (
                        <span className="text-xs text-red-600 font-medium flex items-center gap-1">
                          <AlertCircle size={12} /> {validationErrors.email}
                        </span>
                      )}
                    </label>
                    <input 
                      type="email" 
                      value={email} 
                      onChange={e => {
                        setEmail(e.target.value);
                        if (validationErrors.email) setValidationErrors(prev => ({ ...prev, email: undefined }));
                      }} 
                      placeholder="parent.guardian@church.org"
                      className={`w-full bg-gray-50 dark:bg-[var(--surface-secondary)] border-2 rounded-xl px-4 py-3 outline-none font-bold text-gray-800 dark:text-[var(--text-primary)] transition-colors ${
                        validationErrors.email ? 'border-red-400 dark:border-red-700 bg-red-50/40 dark:bg-red-950/30 focus:border-red-500' : 'border-gray-200 dark:border-[var(--border-default)] focus:border-[var(--mousa-teal-deep)]'
                      }`} 
                    />
                 </div>

                 {/* Phone Number */}
                 <div>
                    <label className="text-xs md:text-sm font-bold text-gray-700 dark:text-[var(--text-secondary)] mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Phone size={14} className="text-[var(--mousa-teal-deep)]" />
                        {lang === 'ar' ? 'رقم الهاتف للتواصل' : 'Contact Phone Number'}
                      </span>
                      {validationErrors.phone && (
                        <span className="text-xs text-red-600 font-medium flex items-center gap-1">
                          <AlertCircle size={12} /> {validationErrors.phone}
                        </span>
                      )}
                    </label>
                    <input 
                      type="tel" 
                      value={phone} 
                      onChange={e => {
                        setPhone(e.target.value);
                        if (validationErrors.phone) setValidationErrors(prev => ({ ...prev, phone: undefined }));
                      }} 
                      placeholder="+20 100 123 4567"
                      className={`w-full bg-gray-50 dark:bg-[var(--surface-secondary)] border-2 rounded-xl px-4 py-3 outline-none font-bold text-gray-800 dark:text-[var(--text-primary)] transition-colors ${
                        validationErrors.phone ? 'border-red-400 dark:border-red-700 bg-red-50/40 dark:bg-red-950/30 focus:border-red-500' : 'border-gray-200 dark:border-[var(--border-default)] focus:border-[var(--mousa-teal-deep)]'
                      }`} 
                    />
                 </div>

                 {/* Grade / Sunday School Group */}
                 <div>
                    <label className="text-xs md:text-sm font-bold text-gray-700 dark:text-[var(--text-secondary)] mb-1.5 flex items-center gap-1.5">
                      <GraduationCap size={14} className="text-[var(--mousa-teal-deep)]" />
                      {lang === 'ar' ? 'مرحلة مدارس الأحد' : 'Sunday School Grade / Class'}
                    </label>
                    <input 
                      type="text" 
                      value={grade} 
                      onChange={e => setGrade(e.target.value)} 
                      placeholder={lang === 'ar' ? 'مثال: ابتدائي - مرحلة ثالثة' : 'e.g. Primary - Grade 3'}
                      className="w-full bg-gray-50 dark:bg-[var(--surface-secondary)] border-2 border-gray-200 dark:border-[var(--border-default)] focus:border-[var(--mousa-teal-deep)] rounded-xl px-4 py-3 outline-none font-bold text-gray-800 dark:text-[var(--text-primary)]"
                    />
                 </div>
               </div>

               <div className="pt-2">
                 <button 
                   onClick={handleUpdateProfile} 
                   disabled={isSaving}
                   className="w-full bg-[var(--mousa-teal-deep)] text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2 shadow-md hover:bg-blue-900 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                 >
                   {isSaving ? (
                     <>
                       <Loader2 size={20} className="animate-spin" />
                       <span>{lang === 'ar' ? 'جارٍ حفظ البيانات في قاعدة البيانات...' : 'Saving to Database...'}</span>
                     </>
                   ) : (
                     <>
                       <Save size={20} />
                       <span>{lang === 'ar' ? 'حفظ وتحديث الحساب' : 'Save Changes'}</span>
                     </>
                   )}
                 </button>
               </div>
            </div>
          </motion.div>
        )}

        {screen === 'settings' && (
          <motion.div key="settings" initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 50, opacity: 0 }} className="space-y-6">
            <Header title={lang === 'ar' ? 'الإعدادات' : 'Settings'} onBack={() => setScreen('main')} />
            <div className="bg-white dark:bg-[var(--surface-primary)] rounded-3xl p-6 shadow-sm border border-[var(--mousa-border-sand)] space-y-6">
               {/* Dark Theme Sanctuary Mode Toggle */}
               <div className="flex items-center justify-between p-4 bg-[var(--color-church-cream)]/60 dark:bg-[var(--surface-secondary)] rounded-2xl border border-[var(--mousa-border-sand)] dark:border-[var(--border-default)]">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-[var(--mousa-gold)]/20 text-[var(--mousa-gold)] flex items-center justify-center">
                     {isDark ? <Moon size={22} className="fill-current" /> : <Sun size={22} />}
                   </div>
                   <div>
                     <p className="font-bold text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB] text-base">
                       {lang === 'ar' ? 'الوضع الليلي للكنيسة' : 'Dark Church Mode'}
                     </p>
                     <p className="text-xs text-gray-500 dark:text-[#C5B5A0] font-medium">
                       {lang === 'ar' ? 'إضاءة خافتة مريحة للعين أثناء القداس والصلوات' : 'Low-light sanctuary colors for liturgies & evening study'}
                     </p>
                   </div>
                 </div>
                 <button
                   type="button"
                   onClick={toggleTheme}
                   className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                     isDark ? 'bg-[var(--mousa-gold)]' : 'bg-gray-300'
                   }`}
                   role="switch"
                   aria-checked={isDark}
                 >
                   <span
                     className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                       isDark ? (lang === 'ar' ? '-translate-x-6' : 'translate-x-6') : 'translate-x-0'
                     }`}
                   >
                     {isDark ? (
                       <Moon size={14} className="text-gray-800 fill-current" />
                     ) : (
                       <Sun size={14} className="text-amber-500" />
                     )}
                   </span>
                 </button>
               </div>

               <div className="flex items-center justify-between pt-2">
                 <span className="font-bold text-gray-700 dark:text-[#FAF5EB]">{lang === 'ar' ? 'تأثيرات صوتية' : 'Sound Effects'}</span>
                 <input type="checkbox" defaultChecked className="w-6 h-6 accent-[var(--mousa-teal-deep)]" />
               </div>
               <div className="flex items-center justify-between">
                 <span className="font-bold text-gray-700 dark:text-[#FAF5EB]">{lang === 'ar' ? 'إشعارات يومية' : 'Daily Notifications'}</span>
                 <input type="checkbox" defaultChecked className="w-6 h-6 accent-[var(--mousa-teal-deep)]" />
               </div>
            </div>
          </motion.div>
        )}

        {/* Working Help & Guidance Screen */}
        {screen === 'help' && (
          <motion.div key="help" initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 50, opacity: 0 }} className="space-y-6">
            <Header title={lang === 'ar' ? 'المساعدة ودليل الاستخدام الكنسي' : 'Help & Church Guide'} onBack={() => setScreen('main')} />
            
            {/* Sub-tab selection */}
            <div className="flex bg-[var(--mousa-sand-100)] dark:bg-[#25201A] p-1.5 rounded-2xl border border-[var(--mousa-border-sand)] gap-1 overflow-x-auto">
              <button
                type="button"
                onClick={() => setHelpSubTab('guide')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  helpSubTab === 'guide'
                    ? 'bg-[var(--mousa-gold)] text-[var(--mousa-teal-deep)] font-black shadow-xs'
                    : 'text-[var(--mousa-sand-600)] dark:text-[#D5C7B5] hover:text-[var(--mousa-teal-deep)]'
                }`}
              >
                {lang === 'ar' ? '🧭 دليل أقسام التطبيق' : '🧭 Navigation Guide'}
              </button>
              <button
                type="button"
                onClick={() => setHelpSubTab('faq')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  helpSubTab === 'faq'
                    ? 'bg-[var(--mousa-gold)] text-[var(--mousa-teal-deep)] font-black shadow-xs'
                    : 'text-[var(--mousa-sand-600)] dark:text-[#D5C7B5] hover:text-[var(--mousa-teal-deep)]'
                }`}
              >
                {lang === 'ar' ? '❓ الأسئلة الشائعة' : '❓ FAQs'}
              </button>
              <button
                type="button"
                onClick={() => setHelpSubTab('contact')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  helpSubTab === 'contact'
                    ? 'bg-[var(--mousa-gold)] text-[var(--mousa-teal-deep)] font-black shadow-xs'
                    : 'text-[var(--mousa-sand-600)] dark:text-[#D5C7B5] hover:text-[var(--mousa-teal-deep)]'
                }`}
              >
                {lang === 'ar' ? '⛪ التواصل مع الكنيسة' : '⛪ Church Contact'}
              </button>
            </div>

            {/* Sub-tab 1: Navigation Guide */}
            {helpSubTab === 'guide' && (
              <div className="bg-[var(--mousa-cream-surface)] dark:bg-[#1E1914] rounded-3xl p-6 shadow-xs border-2 border-[var(--mousa-border-sand)] space-y-4">
                <h3 className="font-black text-base md:text-lg text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB] flex items-center gap-2">
                  <BookOpen size={20} className="text-[var(--mousa-gold)]" />
                  <span>{lang === 'ar' ? 'دليل أقسام منصة كنيسة القديس الأنبا موسى' : 'St. Moses Church Platform Navigation Guide'}</span>
                </h3>
                <p className="text-xs text-[var(--mousa-sand-600)] dark:text-[#C5B5A0] leading-relaxed">
                  {lang === 'ar'
                    ? 'صُمم التطبيق لربط أبناء الكنيسة بالصلوات اليومية، مناهج مدارس الأحد، وتتبع التقدم الروحي تحت رعاية الآباء والخدام.'
                    : 'Designed to connect church youth with daily liturgical prayers, Sunday School curriculum, and spiritual progress.'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                  {[
                    {
                      icon: '🏠',
                      title: lang === 'ar' ? 'الرئيسية (مسار الأنبا موسى)' : 'Home (Moses Journey)',
                      desc: lang === 'ar' ? 'آية اليوم، شعلة المواظبة، محطة اليوم في البرية، وشريط إنجاز المنهج.' : 'Daily verse, prayer streak, today quest, and live progress bar.'
                    },
                    {
                      icon: '📖',
                      title: lang === 'ar' ? 'محطات الدروس (مدارس الأحد)' : 'Lessons (Sunday School)',
                      desc: lang === 'ar' ? 'تصفح دروس مرحلتك الدراسية، أداء الاختبارات التفاعلية، وتسميع الآيات بالصوت.' : 'Explore class milestones, interactive quizzes, and voice verse recitation.'
                    },
                    {
                      icon: '🕊️',
                      title: lang === 'ar' ? 'صلوات الأجبية اليومية' : 'Daily Agpeya Prayers',
                      desc: lang === 'ar' ? 'الصلوات السبع اليومية بالنصوص القبطية والعربية مع ميزة الاستماع والتسجيل.' : 'Canonical 7 hours with bilingual Coptic/Arabic text and prayer tracker.'
                    },
                    {
                      icon: '🎵',
                      title: lang === 'ar' ? 'مدرسة الألحان الكنسية' : 'Coptic Hymns School',
                      desc: lang === 'ar' ? 'تعليم ألحان القداس والمناسبات هزات بالنطق القبطي الدقيق مع مشغل صوتي.' : 'Liturgical hymns with accurate Bohairic phonetic syllables and playback.'
                    },
                    {
                      icon: '📅',
                      title: lang === 'ar' ? 'التقويم والسنكسار القبطي' : 'Coptic Calendar & Synaxarium',
                      desc: lang === 'ar' ? 'شهور السنة القبطية، سير قديسي اليوم، مواعيد الأصوام والأعياد السيدية.' : 'Coptic calendar months, daily saint biographies, feasts and fasts.'
                    },
                    {
                      icon: '🌟',
                      title: lang === 'ar' ? 'كنز البركة والنقاط' : 'Blessing Points & Rewards',
                      desc: lang === 'ar' ? 'جمع نقاط البركة من حفظ الآيات والدروس واستبدالها بهدايا كنسية معتمدة.' : 'Collect blessing points and redeem them for servant-approved church gifts.'
                    },
                    {
                      icon: '💬',
                      title: lang === 'ar' ? 'واحة مجتمع الكنيسة' : 'Church Community Oasis',
                      desc: lang === 'ar' ? 'متابعة إعلانات الخدام، تأملات روحية آمنة، ومشاركات فصل مدارس الأحد.' : 'Servant announcements, spiritual reflections, and safe class fellowship.'
                    },
                    {
                      icon: '👨‍👩‍👧',
                      title: lang === 'ar' ? 'بوابة ولي الأمر والأبناء' : 'Parent Family Hub',
                      desc: lang === 'ar' ? 'ربط حسابات الأبناء بالرمز السري، متابعة الإنجازات، وتشجيعهم بالبركات.' : 'Link child accounts via secret code, track progress, and send blessings.'
                    }
                  ].map((item, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl bg-[var(--mousa-sand-50)] dark:bg-stone-900/60 border border-[var(--mousa-border-sand)] space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{item.icon}</span>
                        <h4 className="font-extrabold text-xs sm:text-sm text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB]">{item.title}</h4>
                      </div>
                      <p className="text-[11px] text-[var(--mousa-sand-600)] dark:text-[#C5B5A0] leading-relaxed font-medium">
                        {item.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sub-tab 2: Frequently Asked Questions */}
            {helpSubTab === 'faq' && (
              <div className="bg-[var(--mousa-cream-surface)] dark:bg-[#1E1914] rounded-3xl p-6 shadow-xs border-2 border-[var(--mousa-border-sand)] space-y-4">
                <h3 className="font-black text-base md:text-lg text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB] flex items-center gap-2">
                  <HelpCircle size={20} className="text-[var(--mousa-gold)]" />
                  <span>{lang === 'ar' ? 'الأسئلة الشائعة حول المنصة' : 'Frequently Asked Questions'}</span>
                </h3>

                <div className="space-y-3 pt-1">
                  {[
                    {
                      q: lang === 'ar' ? 'كيف ينضم الطالب إلى فصل مدارس الأحد الخاص به؟' : 'How does a student join their Sunday School class?',
                      a: lang === 'ar'
                        ? 'يمكنك الانضمام بكتابة كود الفصل (رمز مكون من ٦ أحرف/أرقام) الذي يشاركه معك خادم الفصل في كنيسة القديس موسى، من خلال بطاقة "فصل وصف مدارس الأحد" في حسابك الشخصي.'
                        : 'You can join by entering the 6-character class code provided by your Sunday School servant in the Class Card on your profile.'
                    },
                    {
                      q: lang === 'ar' ? 'كيف يربط ولي الأمر حسابه بحساب طفله؟' : 'How can a parent link their account with their child?',
                      a: lang === 'ar'
                        ? 'يمتلك كل طالب رمزاً سرياً فريداً (مثال: ST-4921) وكود QR في حسابه. يقوم ولي الأمر بفتح "بوابة الأهل" وإدخال الرمز أو مسح الكود، لتتم المزامنة وتظهر متابعة الطفل فوراً.'
                        : 'Every student has a unique secret code (e.g., ST-4921) and QR code in their profile. Parents enter this code in the Parent Portal to link.'
                    },
                    {
                      q: lang === 'ar' ? 'هل يعمل التطبيق أثناء التواجد في الكنيسة بدون اتصال إنترنت؟' : 'Does the platform work offline in the sanctuary?',
                      a: lang === 'ar'
                        ? 'نعم! صلوات الأجبية، نصوص الألحان، والدروس التي فتحتها سابقاً تُحفظ في ذاكرة جهازك تلقائياً لتعمل بدون إنترنت أثناء القداس والاجتماعات.'
                        : 'Yes! Daily Agpeya prayers, Coptic hymns, and previously opened lessons are cached locally for offline prayer in the church.'
                    },
                    {
                      q: lang === 'ar' ? 'كيف يتم احتساب شعلة الأيام ونقاط البركة؟' : 'How are streaks and blessing points calculated?',
                      a: lang === 'ar'
                        ? 'تزيد شعلة الأيام عند فتح التطبيق والمواظبة على صلوات الأجبية والدروس يومياً. وتكتسب نقاط البركة (+٥٠ إلى +١٥٠) مع إتمام كل درس وتسميع آية اليوم بنجاح.'
                        : 'Streaks increase with daily consecutive prayer and study. Blessing points (+50 to +150) are awarded for completed lessons and verse recitals.'
                    }
                  ].map((faq, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-[var(--mousa-sand-50)] dark:bg-stone-900/60 border border-[var(--mousa-border-sand)] space-y-1.5">
                      <h4 className="font-bold text-xs sm:text-sm text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB] flex items-center gap-1.5">
                        <span className="text-[var(--mousa-gold)]">●</span>
                        <span>{faq.q}</span>
                      </h4>
                      <p className="text-xs text-[var(--mousa-sand-600)] dark:text-[#D5C7B5] leading-relaxed font-medium pl-3">
                        {faq.a}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sub-tab 3: Church & Servant Contact Route */}
            {helpSubTab === 'contact' && (
              <div className="bg-[var(--mousa-cream-surface)] dark:bg-[#1E1914] rounded-3xl p-6 shadow-xs border-2 border-[var(--mousa-border-sand)] space-y-4">
                <h3 className="font-black text-base md:text-lg text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB] flex items-center gap-2">
                  <Cross size={20} className="text-[var(--mousa-gold)]" />
                  <span>{lang === 'ar' ? 'قنوات التواصل المتاحة مع الكنيسة والخدام' : 'Available Church & Servant Contact Routes'}</span>
                </h3>
                <p className="text-xs text-[var(--mousa-sand-600)] dark:text-[#C5B5A0] leading-relaxed">
                  {lang === 'ar'
                    ? 'في كنيسة القديس الأنبا موسى الأسود، خدامك وآباؤك الكهنة متواجدون لدعمك روحياً ودراسياً عبر القنوات الكنسية الرسمية المعتمدة:'
                    : 'At St. Moses Coptic Orthodox Church, your servants and fathers are here to support you through established church routes:'}
                </p>

                <div className="space-y-3 pt-2">
                  {/* Channel 1: In-App Class Servant Roster */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/70 to-emerald-50/70 dark:from-stone-900 dark:to-stone-850 border border-blue-200 dark:border-stone-700 flex items-start gap-3">
                    <span className="text-2xl p-2 bg-white dark:bg-stone-800 rounded-xl shadow-xs shrink-0">⛪</span>
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB]">
                        {lang === 'ar' ? '1. خادم الفصل ومسؤول مدارس الأحد' : '1. Class Servant & Sunday School Guide'}
                      </h4>
                      <p className="text-xs text-[var(--mousa-sand-600)] dark:text-[#D5C7B5] leading-relaxed font-medium">
                        {lang === 'ar'
                          ? 'يمكنك التحدث مع خادم مرحلتك مباشرة أثناء الفصل لتأكيد تسكينك في الكشف، تسليم مسابقات الألحان، أو استلام الجوائز.'
                          : 'Speak directly with your assigned class servant to confirm enrollment, submit hymn recitals, or redeem rewards.'}
                      </p>
                    </div>
                  </div>

                  {/* Channel 2: Community Oasis Announcements */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50/70 to-orange-50/70 dark:from-stone-900 dark:to-stone-850 border border-amber-200 dark:border-stone-700 flex items-start gap-3">
                    <span className="text-2xl p-2 bg-white dark:bg-stone-800 rounded-xl shadow-xs shrink-0">📢</span>
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB]">
                        {lang === 'ar' ? '2. واحة مجتمع الكنيسة والمنشورات' : '2. Church Oasis & Announcements'}
                      </h4>
                      <p className="text-xs text-[var(--mousa-sand-600)] dark:text-[#D5C7B5] leading-relaxed font-medium">
                        {lang === 'ar'
                          ? 'تُنشر المواعيد الطقسية وتنبيهات الخدام والرحلات في تبويب "المنشورات"، ويمكنك التفاعل والاستفسار تحت كل منشور كنسي.'
                          : 'Liturgical schedules and servant updates are shared in the Feed tab, where you can comment and follow church announcements.'}
                      </p>
                    </div>
                  </div>

                  {/* Channel 3: In-Person Liturgy & Meetings */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-stone-50 to-amber-50/50 dark:from-stone-900 dark:to-stone-850 border border-[var(--mousa-border-sand)] flex items-start gap-3">
                    <span className="text-2xl p-2 bg-white dark:bg-stone-800 rounded-xl shadow-xs shrink-0">🕊️</span>
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB]">
                        {lang === 'ar' ? '3. الحضور الكنسي واللقاء الشخصي' : '3. Pastoral Care & In-Person Fellowship'}
                      </h4>
                      <p className="text-xs text-[var(--mousa-sand-600)] dark:text-[#D5C7B5] leading-relaxed font-medium">
                        {lang === 'ar'
                          ? 'كنيسة القديس الأنبا موسى ترحب بك دائماً في القداس الإلهي كل أحد، واجتماعات مدارس الأحد والأنشطة الكشفية والروحية الأسبوعية.'
                          : 'St. Moses Church welcomes you during Sunday Divine Liturgies and weekly Sunday School meetings and activities.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Working Readable Privacy Policy Screen */}
        {screen === 'privacy' && (
          <motion.div key="privacy" initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 50, opacity: 0 }} className="space-y-6">
            <Header title={lang === 'ar' ? 'سياسة الخصوصية وحماية البيانات' : 'Privacy & Data Protection Policy'} onBack={() => setScreen('main')} />
            
            <div className="bg-[var(--mousa-cream-surface)] dark:bg-[#1E1914] rounded-3xl p-6 sm:p-7 shadow-xs border-2 border-[var(--mousa-border-sand)] space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-[var(--mousa-border-sand)]/60">
                <div className="w-11 h-11 rounded-2xl bg-[var(--mousa-teal)] text-white flex items-center justify-center font-bold shadow-xs">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB]">
                    {lang === 'ar' ? 'معايير الخصوصية وسلامة بيانات أبناء الكنيسة' : 'Church Privacy & Youth Data Protection'}
                  </h3>
                  <p className="text-xs text-[var(--mousa-sand-500)] dark:text-[#C5B5A0] font-medium">
                    {lang === 'ar' ? 'بيان الشفافية الدقيق حول كيفية التعامل مع بياناتك وفقاً لكود وإعدادات التطبيق' : 'Truthful disclosure of data handling supported by code and platform architecture'}
                  </p>
                </div>
              </div>

              {/* Section 1: Collected Data */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-sm text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB] flex items-center gap-1.5">
                  <span className="text-[var(--mousa-gold)]">1.</span>
                  <span>{lang === 'ar' ? 'البيانات التي يسجلها التطبيق' : 'Information Stored by the Application'}</span>
                </h4>
                <ul className="space-y-1.5 text-xs text-[var(--mousa-sand-600)] dark:text-[#D5C7B5] leading-relaxed list-disc list-inside pl-2">
                  <li>
                    <strong>{lang === 'ar' ? 'بيانات الحساب الشخصي:' : 'Account Details:'}</strong> {lang === 'ar' ? 'الاسم، المرحلة الدراسية، الدور الكنسي (طالب / ولي أمر / خادم)، والصورة الرمزية.' : 'Full name, Sunday School grade, user role, and avatar photo.'}
                  </li>
                  <li>
                    <strong>{lang === 'ar' ? 'المسار الروحي والتعليمي:' : 'Spiritual & Educational Progress:'}</strong> {lang === 'ar' ? 'الدروس المكتملة، شعلة صلوات الأجبية، درجات الاختبارات، ونقاط البركة المكتسبة.' : 'Completed lessons, Agpeya prayer streaks, quiz scores, and blessing points.'}
                  </li>
                  <li>
                    <strong>{lang === 'ar' ? 'ربط الأسرة والأبناء:' : 'Family Linkage:'}</strong> {lang === 'ar' ? 'الرمز السري الخاص بالطفل لتسهيل متابعة ولي الأمر لوقت الشاشة وتشجيع الطفل.' : 'Unique child link code linking parents to their children for supervision.'}
                  </li>
                </ul>
              </div>

              {/* Section 2: Storage Infrastructure */}
              <div className="space-y-2 pt-2 border-t border-[var(--mousa-border-sand)]/60">
                <h4 className="font-extrabold text-sm text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB] flex items-center gap-1.5">
                  <span className="text-[var(--mousa-gold)]">2.</span>
                  <span>{lang === 'ar' ? 'أين تُحفظ بياناتك؟' : 'Where is Your Data Stored?'}</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-[var(--mousa-sand-50)] dark:bg-stone-900/60 border border-[var(--mousa-border-sand)] space-y-1">
                    <span className="font-bold text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB] block">
                      📱 {lang === 'ar' ? 'الذاكرة المحلية لجهازك (LocalStorage)' : 'Local Device Storage'}
                    </span>
                    <p className="text-[11px] text-[var(--mousa-sand-600)] dark:text-[#C5B5A0] leading-relaxed">
                      {lang === 'ar'
                        ? 'تُحفظ نصوص الأجبية، الألحان، وتفضيلات اللغة والوضع الليلي محلياً على جهازك لضمان سرعة التصفح والعمل بدون إنترنت.'
                        : 'Stores prayer cache, hymns, language and theme preferences for immediate offline access.'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[var(--mousa-sand-50)] dark:bg-stone-900/60 border border-[var(--mousa-border-sand)] space-y-1">
                    <span className="font-bold text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB] block">
                      ⛪ {lang === 'ar' ? 'قاعدة بيانات الكنيسة السحابية (Supabase)' : 'Church Cloud Database (Supabase)'}
                    </span>
                    <p className="text-[11px] text-[var(--mousa-sand-600)] dark:text-[#C5B5A0] leading-relaxed">
                      {lang === 'ar'
                        ? 'لأعضاء الفصول المسجلين، تُحفظ كشوف المجموعات وسجلات الحضور والواجبات تحت إشراف خدام مدارس الأحد حصراً.'
                        : 'Stores class rosters, verified attendance, and lesson submissions under servant supervision.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 3: Safety & Non-Commercial Guarantee */}
              <div className="space-y-2 pt-2 border-t border-[var(--mousa-border-sand)]/60">
                <h4 className="font-extrabold text-sm text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB] flex items-center gap-1.5">
                  <span className="text-[var(--mousa-gold)]">3.</span>
                  <span>{lang === 'ar' ? 'الأمان وعدم الاستغلال التجاري' : 'Safety & Non-Commercial Commitment'}</span>
                </h4>
                <p className="text-xs text-[var(--mousa-sand-600)] dark:text-[#D5C7B5] leading-relaxed">
                  {lang === 'ar'
                    ? 'هذا التطبيق مخصص بالكامل لخدمة مدارس الأحد بكنيسة القديس الأنبا موسى الأسود. لا يحتوي التطبيق على أي إعلانات تجارية، ولا يبيع أو يشارك أي بيانات لأي جهة خارجية، وتقتصر كافة المعلومات على الأغراض الرعوية والتعليمية الكنسية.'
                    : 'This platform is exclusively dedicated to the ministry of St. Moses Coptic Church. It contains zero commercial advertisements, sells zero data, and uses information strictly for pastoral and spiritual growth.'}
                </p>
              </div>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setScreen('main')}
                  className="px-6 py-2.5 rounded-xl bg-[var(--mousa-teal-deep)] text-white text-xs font-bold hover:bg-blue-900 transition-colors cursor-pointer shadow-xs"
                >
                  {lang === 'ar' ? 'العودة للملف الشخصي' : 'Back to Profile'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* In-App Safe Logout Confirmation Dialog (Zero iframe confirm() crashes) */}
      <AnimatePresence>
        {showLogoutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-[var(--mousa-border-sand)] text-center space-y-4"
            >
              <div className="w-14 h-14 mx-auto rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center">
                <LogOut size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {lang === 'ar' ? 'تسجيل الخروج' : 'Log Out'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                {lang === 'ar'
                  ? 'هل تريد بالتأكيد تسجيل الخروج من حسابك في تطبيق كنيسة القديس موسى؟'
                  : 'Are you sure you want to log out of your St. Musa Church account?'}
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 py-3 px-4 rounded-2xl border border-gray-200 dark:border-slate-700 font-bold text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={() => {
                    setShowLogoutModal(false);
                    onLogout();
                  }}
                  className="flex-1 py-3 px-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-colors shadow-sm"
                >
                  {lang === 'ar' ? 'نعم، خروج' : 'Yes, Log Out'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Child QR Code Modal */}
      <ChildQrCodeModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        childName={userData.fullName || 'Student'}
        linkCode={studentLinkCode}
        lang={lang}
      />

      {/* Student Sunday School Onboarding & Grade Selector Modal */}
      {showOnboardingModal && (
        <StudentOnboardingModal
          isOpen={showOnboardingModal}
          onClose={() => setShowOnboardingModal(false)}
          lang={lang}
          onSuccess={() => setShowOnboardingModal(false)}
        />
      )}
    </div>
  );
}
