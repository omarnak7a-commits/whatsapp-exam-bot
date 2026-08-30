import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Search, Download, Eye, Clock, Trophy, Filter, Calendar } from 'lucide-react';

interface Attempt {
  id: number;
  exam_id: number;
  exam_title: string;
  student_id: number;
  student_name: string;
  score: number;
  total_score: number;
  percentage: number;
  completion_time_seconds: number;
  ranking?: number;
  status: string;
  started_at: string;
  submitted_at?: string;
}

interface Exam {
  id: number;
  title: string;
}

export const ResultsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [examFilter, setExamFilter] = useState<number | null>(() => {
    const v = searchParams.get('exam');
    const n = v ? parseInt(v, 10) : NaN;
    return Number.isFinite(n) ? n : null;
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [attemptsData, examsData] = await Promise.all([
        apiFetch<Attempt[]>(`/results?search=${search}&exam_id=${examFilter || ''}&status=${statusFilter !== 'all' ? statusFilter : ''}`),
        apiFetch<Exam[]>('/exams'),
      ]);
      setAttempts(attemptsData);
      setExams(examsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [examFilter, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const handleExport = async () => {
    if (!examFilter) {
      alert('اختر امتحان أولاً للتصدير');
      return;
    }
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`/api/exams/${examFilter}/results/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('فشل التصدير');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `exam_${examFilter}_results.csv`;
      a.click();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900">النتائج</h1>
          <p className="text-slate-500 mt-1 font-medium">متابعة نتائج الطلاب وترتيبهم</p>
        </div>
        <Button variant="secondary" onClick={handleExport} disabled={!examFilter}>
          <Download className="w-4 h-4 ml-2" />
          تصدير CSV
        </Button>
      </div>

      <Card padding="sm" className="flex flex-col lg:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ابحث باسم الطالب..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-4 pr-11 py-3 text-sm font-medium focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20"
            />
          </div>
          <Button type="submit" variant="secondary">بحث</Button>
        </form>

        <div className="flex gap-2 flex-wrap">
          <select
            value={examFilter || ''}
            onChange={(e) => setExamFilter(e.target.value ? parseInt(e.target.value) : null)}
            className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-brand-500"
          >
            <option value="">كل الامتحانات</option>
            {exams.map(exam => (
              <option key={exam.id} value={exam.id}>{exam.title}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-brand-500"
          >
            <option value="all">كل الحالات</option>
            <option value="COMPLETED">مكتمل</option>
            <option value="EXPIRED">منتهي</option>
            <option value="IN_PROGRESS">قيد التقدم</option>
          </select>
        </div>
      </Card>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : attempts.length === 0 ? (
        <Card className="text-center py-16">
          <Trophy className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="font-black text-slate-900 text-lg">لسه مفيش نتائج</h3>
          <p className="text-slate-500 text-sm mt-2">أول ما الطلاب يبدأوا يمتحنوا، النتائج هتظهر هنا</p>
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-right px-6 py-4 text-xs font-black tracking-wide text-slate-500">الطالب</th>
                  <th className="text-right px-6 py-4 text-xs font-black tracking-wide text-slate-500">الامتحان</th>
                  <th className="text-center px-6 py-4 text-xs font-black tracking-wide text-slate-500">الدرجة</th>
                  <th className="text-center px-6 py-4 text-xs font-black tracking-wide text-slate-500">النسبة</th>
                  <th className="text-center px-6 py-4 text-xs font-black tracking-wide text-slate-500">الوقت</th>
                  <th className="text-center px-6 py-4 text-xs font-black tracking-wide text-slate-500">الترتيب</th>
                  <th className="text-center px-6 py-4 text-xs font-black tracking-wide text-slate-500">الحالة</th>
                  <th className="text-center px-6 py-4 text-xs font-black tracking-wide text-slate-500">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attempts.map((attempt) => (
                  <tr key={attempt.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white font-black text-sm">
                          {attempt.student_name.charAt(0)}
                        </div>
                        <span className="font-bold text-slate-900 text-sm">{attempt.student_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-700 line-clamp-1">{attempt.exam_title}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-black text-slate-900">{attempt.score}/{attempt.total_score}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-black ${
                        attempt.percentage >= 80 ? 'bg-emerald-50 text-emerald-700' :
                        attempt.percentage >= 60 ? 'bg-amber-50 text-amber-700' :
                        'bg-red-50 text-red-700'
                      }`}>
                        {Math.round(attempt.percentage)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-mono font-bold text-slate-600 flex items-center justify-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatTime(attempt.completion_time_seconds)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {attempt.ranking ? (
                        <span className="font-black text-brand-600">#{attempt.ranking}</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant={attempt.status === 'COMPLETED' ? 'success' : attempt.status === 'EXPIRED' ? 'danger' : 'warning'} size="sm">
                        {attempt.status === 'COMPLETED' ? 'مكتمل' : attempt.status === 'EXPIRED' ? 'منتهي' : attempt.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link to={`/admin/results/${attempt.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export const ResultDetailPage: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const result = await apiFetch(`/results/${attemptId}`);
        setData(result);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [attemptId]);

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>;
  }

  if (!data) {
    return <div className="text-center py-20 text-slate-500">النتيجة غير موجودة</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <Link to="/admin/results" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900">
        ← العودة للنتائج
      </Link>

      <Card className="border-2 border-brand-100">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900">{data.student_name}</h1>
            <p className="text-slate-500 mt-1">{data.exam_title}</p>
          </div>
          <Badge variant={data.status === 'COMPLETED' ? 'success' : 'warning'}>{data.status}</Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-slate-900">{data.score}/{data.total_score}</p>
            <p className="text-xs text-slate-500 mt-1">الدرجة</p>
          </div>
          <div className="bg-brand-50 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-brand-700">{Math.round(data.percentage)}%</p>
            <p className="text-xs text-brand-600/70 mt-1">النسبة</p>
          </div>
          <div className="bg-amber-50 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-amber-700">#{data.ranking || '-'}</p>
            <p className="text-xs text-amber-600/70 mt-1">الترتيب</p>
          </div>
          <div className="bg-emerald-50 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-emerald-700">{Math.floor(data.completion_time_seconds / 60)}:{(data.completion_time_seconds % 60).toString().padStart(2, '0')}</p>
            <p className="text-xs text-emerald-600/70 mt-1">الوقت</p>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="font-black text-slate-900 text-lg mb-4">تفاصيل الإجابات</h3>
        <div className="space-y-3">
          {data.answers?.map((ans: any, idx: number) => (
            <div key={ans.question_id} className={`p-4 rounded-2xl border-2 ${ans.is_correct ? 'bg-emerald-50/50 border-emerald-200/50' : 'bg-red-50/50 border-red-200/50'}`}>
              <p className="font-bold text-slate-900 text-sm mb-3">{idx + 1}. {ans.question_text}</p>
              <div className="space-y-2 text-sm">
                <div className="flex gap-2">
                  <span className="text-slate-500 font-bold min-w-[70px]">إجابته:</span>
                  <span className={`font-bold ${ans.is_correct ? 'text-emerald-700' : 'text-red-700'}`}>{ans.selected_option_text || 'لم يجب'}</span>
                </div>
                {!ans.is_correct && (
                  <div className="flex gap-2">
                    <span className="text-slate-500 font-bold min-w-[70px]">الصحيحة:</span>
                    <span className="font-bold text-emerald-700">{ans.correct_option_text}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
