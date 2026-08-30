import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { publicFetch } from '../../api/client';
import { Logo } from '../../components/ui/Logo';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Watermark } from '../../components/ui/Watermark';
import { Clock, ChevronLeft, ChevronRight, Flag, AlertTriangle, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';

interface Question {
  id: number;
  text: string;
  order_index: number;
  points: number;
  options: { id: number; text: string; order_index: number }[];
  selected_option_id?: number | null;
}

interface ExamFlags {
  instant_feedback_enabled: boolean;
  show_correct_answers: boolean;
  leaderboard_enabled: boolean;
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
  } & Partial<ExamFlags>;
  exam: {
    public_slug: string;
    title: string;
    description?: string;
    duration_minutes: number;
  } & Partial<ExamFlags>;
  questions: Question[];
}

interface AnswerResponse {
  answered_count: number;
  next_question_id: number | null;
  is_last: boolean;
  is_correct: boolean | null;
  correct_option_text: string | null;
}

interface FeedbackState {
  questionId: number;
  isCorrect: boolean;
  correctText: string;
  selectedText: string;
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
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitRef = useRef<(auto?: boolean) => void>(() => undefined);

  const fetchAttempt = useCallback(async () => {
    try {
      const result = await publicFetch<AttemptData>(`/public/attempts/${attemptId}`);
      setData(result);
      setRemaining(result.attempt.remaining_seconds);

      const ansMap: Record<number, number> = {};
      result.questions.forEach(q => {
        if (q.selected_option_id) {
          ansMap[q.id] = q.selected_option_id;
        }
      });
      setAnswers(ansMap);

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

  const handleSubmit = useCallback(async (isAuto = false) => {
    if (!isAuto && !showSubmitModal) {
      setShowSubmitModal(true);
      return;
    }
    setSubmitting(true);
    try {
      await publicFetch(`/public/attempts/${attemptId}/complete`, { method: 'POST' });
      navigate(`/exam/${slug}/result/${attemptId}`);
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
      setShowSubmitModal(false);
    }
  }, [attemptId, navigate, showSubmitModal, slug]);

  submitRef.current = handleSubmit;

  // Server-authoritative countdown: remaining comes from the backend on load,
  // then ticks locally. At zero the attempt is completed server-side.
  useEffect(() => {
    if (!data || remaining <= 0) return;
    const interval = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          submitRef.current(true);
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

  const instantFeedback = Boolean(data?.exam.instant_feedback_enabled);

  const handleAnswer = async (questionId: number, optionId: number) => {
    if (!data || saving !== null || answers[questionId]) return; // locked after submit
    const question = data.questions.find(q => q.id === questionId);
    const selectedOption = question?.options.find(o => o.id === optionId);
    setSaving(questionId);

    try {
      const res = await publicFetch<AnswerResponse>(`/public/attempts/${attemptId}/answers`, {
        method: 'POST',
        body: JSON.stringify({ question_id: questionId, option_id: optionId }),
      });
      setAnswers(prev => ({ ...prev, [questionId]: optionId }));

      if (instantFeedback) {
        setFeedback({
          questionId,
          isCorrect: Boolean(res.is_correct),
          correctText: res.correct_option_text || '',
          selectedText: selectedOption?.text || '',
        });
      } else {
        // No feedback: move straight on to the next question.
        setTimeout(() => {
          if (res.next_question_id) {
            const idx = data.questions.findIndex(q => q.id === res.next_question_id);
            if (idx >= 0) setCurrentIndex(idx);
          }
        }, 300);
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ، حاول مرة أخرى');
      setTimeout(() => setError(null), 2500);
    } finally {
      setSaving(null);
    }
  };

  const goNext = () => {
    setFeedback(null);
    setCurrentIndex(prev => Math.min(data ? data.questions.length - 1 : 0, prev + 1));
  };

  const goPrev = () => {
    setFeedback(null);
    setCurrentIndex(prev => Math.max(0, prev - 1));
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

  if (error && !data) {
    return (
      <div className="min-h-screen bg-[#F8FAFF] flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center py-8">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="font-black text-slate-900 mb-2">حدث خطأ</h2>
          <p className="text-slate-500 text-sm mb-4">{error}</p>
          <Button variant="secondary" onClick={() => navigate(`/exam/${slug}`)}>العودة</Button>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const currentQuestion = data.questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const totalQuestions = data.questions.length;
  const progress = totalQuestions ? (answeredCount / totalQuestions) * 100 : 0;
  const isLastQuestion = currentIndex === totalQuestions - 1;
  const currentAnswered = Boolean(currentQuestion && answers[currentQuestion.id]);
  const currentFeedback = feedback && feedback.questionId === currentQuestion.id ? feedback : null;

  return (
    <div className="min-h-screen bg-[#F8FAFF] flex flex-col" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Logo size="sm" showText={false} />
            <div className="min-w-0">
              <h1 className="font-black text-slate-900 text-sm truncate">{data.exam.title}</h1>
              <p className="text-xs text-slate-500">
                السؤال {currentIndex + 1} من {totalQuestions}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-3">
              <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs font-bold text-slate-600">
                {answeredCount}/{totalQuestions}
              </span>
            </div>

            <div
              role="timer"
              aria-label="الوقت المتبقي"
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-black text-sm ${
                remaining < 60
                  ? 'bg-red-50 text-red-600 border border-red-200 animate-pulse'
                  : remaining < 300
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-slate-50 text-slate-700 border border-slate-200'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span className="font-mono" dir="ltr">{formatTime(remaining)}</span>
            </div>
          </div>
        </div>

        {/* Mobile progress bar */}
        <div className="md:hidden h-1 bg-slate-100">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 grid lg:grid-cols-[1fr_300px] gap-6">
        {/* Main Question */}
        <div className="space-y-6">
          <Card className="border-2 border-slate-100">
            {/* Question card with subtle teacher watermark */}
            <div className="relative overflow-hidden">
              <Watermark />
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-brand-50 border border-brand-200/50 flex items-center justify-center font-black text-brand-700">
                      {currentIndex + 1}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500">
                        {currentQuestion.points} {currentQuestion.points === 1 ? 'درجة' : 'درجات'}
                      </p>
                      {currentAnswered && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full mt-1">
                          <CheckCircle2 className="w-3 h-3" />
                          تمت الإجابة
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <h2 className="text-xl md:text-2xl font-black text-slate-900 leading-relaxed mb-8">
                  {currentQuestion.text}
                </h2>

                <div className="space-y-3" role="radiogroup" aria-label="اختيارات الإجابة">
                  {currentQuestion.options.map((option) => {
                    const isSelected = answers[currentQuestion.id] === option.id;
                    const isLocked = currentAnswered;
                    const isSaving = saving === currentQuestion.id;
                    const showAsCorrect = currentFeedback !== null && instantFeedback && isSelected;

                    return (
                      <button
                        key={option.id}
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => handleAnswer(currentQuestion.id, option.id)}
                        disabled={isLocked || isSaving}
                        className={`
                          answer-card w-full text-right group
                          ${isSelected ? 'selected' : ''}
                          ${showAsCorrect ? (currentFeedback.isCorrect ? 'correct' : 'wrong') : ''}
                          ${isSaving ? 'opacity-50 cursor-wait' : ''}
                          ${isLocked && !isSelected ? 'opacity-60' : ''}
                        `}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                              isSelected
                                ? currentFeedback
                                  ? currentFeedback.isCorrect
                                    ? 'bg-accent-500 border-accent-500 text-white'
                                    : 'bg-red-500 border-red-500 text-white'
                                  : 'bg-brand-600 border-brand-600 text-white'
                                : 'border-slate-300 group-hover:border-brand-400'
                            }`}
                          >
                            {isSelected &&
                              (currentFeedback ? (
                                currentFeedback.isCorrect ? (
                                  <CheckCircle2 className="w-5 h-5" />
                                ) : (
                                  <XCircle className="w-5 h-5" />
                                )
                              ) : (
                                <CheckCircle2 className="w-5 h-5" />
                              ))}
                          </div>
                          <span className="font-bold text-slate-800 text-[15px] leading-relaxed">
                            {option.text}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>

          {/* Instant feedback panel */}
          {instantFeedback && currentFeedback && (
            <div
              className={`rounded-[20px] border-2 p-5 animate-scale-in ${
                currentFeedback.isCorrect
                  ? 'bg-accent-50 border-accent-500/40'
                  : 'bg-red-50 border-red-500/40'
              }`}
              role="status"
            >
              <div className="flex items-center gap-3">
                {currentFeedback.isCorrect ? (
                  <>
                    <CheckCircle2 className="w-8 h-8 text-accent-600 flex-shrink-0" />
                    <h3 className="text-lg font-black text-accent-600">✅ إجابة صحيحة</h3>
                  </>
                ) : (
                  <>
                    <XCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
                    <h3 className="text-lg font-black text-red-600">❌ إجابة خاطئة</h3>
                  </>
                )}
              </div>
              <div className="mt-3 space-y-1 text-sm font-bold">
                {!currentFeedback.isCorrect && (
                  <p className="text-red-700">إجابتك: {currentFeedback.selectedText}</p>
                )}
                <p className={currentFeedback.isCorrect ? 'text-accent-700' : 'text-slate-700'}>
                  الإجابة الصحيحة: {currentFeedback.correctText}
                </p>
              </div>
              <div className="mt-4 flex gap-3">
                {isLastQuestion ? (
                  <Button onClick={() => handleSubmit(false)} className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600">
                    <Flag className="w-4 h-4 ml-2" />
                    إنهاء الامتحان
                  </Button>
                ) : (
                  <Button onClick={goNext} className="flex-1">
                    السؤال التالي
                    <ChevronLeft className="w-5 h-5 mr-1" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between gap-3">
            <Button variant="secondary" onClick={goPrev} disabled={currentIndex === 0} className="flex-1 md:flex-none">
              <ChevronRight className="w-5 h-5 ml-1" />
              السابق
            </Button>

            {isLastQuestion ? (
              <Button
                onClick={() => handleSubmit(false)}
                className="flex-1 md:flex-none bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600"
              >
                <Flag className="w-5 h-5 ml-2" />
                إنهاء الامتحان
              </Button>
            ) : (
              <Button onClick={goNext} className="flex-1 md:flex-none">
                {instantFeedback ? 'السؤال التالي' : 'التالي'}
                <ChevronLeft className="w-5 h-5 mr-1" />
              </Button>
            )}
          </div>

          {error && data && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-2xl text-sm font-bold" role="alert">
              {error}
            </div>
          )}
        </div>

        {/* Sidebar - Question Navigator */}
        <div className="space-y-4">
          <Card>
            <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2">
              <span>خريطة الأسئلة</span>
              <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded-full">
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
                    onClick={() => { setFeedback(null); setCurrentIndex(idx); }}
                    aria-label={`السؤال ${idx + 1}${isAnswered ? ' - تمت الإجابة' : ''}`}
                    className={`aspect-square rounded-2xl font-black text-sm flex items-center justify-center border-2 transition-all duration-200 ${
                      isCurrent
                        ? 'bg-brand-600 border-brand-600 text-white shadow-brand scale-110'
                        : isAnswered
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-emerald-500 rounded-full" />
                  <span className="text-slate-600">تمت الإجابة</span>
                </span>
                <span className="font-black text-slate-900">{answeredCount}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-slate-300 rounded-full" />
                  <span className="text-slate-600">متبقي</span>
                </span>
                <span className="font-black text-slate-900">{totalQuestions - answeredCount}</span>
              </div>
            </div>

            <Button onClick={() => handleSubmit(false)} variant="secondary" fullWidth className="mt-6">
              <Flag className="w-4 h-4 ml-2" />
              إنهاء الامتحان
            </Button>
          </Card>

          <Card className="bg-amber-50/50 border-amber-200/50">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-black text-amber-800 text-sm">خد بالك!</p>
                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                  لو الوقت خلص، الامتحان هيتسلم تلقائياً. أول ما تختار إجابة بتتثبت نهائياً.
                </p>
              </div>
            </div>
          </Card>

          <div className="flex items-center justify-center gap-2 text-slate-400">
            <ArrowLeft className="w-3 h-3" />
            <span className="text-[11px] font-bold">منصة جبت كام؟</span>
          </div>
        </div>
      </div>

      {/* Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Card className="max-w-md w-full animate-scale-in">
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Flag className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">جاهز تسلّم؟</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                تمت الإجابة على <span className="font-black text-brand-600">{answeredCount}</span> من{' '}
                <span className="font-black">{totalQuestions}</span> سؤال
                {totalQuestions - answeredCount > 0 && (
                  <span className="block mt-2 text-amber-600 font-bold">
                    لسه فاضل {totalQuestions - answeredCount} سؤال بدون إجابة
                  </span>
                )}
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="secondary" fullWidth onClick={() => setShowSubmitModal(false)} disabled={submitting}>
                مراجعة الإجابات
              </Button>
              <Button fullWidth onClick={() => handleSubmit(true)} loading={submitting} className="bg-gradient-to-r from-emerald-600 to-emerald-500">
                إنهاء الامتحان
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
