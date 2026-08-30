import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { Card, StatsCard } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { FileText, CheckCircle, Users, Award, Percent, Trophy, RefreshCw, TrendingUp, Clock, Eye, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardStats {
  total_exams: number;
  published_exams: number;
  total_students: number;
  total_completed_attempts: number;
  average_score_percentage: number;
  highest_score_percentage: number;
}

interface Attempt {
  id: number;
  exam_title: string;
  student_name: string;
  score: number;
  total_score: number;
  percentage: number;
  status: string;
  started_at: string;
}

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentAttempts, setRecentAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsData, attemptsData] = await Promise.all([
        apiFetch<DashboardStats>('/dashboard/stats'),
        apiFetch<Attempt[]>('/dashboard/recent-attempts?limit=8'),
      ]);
      setStats(statsData);
      setRecentAttempts(attemptsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const cards = [
    {
      title: 'إجمالي الامتحانات',
      value: stats?.total_exams ?? 0,
      icon: <FileText className="w-6 h-6" />,
      color: 'brand' as const,
      trend: `${stats?.published_exams ?? 0} منشور`,
    },
    {
      title: 'الطلاب المشاركين',
      value: stats?.total_students ?? 0,
      icon: <Users className="w-6 h-6" />,
      color: 'purple' as const,
      trend: 'طالب مسجل',
    },
    {
      title: 'المحاولات المكتملة',
      value: stats?.total_completed_attempts ?? 0,
      icon: <Award className="w-6 h-6" />,
      color: 'emerald' as const,
      trend: 'محاولة مكتملة',
    },
    {
      title: 'متوسط النتائج',
      value: `${stats?.average_score_percentage ?? 0}%`,
      icon: <Percent className="w-6 h-6" />,
      color: 'amber' as const,
      trend: `أعلى نتيجة ${stats?.highest_score_percentage ?? 0}%`,
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900">أهلاً بيك! 👋</h1>
          <p className="text-slate-500 mt-1 font-medium">ده ملخص أداء منصتك النهاردة</p>
        </div>
        <Button variant="secondary" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, idx) => (
          <StatsCard
            key={idx}
            title={card.title}
            value={loading ? '...' : card.value}
            icon={card.icon}
            color={card.color}
            trend={card.trend}
          />
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Attempts */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-brand-600" />
              آخر المحاولات
            </h3>
            <Link to="/admin/results">
              <Button variant="ghost" size="sm">
                عرض الكل
                <ArrowUpRight className="w-4 h-4 mr-1" />
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : recentAttempts.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Award className="w-8 h-8 text-slate-400" />
              </div>
              <p className="font-bold text-slate-600">لسه مفيش محاولات</p>
              <p className="text-sm text-slate-500 mt-1">أول ما الطلاب يبدأوا يمتحنوا هتظهر هنا</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentAttempts.map((attempt) => (
                <div key={attempt.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white font-black text-sm">
                      {attempt.student_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{attempt.student_name}</p>
                      <p className="text-xs text-slate-500">{attempt.exam_title}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-left">
                      <p className="font-black text-slate-900 text-sm">{attempt.score}/{attempt.total_score}</p>
                      <p className="text-xs text-slate-500">{attempt.percentage}%</p>
                    </div>
                    <Badge variant={attempt.status === 'COMPLETED' ? 'success' : 'warning'} size="sm">
                      {attempt.status === 'COMPLETED' ? 'مكتمل' : attempt.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quick Actions & Info */}
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-brand-600 to-brand-700 text-white border-0 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-accent-500/20 rounded-full blur-2xl" />
            
            <div className="relative">
              <div className="w-12 h-12 bg-white/15 backdrop-blur rounded-2xl flex items-center justify-center mb-4">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-black text-xl mb-2">جاهز تبدأ؟</h3>
              <p className="text-brand-100 text-sm leading-relaxed mb-6">
                أنشئ أول امتحان ليك وشارك الرابط مع الطلاب. هتشوف النتائج لحظياً!
              </p>
              <Link to="/admin/exams/new">
                <Button variant="secondary" className="bg-white text-brand-700 hover:bg-brand-50 border-0 font-black">
                  إنشاء امتحان جديد
                </Button>
              </Link>
            </div>
          </Card>

          <Card>
            <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              نصائح سريعة
            </h3>
            <div className="space-y-3 text-sm">
              {[
                'استخدم عناوين واضحة وجذابة للامتحانات',
                'خلي مدة الامتحان مناسبة لعدد الأسئلة',
                'شارك رابط الامتحان في جروبات الطلاب',
                'تابع لوحة المتصدرين لتحفيز الطلاب',
              ].map((tip, i) => (
                <div key={i} className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-xs font-black flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-slate-600 font-medium">{tip}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
