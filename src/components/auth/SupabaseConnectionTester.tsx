import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, AlertCircle, RefreshCw, X, ShieldCheck, Key, Globe } from 'lucide-react';
import { supabaseUrl, supabaseAnonKey, isSupabaseConfigured, configureSupabase } from '../../lib/supabase';
import { testSupabaseConnection } from '../../lib/supabaseAuth';
import { Language } from '../../types';

interface SupabaseConnectionTesterProps {
  lang: Language;
  onClose: () => void;
}

export function SupabaseConnectionTester({ lang, onClose }: SupabaseConnectionTesterProps) {
  const [testing, setTesting] = useState(false);
  const [statusResult, setStatusResult] = useState<{
    tested: boolean;
    connected: boolean;
    message: string;
    authWorking: boolean;
  }>({
    tested: false,
    connected: isSupabaseConfigured,
    message: isSupabaseConfigured ? 'Ready to test' : 'Credentials not detected yet',
    authWorking: false,
  });

  const [inputUrl, setInputUrl] = useState(() => supabaseUrl || '');
  const [inputKey, setInputKey] = useState(() => supabaseAnonKey || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const runTest = async () => {
    setTesting(true);
    setSaveSuccess(false);
    try {
      const res = await testSupabaseConnection();
      setStatusResult({
        tested: true,
        connected: res.connected,
        message: res.status,
        authWorking: res.authWorking,
      });
    } catch (e: any) {
      setStatusResult({
        tested: true,
        connected: false,
        message: e.message || 'Error executing test',
        authWorking: false,
      });
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    runTest();
  }, []);

  const handleSaveAndConnect = () => {
    if (!inputUrl.trim() || !inputKey.trim()) {
      alert(lang === 'ar' ? 'يرجى إدخال الرابط والمفتاح' : 'Please enter both URL and Anon Key');
      return;
    }
    configureSupabase(inputUrl.trim(), inputKey.trim());
    setSaveSuccess(true);
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      dir="rtl"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-5 text-start animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <Database size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                {lang === 'ar' ? 'فحص واختبار اتصال Supabase' : 'Supabase Connection Test'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {lang === 'ar' ? 'التحقق من حالة قاعدة البيانات ونظام الدخول' : 'Verify database & authentication readiness'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Live Diagnostics Card */}
        <div className={`p-4 rounded-2xl border ${
          statusResult.connected 
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200' 
            : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
        }`}>
          <div className="flex items-start gap-3">
            {statusResult.connected ? (
              <CheckCircle2 size={22} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={22} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider">
                {statusResult.connected 
                  ? (lang === 'ar' ? 'متصل وجاهز للاستخدام' : 'Connected & Active') 
                  : (lang === 'ar' ? 'في انتظار إدخال بيانات الربط' : 'Awaiting Supabase Credentials')}
              </p>
              <p className="text-xs leading-relaxed opacity-90">
                {statusResult.message}
              </p>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/10 flex items-center justify-between text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={15} />
              {lang === 'ar' ? 'حالة المصادقة (Auth):' : 'Auth Status:'}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] ${
              statusResult.authWorking 
                ? 'bg-emerald-200/60 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-100' 
                : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300'
            }`}>
              {statusResult.authWorking 
                ? (lang === 'ar' ? 'نشط ومستعد' : 'Active & Ready') 
                : (lang === 'ar' ? 'غير مرتبط' : 'Not Connected')}
            </span>
          </div>
        </div>

        {/* Quick Credentials Form */}
        <div className="space-y-3 bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-gray-200/80 dark:border-slate-800">
          <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
            {lang === 'ar' ? 'ربط مفاتيح Supabase الخاصة بك:' : 'Enter your Supabase Project Keys:'}
          </p>

          <div>
            <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-1">
              <Globe size={13} /> Project URL (https://xyz.supabase.co)
            </label>
            <input 
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="https://your-project-id.supabase.co"
              className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-1">
              <Key size={13} /> anon / public Key (eyJhbGciOi...)
            </label>
            <input 
              type="password"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSaveAndConnect}
              className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              {saveSuccess ? (
                <span>{lang === 'ar' ? 'تم الحفظ والتحميل...' : 'Saved! Reloading...'}</span>
              ) : (
                <span>{lang === 'ar' ? 'حفظ واختبار الربط' : 'Save & Test Live'}</span>
              )}
            </button>
            <button
              onClick={runTest}
              disabled={testing}
              className="py-2 px-3 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <RefreshCw size={14} className={testing ? 'animate-spin' : ''} />
              <span>{lang === 'ar' ? 'إعادة الفحص' : 'Re-test'}</span>
            </button>
          </div>
        </div>

        {/* Instructions for Google & Email Auth */}
        <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200 space-y-1.5">
          <p className="font-bold flex items-center gap-1.5">
            <span>💡</span>
            <span>{lang === 'ar' ? 'طريقة تفعيل الدخول بجوجل والبريد في Supabase:' : 'How to enable Email & Google Sign-In in Supabase:'}</span>
          </p>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-blue-800/90 dark:text-blue-300/90">
            <li>
              <strong>Email & Password:</strong> {lang === 'ar' ? 'مفعل تلقائياً في Authentication > Providers > Email.' : 'Enabled by default under Authentication > Providers > Email.'}
            </li>
            <li>
              <strong>Google Sign-In:</strong> {lang === 'ar' ? 'في لوحة Supabase، توجه إلى Authentication > Providers > Google ثم فعل المفتاح وأضف Client ID و Secret.' : 'Go to Authentication > Providers > Google, enable it and paste your Google Client ID & Secret.'}
            </li>
          </ul>
        </div>

      </div>
    </div>
  );
}
