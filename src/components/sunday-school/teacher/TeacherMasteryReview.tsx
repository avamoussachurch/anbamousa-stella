import React, { useState } from 'react';
import { 
  Award, 
  UserCheck, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  BookOpen, 
  HelpCircle, 
  Save, 
  Edit3,
  User,
  ChevronRight
} from 'lucide-react';
import { 
  StudentContentProgress, 
  StudentQuizAttempt, 
  StudentMastery, 
  MasteryStatus 
} from '../../../types';
import { getClassRoster } from '../../../lib/classRosterService';

interface TeacherMasteryReviewProps {
  lessonId: string;
  lessonTitle: string;
  contentProgress: Record<string, StudentContentProgress>;
  quizAttempts: Record<string, StudentQuizAttempt[]>;
  masteries: Record<string, StudentMastery>;
  onUpdateMastery: (studentId: string, lessonId: string, status: MasteryStatus, evaluatedBy: string, notes: string) => void;
}

interface StudentRosterItem {
  id: string;
  name: string;
  avatar: string;
  grade: string;
}

export const TeacherMasteryReview: React.FC<TeacherMasteryReviewProps> = ({
  lessonId,
  lessonTitle,
  contentProgress,
  quizAttempts,
  masteries,
  onUpdateMastery
}) => {
  // Sunday School class roster with live server and fallback resilience
  const [students, setStudents] = useState<StudentRosterItem[]>([
    { id: 'u1', name: 'Youssef Mina', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Youssef', grade: '4th Grade' },
    { id: 's1', name: 'Mina Shenouda', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mina', grade: '4th Grade' },
    { id: 's2', name: 'Mary Gabriel', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mary', grade: '4th Grade' },
    { id: 's3', name: 'Kyrollos Bassily', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kyrollos', grade: '4th Grade' }
  ]);

  React.useEffect(() => {
    getClassRoster(undefined, true).then(({ data }) => {
      if (data && data.length > 0) {
        setStudents(data.map(d => ({
          id: d.id,
          name: d.name,
          avatar: d.avatarUrl,
          grade: d.grade
        })));
      }
    });
  }, []);

  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0].id);
  const [editStatus, setEditStatus] = useState<MasteryStatus>('DEVELOPING');
  const [teacherNotes, setTeacherNotes] = useState<string>('');
  const [servantName, setServantName] = useState<string>('Servant Mina');
  const [saveMsg, setSaveMsg] = useState<string>('');

  const selectedStudent = students.find(s => s.id === selectedStudentId) || students[0];
  const currentProgress = contentProgress[`${selectedStudent.id}_${lessonId}`];
  const attempts = quizAttempts[`${selectedStudent.id}_${lessonId}`] || [];
  const latestAttempt = attempts[attempts.length - 1];
  const currentMastery = masteries[`${selectedStudent.id}_${lessonId}`];

  // Set initial form state when student changes
  React.useEffect(() => {
    if (currentMastery) {
      setEditStatus(currentMastery.status);
      setTeacherNotes(currentMastery.teacherNotes || '');
    } else {
      setEditStatus(latestAttempt && latestAttempt.percentage >= 80 ? 'DEVELOPING' : 'NOT_STARTED');
      setTeacherNotes('');
    }
    setSaveMsg('');
  }, [selectedStudentId, currentMastery, latestAttempt]);

  const handleSaveEvaluation = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateMastery(selectedStudent.id, lessonId, editStatus, servantName, teacherNotes);
    setSaveMsg('Mastery evaluation updated successfully!');
    setTimeout(() => setSaveMsg(''), 3000);
  };

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-stone-950 px-6 py-4 border-b border-stone-800 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-950/70 border border-amber-800/60 flex items-center justify-center text-amber-400">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Student Mastery & Educational Assessment</h2>
            <p className="text-xs text-stone-400">
              Clear Separation: Lesson Content Progress ≠ Quiz Score ≠ Teacher Mastery Review.
            </p>
          </div>
        </div>

        <span className="text-xs px-3 py-1 bg-stone-900 rounded-xl border border-stone-800 text-amber-300 font-medium">
          Lesson: {lessonTitle}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-stone-800">
        {/* Left Column: Student Roster */}
        <div className="p-4 space-y-2 bg-stone-950/40">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 px-2 mb-2">
            Class Roster (4th Grade)
          </h3>

          {students.map((student) => {
            const isSelected = student.id === selectedStudentId;
            const prog = contentProgress[`${student.id}_${lessonId}`];
            const att = quizAttempts[`${student.id}_${lessonId}`]?.[0];
            const mast = masteries[`${student.id}_${lessonId}`];

            return (
              <button
                key={student.id}
                onClick={() => setSelectedStudentId(student.id)}
                className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                  isSelected 
                    ? 'bg-amber-950/40 border-amber-500/80 shadow-md ring-1 ring-amber-500/50' 
                    : 'bg-stone-900/60 border-stone-800 hover:border-stone-700 hover:bg-stone-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <img src={student.avatar} alt={student.name} className="w-9 h-9 rounded-xl bg-stone-800" />
                  <div>
                    <span className="font-bold text-xs text-stone-100 block">{student.name}</span>
                    <span className="text-[10px] text-stone-400 font-mono">
                      Content: {prog ? `${prog.completionPercent}%` : '0%'} • Quiz: {att ? `${att.score}/${att.totalScore}` : 'None'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    mast?.status === 'MASTERED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                    mast?.status === 'DEVELOPING' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                    mast?.status === 'NEEDS_SUPPORT' ? 'bg-red-950 text-red-300 border border-red-800' :
                    'bg-stone-800 text-stone-400'
                  }`}>
                    {mast?.status || 'NOT_STARTED'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right 2 Columns: Comprehensive Student Diagnosis & Evaluation */}
        <div className="lg:col-span-2 p-6 space-y-6">
          {/* Student Profile Header */}
          <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-stone-800">
            <div className="flex items-center gap-3">
              <img src={selectedStudent.avatar} alt={selectedStudent.name} className="w-12 h-12 rounded-2xl bg-stone-800 border border-stone-700" />
              <div>
                <h3 className="font-bold text-base text-white">{selectedStudent.name}</h3>
                <p className="text-xs text-stone-400">{selectedStudent.grade} • Sunday School Class</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-400">Assigned Mastery:</span>
              <span className={`text-xs px-3 py-1 rounded-xl font-bold uppercase tracking-wider border ${
                currentMastery?.status === 'MASTERED' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' :
                currentMastery?.status === 'DEVELOPING' ? 'bg-amber-950 text-amber-300 border-amber-800' :
                currentMastery?.status === 'NEEDS_SUPPORT' ? 'bg-red-950 text-red-300 border-red-800' :
                'bg-stone-800 text-stone-400 border-stone-700'
              }`}>
                {currentMastery?.status || 'PENDING EVALUATION'}
              </span>
            </div>
          </div>

          {/* Separation Cards: 1) Content Progress vs 2) Quiz Score */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Metric 1: Lesson Content Progress */}
            <div className="p-4 bg-stone-950 rounded-xl border border-stone-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" /> Lesson Content Progress
                </span>
                <span className="font-mono text-sm font-bold text-white">
                  {currentProgress?.completionPercent || 0}%
                </span>
              </div>
              <div className="w-full h-2 bg-stone-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${currentProgress?.completionPercent || 0}%` }}
                />
              </div>
              <p className="text-[11px] text-stone-400">
                {currentProgress 
                  ? `${currentProgress.sectionsCompleted.length} of ${currentProgress.totalSections} sections read`
                  : 'Student has not opened the lesson yet'}
              </p>
            </div>

            {/* Metric 2: Separate Quiz Attempt */}
            <div className="p-4 bg-stone-950 rounded-xl border border-stone-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4" /> Review Quiz Assessment
                </span>
                <span className="font-mono text-sm font-bold text-white">
                  {latestAttempt ? `${latestAttempt.percentage}%` : 'Not Taken'}
                </span>
              </div>
              <div className="w-full h-2 bg-stone-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    latestAttempt && latestAttempt.percentage >= 80 ? 'bg-emerald-500' : 'bg-purple-500'
                  }`}
                  style={{ width: `${latestAttempt?.percentage || 0}%` }}
                />
              </div>
              <p className="text-[11px] text-stone-400">
                {latestAttempt 
                  ? `${latestAttempt.score} of ${latestAttempt.totalScore} questions correct (${attempts.length} attempts)`
                  : 'Separate quiz not yet completed'}
              </p>
            </div>
          </div>

          {/* Quiz Question Breakdown (if attempt exists) */}
          {latestAttempt && latestAttempt.answers && (
            <div className="p-4 bg-stone-950 rounded-xl border border-stone-800 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-300 block">
                Quiz Diagnostics & Recommended Review Areas
              </span>
              <div className="space-y-2">
                {latestAttempt.answers.map((ans, idx) => (
                  <div 
                    key={ans.questionId}
                    className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-3 ${
                      ans.isCorrect ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-200' : 'bg-red-950/20 border-red-900/40 text-red-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">Q{idx + 1}: {ans.isCorrect ? '✓ Correct' : '✕ Missed'}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-stone-300">{ans.feedbackEn}</p>
                      {ans.recommendedSectionTitle && (
                        <p className="mt-1 text-[11px] text-amber-300 font-medium">
                          Targeted Review: {ans.recommendedSectionTitle}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Servant Mastery Assessment Form */}
          <form onSubmit={handleSaveEvaluation} className="p-5 bg-stone-950 rounded-xl border border-stone-800 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Edit3 className="w-4 h-4" /> Servant Mastery Evaluation Form
              </span>
              <span className="text-stone-500 text-[11px]">Human in the loop</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-stone-300 font-semibold mb-1">Mastery Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as MasteryStatus)}
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 focus:outline-none focus:border-amber-500 font-semibold"
                >
                  <option value="NOT_STARTED">NOT_STARTED (Not yet evaluated)</option>
                  <option value="DEVELOPING">DEVELOPING (Good grasp, reviewing key details)</option>
                  <option value="MASTERED">MASTERED (Complete comprehension & verse memorized)</option>
                  <option value="NEEDS_SUPPORT">NEEDS_SUPPORT (Requires 1-on-1 servant guidance)</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-300 font-semibold mb-1">Evaluating Servant</label>
                <input
                  type="text"
                  value={servantName}
                  onChange={(e) => setServantName(e.target.value)}
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-stone-300 font-semibold mb-1">Pastoral & Classroom Feedback</label>
              <textarea
                rows={3}
                placeholder="Write specific notes on child's oral recitation, church attendance, or areas needing review..."
                value={teacherNotes}
                onChange={(e) => setTeacherNotes(e.target.value)}
                className="w-full bg-stone-900 border border-stone-800 rounded-xl p-3 text-stone-100 focus:outline-none focus:border-amber-500 font-serif"
              />
            </div>

            {saveMsg && (
              <p className="text-xs text-emerald-400 bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-800/40 font-medium">
                {saveMsg}
              </p>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95"
              >
                <Save className="w-4 h-4" /> Save Mastery Evaluation
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
