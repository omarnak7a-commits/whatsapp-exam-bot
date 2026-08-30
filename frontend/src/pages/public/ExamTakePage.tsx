import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { publicFetch } from '../../api/client';
import { Logo } from '../../components/ui/Logo';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Clock, ChevronLeft, ChevronRight, Flag, AlertTriangle, CheckCircle } from 'lucide-react';

interface Question {
  id: number;
  text: string;
  order_index: number;
  points: number;
  options: { id: number; text: string; order_index: number }[];
  selected_option_id?: number | null;
}

interface AttemptData {
  attempt: {
    id: number;
    exam_id: number;
    student_name: string;
    started_at: string;
    expires_at: string;
    status: string;
    remaining_seconds: number;
    total_questions: number;
    total_score: number;
    answered_count: number;
  };
  exam: {
    public_slug: string;
    title: string;
    description?: string;
    duration_minutes: number;
  };
  questions: Question[];
}

export const ExamTakePage: React.FC = () => {
  const { slug, attemptId } = useParams<{ slug: string; attemptId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<AttemptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [remaining, setRemaining] = useState(0);
  const [saving, setSaving] = useState<number | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAttempt = useCallback(async () => {
    try {
      const result = await publicFetch<AttemptData>(`/public/attempts/${attemptId}`);
      setData(result);
      setRemaining(result.attempt.remaining_seconds);
      
      // Build answers map
      const ansMap: Record<number, number> = {};
      result.questions.forEach(q => {
        if (q.selected_option_id) {
          ansMap[q.id] = q.selected_option_id;
        }
      });
      setAnswers(ansMap);

      // If attempt already completed, redirect to result
      if (result.attempt.status !== 'IN_PROGRESS') {
        navigate(`/exam/${slug}/result/${attemptId}`, { replace: true });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [attemptId, slug, navigate]);

  useEffect(() => {
    fetchAttempt();
  }, [fetchAttempt]);

  // Timer
  useEffect(() => {
    if (!data || remaining <= 0) return;

    const interval = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          // Auto submit
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [data, remaining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswer = async (questionId: number, optionId: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
    setSaving(questionId);

    try {
      await publicFetch(`/public/attempts/${attemptId}/answers`, {
        method: 'POST',
        body: JSON.stringify({ question_id: questionId, option_id: optionId }),
      });
    } catch (err: any) {
      console.error('Failed to save answer', err);
      // Revert on failure
      setAnswers(prev => {
        const newAns = { ...prev };
        delete newAns[questionId];
        return newAns;
      });
    } finally {
      setSaving(null);
    }
  };

  const handleSubmit = async (isAuto = false) => {
    if (!isAuto && !showSubmitModal) {
      setShowSubmitModal(true);
      return;
    }

    setSubmitting(true);
    try {
      await publicFetch(`/public/attempts/${attemptId}/submit`, {
        method: 'POST',
      });
      navigate(`/exam/${slug}/result/${attemptId}`);
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
      setShowSubmitModal(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFF] dark:bg-[#070B1A] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400 font-bold">جاري تحميل الامتحان...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#F8FAFF] dark:bg-[#070B1A] flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center py-8">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="font-black text-slate-900 dark:text-white mb-2">حدث خطأ</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">{error}</p>
          <Button variant="secondary" onClick={() => navigate(`/exam/${slug}`)}>العودة</Button>
        </Card>
      </div>
    );
  }

  const currentQuestion = data.questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const totalQuestions = data.questions.length;
  const progress = (answeredCount / totalQuestions) * 100;
  const isLastQuestion = currentIndex === totalQuestions - 1;

  return (
    <div className="min-h-screen bg-[#F8FAFF] dark:bg-[#070B1A] flex flex-col" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo size="sm" showText={false} />
            <div className="hidden md:block">
              <h1 className="font-black text-slate-900 dark:text-white text-sm">{data.exam.title}</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                السؤال {currentIndex + 1} من {totalQuestions}
              </p>
            </div>
            <div className="md:hidden">
              <p className="font-black text-slate-900 dark:text-white text-sm">
                {currentIndex + 1} / {totalQuestions}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Progress - Desktop */}
            <div className="hidden md:flex items-center gap-3">
              <div className="w-32 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                {answeredCount}/{totalQuestions}
              </span>
            </div>

            {/* Timer */}
            <div className={`
              flex items-center gap-2 px-4 py-2 rounded-2xl font-black text-sm
              ${remaining < 60 
                ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 animate-pulse' 
                : remaining < 300
                ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }
            `}>
              <Clock className="w-4 h-4" />
              <span className="font-mono">{formatTime(remaining)}</span>
            </div>
          </div>
        </div>

        {/* Mobile progress bar */}
        <div className="md:hidden h-1 bg-slate-100 dark:bg-slate-800">
          <div 
            className="h-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 grid lg:grid-cols-[1fr_300px] gap-6">
        {/* Main Question */}
        <div className="space-y-6">
          <Card className="border-2 border-slate-100 dark:border-slate-800">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-50 dark:bg-brand-950/50 border border-brand-200/50 dark:border-brand-800/30 flex items-center justify-center font-black text-brand-700 dark:text-brand-300">
                  {currentIndex + 1}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {currentQuestion.points} {currentQuestion.points === 1 ? 'درجة' : 'درجات'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {answers[currentQuestion.id] && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded-full">
                        <CheckCircle className="w-3 h-3" />
                        تمت الإجابة
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-relaxed mb-8">
              {currentQuestion.text}
            </h2>

            <div className="space-y-3">
              {currentQuestion.options.map((option) => {
                const isSelected = answers[currentQuestion.id] === option.id;
                const isSaving = saving === currentQuestion.id;

                return (
                  <button
                    key={option.id}
                    onClick={() => handleAnswer(currentQuestion.id, option.id)}
                    disabled={isSaving}
                    className={`
                      answer-card w-full text-right group
                      ${isSelected ? 'selected' : ''}
                      ${isSaving ? 'opacity-50 cursor-wait' : ''}
                    `}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`
                        w-8 h-8 rounded-xl border-2 flex items-center justify-center flex-shrink-0 transition-all
                        ${isSelected 
                          ? 'bg-brand-600 border-brand-600 text-white' 
                          : 'border-slate-300 dark:border-slate-600 group-hover:border-brand-400 dark:group-hover:border-brand-500'
                        }
                      `}>
                        {isSelected && <CheckCircle className="w-5 h-5" />}
                      </div>
                      <span className="font-bold text-slate-800 dark:text-slate-100 text-[15px] leading-relaxed">
                        {option.text}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="secondary"
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="flex-1 md:flex-none"
            >
              <ChevronRight className="w-5 h-5 ml-1" />
              السابق
            </Button>

            {isLastQuestion ? (
              <Button
                onClick={() => handleSubmit(false)}
                className="flex-1 md:flex-none bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600"
              >
                <Flag className="w-5 h-5 ml-2" />
                تسليم الامتحان
              </Button>
            ) : (
              <Button
                onClick={() => setCurrentIndex(prev => Math.min(totalQuestions - 1, prev + 1))}
                className="flex-1 md:flex-none"
              >
                التالي
                <ChevronLeft className="w-5 h-5 mr-1" />
              </Button>
            )}
          </div>
        </div>

        {/* Sidebar - Question Navigator */}
        <div className="space-y-4">
          <Card>
            <h3 className="font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <span>خريطة الأسئلة</span>
              <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                {answeredCount}/{totalQuestions}
              </span>
            </h3>
            
            <div className="grid grid-cols-5 gap-2">
              {data.questions.map((q, idx) => {
                const isAnswered = !!answers[q.id];
                const isCurrent = idx === currentIndex;

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`
                      aspect-square rounded-2xl font-black text-sm flex items-center justify-center
                      border-2 transition-all duration-200
                      ${isCurrent 
                        ? 'bg-brand-600 border-brand-600 text-white shadow-brand scale-110' 
                        : isAnswered
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                      }
                    `}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-emerald-500 rounded-full" />
                  <span className="text-slate-600 dark:text-slate-400">تمت الإجابة</span>
                </span>
                <span className="font-black text-slate-900 dark:text-white">{answeredCount}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-slate-300 dark:bg-slate-600 rounded-full" />
                  <span className="text-slate-600 dark:text-slate-400">متبقي</span>
                </span>
                <span className="font-black text-slate-900 dark:text-white">{totalQuestions - answeredCount}</span>
              </div>
            </div>

            <Button
              onClick={() => handleSubmit(false)}
              variant="secondary"
              fullWidth
              className="mt-6"
            >
              <Flag className="w-4 h-4 ml-2" />
              تسليم الامتحان
            </Button>
          </Card>

          <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/30">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-black text-amber-800 dark:text-amber-200 text-sm">خد بالك!</p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 leading-relaxed">
                  لو الوقت خلص، الامتحان هيتسلم تلقائياً. تقدر تغير إجابتك في أي وقت قبل التسليم.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Card className="max-w-md w-full animate-scale-in">
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Flag className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">جاهز تسلّم؟</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                تمت الإجابة على <span className="font-black text-brand-600 dark:text-brand-400">{answeredCount}</span> من <span className="font-black">{totalQuestions}</span> سؤال
                {totalQuestions - answeredCount > 0 && (
                  <span className="block mt-2 text-amber-600 dark:text-amber-400 font-bold">
                    لسه فاضل {totalQuestions - answeredCount} سؤال بدون إجابة
                  </span>
                )}
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setShowSubmitModal(false)}
                disabled={submitting}
              >
                مراجعة الإجابات
              </Button>
              <Button
                fullWidth
                onClick={() => handleSubmit(true)}
                loading={submitting}
                className="bg-gradient-to-r from-emerald-600 to-emerald-500"
              >
                تسليم الامتحان
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
