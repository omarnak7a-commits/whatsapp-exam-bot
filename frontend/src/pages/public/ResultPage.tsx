import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { publicFetch } from '../../api/client';
import { Logo } from '../../components/ui/Logo';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { PublicNavbar } from '../../components/layout/Navbar';
import { Trophy, Clock, CheckCircle, XCircle, Medal, Share2, Home, RotateCcw, Sparkles, Target } from 'lucide-react';

interface ResultData {
  attempt_id: number;
  student_name: string;
  exam_title: string;
  public_slug: string;
  score: number;
  total_score: number;
  percentage: number;
  completion_time_seconds: number;
  ranking: number | null;
  total_ranked: number;
  correct_answers: number;
  wrong_answers: number;
  unanswered: number;
  answers: Array<{
    question_id: number;
    question_text: string;
    question_points: number;
    selected_option_id: number | null;
    selected_option_text: string | null;
    correct_option_id: number | null;
    correct_option_text: string | null;
    is_correct: boolean;
    points_awarded: number;
  }>;
  leaderboard: Array<{
    rank: number;
    student_name: string;
    score: number;
    total_score: number;
    percentage: number;
    completion_time_seconds: number;
  }>;
  status: string;
  started_at: string;
  submitted_at: string;
  show_correct_answers?: boolean;
  leaderboard_enabled?: boolean;
}

export const ResultPage: React.FC = () => {
  const { slug, attemptId } = useParams<{ slug: string; attemptId: string }>();
  const [data, setData] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const result = await publicFetch<ResultData>(`/public/attempts/${attemptId}/result`);
        setData(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [attemptId]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRankEmoji = (rank: number | null) => {
    if (!rank) return '🎯';
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    if (rank <= 10) return '🏅';
    return '🎯';
  };

  const getPerformanceMessage = (percentage: number) => {
    if (percentage >= 90) return { text: 'ممتاز جداً! 🔥', color: 'text-emerald-600' };
    if (percentage >= 80) return { text: 'ممتاز! 🌟', color: 'text-brand-600' };
    if (percentage >= 70) return { text: 'جيد جداً! 👏', color: 'text-blue-600' };
    if (percentage >= 60) return { text: 'جيد! 👍', color: 'text-amber-600' };
    if (percentage >= 50) return { text: 'مقبول، تقدر تعمل أحسن 💪', color: 'text-orange-600' };
    return { text: 'حاول تاني، هتتحسن! 🚀', color: 'text-slate-600' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFF] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-bold">جاري حساب النتيجة...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#F8FAFF] flex flex-col">
        <PublicNavbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center py-8">
            <h2 className="font-black text-slate-900 mb-2">خطأ في تحميل النتيجة</h2>
            <p className="text-slate-500 text-sm mb-4">{error}</p>
            <Link to={`/exam/${slug}`}>
              <Button>العودة</Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  const showLeaderboard = data.leaderboard_enabled !== false;
  const showAnswers = data.show_correct_answers !== false && data.answers.length > 0;

  const performance = getPerformanceMessage(data.percentage);

  return (
    <div className="min-h-screen bg-[#F8FAFF]" dir="rtl">
      <PublicNavbar />

      <div className="max-w-6xl mx-auto px-4 py-6 md:py-10">
        {/* Celebration Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-brand-50 to-accent-50 border border-brand-200/50 rounded-full px-5 py-2 text-sm font-black text-brand-700 mb-6">
            <Sparkles className="w-4 h-4" />
            <span>خلصت! 🎉</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 leading-tight">
            برافو يا <span className="bg-gradient-to-r from-brand-600 to-accent-500 bg-clip-text text-transparent">{data.student_name}</span>!
          </h1>
          <p className={`text-xl md:text-2xl font-black mt-4 ${performance.color}`}>
            {performance.text}
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-6">
          {/* Main Result Card */}
          <div className="space-y-6">
            {/* Score Card */}
            <Card className="relative overflow-hidden border-2 border-brand-100 shadow-brand-lg">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-brand-500/10 to-accent-500/10 rounded-full blur-3xl -translate-y-32 translate-x-32" />
              
              <div className="relative">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-sm font-black tracking-widest text-slate-500">نتيجتك في</h2>
                    <p className="font-black text-slate-900 text-lg mt-1">{data.exam_title}</p>
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-brand-600 to-brand-500 rounded-2xl flex items-center justify-center shadow-brand">
                    <Target className="w-7 h-7 text-white" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="w-20 h-20 md:w-24 md:h-24 mx-auto relative">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" className="text-slate-100" strokeWidth="8" />
                        <circle
                          cx="50" cy="50" r="45" fill="none"
                          stroke="url(#scoreGrad)"
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={`${data.percentage * 2.827} 282.7`}
                          className="transition-all duration-1000 ease-out"
                        />
                        <defs>
                          <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#1E5CFF" />
                            <stop offset="100%" stopColor="#10B981" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl md:text-3xl font-black text-slate-900">{Math.round(data.percentage)}%</span>
                      </div>
                    </div>
                    <p className="text-xs font-bold text-slate-500 mt-2">النسبة</p>
                  </div>

                  <div className="text-center">
                    <div className="bg-slate-50 rounded-3xl py-4 px-2">
                      <p className="text-3xl md:text-4xl font-black text-slate-900">
                        {data.score}
                        <span className="text-lg text-slate-400">/{data.total_score}</span>
                      </p>
                      <p className="text-xs font-bold text-slate-500 mt-1">الدرجة</p>
                    </div>
                  </div>

                  {showLeaderboard ? (
                    <div className="text-center">
                      <div className="bg-gradient-to-br from-brand-50 to-accent-50 border border-brand-200/30 rounded-3xl py-4 px-2">
                        <p className="text-2xl md:text-3xl font-black text-brand-700 flex items-center justify-center gap-1">
                          <span>{getRankEmoji(data.ranking)}</span>
                          <span>#{data.ranking || '-'}</span>
                        </p>
                        <p className="text-xs font-bold text-brand-600/70 mt-1">ترتيبك</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="bg-slate-50 border border-slate-200 rounded-3xl py-4 px-2">
                        <p className="text-sm font-black text-slate-400">الترتيب غير مفعل</p>
                        <p className="text-xs font-bold text-slate-400 mt-1">لهذا الامتحان</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3 mt-8">
                  <div className="bg-emerald-50 border border-emerald-200/50 rounded-2xl p-3 text-center">
                    <p className="text-xl font-black text-emerald-700">{data.correct_answers}</p>
                    <p className="text-[11px] font-bold text-emerald-600/70">صحيحة</p>
                  </div>
                  <div className="bg-red-50 border border-red-200/50 rounded-2xl p-3 text-center">
                    <p className="text-xl font-black text-red-700">{data.wrong_answers}</p>
                    <p className="text-[11px] font-bold text-red-600/70">خاطئة</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
                    <p className="text-xl font-black text-slate-700 flex items-center justify-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatTime(data.completion_time_seconds)}
                    </p>
                    <p className="text-[11px] font-bold text-slate-500">الوقت</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Answers Review */}
            {showAnswers && (
            <Card>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-slate-900 text-lg">مراجعة الإجابات</h3>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowDetails(!showDetails)}
                >
                  {showDetails ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
                </Button>
              </div>

              <div className="space-y-3">
                {data.answers.map((ans, idx) => (
                  <div
                    key={ans.question_id}
                    className={`
                      border-2 rounded-2xl p-4 transition-all
                      ${ans.is_correct 
                        ? 'bg-emerald-50/50 border-emerald-200/50' 
                        : ans.selected_option_id
                        ? 'bg-red-50/50 border-red-200/50'
                        : 'bg-slate-50 border-slate-200'
                      }
                    `}
                  >
                    <div className="flex gap-3">
                      <div className={`
                        w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-sm
                        ${ans.is_correct 
                          ? 'bg-emerald-500 text-white' 
                          : ans.selected_option_id
                          ? 'bg-red-500 text-white'
                          : 'bg-slate-300 text-white'
                        }
                      `}>
                        {ans.is_correct ? <CheckCircle className="w-5 h-5" /> : ans.selected_option_id ? <XCircle className="w-5 h-5" /> : idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 text-[14px] leading-relaxed">
                          {idx + 1}. {ans.question_text}
                        </p>
                        
                        {showDetails && (
                          <div className="mt-3 space-y-2 text-sm">
                            {ans.selected_option_text && (
                              <div className="flex gap-2">
                                <span className="text-slate-500 font-bold min-w-[80px]">إجابتك:</span>
                                <span className={`font-bold ${ans.is_correct ? 'text-emerald-700' : 'text-red-700'}`}>
                                  {ans.selected_option_text}
                                </span>
                              </div>
                            )}
                            {!ans.is_correct && ans.correct_option_text && (
                              <div className="flex gap-2">
                                <span className="text-slate-500 font-bold min-w-[80px]">الصحيحة:</span>
                                <span className="font-bold text-emerald-700">
                                  {ans.correct_option_text}
                                </span>
                              </div>
                            )}
                            {!ans.selected_option_id && (
                              <span className="text-amber-600 font-bold text-xs">لم تتم الإجابة</span>
                            )}
                          </div>
                        )}
                      </div>
                      <Badge variant={ans.is_correct ? 'success' : ans.selected_option_id ? 'danger' : 'default'} size="sm">
                        {ans.points_awarded}/{ans.question_points}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            )}
          </div>

          {/* Sidebar - Leaderboard */}
          <div className="space-y-6">
            {showLeaderboard && (
            <Card className="border-2 border-amber-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900">لوحة المتصدرين</h3>
                  <p className="text-xs text-slate-500">أفضل {data.leaderboard.length} طالب</p>
                </div>
              </div>

              <div className="space-y-2">
                {data.leaderboard.slice(0, 10).map((entry) => {
                  const isCurrentUser = entry.student_name === data.student_name && entry.rank === data.ranking;
                  
                  return (
                    <div
                      key={`${entry.rank}-${entry.student_name}`}
                      className={`
                        flex items-center gap-3 p-3 rounded-2xl border-2 transition-all
                        ${isCurrentUser 
                          ? 'bg-brand-50 border-brand-300 shadow-sm scale-[1.02]' 
                          : 'bg-white border-slate-100 hover:border-slate-200'
                        }
                      `}
                    >
                      <div className={`
                        w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0
                        ${entry.rank === 1 ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white' : ''}
                        ${entry.rank === 2 ? 'bg-gradient-to-br from-slate-400 to-slate-500 text-white' : ''}
                        ${entry.rank === 3 ? 'bg-gradient-to-br from-amber-600 to-orange-600 text-white' : ''}
                        ${entry.rank > 3 ? 'bg-slate-100 text-slate-600' : ''}
                      `}>
                        {entry.rank <= 3 ? getRankEmoji(entry.rank) : entry.rank}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className={`font-black text-sm truncate ${isCurrentUser ? 'text-brand-700' : 'text-slate-900'}`}>
                          {entry.student_name}
                          {isCurrentUser && <span className="mr-2 text-[10px] bg-brand-600 text-white px-2 py-0.5 rounded-full">أنت</span>}
                        </p>
                        <p className="text-xs text-slate-500">
                          {entry.score}/{entry.total_score} • {formatTime(entry.completion_time_seconds)}
                        </p>
                      </div>
                      
                      <div className="text-left">
                        <p className="font-black text-slate-900 text-sm">{Math.round(entry.percentage)}%</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Link to={`/exam/${slug}/leaderboard`} className="block mt-4">
                <Button variant="secondary" fullWidth size="sm">
                  عرض كل المتصدرين
                </Button>
              </Link>
            </Card>
            )}

            {/* Actions */}
            <Card>
              <h3 className="font-black text-slate-900 mb-4">إيه اللي جاي؟</h3>
              <div className="space-y-3">
                <Button fullWidth variant="secondary" onClick={() => navigator.share ? navigator.share({ title: `جبت ${data.percentage}% في ${data.exam_title}`, text: `جبت ${data.score} من ${data.total_score} وترتيبي #${data.ranking} في امتحان ${data.exam_title} على منصة جبت كام؟` }).catch(() => {}) : null}>
                  <Share2 className="w-4 h-4 ml-2" />
                  شارك نتيجتك
                </Button>
                <Link to={`/exam/${slug}`} className="block">
                  <Button fullWidth variant="secondary">
                    <RotateCcw className="w-4 h-4 ml-2" />
                    إعادة الامتحان
                  </Button>
                </Link>
                <Link to="/" className="block">
                  <Button fullWidth>
                    <Home className="w-4 h-4 ml-2" />
                    الرئيسية
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
