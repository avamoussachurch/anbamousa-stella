import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Check, 
  Clock, 
  X, 
  AlertCircle, 
  Phone, 
  MessageCircle, 
  Calendar, 
  FileText, 
  Plus, 
  Sparkles, 
  HeartHandshake, 
  Search, 
  Save, 
  Award,
  ChevronDown 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SUNDAY_SCHOOL_STAGES, StageId, StageInfo } from '../../context/StageContext';

export interface StudentRecord {
  id: string;
  fullName: string;
  stageId: StageId;
  parentPhone: string;
  consecutiveAbsences: number;
  lastAttendedDate: string;
  notes?: string;
  visitations: Array<{
    date: string;
    type: 'call' | 'visit' | 'whatsapp';
    servantName: string;
    notes: string;
  }>;
}

export type AttendanceStatus = 'present' | 'late' | 'excused' | 'absent';

// Initial realistic Sunday School roster across all 5 stages
const INITIAL_STUDENTS: StudentRecord[] = [
  // Primary 4-6 (St. Anthony Family)
  {
    id: 's1',
    fullName: 'بيشوي مينا كمال',
    stageId: 'primary_upper',
    parentPhone: '+201012345678',
    consecutiveAbsences: 0,
    lastAttendedDate: '2026-09-13',
    visitations: []
  },
  {
    id: 's2',
    fullName: 'مارينا يوسف إبراهيم',
    stageId: 'primary_upper',
    parentPhone: '+201098765432',
    consecutiveAbsences: 2, // Needs visitation!
    lastAttendedDate: '2026-08-30',
    visitations: [
      {
        date: '2026-09-06',
        type: 'call',
        servantName: 'تاسوني مريم',
        notes: 'الوالدة ذكرت أن مارينا كانت مريضة بنزلة برد وتتحسن.'
      }
    ]
  },
  {
    id: 's3',
    fullName: 'كيرلس هاني فايز',
    stageId: 'primary_upper',
    parentPhone: '+201123456789',
    consecutiveAbsences: 3, // Urgent visitation!
    lastAttendedDate: '2026-08-23',
    visitations: []
  },
  {
    id: 's4',
    fullName: 'ساندرا رأفت مجدي',
    stageId: 'primary_upper',
    parentPhone: '+201234567890',
    consecutiveAbsences: 0,
    lastAttendedDate: '2026-09-13',
    visitations: []
  },

  // Kindergarten (Holy Angels)
  {
    id: 's5',
    fullName: 'مارك بيتر سمير',
    stageId: 'kg',
    parentPhone: '+201011223344',
    consecutiveAbsences: 0,
    lastAttendedDate: '2026-09-13',
    visitations: []
  },
  {
    id: 's6',
    fullName: 'كلارا أمجد عاطف',
    stageId: 'kg',
    parentPhone: '+201222334455',
    consecutiveAbsences: 2, // Needs visitation!
    lastAttendedDate: '2026-08-30',
    visitations: []
  },

  // Primary 1-3 (St. George)
  {
    id: 's7',
    fullName: 'فيلوباتير عادل شكري',
    stageId: 'primary_lower',
    parentPhone: '+201555667788',
    consecutiveAbsences: 0,
    lastAttendedDate: '2026-09-13',
    visitations: []
  },
  {
    id: 's8',
    fullName: 'جوستينا سامح نبيل',
    stageId: 'primary_lower',
    parentPhone: '+201144556677',
    consecutiveAbsences: 1,
    lastAttendedDate: '2026-09-06',
    visitations: []
  },

  // Prep (Pope Kyrillos VI)
  {
    id: 's9',
    fullName: 'أنطونيوس وجيه جرجس',
    stageId: 'prep',
    parentPhone: '+201099887766',
    consecutiveAbsences: 0,
    lastAttendedDate: '2026-09-13',
    visitations: []
  },
  {
    id: 's10',
    fullName: 'دميانة مجدي فوزي',
    stageId: 'prep',
    parentPhone: '+201288776655',
    consecutiveAbsences: 2,
    lastAttendedDate: '2026-08-30',
    visitations: []
  },

  // Secondary (St. Habib Girgis)
  {
    id: 's11',
    fullName: 'يوحنا عماد زكي',
    stageId: 'secondary',
    parentPhone: '+201177665544',
    consecutiveAbsences: 0,
    lastAttendedDate: '2026-09-13',
    visitations: []
  }
];

export function AttendanceVisitationTracker({ lang }: { lang: 'en' | 'ar' }) {
  const [selectedStage, setSelectedStage] = useState<StageId>('primary_upper');
  const [students, setStudents] = useState<StudentRecord[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('church_students_roster');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return INITIAL_STUDENTS;
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({});
  const [searchQuery, setSearchQuery] = useState('');
  
  // Visitation logging modal state
  const [activeVisitationStudent, setActiveVisitationStudent] = useState<StudentRecord | null>(null);
  const [visitationType, setVisitationType] = useState<'call' | 'visit' | 'whatsapp'>('call');
  const [servantName, setServantName] = useState('الخادم المسؤول');
  const [visitationNotes, setVisitationNotes] = useState('');

  // Load attendance for date
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`attendance_${selectedStage}_${selectedDate}`);
      if (saved) {
        try {
          setAttendanceMap(JSON.parse(saved));
          return;
        } catch (e) {}
      }
    }
    // Default everyone to present initially for quick one-tap changes
    const def: Record<string, AttendanceStatus> = {};
    const safeStudents = Array.isArray(students) ? students : INITIAL_STUDENTS;
    safeStudents.filter(s => s.stageId === selectedStage).forEach(s => {
      def[s.id] = 'present';
    });
    setAttendanceMap(def);
  }, [selectedStage, selectedDate, students]);

  const setStudentStatus = (studentId: string, status: AttendanceStatus) => {
    const updated = { ...attendanceMap, [studentId]: status };
    setAttendanceMap(updated);

    if (typeof window !== 'undefined') {
      localStorage.setItem(`attendance_${selectedStage}_${selectedDate}`, JSON.stringify(updated));
    }

    // Update student consecutive absence count if marked absent
    const updatedStudents = students.map(s => {
      if (s.id === studentId) {
        if (status === 'absent') {
          return { ...s, consecutiveAbsences: s.consecutiveAbsences + 1 };
        } else if (status === 'present') {
          return { ...s, consecutiveAbsences: 0, lastAttendedDate: selectedDate };
        }
      }
      return s;
    });
    setStudents(updatedStudents);
    if (typeof window !== 'undefined') {
      localStorage.setItem('church_students_roster', JSON.stringify(updatedStudents));
    }
  };

  const handleLogVisitation = () => {
    if (!activeVisitationStudent) return;

    const newLog = {
      date: selectedDate,
      type: visitationType,
      servantName: servantName.trim() || 'خادم مدارس الأحد',
      notes: visitationNotes.trim() || (lang === 'ar' ? 'اتواصلنا معاه واطمنا عليه.' : 'Followed up and checked in.')
    };

    const updatedStudents = students.map(s => {
      if (s.id === activeVisitationStudent.id) {
        return {
          ...s,
          visitations: [newLog, ...(s.visitations || [])]
        };
      }
      return s;
    });

    setStudents(updatedStudents);
    if (typeof window !== 'undefined') {
      localStorage.setItem('church_students_roster', JSON.stringify(updatedStudents));
    }

    setActiveVisitationStudent(null);
    setVisitationNotes('');
  };

  const openWhatsApp = (student: StudentRecord) => {
    const message = encodeURIComponent(
      `سلام ونعمة من ربنا يسوع المسيح ⛪\nوحشتنا جداً يا ${student.fullName} في كنيسة القديس العظيم الأنبا موسى الأسود ومدارس الأحد.\nبقالنا أسبوعين بنصليلك ونتمنى نشوفك الأحد القادم في القداس ومدارس الأحد وسط أصحابك وخُدامك اللي بيحبوك!`
    );
    const cleanPhone = student.parentPhone.replace(/[^0-9+]/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  // Filter students by selected stage & search query
  const safeStudents = Array.isArray(students) ? students : INITIAL_STUDENTS;
  const stageStudents = safeStudents.filter(s => {
    const matchesStage = s.stageId === selectedStage;
    const matchesSearch = s.fullName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStage && matchesSearch;
  });

  const totalInStage = stageStudents.length;
  const presentCount = stageStudents.filter(s => attendanceMap[s.id] === 'present').length;
  const absentCount = stageStudents.filter(s => attendanceMap[s.id] === 'absent').length;
  const needingVisitationCount = stageStudents.filter(s => s.consecutiveAbsences >= 2).length;

  const currentStageInfo = SUNDAY_SCHOOL_STAGES.find(s => s.id === selectedStage) || SUNDAY_SCHOOL_STAGES[2];

  return (
    <div className="space-y-6">
      {/* Stage Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {SUNDAY_SCHOOL_STAGES.map(stage => (
          <button
            key={stage.id}
            onClick={() => setSelectedStage(stage.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm shrink-0 border transition-all cursor-pointer ${
              selectedStage === stage.id
                ? 'bg-amber-600 text-white border-amber-600 shadow-sm transform scale-[1.02]'
                : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:border-amber-300'
            }`}
          >
            <span>{stage.icon}</span>
            <span>{lang === 'ar' ? stage.nameAr : stage.nameEn}</span>
          </button>
        ))}
      </div>

      {/* Stage Banner with Visitation Metrics */}
      <div className="p-5 sm:p-6 rounded-3xl bg-linear-to-r from-amber-500/10 via-orange-500/5 to-rose-500/10 dark:bg-slate-900 border border-amber-300/60 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{currentStageInfo.icon}</span>
              <h3 className="text-xl font-bold text-[var(--color-church-blue)] dark:text-amber-200">
                {lang === 'ar' ? currentStageInfo.familyNameAr : currentStageInfo.familyNameEn}
              </h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {lang === 'ar' ? `شفيع العيلة: ${currentStageInfo.patronSaintAr} • ${currentStageInfo.gradeRangeAr}` : `Patron: ${currentStageInfo.patronSaintEn}`}
            </p>
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-bold">
            <Calendar size={16} className="text-amber-600" />
            <span className="text-gray-500">{lang === 'ar' ? 'تاريخ الحضور:' : 'Date:'}</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-gray-800 dark:text-gray-200 focus:outline-hidden font-mono"
            />
          </div>
        </div>

        {/* Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
            <span className="text-xs text-gray-500 font-bold block">{lang === 'ar' ? 'إجمالي التلاميذ' : 'Total Students'}</span>
            <span className="text-xl font-extrabold text-gray-800 dark:text-gray-100">{totalInStage}</span>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
            <span className="text-xs text-emerald-800 dark:text-emerald-300 font-bold block">{lang === 'ar' ? 'حاضر النهارده' : 'Present'}</span>
            <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {presentCount} ({totalInStage > 0 ? Math.round((presentCount / totalInStage) * 100) : 0}%)
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50">
            <span className="text-xs text-[var(--color-church-burgundy)] dark:text-red-300 font-bold block">{lang === 'ar' ? 'غايب النهارده' : 'Absent'}</span>
            <span className="text-xl font-extrabold text-[var(--color-church-burgundy)] dark:text-red-400">{absentCount}</span>
          </div>

          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
            <span className="text-xs text-amber-800 dark:text-amber-300 font-bold block">{lang === 'ar' ? 'محتاج متابعة (غايب مرتين أو أكتر)' : 'Needs Visitation'}</span>
            <span className="text-xl font-extrabold text-amber-600 dark:text-amber-400">{needingVisitationCount}</span>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute right-3.5 top-3 text-gray-400" size={18} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={lang === 'ar' ? 'دوّر على اسم التلميذ في الفصل...' : 'Search student by name...'}
          className="w-full pr-10 pl-4 py-2.5 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm focus:outline-hidden focus:border-amber-500 text-gray-800 dark:text-gray-100"
        />
      </div>

      {/* Student Attendance List */}
      <div className="space-y-3">
        {stageStudents.length === 0 ? (
          <div className="text-center py-10 bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 text-gray-500">
            {lang === 'ar' ? 'ملقيناش تلاميذ مطابقين للبحث في المرحلة دي.' : 'No students found in this stage.'}
          </div>
        ) : (
          stageStudents.map((student) => {
            const status = attendanceMap[student.id] || 'present';
            const needsVisitation = student.consecutiveAbsences >= 2;

            return (
              <div
                key={student.id}
                className={`p-4 sm:p-5 rounded-3xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  needsVisitation
                    ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900'
                    : 'bg-white dark:bg-slate-900 border-gray-200/80 dark:border-slate-800'
                }`}
              >
                {/* Student Info */}
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h4 className="font-extrabold text-base text-[var(--color-church-blue)] dark:text-amber-100">
                      {student.fullName}
                    </h4>
                    {needsVisitation && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-[var(--color-church-burgundy)] text-white shadow-xs animate-pulse">
                        <AlertCircle size={12} />
                        {lang === 'ar' ? `محتاج متابعة (غايب ${student.consecutiveAbsences} أسابيع)` : `Needs Visit (${student.consecutiveAbsences}w absent)`}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {lang === 'ar' ? `ولي الأمر: ${student.parentPhone} • آخر حضور: ${student.lastAttendedDate}` : `Parent: ${student.parentPhone}`}
                  </p>

                  {/* Recent visitation note if any */}
                  {student.visitations && student.visitations.length > 0 && (
                    <div className="mt-2 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-slate-800/80 p-2 rounded-xl border border-amber-200/50 dark:border-slate-700 flex items-center gap-1.5">
                      <HeartHandshake size={14} className="shrink-0 text-amber-600" />
                      <span className="line-clamp-1">
                        <strong>{student.visitations[0].date}:</strong> {student.visitations[0].notes} ({student.visitations[0].servantName})
                      </span>
                    </div>
                  )}
                </div>

                {/* Right Side: One-Tap Attendance Buttons + Visitation Quick Actions */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* One-Tap 4 Status Buttons (NO QR CODE) */}
                  <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-2xl">
                    <button
                      onClick={() => setStudentStatus(student.id, 'present')}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                        status === 'present'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-gray-600 dark:text-gray-400 hover:text-emerald-700'
                      }`}
                    >
                      {lang === 'ar' ? 'حاضر' : 'Present'}
                    </button>

                    <button
                      onClick={() => setStudentStatus(student.id, 'late')}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                        status === 'late'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'text-gray-600 dark:text-gray-400 hover:text-amber-700'
                      }`}
                    >
                      {lang === 'ar' ? 'متأخر' : 'Late'}
                    </button>

                    <button
                      onClick={() => setStudentStatus(student.id, 'excused')}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                        status === 'excused'
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'text-gray-600 dark:text-gray-400 hover:text-sky-700'
                      }`}
                    >
                      {lang === 'ar' ? 'بعذر' : 'Excused'}
                    </button>

                    <button
                      onClick={() => setStudentStatus(student.id, 'absent')}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                        status === 'absent'
                          ? 'bg-[var(--color-church-burgundy)] text-white shadow-xs'
                          : 'text-gray-600 dark:text-gray-400 hover:text-[var(--color-church-burgundy)]'
                      }`}
                    >
                      {lang === 'ar' ? 'غائب' : 'Absent'}
                    </button>
                  </div>

                  {/* Quick Visitation Actions */}
                  <div className="flex items-center gap-1.5">
                    {/* WhatsApp */}
                    <button
                      onClick={() => openWhatsApp(student)}
                      title={lang === 'ar' ? 'إرسال رسالة افتقاد واتساب' : 'WhatsApp Greeting'}
                      className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 transition-colors cursor-pointer"
                    >
                      <MessageCircle size={16} />
                    </button>

                    {/* Phone Call */}
                    <a
                      href={`tel:${student.parentPhone}`}
                      title={lang === 'ar' ? 'اتصال بولي الأمر' : 'Call Parent'}
                      className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 hover:bg-blue-200 transition-colors cursor-pointer"
                    >
                      <Phone size={16} />
                    </a>

                    {/* Log Visit Note */}
                    <button
                      onClick={() => setActiveVisitationStudent(student)}
                      title={lang === 'ar' ? 'تسجيل تقرير الافتقاد' : 'Log Visitation Note'}
                      className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 hover:bg-amber-200 transition-colors cursor-pointer"
                    >
                      <FileText size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Visitation Log Modal */}
      {activeVisitationStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-amber-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
              <div>
                <h3 className="font-extrabold text-lg text-[var(--color-church-blue)] dark:text-amber-200">
                  {lang === 'ar' ? 'تسجيل تقرير الافتقاد الروحي' : 'Log Visitation Report'}
                </h3>
                <p className="text-xs text-gray-500">
                  {lang === 'ar' ? `المخدوم: ${activeVisitationStudent.fullName}` : `Student: ${activeVisitationStudent.fullName}`}
                </p>
              </div>
              <button
                onClick={() => setActiveVisitationStudent(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={20} />
              </button>
            </div>

            {/* Visitation Type Buttons */}
            <div>
              <label className="text-xs font-bold text-gray-600 dark:text-gray-300 block mb-1">
                {lang === 'ar' ? 'طريقة الافتقاد:' : 'Visitation Method:'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'call', labelAr: 'مكالمة هاتفية', labelEn: 'Call' },
                  { id: 'whatsapp', labelAr: 'واتساب', labelEn: 'WhatsApp' },
                  { id: 'visit', labelAr: 'زيارة منزلية', labelEn: 'Home Visit' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setVisitationType(m.id as any)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      visitationType === m.id
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {lang === 'ar' ? m.labelAr : m.labelEn}
                  </button>
                ))}
              </div>
            </div>

            {/* Servant Name */}
            <div>
              <label className="text-xs font-bold text-gray-600 dark:text-gray-300 block mb-1">
                {lang === 'ar' ? 'اسم الخادم المفتقد:' : 'Servant Name:'}
              </label>
              <input
                type="text"
                value={servantName}
                onChange={(e) => setServantName(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-gray-100"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-bold text-gray-600 dark:text-gray-300 block mb-1">
                {lang === 'ar' ? 'ملاحظات الافتقاد (سبب الغياب، طلب صلاة، موعد الزيارة القادمة):' : 'Visitation Notes:'}
              </label>
              <textarea
                value={visitationNotes}
                onChange={(e) => setVisitationNotes(e.target.value)}
                placeholder={lang === 'ar' ? 'اكتب تقرير الافتقاد هنا...' : 'Write notes here...'}
                className="w-full text-xs p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-gray-100 min-h-[90px]"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setActiveVisitationStudent(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-600 dark:text-gray-300"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleLogVisitation}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md"
              >
                {lang === 'ar' ? 'حفظ تقرير الافتقاد' : 'Save Report'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
