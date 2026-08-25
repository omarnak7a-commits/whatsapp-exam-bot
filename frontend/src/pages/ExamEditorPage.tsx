import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { ExamDetail, Question, Option } from '../types';
import { ArrowRight, Plus, Trash2, CheckCircle2, Save, HelpCircle } from 'lucide-react';

export const ExamEditorPage: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // New Question Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState<Option[]>([
    { option_text: '', is_correct: true },
    { option_text: '', is_correct: false },
    { option_text: '', is_correct: false },
    { option_text: '', is_correct: false },
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  const navigate = useNavigate();

  const fetchExamDetail = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<ExamDetail>(`/exams/${examId}`);
      setExam(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (examId) fetchExamDetail();
  }, [examId]);

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!questionText.trim()) {
      setFormError('نص السؤال مطلوب');
      return;
    }
    const filledOptions = options.filter((o) => o.option_text.trim() !== '');
    if (filledOptions.length < 2) {
      setFormError('يجب تعبئة خيارين على الأقل');
      return;
    }
    const correctCount = filledOptions.filter((o) => o.is_correct).length;
    if (correctCount !== 1) {
      setFormError('يجب تحديد خيار صح واحد بالضبط');
      return;
    }

    try {
      await apiFetch(`/exams/${examId}/questions`, {
        method: 'POST',
        body: JSON.stringify({
          question_text: questionText,
          order_index: (exam?.questions.length || 0) + 1,
          options: filledOptions,
        }),
      });

      // Reset Form
      setQuestionText('');
      setOptions([
        { option_text: '', is_correct: true },
        { option_text: '', is_correct: false },
        { option_text: '', is_correct: false },
        { option_text: '', is_correct: false },
      ]);
      setShowAddModal(false);
      fetchExamDetail();
    } catch (err: any) {
      setFormError(err.message || 'فشل إضافة السؤال');
    }
  };

  const handleDeleteQuestion = async (questionId: number) => {
    if (!window.confirm('هل أنت تأكد من حذف هذا السؤال؟')) return;
    try {
      await apiFetch(`/questions/${questionId}`, { method: 'DELETE' });
      fetchExamDetail();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOptionTextChange = (index: number, text: string) => {
    const updated = [...options];
    updated[index].option_text = text;
    setOptions(updated);
  };

  const handleSetCorrectOption = (index: number) => {
    const updated = options.map((opt, i) => ({
      ...opt,
      is_correct: i === index,
    }));
    setOptions(updated);
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-400">جاري تحميل بيانات الامتحان...</div>;
  }

  if (!exam) {
    return <div className="text-center py-12 text-rose-400">الامتحان غير موجود</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/exams')}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white">{exam.title}</h2>
            <p className="text-slate-400 text-sm mt-1">إدارة وبناء الأسئلة التفاعلية للواتساب</p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 transition text-sm"
        >
          <Plus className="w-5 h-5" />
          <span>إضافة سؤال جديد</span>
        </button>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {exam.questions.length === 0 ? (
          <div className="bg-slate-800/30 border border-slate-700/60 rounded-3xl p-12 text-center">
            <HelpCircle className="w-12 h-12 text-slate-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-300">لم يتم إضافة أسئلة بعد</h3>
            <p className="text-slate-500 text-sm mt-1">اضغط على "إضافة سؤال جديد" لبدء إضافة أسئلة هذا الامتحان.</p>
          </div>
        ) : (
          exam.questions.map((q, idx) => (
            <div
              key={q.id}
              className="bg-slate-800/60 border border-slate-700/60 rounded-3xl p-6 relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold flex items-center justify-center text-sm flex-shrink-0">
                    {idx + 1}
                  </span>
                  <h4 className="text-lg font-bold text-white leading-relaxed">{q.question_text}</h4>
                </div>

                <button
                  onClick={() => handleDeleteQuestion(q.id)}
                  className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
                  title="حذف السؤال"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              {/* Options Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-11">
                {q.options.map((opt) => (
                  <div
                    key={opt.id}
                    className={`p-3.5 rounded-2xl border text-sm font-medium flex items-center justify-between ${
                      opt.is_correct
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-900/40 border-slate-800 text-slate-300'
                    }`}
                  >
                    <span>{opt.option_text}</span>
                    {opt.is_correct && (
                      <span className="flex items-center gap-1 text-xs bg-emerald-500/20 px-2 py-0.5 rounded-md text-emerald-400 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> الإجابة الصحيحة
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Question Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">إضافة سؤال جديد</h3>

            {formError && (
              <div className="mb-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-xl text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddQuestion} className="space-y-5 text-sm">
              <div>
                <label className="block font-medium text-slate-300 mb-1">نص السؤال *</label>
                <textarea
                  required
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="اكتب السؤال هنا..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 h-24"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-2">
                  خيارات الإجابة (حدد الإجابة الصحيحة بالضغط على الدائرة):
                </label>
                <div className="space-y-3">
                  {options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="correct_option"
                        checked={opt.is_correct}
                        onChange={() => handleSetCorrectOption(i)}
                        className="w-5 h-5 text-emerald-500 focus:ring-emerald-500 bg-slate-800 border-slate-700 cursor-pointer"
                      />
                      <input
                        type="text"
                        required={i < 2}
                        value={opt.option_text}
                        onChange={(e) => handleOptionTextChange(i, e.target.value)}
                        placeholder={`الخيار ${i + 1}`}
                        className={`flex-1 bg-slate-800 border rounded-xl px-4 py-2.5 text-white focus:outline-none ${
                          opt.is_correct ? 'border-emerald-500/60 ring-1 ring-emerald-500/30' : 'border-slate-700'
                        }`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium px-4 py-2 rounded-xl transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-2 rounded-xl transition shadow-lg shadow-emerald-500/20"
                >
                  حفظ السؤال
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
