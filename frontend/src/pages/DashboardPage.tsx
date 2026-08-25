import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { DashboardStats } from '../types';
import { FileText, CheckCircle, Users, Award, Percent, Trophy, RefreshCw } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<DashboardStats>('/dashboard/stats');
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const cards = [
    {
      title: 'إجمالي الامتحانات',
      value: stats?.total_exams ?? 0,
      icon: FileText,
      color: 'from-blue-500/20 to-blue-600/5 text-blue-400 border-blue-500/30',
    },
    {
      title: 'الامتحانات النشطة (المنشورة)',
      value: stats?.published_exams ?? 0,
      icon: CheckCircle,
      color: 'from-emerald-500/20 to-emerald-600/5 text-emerald-400 border-emerald-500/30',
    },
    {
      title: 'إجمالي الطلاب المسجلين',
      value: stats?.total_students ?? 0,
      icon: Users,
      color: 'from-purple-500/20 to-purple-600/5 text-purple-400 border-purple-500/30',
    },
    {
      title: 'المحاولات المكتملة',
      value: stats?.total_completed_attempts ?? 0,
      icon: Award,
      color: 'from-amber-500/20 to-amber-600/5 text-amber-400 border-amber-500/30',
    },
    {
      title: 'متوسط درجات الطلاب',
      value: `${stats?.average_score_percentage ?? 0}%`,
      icon: Percent,
      color: 'from-cyan-500/20 to-cyan-600/5 text-cyan-400 border-cyan-500/30',
    },
    {
      title: 'أعلى نسبة محققة',
      value: `${stats?.highest_score_percentage ?? 0}%`,
      icon: Trophy,
      color: 'from-rose-500/20 to-rose-600/5 text-rose-400 border-rose-500/30',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">نظرة عامة على الإحصائيات</h2>
          <p className="text-slate-400 text-sm mt-1">ملخص أداء الامتحانات وتفاعلات الطلاب عبر واتساب</p>
        </div>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 rounded-xl text-sm transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>تحديث الإحصائيات</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={`bg-gradient-to-br ${card.color} border rounded-2xl p-6 relative overflow-hidden backdrop-blur-sm`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-400">{card.title}</p>
                  <h3 className="text-3xl font-extrabold text-white mt-2">
                    {loading ? '...' : card.value}
                  </h3>
                </div>
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700/50">
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
