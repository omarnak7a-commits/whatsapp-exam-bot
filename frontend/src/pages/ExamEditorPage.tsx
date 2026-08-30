import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { ArrowRight, Plus, Trash2, CheckCircle2, Save, GripVertical, Copy, Eye, Share2, Link2, Clock, FileText, Users, Settings, AlertCircle } from 'lucide-react';
import { examLink, copyExamLink } from '../utils/examLink';

interface Option {
  id?: number;
  text: string;
  is_correct: boolean;
  order_index: number;
}

interface Question {
  id: number;
  text: string;
  order_index: number;
  points: number;
  options: Option[];
}

interface ExamDetail {
  id: number;
  title: string;
  description?: string;
  public_slug?: string;
  duration_minutes: number;
  status: string;
  questions: Question[];
  total_attempts_count: number;
}

export const ExamEditorPage: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'questions' | 'settings' | 'share'>('questions');
  
  // Edit exam
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editDuration, setEditDuration] = useState(20);
  const [savingExam, setSavingExam] = useState(false);

  // Add question
  const [showAddModal, setShowAddModal] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [questionPoints, setQuestionPoints] = useState(1);
  const [options, setOptions] = useState<Option[]>([
    { text: '', is_correct: true, order_index: 0 },
    { text: '', is_correct: false, order_index: 1 },
    { text: '', is_correct: false, order_index: 2 },
    { text: '', is_correct: false, order_index: 3 },
  ]);
  const [formError, setFormError] = useState<string | null>(null);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [justPublished, setJustPublished] = useState(false);

  const fetchExam = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<ExamDetail>(`/exams/${examId}`);
      setExam(data);
      setEditTitle(data.title);
      setEditDesc(data.description || '');
      setEditDuration(data.duration_minutes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExam();
  }, [examId]);

  const handleSaveExam = async () => {
    if (!editTitle.trim()) return;
    setSavingExam(true);
    try {
      await apiFetch(`/exams/${examId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: editTitle,
          description: editDesc,
          duration_minutes: editDuration,
        }),
      });
      fetchExam();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingExam(false);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!questionText.trim()) {
      setFormError('نص السؤال مطلوب');
      return;
    }
    const filledOptions = options.filter(o => o.text.trim() !== '');
    if (filledOptions.length < 2) {
      setFormError('يجب تعبئة خيارين على الأقل');
      return;
    }
    const correctCount = filledOptions.filter(o => o.is_correct).length;
    if (correctCount !== 1) {
      setFormError('يجب تحديد إجابة صحيحة واحدة');
      return;
    }

    setSavingQuestion(true);
    try {
      await apiFetch(`/exams/${examId}/questions`, {
        method: 'POST',
        body: JSON.stringify({
          text: questionText,
          points: questionPoints,
          order_index: (exam?.questions.length || 0) + 1,
          options: filledOptions.map((o, idx) => ({
            text: o.text,
            is_correct: o.is_correct,
            order_index: idx,
          })),
        }),
      });

      setQuestionText('');
      setQuestionPoints(1);
      setOptions([
        { text: '', is_correct: true, order_index: 0 },
        { text: '', is_correct: false, order_index: 1 },
        { text: '', is_correct: false, order_index: 2 },
        { text: '', is_correct: false, order_index: 3 },
      ]);
      setShowAddModal(false);
      fetchExam();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (questionId: number) => {
    if (!confirm('متأكد عايز تحذف السؤال ده؟')) return;
    try {
      await apiFetch(`/questions/${questionId}`, { method: 'DELETE' });
      fetchExam();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDuplicateQuestion = async (questionId: number) => {
    try {
      await apiFetch(`/questions/${questionId}/duplicate`, { method: 'POST' });
      fetchExam();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePublish = async () => {
    try {
      await apiFetch(`/exams/${examId}/publish`, { method: 'POST' });
      const fresh = await apiFetch<ExamDetail>(`/exams/${examId}`);
      setExam(fresh);
      // Reveal the share tab immediately so the real link shows up
      setActiveTab('share');
      setJustPublished(true);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleClose = async () => {
    try {
      await apiFetch(`/exams/${examId}/close`, { method: 'POST' });
      fetchExam();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const copyLink = () => {
    if (!exam?.public_slug) return;
    copyExamLink(exam.public_slug);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">الامتحان غير موجود</p>
        <Link to="/admin/exams" className="mt-4 inline-block">
          <Button>العودة للامتحانات</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/admin/exams')}
          className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white truncate">{exam.title}</h1>
            <Badge variant={exam.status === 'PUBLISHED' ? 'success' : exam.status === 'DRAFT' ? 'warning' : 'danger'}>
              {exam.status === 'PUBLISHED' ? 'منشور' : exam.status === 'DRAFT' ? 'مسودة' : 'مغلق'}
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {exam.questions.length} سؤال • {exam.duration_minutes} دقيقة • {exam.total_attempts_count} مشارك
          </p>
        </div>
        <div className="flex gap-2">
          {exam.status === 'DRAFT' && (
            <Button onClick={handlePublish}>نشر الامتحان</Button>
          )}
          {exam.status === 'PUBLISHED' && (
            <>
              <Link to={`/exam/${exam.public_slug}`} target="_blank">
                <Button variant="secondary">
                  <Eye className="w-4 h-4 ml-2" />
                  عرض
                </Button>
              </Link>
              <Button variant="secondary" onClick={handleClose}>إغلاق</Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl w-fit">
        {[
          { id: 'questions', label: 'الأسئلة', icon: FileText, count: exam.questions.length },
          { id: 'settings', label: 'الإعدادات', icon: Settings },
          { id: 'share', label: 'المشاركة', icon: Share2 },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                if (tab.id !== 'share') setJustPublished(false);
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="bg-slate-100 dark:bg-slate-600 text-xs px-2 py-0.5 rounded-full">{tab.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Questions Tab */}
      {activeTab === 'questions' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-slate-900 dark:text-white text-lg">أسئلة الامتحان</h2>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="w-5 h-5 ml-2" />
              إضافة سؤال
            </Button>
          </div>

          {exam.questions.length === 0 ? (
            <Card className="text-center py-16 border-dashed border-2">
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="font-black text-slate-900 dark:text-white text-lg">لسه مفيش أسئلة</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 max-w-sm mx-auto">ابدأ بإضافة أسئلة للامتحان. كل سؤال لازم يكون له على الأقل خيارين وإجابة صحيحة واحدة</p>
              <Button onClick={() => setShowAddModal(true)} className="mt-6">
                <Plus className="w-5 h-5 ml-2" />
                إضافة أول سؤال
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {exam.questions
                .sort((a, b) => a.order_index - b.order_index)
                .map((q, idx) => (
                  <Card key={q.id} className="group">
                    <div className="flex gap-4">
                      <div className="hidden md:flex flex-col items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <GripVertical className="w-4 h-4 text-slate-400" />
                        </div>
                        <span className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-950/50 border border-brand-200/50 dark:border-brand-800/30 text-brand-700 dark:text-brand-300 font-black flex items-center justify-center text-sm">
                          {idx + 1}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <h4 className="font-bold text-slate-900 dark:text-white leading-relaxed">{q.text}</h4>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Badge variant="brand" size="sm">{q.points} نقطة</Badge>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-3">
                          {q.options.map((opt) => (
                            <div
                              key={opt.id}
                              className={`p-3 rounded-2xl border-2 text-sm font-bold flex items-center justify-between ${
                                opt.is_correct
                                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-200'
                                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <span>{opt.text}</span>
                              {opt.is_correct && <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex md:flex-col gap-1">
                        <button
                          onClick={() => handleDuplicateQuestion(q.id)}
                          className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
                          title="نسخ"
                        >
                          <Copy className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center justify-center transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <Card>
          <h3 className="font-black text-slate-900 dark:text-white text-lg mb-6">إعدادات الامتحان</h3>
          
          <div className="space-y-6 max-w-2xl">
            <div>
              <label className="block text-sm font-black text-slate-700 dark:text-slate-200 mb-2">عنوان الامتحان</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="مثال: امتحان الرياضيات النهائي"
              />
            </div>

            <div>
              <label className="block text-sm font-black text-slate-700 dark:text-slate-200 mb-2">الوصف</label>
              <Textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="وصف مختصر عن الامتحان..."
                rows={4}
              />
            </div>

            <div>
              <label className="block text-sm font-black text-slate-700 dark:text-slate-200 mb-2">مدة الامتحان (بالدقائق)</label>
              <Input
                type="number"
                min={1}
                max={180}
                value={editDuration}
                onChange={(e) => setEditDuration(parseInt(e.target.value) || 20)}
              />
              <p className="text-xs text-slate-500 mt-2">من 1 إلى 180 دقيقة</p>
            </div>

            <Button onClick={handleSaveExam} loading={savingExam}>
              <Save className="w-4 h-4 ml-2" />
              حفظ التغييرات
            </Button>
          </div>
        </Card>
      )}

      {/* Share Tab */}
      {activeTab === 'share' && (
        <div className="space-y-6">
          {exam.status !== 'PUBLISHED' ? (
            <Card className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <h3 className="font-black text-slate-900 dark:text-white">الامتحان لسه مش منشور</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">لازم تنشر الامتحان الأول عشان تقدر تشارك الرابط</p>
              <Button onClick={handlePublish} className="mt-6">نشر الامتحان الآن</Button>
            </Card>
          ) : (
            <>
              {justPublished && (
                <div className="flex items-start gap-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl p-4">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black text-emerald-800 dark:text-emerald-300 text-sm">تم نشر الامتحان! 🎉</p>
                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                      الرابط اللي تحت شغال دلوقتي — انسخه وشاركه مع الطلاب في الواتساب
                    </p>
                  </div>
                </div>
              )}

              <Card className="border-2 border-brand-100 dark:border-brand-900/50">
                <h3 className="font-black text-slate-900 dark:text-white text-lg mb-2 flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-brand-600" />
                  رابط الامتحان
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">شارك الرابط ده مع الطلاب عشان يبدأوا الامتحان</p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-500 dark:text-slate-400 tracking-wide mb-1">رابط الامتحان العام (لينك حقيقي جاهز)</p>
                    <input
                      type="text"
                      readOnly
                      dir="ltr"
                      value={examLink(exam.public_slug) || ''}
                      onFocus={(e) => e.target.select()}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 font-mono text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 select-all"
                    />
                  </div>
                  <Button onClick={copyLink} size="sm" className="sm:self-end sm:shrink-0">
                    <Copy className="w-4 h-4 ml-2" />
                    نسخ الرابط
                  </Button>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mt-6">
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-center">
                    <Clock className="w-8 h-8 text-brand-600 mx-auto mb-2" />
                    <p className="font-black text-slate-900 dark:text-white">{exam.duration_minutes} دقيقة</p>
                    <p className="text-xs text-slate-500">المدة</p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-center">
                    <FileText className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                    <p className="font-black text-slate-900 dark:text-white">{exam.questions.length} سؤال</p>
                    <p className="text-xs text-slate-500">عدد الأسئلة</p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-center">
                    <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <p className="font-black text-slate-900 dark:text-white">{exam.total_attempts_count} مشارك</p>
                    <p className="text-xs text-slate-500">إجمالي المشاركين</p>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <Link to={`/exam/${exam.public_slug}`} target="_blank" className="flex-1">
                    <Button variant="secondary" fullWidth>
                      <Eye className="w-4 h-4 ml-2" />
                      فتح الامتحان
                    </Button>
                  </Link>
                  <Button fullWidth onClick={copyLink}>
                    <Share2 className="w-4 h-4 ml-2" />
                    نسخ الرابط
                  </Button>
                </div>
              </Card>

              <Card>
                <h4 className="font-black text-slate-900 dark:text-white mb-3">نصائح للمشاركة</h4>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <li className="flex gap-2">
                    <span className="text-brand-600">•</span>
                    <span>شارك الرابط في جروبات الواتساب أو التليجرام</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-brand-600">•</span>
                    <span>الطلاب هيدخلوا اسمهم بس ويبدأوا الامتحان فوراً</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-brand-600">•</span>
                    <span>النتائج هتظهر لحظياً في لوحة التحكم</span>
                  </li>
                </ul>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Add Question Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-slate-900 dark:text-white text-xl">إضافة سؤال جديد</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mb-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 p-3 rounded-2xl text-sm font-bold flex gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddQuestion} className="space-y-5">
              <div>
                <label className="block text-sm font-black text-slate-700 dark:text-slate-200 mb-2">نص السؤال</label>
                <Textarea
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="اكتب نص السؤال هنا..."
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-black text-slate-700 dark:text-slate-200 mb-2">النقاط</label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={questionPoints}
                    onChange={(e) => setQuestionPoints(parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-black text-slate-700 dark:text-slate-200 mb-3">الاختيارات (اختر الإجابة الصحيحة)</label>
                <div className="space-y-3">
                  {options.map((opt, idx) => (
                    <div key={idx} className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          const newOpts = options.map((o, i) => ({ ...o, is_correct: i === idx }));
                          setOptions(newOpts);
                        }}
                        className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          opt.is_correct
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {opt.is_correct && <CheckCircle2 className="w-5 h-5" />}
                      </button>
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => {
                          const newOpts = [...options];
                          newOpts[idx].text = e.target.value;
                          setOptions(newOpts);
                        }}
                        placeholder={`الاختيار ${idx + 1}`}
                        className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 transition-all"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="secondary" fullWidth onClick={() => setShowAddModal(false)}>
                  إلغاء
                </Button>
                <Button type="submit" fullWidth loading={savingQuestion}>
                  <Plus className="w-5 h-5 ml-2" />
                  إضافة السؤال
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
