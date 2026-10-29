import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Mail, User, Check, Moon, Sun, Database, Sparkles, BookOpen } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { registerWithSupabase, loginWithSupabase, signInWithGoogleSupabase } from '../../lib/supabaseAuth';
import { isSupabaseConfigured } from '../../lib/supabase';
import { CLASS_GROUPS } from '../../lib/classGroups';
import { ClassGroupId, User as AppUser, Language } from '../../types';
import { requestAccountActivation } from '../../lib/onboardingService';
import { parseHymnsTaxisLevel, type HymnsTaxisLevel } from '../../lib/hymnsTaxisLevel';
import { PrivacyPolicy } from '../legal/PrivacyPolicy';
import { FAQ } from '../legal/FAQ';

export function LoginScreen({ lang, setLang }: { lang: Language, setLang: (l: Language) => void }) {
  const { isDark, toggleTheme } = useTheme();
  const { loginAsGuest, setUserDirectly } = useAuth();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [showLegal, setShowLegal] = useState<'privacy' | 'faq' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'student'|'teacher'|'parent'>('student');
  const [selectedClassGroupId, setSelectedClassGroupId] = useState<ClassGroupId>('primary_2');
  const [selectedGrade, setSelectedGrade] = useState<string>('Grade 4');
  const [selectedHymnsTaxisLevel, setSelectedHymnsTaxisLevel] = useState<HymnsTaxisLevel | ''>('');
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('church_remember_me') !== 'false';
  });
  const [error, setError] = useState('');

  const handleRememberMeChange = (checked: boolean) => {
    setRememberMe(checked);
    localStorage.setItem('church_remember_me', String(checked));
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const registrationLevel = parseHymnsTaxisLevel(selectedHymnsTaxisLevel);
    if (isRegister && role === 'student' && registrationLevel === null) {
      setError(lang === 'ar' ? 'اختار المستوى المشترك للألحان والطقس قبل إنشاء الحساب.' : 'Choose your shared Hymns & Taxis level before registering.');
      setLoading(false);
      return;
    }

    // If Supabase is configured, use Supabase as the primary auth backend
    if (isSupabaseConfigured) {
      try {
        if (isRegister) {
          const res = await registerWithSupabase(
            email, 
            password, 
            fullName || 'Member', 
            role,
            role === 'student' ? selectedGrade : undefined,
            registrationLevel
          );
          if (!res.success) {
            setError(res.error || (lang === 'ar' ? 'فشل إنشاء الحساب' : 'Registration failed'));
            setLoading(false);
            return;
          }
          if (res.user) {
            if (role === 'student') {
              requestAccountActivation({
                studentId: res.user.id,
                studentName: fullName || 'Member',
                email: email,
                requestedClassGroupId: selectedClassGroupId,
                requestedGrade: selectedGrade
              }).catch(() => {});
            }
            setUserDirectly(res.user);
          }
        } else {
          const res = await loginWithSupabase(email, password);
          if (!res.success) {
            setError(res.error || (lang === 'ar' ? 'فشل تسجيل الدخول. تحقق من البريد وكلمة السر.' : 'Login failed. Please check your credentials.'));
            setLoading(false);
            return;
          }
          if (res.user) {
            setUserDirectly(res.user);
          }
        }
        setLoading(false);
        return;
      } catch (sbErr: any) {
        console.warn('Supabase auth attempt error:', sbErr);
        setError(sbErr.message || 'Authentication error');
        setLoading(false);
        return;
      }
    } else {
      // If Supabase credentials haven't been entered yet, handle registration/login without leaking unrelated demo data
      if (isRegister) {
        const studentGrade = role === 'student' ? selectedGrade : undefined;
        const studentGroupId = role === 'student' ? selectedClassGroupId : undefined;
        const newUser: AppUser = {
          id: 'user_' + Date.now(),
          fullName: fullName.trim() || (email.split('@')[0] || 'User'),
          role: role,
          grade: studentGrade,
          requestedGrade: studentGrade,
          hymnsTaxisLevel: role === 'student' ? registrationLevel ?? undefined : undefined,
          requestedClassGroupId: studentGroupId,
          points: 0,
          currentStreak: 0,
          longestStreak: 0,
          screenTimeSeconds: 0,
          parentEmail: email,
          phone: '',
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName || 'User')}`,
          activationStatus: role === 'student' ? 'PENDING_APPROVAL' : 'APPROVED'
        };

        if (role === 'student' && studentGroupId && studentGrade) {
          requestAccountActivation({
            studentId: newUser.id,
            studentName: newUser.fullName,
            email: email,
            requestedClassGroupId: studentGroupId,
            requestedGrade: studentGrade
          }).catch(() => {});
        }

        setUserDirectly(newUser);
      } else {
        loginAsGuest(role, fullName || (email.split('@')[0] || 'User'));
      }
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError('');
    const res = await signInWithGoogleSupabase();
    if (res.error) {
      setError(res.error);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-church-cream)] dark:bg-slate-950 flex flex-col justify-center items-center p-4 selection:bg-[var(--color-church-gold)] selection:text-white transition-colors duration-200">
      {/* Top action controls: Language & Dark mode */}
      <div className="w-full max-w-md flex justify-between items-center mb-4 px-2">
        <button 
          onClick={toggleTheme}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 shadow-sm border border-[var(--color-church-cream-dark)] dark:border-slate-700 text-xs font-semibold hover:opacity-80 transition-all cursor-pointer"
        >
          {isDark ? <Sun size={15} className="text-[var(--color-church-gold)]" /> : <Moon size={15} className="text-[var(--color-church-blue)]" />}
          <span>{isDark ? (lang === 'copt' ? 'Ⲡⲓⲟⲩⲱⲓⲛⲓ' : lang === 'ar' ? 'الوضع المضيء' : 'Light Mode') : (lang === 'copt' ? 'Ⲡⲓⲉ̀ϫⲱⲣϩ' : lang === 'ar' ? 'الوضع الليلي' : 'Dark Mode')}</span>
        </button>

        {/* 3-Language Selector */}
        <div className="flex items-center bg-white dark:bg-slate-800 p-1 rounded-full shadow-sm border border-[var(--color-church-cream-dark)] dark:border-slate-700 gap-1 text-xs font-bold">
          <button
            onClick={() => setLang('ar')}
            className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
              lang === 'ar'
                ? 'bg-[var(--color-church-blue)] text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-[var(--color-church-blue)]'
            }`}
          >
            عربي
          </button>
          <button
            onClick={() => setLang('en')}
            className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
              lang === 'en'
                ? 'bg-[var(--color-church-blue)] text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-[var(--color-church-blue)]'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLang('copt')}
            className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
              lang === 'copt'
                ? 'bg-[var(--color-church-gold)] text-[var(--color-church-blue)] shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-[var(--color-church-gold)]'
            }`}
            title="Ⲙⲉⲑⲣⲉⲙⲛ̀ⲭⲏⲙⲓ (Church Coptic)"
          >
            Ⲭⲏⲙⲓ
          </button>
        </div>

      </div>

      <div className="w-full max-w-md bg-[var(--mousa-cream-surface)] dark:bg-[#1E1914] rounded-3xl shadow-xl border-2 border-[var(--mousa-border-sand)] p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-gradient-to-tr from-[var(--mousa-teal-deep)] to-[var(--mousa-teal)] rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg shadow-[var(--mousa-teal-deep)]/20 border-2 border-[var(--mousa-gold)]/50">
            <span className="text-2xl font-black tracking-tighter text-[var(--mousa-gold)]">ⲭⲣ</span>
          </div>
          <h1 className="text-2xl font-black text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB] tracking-tight">
            {lang === 'copt' ? 'Ϯⲉⲕⲕⲗⲏⲥⲓⲁ ⲙ̀Ⲫⲁⲅⲓⲟⲥ Ⲙⲱⲩⲥⲏⲥ' : lang === 'ar' ? 'كنيسة القديس الأنبا موسى' : 'St. Moses Church'}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {isRegister 
              ? (lang === 'copt' ? 'Ⲁⲣⲓ ⲟⲩⲕⲗⲟⲙ ⲙ̀ⲃⲉⲣⲓ ⲉ̀ⲛⲓⲥⲃⲱ ⲛ̀ⲧⲉ ϯⲕⲩⲣⲓⲁⲕⲏ' : lang === 'ar' ? 'أنشئ حسابك الجديد للانضمام إلى مدارس الأحد' : 'Create your Sunday School account')
              : (lang === 'copt' ? 'Ϣⲉ ⲉ̀ϧⲟⲩⲛ ⲉ̀ⲛⲓⲥⲃⲱ ⲟⲩⲟϩ ϭⲓ ⲛⲓⲧⲁⲓⲟ' : lang === 'ar' ? 'سجل دخولك عشان تتابع دروسك وتجمع نقاط' : 'Sign in to follow lessons & earn points')
            }
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-semibold rounded-xl border border-red-200 dark:border-red-900/50">
            {error}
          </div>
        )}

        {/* Role selection visible if registering */}
        {isRegister && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
              {lang === 'copt' ? 'Ⲡⲓⲧⲁⲝⲓⲥ ⲛ̀ⲧⲉ ⲡⲓⲣⲁⲛ:' : lang === 'ar' ? 'نوع الحساب:' : 'Account Role:'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  role === 'student'
                    ? 'bg-[var(--mousa-teal)] text-white border-[var(--mousa-teal)] shadow-sm'
                    : 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-[var(--mousa-border-sand)] dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              >
                {lang === 'copt' ? '👦 Ⲁⲗⲟⲩ' : lang === 'ar' ? '👦 تلميذ' : '👦 Student'}
              </button>
              <button
                type="button"
                onClick={() => setRole('teacher')}
                className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  role === 'teacher'
                    ? 'bg-[var(--color-church-gold)] text-[var(--mousa-teal)] border-[var(--color-church-gold)] shadow-sm font-black'
                    : 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-[var(--mousa-border-sand)] dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              >
                {lang === 'copt' ? '⛪ Ⲇⲓⲁⲕⲟⲛ' : lang === 'ar' ? '⛪ خادم' : '⛪ Servant'}
              </button>
              <button
                type="button"
                onClick={() => setRole('parent')}
                className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  role === 'parent'
                    ? 'bg-[var(--color-church-burgundy)] text-white border-[var(--color-church-burgundy)] shadow-sm'
                    : 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-[var(--mousa-border-sand)] dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              >
                {lang === 'copt' ? '👨‍👩‍👦 Ⲓⲱⲧ' : lang === 'ar' ? '👨‍👩‍👦 ولي أمر' : '👨‍👩‍👦 Parent'}
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {isRegister && (
            <div>
              <label className="text-xs font-bold text-gray-600 dark:text-gray-300 block mb-1">
                {lang === 'copt' ? 'Ⲡⲉⲕⲣⲁⲛ ⲧⲏⲣϥ' : lang === 'ar' ? 'الاسم بالكامل' : 'Full Name'}
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={lang === 'copt' ? 'Ⲙⲱⲩⲥⲏⲥ' : lang === 'ar' ? 'مثال: مينا عماد' : 'e.g., Mina Emad'}
                  className="w-full bg-gray-50 dark:bg-slate-800 dark:text-white border border-[var(--mousa-border-sand)] dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--mousa-teal)] pl-10"
                />
                <User size={18} className="absolute left-3 top-3.5 text-gray-400" />
              </div>
            </div>
          )}

          {/* Sunday School Class & Grade Selector for Student Registration */}
          {isRegister && role === 'student' && (
            <div className="space-y-3 p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40">
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1.5 flex items-center justify-between">
                  <span>{lang === 'copt' ? 'Ⲡⲓⲧⲁⲝⲓⲥ ⲛ̀ⲧⲉ ϯⲕⲩⲣⲓⲁⲕⲏ:' : lang === 'ar' ? 'فصل مدارس الأحد (المرحلة):' : 'Sunday School Class Group:'}</span>
                  <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold">
                    {CLASS_GROUPS[selectedClassGroupId]?.name[lang === 'ar' ? 'ar' : 'en']}
                  </span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {Object.values(CLASS_GROUPS).map((group) => {
                    const isSelected = selectedClassGroupId === group.id;
                    return (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => {
                          setSelectedClassGroupId(group.id);
                          const gList = CLASS_GROUPS[group.id]?.grades || [];
                          if (gList.length > 0) setSelectedGrade(gList[0].code);
                        }}
                        className={`py-1.5 px-1 text-[11px] font-bold rounded-xl border transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                          isSelected
                            ? 'bg-[var(--mousa-teal)] text-white border-[var(--mousa-teal)] shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-xs">{group.icon}</span>
                        <span className="truncate max-w-[80px]">{group.name[lang === 'ar' ? 'ar' : 'en']}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                  {lang === 'copt' ? 'ϯⲧⲁⲝⲓⲥ ⲉⲧⲥⲟⲧⲡ:' : lang === 'ar' ? 'الصف الدراسي المحدد:' : 'Specific Grade:'}
                </label>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 text-gray-800 dark:text-white border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--mousa-teal)]"
                >
                  {(CLASS_GROUPS[selectedClassGroupId]?.grades || []).map((g) => (
                    <option key={g.id} value={g.code}>
                      {g.name[lang === 'ar' ? 'ar' : 'en']} ({g.code})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                  {lang === 'ar' 
                    ? 'سيتم إرسال طلب تفعيل الحساب للخادم المسؤول عن هذا الفصل لاعتماده فوراً.' 
                    : 'An account activation request will be sent to your Sunday School servant.'}
                </p>
              </div>

              <div>
                <label htmlFor="hymns-taxis-level" className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1.5">
                  {lang === 'ar' ? 'المستوى المشترك للألحان والطقس:' : lang === 'copt' ? 'Ⲡⲓⲙⲁ ⲛ̀ϩⲓⲙⲛⲟⲥ ⲛⲉⲙ ⲛ̀ⲧⲁⲝⲓⲥ:' : 'Shared Hymns & Taxis Level:'}
                </label>
                <select
                  id="hymns-taxis-level"
                  required
                  value={selectedHymnsTaxisLevel}
                  onChange={event => setSelectedHymnsTaxisLevel(parseHymnsTaxisLevel(event.target.value) || '')}
                  className="w-full bg-white dark:bg-slate-800 text-gray-800 dark:text-white border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--mousa-teal)]"
                >
                  <option value="">{lang === 'ar' ? 'اختار المستوى' : 'Select a level'}</option>
                  <option value={1}>{lang === 'ar' ? 'المستوى الأول' : lang === 'copt' ? 'Ⲡⲓⲙⲁ ⲛ̀ϩⲟⲩⲓⲧ' : 'Level 1'}</option>
                  <option value={2}>{lang === 'ar' ? 'المستوى الثاني' : lang === 'copt' ? 'Ⲡⲓⲙⲁ ⲙ̀ⲙⲁϩⲥⲛⲟⲩϯ' : 'Level 2'}</option>
                  <option value={3}>{lang === 'ar' ? 'المستوى الثالث' : lang === 'copt' ? 'Ⲡⲓⲙⲁ ⲙ̀ⲙⲁϩϣⲟⲙϯ' : 'Level 3'}</option>
                </select>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                  {lang === 'ar'
                    ? 'اختيار واحد هيتطبق على الألحان والطقس معاً، ويتحفظ في ملفك.'
                    : 'One selection applies to both Hymns and Taxis and is saved to your profile.'}
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-gray-600 dark:text-gray-300 block mb-1">
              {lang === 'copt' ? 'Ⲡⲓⲧⲁⲭⲩⲇⲣⲟⲙⲟⲥ' : lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}
            </label>
            <div className="relative">
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@church.org"
                className="w-full bg-gray-50 dark:bg-slate-800 dark:text-white border border-[var(--mousa-border-sand)] dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--mousa-teal)] pl-10"
              />
              <Mail size={18} className="absolute left-3 top-3.5 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600 dark:text-gray-300 block mb-1">
              {lang === 'copt' ? 'Ⲡⲓⲗⲟⲅⲟⲥ ⲛ̀ⲕⲉⲗⲉⲯ' : lang === 'ar' ? 'كلمة المرور' : 'Password'}
            </label>
            <div className="relative">
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-gray-50 dark:bg-slate-800 dark:text-white border border-[var(--mousa-border-sand)] dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--mousa-teal)] pl-10"
              />
              <Lock size={18} className="absolute left-3 top-3.5 text-gray-400" />
            </div>
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => handleRememberMeChange(e.target.checked)}
                className="w-4 h-4 rounded border-[var(--mousa-border-sand)] text-[var(--mousa-teal)] focus:ring-[var(--mousa-teal)] accent-[var(--mousa-teal)] cursor-pointer"
              />
              <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                {lang === 'copt' ? 'Ⲁⲣⲓⲡⲁⲙⲉⲩⲓ ϧⲉⲛ ⲡⲁⲓⲥⲕⲉⲩⲟⲥ' : lang === 'ar' ? 'تذكرني على هذا الجهاز' : 'Remember me on this device'}
              </span>
            </label>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[var(--mousa-teal)] hover:bg-[var(--color-church-blue-light)] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer border border-[var(--color-church-blue-light)]"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span>
                {isRegister 
                  ? (lang === 'copt' ? 'Ⲑⲁⲙⲓⲟ ⲛ̀ⲟⲩⲕⲗⲟⲙ ⲙ̀ⲃⲉⲣⲓ' : lang === 'ar' ? 'إنشاء حساب جديد بالبريد' : 'Create Account with Email')
                  : (lang === 'copt' ? 'Ϣⲉ ⲉ̀ϧⲟⲩⲛ' : lang === 'ar' ? 'تسجيل الدخول بالبريد' : 'Sign In with Email')
                }
              </span>
            )}
          </button>

          {/* Sign in with Google (Supabase OAuth) */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full py-3 px-4 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl border border-[var(--mousa-border-sand)] dark:border-slate-700 shadow-xs transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer text-xs"
          >
            {googleLoading ? (
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>
              {lang === 'copt' ? 'Ϣⲉ ⲉ̀ϧⲟⲩⲛ ⲛ̀ⲧⲉ Google' : lang === 'ar' ? 'المتابعة بحساب Google' : 'Continue with Google'}
            </span>
          </button>
        </form>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-[var(--mousa-border-sand)] dark:border-slate-700"></div>
          <span className="flex-shrink mx-4 text-xs font-bold text-gray-400 uppercase">
            {lang === 'copt' ? 'Ⲓⲉ ⲇⲟⲕⲓⲙⲁⲍⲓⲛ' : lang === 'ar' ? 'أو تجربة فورية' : 'or instant demo'}
          </span>
          <div className="flex-grow border-t border-[var(--mousa-border-sand)] dark:border-slate-700"></div>
        </div>

        {/* Quick Demo Access buttons for Sunday School testing */}
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 text-center">
            {lang === 'copt' ? 'Ⲇⲟⲕⲓⲙⲏ ⲛ̀ⲛⲓⲧⲁⲝⲓⲥ:' : lang === 'ar' ? 'الدخول كحساب تجريبي مباشر:' : 'Instant Role Demo Testing:'}
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => loginAsGuest('student', lang === 'copt' ? 'Ⲇⲁⲩⲓⲇ' : 'التلميذ ديفيد')}
              className="py-2.5 px-2 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-[var(--mousa-teal)] dark:text-blue-300 text-xs font-bold rounded-xl border border-[var(--mousa-border-sand)] dark:border-blue-900 transition-all flex flex-col items-center gap-1 cursor-pointer"
            >
              <span>👦</span>
              <span>{lang === 'copt' ? 'Ⲁⲗⲟⲩ' : lang === 'ar' ? 'تلميذ' : 'Student'}</span>
            </button>
            <button
              type="button"
              onClick={() => loginAsGuest('teacher', lang === 'copt' ? 'Ⲙⲏⲛⲁ' : 'الخادم مينا')}
              className="py-2.5 px-2 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-[var(--mousa-teal)] dark:text-amber-300 text-xs font-bold rounded-xl border border-[var(--mousa-gold)]/40 dark:border-amber-900 transition-all flex flex-col items-center gap-1 cursor-pointer"
            >
              <span>⛪</span>
              <span>{lang === 'copt' ? 'Ⲇⲓⲁⲕⲟⲛ' : lang === 'ar' ? 'خادم' : 'Servant'}</span>
            </button>
            <button
              type="button"
              onClick={() => loginAsGuest('parent', lang === 'copt' ? 'Ⲙⲁⲕⲁⲣⲓⲟⲥ' : 'الأستاذ عماد مكرم')}
              className="py-2.5 px-2 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-[var(--mousa-coral)] dark:text-red-300 text-xs font-bold rounded-xl border border-[var(--mousa-coral)]/30 dark:border-red-900 transition-all flex flex-col items-center gap-1 cursor-pointer"
            >
              <span>👨‍👩‍👦</span>
              <span>{lang === 'copt' ? 'Ⲓⲱⲧ' : lang === 'ar' ? 'ولي أمر' : 'Parent'}</span>
            </button>
          </div>
        </div>

        <div className="text-center pt-2">
          <button 
            type="button"
            onClick={() => { setIsRegister(!isRegister); setError(''); }}
            className="text-xs font-bold text-[var(--mousa-teal)] dark:text-[var(--mousa-gold-light)] hover:underline cursor-pointer"
          >
            {isRegister 
              ? (lang === 'copt' ? 'Ⲟⲩⲟⲛ ⲛ̀ⲧⲁⲕ ⲟⲩⲕⲗⲟⲙ? Ϣⲉ ⲉ̀ϧⲟⲩⲛ' : lang === 'ar' ? 'لديك حساب بالفعل؟ سجل دخولك' : 'Already have an account? Sign in')
              : (lang === 'copt' ? 'Ⲙⲙⲟⲛ ⲕⲗⲟⲙ ⲛ̀ⲧⲁⲕ? Ⲑⲁⲙⲓⲟ ⲧⲛⲟⲩ' : lang === 'ar' ? 'مستخدم جديد؟ سجل الآن' : "Don't have an account? Sign up")
            }
          </button>
        </div>

        {/* Legal & Compliance footer links */}
        <div className="pt-2 border-t border-[var(--mousa-border-sand)] dark:border-stone-800/80 flex items-center justify-center gap-4 text-[11px] text-gray-400 dark:text-gray-500 font-medium">
          <button
            type="button"
            onClick={() => setShowLegal('privacy')}
            className="hover:text-[var(--mousa-teal)] dark:hover:text-[var(--mousa-gold)] transition-colors cursor-pointer"
          >
            {lang === 'copt' ? 'Ⲡⲓⲛⲟⲙⲟⲥ ⲛ̀ⲧⲉ ⲡⲓϩⲱⲡ' : lang === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => setShowLegal('faq')}
            className="hover:text-[var(--mousa-teal)] dark:hover:text-[var(--mousa-gold)] transition-colors cursor-pointer"
          >
            {lang === 'copt' ? 'Ⲛⲓϣⲉⲛϩⲏⲧ' : lang === 'ar' ? 'الأسئلة الشائعة' : 'FAQ'}
          </button>
        </div>
      </div>

      {/* Legal Modals */}
      <AnimatePresence>
        {showLegal === 'privacy' && (
          <PrivacyPolicy lang={lang} onClose={() => setShowLegal(null)} />
        )}
        {showLegal === 'faq' && (
          <FAQ lang={lang} onClose={() => setShowLegal(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
