import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { ArrowRight, Sparkles, Clock, FileText, CheckCircle2, Copy, Link2, ArrowLeft, Zap, Eye, Trophy } from 'lucide-react';
import { examLink, copyExamLink } from '../utils/examLink';
import { Toggle } from '../components/ui/Toggle';

interface CreatedExam {
  id: number;
  title: string;
  public_slug?: string;
}

export const CreateExamPage: React.FC = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(20);
  const [instantFeedback, setInstantFeedback] = useState(false);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(true);
  const [leaderboard, setLeaderboard] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedExam | null>(null);

  // After the exam is created, show the success card briefly (with the real
  // link) and then auto-navigate to the questions editor.
  useEffect(() => {
    if (!created) return;
    const t = setTimeout(() => {
      navigate(`/admin/exams/${created.id}`);
    }, 1500);
    return () => clearTimeout(t);
  }, [created, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Clear, explicit validation before hitting the API.
    if (!title.trim()) {
      setError('عنوان الامتحان مطلوب — اكتب عنوان عشان تقدر تكمّل.');
      return;
    }
    if (!Number.isFinite(duration) || duration < 1 || duration > 180) {
      setError('مدة الامتحان لازم تكون بين 1 و 180 دقيقة.');
      return;
    }

    console.log('[CreateExamPage] Submitting new exam:', {
      title: title.trim(),
      description: description.trim() || null,
      duration_minutes: duration,
    });

    setLoading(true);
    try {
      const exam = await apiFetch<CreatedExam>('/exams', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          duration_minutes: duration,
          instant_feedback_enabled: instantFeedback,
          show_correct_answers: showCorrectAnswers,
          leaderboard_enabled: leaderboard,
        }),
      });
      console.log('[CreateExamPage] Exam created:', exam);
      // Show the real link right away instead of jumping silently to the editor
      setCreated(exam);
    } catch (err: any) {
      console.error('[CreateExamPage] Create failed:', err);
      setError(err?.message || 'حصل خطأ غير متوقع أثناء إنشاء الامتحان');
    } finally {
      setLoading(false);
    }
  };

  const shareUrl = examLink(created?.public_slug);

  // Success step: the exam is created — show the real link + next actions
  if (created) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Link to="/admin/exams" className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900">إنشاء امتحان جديد</h1>
            <p className="text-sm text-slate-500 mt-1">خطوة أخيرة قبل ما تبدأ تضيف الأسئلة</p>
          </div>
        </div>

        <Card className="border-2 border-emerald-200">
          <div className="text-center py-2">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-9 h-9 text-emerald-600" />
            </div>
            <h2 className="text-xl font-black text-slate-900">تم إنشاء الامتحان بنجاح ✅</h2>
            <p className="text-sm text-slate-500 mt-2">
              ده امتحان «{created.title}» — رابط الامتحان الحقيقي جاهز
            </p>
          </div>

          {shareUrl ? (
            <div className="mt-6">
              <label className="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-brand-600" />
                رابط الامتحان (شاركه مع الطلاب)
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  readOnly
                  dir="ltr"
                  value={shareUrl}
                  onFocus={(e) => e.target.select()}
                  className="flex-1 min-w-0 bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3.5 font-mono text-sm font-bold text-slate-900 focus:outline-none focus:border-brand-500 select-all"
                />
                <Button type="button" onClick={() => copyExamLink(created.public_slug)}>
                  <Copy className="w-4 h-4 ml-2" />
                  نسخ الرابط
                </Button>
              </div>
              <div className="mt-4 flex items-start gap-2 bg-amber-50 border border-amber-200/60 rounded-2xl p-4">
                <span className="text-lg leading-none">📌</span>
                <p className="text-xs font-bold text-amber-800 leading-relaxed">
                  الرابط ده هيشتغل للطلاب أول ما تضيف الأسئلة وتنشر الامتحان. لحد كده الامتحان لسه «مسودة».
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-6 text-sm font-bold text-slate-500 text-center">
              الامتحان اتعمل ك«مسودة» — هيظهر الرابط هنا أول ما يتنشر
            </p>
          )}

          <div className="mt-5 text-center">
            <p className="text-sm font-bold text-slate-500">
              هيتم تحويلك لصفحة إضافة الأسئلة تلقائياً خلال لحظات... ⏳
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-6">
            <Button type="button" fullWidth className="flex-[2]" onClick={() => navigate(`/admin/exams/${created.id}`)}>
              متابعة: إضافة الأسئلة
              <ArrowLeft className="w-4 h-4 mr-2" />
            </Button>
            <Link to="/admin/exams" className="flex-1">
              <Button type="button" variant="secondary" fullWidth>
                العودة للامتحانات
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link to="/admin/exams" className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-slate-900">إنشاء امتحان جديد</h1>
          <p className="text-sm text-slate-500 mt-1">ابدأ بإدخال البيانات الأساسية للامتحان</p>
        </div>
      </div>

      <Card className="border-2 border-slate-100">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-brand-600 to-brand-500 rounded-2xl flex items-center justify-center shadow-brand">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-black text-slate-900 text-lg">الخطوة 1: البيانات الأساسية</h2>
            <p className="text-sm text-slate-500">معلومات عامة عن الامتحان</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-sm font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-black text-slate-700 mb-3">عنوان الامتحان *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: امتحان الرياضيات النهائي - الصف الثالث"
              required
              className="text-lg font-bold"
            />
          </div>

          <div>
            <label className="block text-sm font-black text-slate-700 mb-3">الوصف (اختياري)</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتب وصف مختصر عن الامتحان، المواضيع اللي هيغطيها، أو أي تعليمات للطلاب..."
              rows={4}
            />
            <p className="text-xs text-slate-500 mt-2">الوصف هيظهر للطلاب في صفحة البداية</p>
          </div>

          <div>
            <label className="block text-sm font-black text-slate-700 mb-3">مدة الامتحان</label>
            <div className="grid grid-cols-4 gap-3">
              {[10, 15, 20, 30, 45, 60, 90, 120].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDuration(mins)}
                  className={`p-4 rounded-2xl border-2 font-black text-sm transition-all ${
                    duration === mins
                      ? 'bg-brand-600 border-brand-600 text-white shadow-brand'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <Clock className="w-5 h-5 mx-auto mb-1" />
                  {mins} دقيقة
                </button>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="text-sm font-bold text-slate-600">أو مدة مخصصة:</span>
              <input
                type="number"
                min={1}
                max={180}
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 20)}
                className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-center focus:outline-none focus:border-brand-500"
              />
              <span className="text-sm text-slate-500">دقيقة</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-black text-slate-700 mb-3">إعدادات الامتحان</label>
            <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 px-5">
              <Toggle
                checked={instantFeedback}
                onChange={setInstantFeedback}
                label="التصحيح الفوري"
                description="الطالب يعرف فوراً بعد كل إجابة إذا كانت صحيحة أم خاطئة"
                icon={<Zap className="w-5 h-5" />}
              />
              <Toggle
                checked={showCorrectAnswers}
                onChange={setShowCorrectAnswers}
                label="إظهار الإجابات الصحيحة"
                description="عرض الإجابات الصحيحة في صفحة النتيجة بعد انتهاء الامتحان"
                icon={<Eye className="w-5 h-5" />}
              />
              <Toggle
                checked={leaderboard}
                onChange={setLeaderboard}
                label="لوحة الترتيب (Leaderboard)"
                description="الطلاب يقدروا يشوفوا ترتيبهم مقارنة بباقي الزملاء"
                icon={<Trophy className="w-5 h-5" />}
              />
            </div>
          </div>

          <div className="bg-gradient-to-br from-brand-50 to-accent-50 border border-brand-200/50 rounded-2xl p-5">
            <h4 className="font-black text-brand-800 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              إيه اللي هيحصل بعد كده؟
            </h4>
            <ul className="mt-3 space-y-2 text-sm text-brand-700">
              <li className="flex gap-2">
                <span className="font-black">1.</span>
                <span>هتنتقل لصفحة إضافة الأسئلة</span>
              </li>
              <li className="flex gap-2">
                <span className="font-black">2.</span>
                <span>هتضيف الأسئلة والاختيارات وتحدد الإجابة الصحيحة</span>
              </li>
              <li className="flex gap-2">
                <span className="font-black">3.</span>
                <span>هتنشر الامتحان وتشارك الرابط مع الطلاب</span>
              </li>
            </ul>
          </div>

          <div className="flex gap-3 pt-4">
            <Link to="/admin/exams" className="flex-1">
              <Button type="button" variant="secondary" fullWidth>إلغاء</Button>
            </Link>
            <Button type="submit" loading={loading} fullWidth className="flex-[2]">
              إنشاء ومتابعة
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
