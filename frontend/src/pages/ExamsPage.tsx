import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { Exam, ExamStatus } from '../types';
import { Plus, Edit, Eye, CheckCircle2, XCircle, Clock, HelpCircle, Layers, Settings } from 'lucide-react';

export const ExamsPage: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Exam Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationMins, setDurationMins] = useState(20);
  const [numberOfQuestions, setNumberOfQuestions] = useState(10);
  const [randomizeQuestions, setRandomizeQuestions] = useState(true);
  const [randomizeOptions, setRandomizeOptions] = useState(true);
  const [oneAttemptOnly, setOneAttemptOnly] = useState(true);
  const [showCorrectImmediately, setShowCorrectImmediately] = useState(true);
  const [createError, setCreateError] = useState<string | null>(null);

  const navigate = useNavigate();

  const fetchExams = async () => {
    setLoading(true);
    try {
      const url = statusFilter ? `/exams?status=${statusFilter}` : '/exams';
      const data = await apiFetch<Exam[]>(url);
      setExams(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, [statusFilter]);

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    try {
      const newExam = await apiFetch<Exam>('/exams', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          duration_seconds: durationMins * 60,
          number_of_questions: numberOfQuestions,
          randomize_questions: randomizeQuestions,
          randomize_options: randomizeOptions,
          one_attempt_only: oneAttemptOnly,
          show_correct_answer_immediately: showCorrectImmediately,
        }),
      });
      setShowCreateModal(false);
      // Navigate to Editor
      navigate(`/exams/${newExam.id}`);
    } catch (err: any) {
      setCreateError(err.message || 'حدث خطأ أثناء إنشاء الامتحان');
    }
  };

  const handlePublish = async (examId: number) => {
    try {
      await apiFetch(`/exams/${examId}/publish`, { method: 'POST' });
      fetchExams();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleClose = async (examId: number) => {
    try {
      await apiFetch(`/exams/${examId}/close`, { method: 'POST' });
      fetchExams();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getStatusBadge = (status: ExamStatus) => {
    switch (status) {
      case 'PUBLISHED':
        return (
          <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 w-fit">
            <CheckCircle2 className="w-3.5 h-3.5" /> منشور ونشط
          </span>
        );
      case 'CLOSED':
        return (
          <span className="bg-rose-500/10 border border-rose-500/30 text-rose-400 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 w-fit">
            <XCircle className="w-3.5 h-3.5" /> مغلق
          </span>
        );
      default:
        return (
          <span className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 w-fit">
            <Clock className="w-3.5 h-3.5" /> مسودة (غير منشور)
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">إدارة الامتحانات</h2>
          <p className="text-slate-400 text-sm mt-1">إنشاء، تعديل، ونشر الاختبارات التفاعلية للواتساب</p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 transition text-sm"
        >
          <Plus className="w-5 h-5" />
          <span>إنشاء امتحان جديد</span>
        </button>
      </div>

      {/* Filter Header */}
      <div className="flex items-center gap-3 bg-slate-800/60 p-2 rounded-2xl border border-slate-700/60 w-fit">
        <button
          onClick={() => setStatusFilter('')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            statusFilter === '' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          الكل
        </button>
        <button
          onClick={() => setStatusFilter('PUBLISHED')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            statusFilter === 'PUBLISHED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          النشطة فقط
        </button>
        <button
          onClick={() => setStatusFilter('DRAFT')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            statusFilter === 'DRAFT' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          المسودات
        </button>
        <button
          onClick={() => setStatusFilter('CLOSED')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            statusFilter === 'CLOSED' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          المغلقة
        </button>
      </div>

      {/* Exams Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">جاري تحميل الامتحانات...</div>
      ) : exams.length === 0 ? (
        <div className="bg-slate-800/30 border border-slate-700/60 rounded-3xl p-12 text-center">
          <Layers className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-300">لا يوجد امتحانات مطابقة</h3>
          <p className="text-slate-500 text-sm mt-1">ابدأ بإنشاء أول امتحان وتخصيص أسئلته للواتساب.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="bg-slate-800/60 border border-slate-700/60 rounded-3xl p-6 flex flex-col justify-between hover:border-slate-600 transition"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  {getStatusBadge(exam.status)}
                  <span className="text-xs font-semibold text-slate-500 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-700">
                    ID: #{exam.id}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white mb-2">{exam.title}</h3>
                <p className="text-slate-400 text-sm line-clamp-2 mb-4">{exam.description || 'بدون وصف'}</p>

                <div className="grid grid-cols-2 gap-3 mb-6 bg-slate-900/40 p-3.5 rounded-2xl border border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-500 block">مدة الامتحان:</span>
                    <span className="text-slate-200 font-bold">{Math.round(exam.duration_seconds / 60)} دقيقة</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">الأسئلة المضافة:</span>
                    <span className="text-slate-200 font-bold">{exam.total_questions_count} أسئلة</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">المحاولات:</span>
                    <span className="text-slate-200 font-bold">{exam.total_attempts_count} طالب</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">محاولة واحدة:</span>
                    <span className="text-slate-200 font-bold">{exam.one_attempt_only ? 'مفعل' : 'غير مفعل'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-slate-700/60">
                <button
                  onClick={() => navigate(`/exams/${exam.id}`)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>تعديل الأسئلة</span>
                </button>

                {exam.status === 'DRAFT' && (
                  <button
                    onClick={() => handlePublish(exam.id)}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-3 py-2 rounded-xl text-xs flex items-center gap-1 transition"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>نشر الآن</span>
                  </button>
                )}

                {exam.status === 'PUBLISHED' && (
                  <button
                    onClick={() => handleClose(exam.id)}
                    className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 px-3 py-2 rounded-xl text-xs flex items-center gap-1 transition"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>إغلاق</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Exam Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-xl shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">إنشاء امتحان جديد</h3>

            {createError && (
              <div className="mb-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-xl text-xs">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateExam} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium text-slate-300 mb-1">عنوان الامتحان *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: امتحان الرياضيات والذكاء العام"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">الوصف</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="وصف مختصر للطلاب..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 h-20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">مدة الامتحان (بالدقائق)</label>
                  <input
                    type="number"
                    min="1"
                    value={durationMins}
                    onChange={(e) => setDurationMins(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">عدد الأسئلة في المحاولة</label>
                  <input
                    type="number"
                    min="1"
                    value={numberOfQuestions}
                    onChange={(e) => setNumberOfQuestions(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={randomizeQuestions}
                    onChange={(e) => setRandomizeQuestions(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-800 border-slate-700"
                  />
                  <span className="text-slate-300">عشوائية ترتيب الأسئلة لكل طالب</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={randomizeOptions}
                    onChange={(e) => setRandomizeOptions(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-800 border-slate-700"
                  />
                  <span className="text-slate-300">عشوائية ترتيب خيارات الإجابة</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={oneAttemptOnly}
                    onChange={(e) => setOneAttemptOnly(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-800 border-slate-700"
                  />
                  <span className="text-slate-300">محاولة واحدة فقط لكل رقم واتساب</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showCorrectImmediately}
                    onChange={(e) => setShowCorrectImmediately(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-800 border-slate-700"
                  />
                  <span className="text-slate-300">إظهار الإجابة الصحيحة فورًا بعد كل سؤال</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium px-4 py-2 rounded-xl transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-2 rounded-xl transition shadow-lg shadow-emerald-500/20"
                >
                  حفظ والمتابعة للأسئلة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
