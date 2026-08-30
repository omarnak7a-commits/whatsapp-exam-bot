import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { publicFetch } from '../../api/client';
import { Logo } from '../../components/ui/Logo';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { PublicNavbar } from '../../components/layout/Navbar';
import { Clock, FileQuestion, Trophy, Users, Sparkles, AlertCircle } from 'lucide-react';

interface PublicExam {
  public_slug: string;
  title: string;
  description?: string;
  duration_minutes: number;
  questions_count: number;
  total_points: number;
  status: string;
}

export const ExamLandingPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [exam, setExam] = useState<PublicExam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const fetchExam = async () => {
      try {
        const data = await publicFetch<PublicExam>(`/public/exams/${slug}`);
        setExam(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (slug) fetchExam();
  }, [slug]);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError('');
    
    if (!name.trim() || name.trim().length < 2) {
      setNameError('الاسم لازم يكون على الأقل حرفين');
      return;
    }

    if (name.trim().length > 50) {
      setNameError('الاسم طويل أوي');
      return;
    }

    setStarting(true);
    try {
      const attempt = await publicFetch<any>(`/public/exams/${slug}/attempts`, {
        method: 'POST',
        body: JSON.stringify({ student_name: name.trim() }),
      });
      
      // Save to localStorage for resume
      localStorage.setItem(`attempt_${attempt.id}_name`, name.trim());
      
      navigate(`/exam/${slug}/take/${attempt.id}`);
    } catch (err: any) {
      setNameError(err.message);
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFF] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-bold">جاري تحميل الامتحان...</p>
        </div>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="min-h-screen bg-[#F8FAFF] flex flex-col">
        <PublicNavbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center py-12">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2">الامتحان غير موجود</h2>
            <p className="text-slate-500 text-sm mb-6">{error || 'الرابط غير صحيح أو الامتحان غير متاح'}</p>
            <Button variant="secondary" onClick={() => window.location.href = '/'}>العودة للرئيسية</Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFF] flex flex-col" dir="rtl">
      <PublicNavbar />
      
      {/* Hero Section */}
      <div className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            {/* Left - Exam Info */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200/50 rounded-full px-4 py-2 text-sm font-bold text-brand-700">
                <Sparkles className="w-4 h-4" />
                <span>جاهز تعرف جبت كام؟ 👀</span>
              </div>

              <div>
                <h1 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight">
                  {exam.title}
                </h1>
                {exam.description && (
                  <p className="text-slate-600 mt-4 text-lg leading-relaxed">
                    {exam.description}
                  </p>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="text-center py-4" padding="sm">
                  <div className="w-10 h-10 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-2">
                    <FileQuestion className="w-5 h-5 text-brand-600" />
                  </div>
                  <p className="text-2xl font-black text-slate-900">{exam.questions_count}</p>
                  <p className="text-xs font-bold text-slate-500">سؤال</p>
                </Card>
                <Card className="text-center py-4" padding="sm">
                  <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-2">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <p className="text-2xl font-black text-slate-900">{exam.duration_minutes}</p>
                  <p className="text-xs font-bold text-slate-500">دقيقة</p>
                </Card>
                <Card className="text-center py-4" padding="sm">
                  <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-2">
                    <Trophy className="w-5 h-5 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-black text-slate-900">{exam.total_points}</p>
                  <p className="text-xs font-bold text-slate-500">درجة</p>
                </Card>
              </div>

              {/* Features */}
              <Card>
                <h3 className="font-black text-slate-900 mb-4">إيه اللي هيحصل؟</h3>
                <div className="space-y-3">
                  {[
                    'هتدخل اسمك بس، من غير تسجيل ولا إيميل',
                    `هتجاوب على ${exam.questions_count} سؤال في ${exam.duration_minutes} دقيقة`,
                    'هتعرف نتيجتك فوراً بعد التسليم',
                    'هتشوف ترتيبك وسط كل اللي امتحنوا',
                  ].map((item, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-black text-brand-600">{i + 1}</span>
                      </div>
                      <p className="text-sm font-medium text-slate-700">{item}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Right - Start Form */}
            <div className="lg:sticky lg:top-24">
              <Card className="border-2 border-brand-100 shadow-brand-lg">
                <div className="text-center mb-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-brand-500 to-brand-600 rounded-[20px] flex items-center justify-center mx-auto mb-4 shadow-brand">
                    <span className="text-3xl">🎯</span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900">يلا نبدأ؟</h2>
                  <p className="text-slate-500 text-sm mt-2">اكتب اسمك وابدأ الامتحان حالاً</p>
                </div>

                <form onSubmit={handleStart} className="space-y-5">
                  <div>
                    <label className="block text-sm font-black text-slate-700 mb-3">
                      اسمك إيه؟ ✨
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="مثال: أحمد محمد"
                      className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-5 py-4 text-lg font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 transition-all"
                      autoFocus
                    />
                    {nameError && (
                      <p className="mt-3 text-sm font-bold text-red-500 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {nameError}
                      </p>
                    )}
                    <p className="mt-3 text-xs text-slate-500">
                      الاسم هيظهر في لوحة المتصدرين 🏆
                    </p>
                  </div>

                  <Button
                    type="submit"
                    loading={starting}
                    fullWidth
                    size="lg"
                    className="text-lg py-4"
                  >
                    {starting ? 'جاري البدء...' : 'ابدأ الامتحان 🚀'}
                  </Button>

                  <div className="flex items-center justify-center gap-2 text-xs text-slate-500 pt-2">
                    <Users className="w-4 h-4" />
                    <span>انضم لآلاف الطلاب اللي عرفوا جابوا كام</span>
                  </div>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">الامتحان بواسطة</span>
                    <div className="flex items-center gap-2 font-black text-brand-700">
                      <Logo size="sm" showText={false} />
                      <span>جبت كام؟</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Trust badges */}
              <div className="mt-4 flex items-center justify-center gap-6 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  آمن 100%
                </span>
                <span>•</span>
                <span>بدون تسجيل</span>
                <span>•</span>
                <span>نتيجة فورية</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <Logo size="sm" showText={false} />
            <span className="font-bold">جبت كام؟ - امتحن، اعرف نتيجتك، وشوف ترتيبك</span>
          </div>
          <div>© 2026 جميع الحقوق محفوظة</div>
        </div>
      </footer>
    </div>
  );
};
