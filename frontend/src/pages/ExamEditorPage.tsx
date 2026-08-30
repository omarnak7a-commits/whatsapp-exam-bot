import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { ArrowRight, Plus, Trash2, CheckCircle2, Save, GripVertical, Copy, Eye, Share2, Link2, Clock, FileText, Users, Settings, AlertCircle, ArrowUp, ArrowDown, QrCode, Zap, Trophy } from 'lucide-react';
import { Toggle } from '../components/ui/Toggle';
import { ShareModal } from '../components/exam/ShareModal';
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
  question_type?: 'multiple_choice' | 'true_false';
  options: Option[];
}

interface ExamDetail {
  id: number;
  title: string;
  description?: string;
  public_slug?: string;
  duration_minutes: number;
  status: string;
  instant_feedback_enabled?: boolean;
  show_correct_answers?: boolean;
  leaderboard_enabled?: boolean;
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
  const [editInstantFeedback, setEditInstantFeedback] = useState(false);
  const [editShowCorrect, setEditShowCorrect] = useState(true);
  const [editLeaderboard, setEditLeaderboard] = useState(true);
  const [savingExam, setSavingExam] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Add question
  const [showAddModal, setShowAddModal] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [questionPoints, setQuestionPoints] = useState(1);
  const [options, setOptions] = useState<Option[]>([
    { text: '', is_correct: true, order_index: 0 },
    { text: '', is_correct: false, order_index: 1 },
  ]);
  const [formError, setFormError] = useState<string | null>(null);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [justPublished, setJustPublished] = useState(false);
  const [questionType, setQuestionType] = useState<'multiple_choice' | 'true_false'>('multiple_choice');
  const [tfCorrect, setTfCorrect] = useState<'صح' | 'غلط'>('صح');

  const fetchExam = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<ExamDetail>(`/exams/${examId}`);
      setExam(data);
      setEditTitle(data.title);
      setEditDesc(data.description || '');
      setEditDuration(data.duration_minutes);
      setEditInstantFeedback(Boolean(data.instant_feedback_enabled));
      setEditShowCorrect(data.show_correct_answers !== false);
      setEditLeaderboard(data.leaderboard_enabled !== false);
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
          instant_feedback_enabled: editInstantFeedback,
          show_correct_answers: editShowCorrect,
          leaderboard_enabled: editLeaderboard,
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
    let payloadOptions: { text: string; is_correct: boolean; order_index: number }[];

    if (questionType === 'true_false') {
      // True/False questions always use the fixed صح / غلط options.
      payloadOptions = [
        { text: 'صح', is_correct: tfCorrect === 'صح', order_index: 0 },
        { text: 'غلط', is_correct: tfCorrect === 'غلط', order_index: 1 },
      ];
    } else {
      const filledOptions = options.filter(o => o.text.trim() !== '');
      if (filledOptions.length < 2) {
        setFormError('يجب تعبئة خيارين على الأقل');
        return;
      }
      if (filledOptions.length > 4) {
        setFormError('الحد الأقصى للاختيارات هو 4');
        return;
      }
      const correctCount = filledOptions.filter(o => o.is_correct).length;
      if (correctCount !== 1) {
        setFormError('يجب تحديد إجابة صحيحة واحدة');
        return;
      }
      payloadOptions = filledOptions.map((o, idx) => ({
        text: o.text,
        is_correct: o.is_correct,
        order_index: idx,
      }));
    }

    setSavingQuestion(true);
    try {
      await apiFetch(`/exams/${examId}/questions`, {
        method: 'POST',
        body: JSON.stringify({
          text: questionText,
          points: questionPoints,
          question_type: questionType,
          order_index: (exam?.questions.length || 0) + 1,
          options: payloadOptions,
        }),
      });

      setQuestionText('');
      setQuestionPoints(1);
      setQuestionType('multiple_choice');
      setTfCorrect('صح');
      setOptions([
        { text: '', is_correct: true, order_index: 0 },
        { text: '', is_correct: false, order_index: 1 },
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

  const handleMoveQuestion = async (index: number, direction: -1 | 1) => {
    if (!exam) return;
    const ordered = [...exam.questions].sort((a, b) => a.order_index - b.order_index);
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    try {
      await apiFetch(`/exams/${exam.id}/questions/reorder`, {
        method: 'POST',
        body: JSON.stringify({ ordered_ids: ordered.map(q => q.id) }),
      });
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
          className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 truncate">{exam.title}</h1>
            <Badge variant={exam.status === 'PUBLISHED' ? 'success' : exam.status === 'DRAFT' ? 'warning' : 'danger'}>
              {exam.status === 'PUBLISHED' ? 'منشور' : exam.status === 'DRAFT' ? 'مسودة' : 'مغلق'}
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
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
      <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit">
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
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="bg-slate-100 text-xs px-2 py-0.5 rounded-full">{tab.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Questions Tab */}
      {activeTab === 'questions' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-slate-900 text-lg">أسئلة الامتحان</h2>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="w-5 h-5 ml-2" />
              إضافة سؤال
            </Button>
          </div>

          {exam.questions.length === 0 ? (
            <Card className="text-center py-16 border-dashed border-2">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="font-black text-slate-900 text-lg">لسه مفيش أسئلة</h3>
              <p className="text-slate-500 text-sm mt-2 max-w-sm mx-auto">ابدأ بإضافة أسئلة للامتحان. كل سؤال لازم يكون له على الأقل خيارين وإجابة صحيحة واحدة</p>
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
                        <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
                          <GripVertical className="w-4 h-4 text-slate-400" />
                        </div>
                        <span className="w-8 h-8 rounded-xl bg-brand-50 border border-brand-200/50 text-brand-700 font-black flex items-center justify-center text-sm">
                          {idx + 1}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <h4 className="font-bold text-slate-900 leading-relaxed">{q.text}</h4>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Badge variant={q.question_type === 'true_false' ? 'success' : 'brand'} size="sm">
                              {q.question_type === 'true_false' ? 'صح أو غلط' : 'اختيار من متعدد'}
                            </Badge>
                            <Badge variant="brand" size="sm">{q.points} نقطة</Badge>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-3">
                          {q.options.map((opt) => (
                            <div
                              key={opt.id}
                              className={`p-3 rounded-2xl border-2 text-sm font-bold flex items-center justify-between ${
                                opt.is_correct
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                  : 'bg-slate-50 border-slate-200 text-slate-700'
                              }`}
                            >
                              <span>{opt.text}</span>
                              {opt.is_correct && <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex md:flex-col gap-1">
                        <button
                          onClick={() => handleMoveQuestion(idx, -1)}
                          disabled={idx === 0}
                          className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 disabled:opacity-40 flex items-center justify-center transition-colors"
                          title="تحريك لأعلى"
                          aria-label="تحريك السؤال لأعلى"
                        >
                          <ArrowUp className="w-4 h-4 text-slate-600" />
                        </button>
                        <button
                          onClick={() => handleMoveQuestion(idx, 1)}
                          disabled={idx === exam.questions.length - 1}
                          className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 disabled:opacity-40 flex items-center justify-center transition-colors"
                          title="تحريك لأسفل"
                          aria-label="تحريك السؤال لأسفل"
                        >
                          <ArrowDown className="w-4 h-4 text-slate-600" />
                        </button>
                        <button
                          onClick={() => handleDuplicateQuestion(q.id)}
                          className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center transition-colors"
                          title="نسخ"
                        >
                          <Copy className="w-4 h-4 text-slate-600" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="w-9 h-9 rounded-xl bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
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
          <h3 className="font-black text-slate-900 text-lg mb-6">إعدادات الامتحان</h3>
          
          <div className="space-y-6 max-w-2xl">
            <div>
              <label className="block text-sm font-black text-slate-700 mb-2">عنوان الامتحان</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="مثال: امتحان الرياضيات النهائي"
              />
            </div>

            <div>
              <label className="block text-sm font-black text-slate-700 mb-2">الوصف</label>
              <Textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="وصف مختصر عن الامتحان..."
                rows={4}
              />
            </div>

            <div>
              <label className="block text-sm font-black text-slate-700 mb-2">مدة الامتحان (بالدقائق)</label>
              <Input
                type="number"
                min={1}
                max={180}
                value={editDuration}
                onChange={(e) => setEditDuration(parseInt(e.target.value) || 20)}
              />
              <p className="text-xs text-slate-500 mt-2">من 1 إلى 180 دقيقة</p>
            </div>

            <div>
              <label className="block text-sm font-black text-slate-700 mb-2">إعدادات تجربة الطالب</label>
              <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 px-5">
                <Toggle
                  checked={editInstantFeedback}
                  onChange={setEditInstantFeedback}
                  label="التصحيح الفوري"
                  description="الطالب يعرف فوراً بعد كل إجابة إذا كانت صحيحة أم خاطئة"
                  icon={<Zap className="w-5 h-5" />}
                />
                <Toggle
                  checked={editShowCorrect}
                  onChange={setEditShowCorrect}
                  label="إظهار الإجابات الصحيحة"
                  description="عرض الإجابات الصحيحة في صفحة النتيجة بعد انتهاء الامتحان"
                  icon={<Eye className="w-5 h-5" />}
                />
                <Toggle
                  checked={editLeaderboard}
                  onChange={setEditLeaderboard}
                  label="لوحة الترتيب (Leaderboard)"
                  description="الطلاب يقدروا يشوفوا ترتيبهم مقارنة بباقي الزملاء"
                  icon={<Trophy className="w-5 h-5" />}
                />
              </div>
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
              <h3 className="font-black text-slate-900">الامتحان لسه مش منشور</h3>
              <p className="text-sm text-slate-500 mt-2">لازم تنشر الامتحان الأول عشان تقدر تشارك الرابط</p>
              <Button onClick={handlePublish} className="mt-6">نشر الامتحان الآن</Button>
            </Card>
          ) : (
            <>
              {justPublished && (
                <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black text-emerald-800 text-sm">تم نشر الامتحان! 🎉</p>
                    <p className="text-xs font-bold text-emerald-700 mt-1">
                      الرابط اللي تحت شغال دلوقتي — انسخه وشاركه مع الطلاب في الواتساب
                    </p>
                  </div>
                </div>
              )}

              <Card className="border-2 border-brand-100">
                <h3 className="font-black text-slate-900 text-lg mb-2 flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-brand-600" />
                  رابط الامتحان
                </h3>
                <p className="text-sm text-slate-500 mb-6">شارك الرابط ده مع الطلاب عشان يبدأوا الامتحان</p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-500 tracking-wide mb-1">رابط الامتحان العام (لينك حقيقي جاهز)</p>
                    <input
                      type="text"
                      readOnly
                      dir="ltr"
                      value={examLink(exam.public_slug) || ''}
                      onFocus={(e) => e.target.select()}
                      className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 font-mono text-sm font-bold text-slate-900 focus:outline-none focus:border-brand-500 select-all"
                    />
                  </div>
                  <Button onClick={copyLink} size="sm" className="sm:self-end sm:shrink-0">
                    <Copy className="w-4 h-4 ml-2" />
                    نسخ الرابط
                  </Button>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mt-6">
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
                    <Clock className="w-8 h-8 text-brand-600 mx-auto mb-2" />
                    <p className="font-black text-slate-900">{exam.duration_minutes} دقيقة</p>
                    <p className="text-xs text-slate-500">المدة</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
                    <FileText className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                    <p className="font-black text-slate-900">{exam.questions.length} سؤال</p>
                    <p className="text-xs text-slate-500">عدد الأسئلة</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
                    <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <p className="font-black text-slate-900">{exam.total_attempts_count} مشارك</p>
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

                <div className="flex gap-3 mt-3">
                  <Button variant="secondary" fullWidth onClick={() => setShowShareModal(true)}>
                    <QrCode className="w-4 h-4 ml-2" />
                    عرض QR Code للمشاركة
                  </Button>
                </div>
              </Card>

              <Card>
                <h4 className="font-black text-slate-900 mb-3">نصائح للمشاركة</h4>
                <ul className="space-y-2 text-sm text-slate-600">
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
              <h3 className="font-black text-slate-900 text-xl">إضافة سؤال جديد</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-2xl text-sm font-bold flex gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddQuestion} className="space-y-5">
              <div>
                <label className="block text-sm font-black text-slate-700 mb-2">نوع السؤال</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setQuestionType('multiple_choice')}
                    className={`p-4 rounded-2xl border-2 font-black text-sm transition-all ${
                      questionType === 'multiple_choice'
                        ? 'bg-brand-600 border-brand-600 text-white shadow-brand'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    اختيار من متعدد
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuestionType('true_false')}
                    className={`p-4 rounded-2xl border-2 font-black text-sm transition-all ${
                      questionType === 'true_false'
                        ? 'bg-brand-600 border-brand-600 text-white shadow-brand'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    صح أو غلط
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-black text-slate-700 mb-2">نص السؤال</label>
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
                  <label className="block text-sm font-black text-slate-700 mb-2">النقاط</label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={questionPoints}
                    onChange={(e) => setQuestionPoints(parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>

              {questionType === 'true_false' ? (
                <div>
                  <label className="block text-sm font-black text-slate-700 mb-3">الإجابة الصحيحة</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['صح', 'غلط'] as const).map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setTfCorrect(val)}
                        className={`p-5 rounded-2xl border-2 font-black text-lg transition-all flex items-center justify-center gap-2 ${
                          tfCorrect === val
                            ? val === 'صح'
                              ? 'bg-accent-50 border-accent-500 text-accent-600'
                              : 'bg-red-50 border-red-500 text-red-600'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {val === 'صح' ? '✅ صح' : '❌ غلط'}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">النظام هيعمل الخيارين (صح / غلط) تلقائياً</p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-black text-slate-700 mb-3">الاختيارات (اختر الإجابة الصحيحة)</label>
                  <div className="space-y-3">
                    {options.map((opt, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <button
                          type="button"
                          onClick={() => {
                            const newOpts = options.map((o, i) => ({ ...o, is_correct: i === idx }));
                            setOptions(newOpts);
                          }}
                          aria-label={`تحديد الاختيار ${idx + 1} كإجابة صحيحة`}
                          className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            opt.is_correct
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-slate-200 hover:border-slate-300'
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
                          className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 transition-all"
                        />
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            aria-label="تحديد لأعلى"
                            onClick={() => {
                              const newOpts = [...options];
                              [newOpts[idx - 1], newOpts[idx]] = [newOpts[idx], newOpts[idx - 1]];
                              setOptions(newOpts);
                            }}
                            className="w-7 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 flex items-center justify-center"
                          >
                            <ArrowUp className="w-3 h-3 text-slate-600" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === options.length - 1}
                            aria-label="تحديد لأسفل"
                            onClick={() => {
                              const newOpts = [...options];
                              [newOpts[idx + 1], newOpts[idx]] = [newOpts[idx], newOpts[idx + 1]];
                              setOptions(newOpts);
                            }}
                            className="w-7 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 flex items-center justify-center"
                          >
                            <ArrowDown className="w-3 h-3 text-slate-600" />
                          </button>
                        </div>
                        <button
                          type="button"
                          disabled={options.length <= 2}
                          aria-label="حذف الاختيار"
                          onClick={() => {
                            const newOpts = options.filter((_, i) => i !== idx);
                            if (newOpts.every(o => !o.is_correct)) newOpts[0] = { ...newOpts[0], is_correct: true };
                            setOptions(newOpts);
                          }}
                          className="w-9 h-9 rounded-xl bg-red-50 hover:bg-red-100 disabled:opacity-40 flex items-center justify-center flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={options.length >= 4}
                      onClick={() => setOptions([...options, { text: '', is_correct: false, order_index: options.length }])}
                    >
                      <Plus className="w-4 h-4 ml-1" />
                      إضافة اختيار
                    </Button>
                    <span className="text-xs font-bold text-slate-500">{options.length} / 4 اختيارات</span>
                  </div>
                </div>
              )}

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

      {/* Share / QR modal */}
      {showShareModal && (
        <ShareModal slug={exam.public_slug} title={exam.title} onClose={() => setShowShareModal(false)} />
      )}
    </div>
  );
};
