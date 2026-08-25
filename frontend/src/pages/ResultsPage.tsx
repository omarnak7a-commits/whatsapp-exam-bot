import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { AttemptResult } from '../types';
import { Award, Clock, CheckCircle, XCircle, AlertTriangle, Trophy } from 'lucide-react';

export const ResultsPage: React.FC = () => {
  const [results, setResults] = useState<AttemptResult[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<AttemptResult[]>('/results');
      setResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const getStatusBadge = (status: string) => {
    if (status === 'COMPLETED') {
      return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full text-xs font-semibold">مكتمل</span>;
    }
    if (status === 'EXPIRED') {
      return <span className="bg-rose-500/10 text-rose-400 border border-rose-500/30 px-2.5 py-1 rounded-full text-xs font-semibold">انتهى الوقت</span>;
    }
    return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-full text-xs font-semibold">جاري الحل</span>;
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return mins > 0 ? `${mins} دقيقة و${s} ثانية` : `${s} ثانية`;
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">سجل المحاولات والنتائج التفصيلي</h2>
        <p className="text-slate-400 text-sm mt-1">سجل حي لكافة إجابات ومحاولات الطلاب في امتحانات واتساب</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">جاري تحميل المحاولات...</div>
      ) : results.length === 0 ? (
        <div className="bg-slate-800/30 border border-slate-700/60 rounded-3xl p-12 text-center text-slate-400">
          لا يوجد محاولات مسجلة بعد.
        </div>
      ) : (
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-3xl overflow-hidden shadow-xl">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-700/60">
              <tr>
                <th className="px-6 py-4">اسم الطالب</th>
                <th className="px-6 py-4">الامتحان</th>
                <th className="px-6 py-4">الحالة</th>
                <th className="px-6 py-4">الدرجة</th>
                <th className="px-6 py-4">النسبة</th>
                <th className="px-6 py-4">الوقت المستغرق</th>
                <th className="px-6 py-4">الترتيب</th>
                <th className="px-6 py-4">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {results.map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/80 transition">
                  <td className="px-6 py-4 font-bold text-white">
                    <div>{r.student_name}</div>
                    <div className="text-xs text-slate-500 font-mono" dir="ltr">+{r.student_whatsapp}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-300 font-medium">{r.exam_title}</td>
                  <td className="px-6 py-4">{getStatusBadge(r.status)}</td>
                  <td className="px-6 py-4 text-white font-bold">
                    {r.correct_answers} / {r.total_questions}
                  </td>
                  <td className="px-6 py-4 font-extrabold text-emerald-400">{r.percentage}%</td>
                  <td className="px-6 py-4 text-slate-400 text-xs">{formatTime(r.completion_seconds)}</td>
                  <td className="px-6 py-4 font-bold text-amber-400">
                    {r.final_rank ? `#${r.final_rank}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-xs">
                    {new Date(r.started_at).toLocaleString('ar-EG')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
