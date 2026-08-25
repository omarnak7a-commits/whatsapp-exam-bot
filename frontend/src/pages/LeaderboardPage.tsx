import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { Exam, LeaderboardEntry } from '../types';
import { Trophy, Medal, Award, Clock, Flame } from 'lucide-react';

export const LeaderboardPage: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExams = async () => {
    try {
      const data = await apiFetch<Exam[]>('/exams');
      setExams(data);
      if (data.length > 0) {
        setSelectedExamId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLeaderboard = async (examId: number) => {
    setLoading(true);
    try {
      const data = await apiFetch<LeaderboardEntry[]>(`/exams/${examId}/leaderboard`);
      setLeaderboard(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  useEffect(() => {
    if (selectedExamId) {
      fetchLeaderboard(selectedExamId);
    }
  }, [selectedExamId]);

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-full font-extrabold text-sm flex items-center gap-1">
          <Trophy className="w-4 h-4 text-amber-400" /> المركز الأول 🥇
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="bg-slate-300/20 text-slate-200 border border-slate-300/40 px-3 py-1 rounded-full font-bold text-sm flex items-center gap-1">
          <Medal className="w-4 h-4 text-slate-300" /> المركز الثاني 🥈
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="bg-amber-700/20 text-amber-500 border border-amber-700/40 px-3 py-1 rounded-full font-bold text-sm flex items-center gap-1">
          <Award className="w-4 h-4 text-amber-600" /> المركز الثالث 🥉
        </span>
      );
    }
    return <span className="font-bold text-slate-400 px-3 py-1">#{rank}</span>;
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return mins > 0 ? `${mins} دقيقة و${s} ثانية` : `${s} ثانية`;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-7 h-7 text-amber-400" /> لوحة الأوائل والترتيب
          </h2>
          <p className="text-slate-400 text-sm mt-1">المتصدرون حسب أعلى درجة وأسرع وقت في حل الامتحان</p>
        </div>

        {exams.length > 0 && (
          <select
            value={selectedExamId || ''}
            onChange={(e) => setSelectedExamId(Number(e.target.value))}
            className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-medium"
          >
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">جاري احتساب الترتيب...</div>
      ) : leaderboard.length === 0 ? (
        <div className="bg-slate-800/30 border border-slate-700/60 rounded-3xl p-12 text-center text-slate-400">
          لا يوجد طلاب مكتملين لهذا الامتحان حتى الآن.
        </div>
      ) : (
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-3xl overflow-hidden shadow-2xl">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-700/60">
              <tr>
                <th className="px-6 py-4">الترتيب</th>
                <th className="px-6 py-4">اسم الطالب</th>
                <th className="px-6 py-4">رقم الواتساب</th>
                <th className="px-6 py-4">الدرجة</th>
                <th className="px-6 py-4">النسبة المئوية</th>
                <th className="px-6 py-4">وقت الحل (كسر التعادل)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {leaderboard.map((entry) => (
                <tr
                  key={entry.rank}
                  className={`hover:bg-slate-800/80 transition ${
                    entry.rank === 1 ? 'bg-amber-500/5' : ''
                  }`}
                >
                  <td className="px-6 py-4">{getRankBadge(entry.rank)}</td>
                  <td className="px-6 py-4 font-bold text-white text-base">{entry.student_name}</td>
                  <td className="px-6 py-4 text-slate-400 font-mono" dir="ltr">
                    +{entry.whatsapp_number}
                  </td>
                  <td className="px-6 py-4 font-bold text-white">
                    {entry.score} / {entry.total_questions}
                  </td>
                  <td className="px-6 py-4 font-extrabold text-emerald-400 text-lg">
                    {entry.percentage}%
                  </td>
                  <td className="px-6 py-4 text-cyan-400 text-xs font-semibold flex items-center gap-1.5 pt-5">
                    <Clock className="w-3.5 h-3.5" />
                    {formatTime(entry.completion_seconds)}
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
