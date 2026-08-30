import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Trophy, Medal, Crown, Clock, Target } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  student_name: string;
  score: number;
  total_score: number;
  percentage: number;
  completion_time_seconds: number;
  submitted_at?: string;
}

interface Exam {
  id: number;
  title: string;
  status: string;
}

export const LeaderboardPage: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const data = await apiFetch<Exam[]>('/exams');
        setExams(data.filter(e => e.status === 'PUBLISHED' || e.status === 'CLOSED'));
        if (data.length > 0) {
          const published = data.find(e => e.status === 'PUBLISHED') || data[0];
          setSelectedExam(published.id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchExams();
  }, []);

  useEffect(() => {
    if (!selectedExam) return;
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const data = await apiFetch<LeaderboardEntry[]>(`/exams/${selectedExam}/leaderboard`);
        setLeaderboard(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [selectedExam]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-amber-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-slate-400" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
    return <span className="font-black text-slate-500">#{rank}</span>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
          <Trophy className="w-8 h-8 text-amber-500" />
          لوحة المتصدرين
        </h1>
        <p className="text-slate-500 mt-1 font-medium">ترتيب الطلاب حسب الأداء والسرعة</p>
      </div>

      <Card padding="sm">
        <div className="flex gap-2 overflow-x-auto">
          {exams.map((exam) => (
            <button
              key={exam.id}
              onClick={() => setSelectedExam(exam.id)}
              className={`px-5 py-3 rounded-2xl font-bold text-sm whitespace-nowrap border-2 transition-all ${
                selectedExam === exam.id
                  ? 'bg-brand-600 border-brand-600 text-white shadow-brand'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {exam.title}
            </button>
          ))}
        </div>
      </Card>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : leaderboard.length === 0 ? (
        <Card className="text-center py-16">
          <Trophy className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="font-black text-slate-900">لسه مفيش متصدرين</h3>
          <p className="text-sm text-slate-500 mt-2">أول ما الطلاب يخلصوا الامتحان، الترتيب هيظهر هنا</p>
        </Card>
      ) : (
        <>
          {/* Top 3 Podium */}
          {leaderboard.length >= 3 && (
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {[1,0,2].map((idx) => {
                const entry = leaderboard[idx];
                if (!entry) return null;
                const isFirst = entry.rank === 1;
                
                return (
                  <Card key={entry.rank} className={`text-center relative overflow-hidden ${isFirst ? 'md:order-2 border-2 border-amber-200 shadow-xl md:scale-105 md:-mt-4' : idx === 0 ? 'md:order-1' : 'md:order-3'}`}>
                    {isFirst && (
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-400/20 to-orange-500/20 rounded-full blur-2xl -translate-y-16 translate-x-16" />
                    )}
                    
                    <div className="relative">
                      <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center text-3xl mb-4 ${
                        entry.rank === 1 ? 'bg-gradient-to-br from-amber-400 to-amber-500 shadow-lg shadow-amber-500/30' :
                        entry.rank === 2 ? 'bg-gradient-to-br from-slate-400 to-slate-500' :
                        'bg-gradient-to-br from-amber-600 to-orange-600'
                      }`}>
                        {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
                      </div>
                      
                      <h3 className="font-black text-slate-900 text-lg">{entry.student_name}</h3>
                      <p className="text-sm text-slate-500 mt-1">المركز {entry.rank}</p>
                      
                      <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                        <div className="bg-slate-50 rounded-xl p-2">
                          <p className="font-black text-slate-900">{entry.score}/{entry.total_score}</p>
                          <p className="text-[11px] text-slate-500">الدرجة</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-2">
                          <p className="font-black text-brand-600">{Math.round(entry.percentage)}%</p>
                          <p className="text-[11px] text-slate-500">النسبة</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Full List */}
          <Card padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-center px-6 py-4 text-xs font-black tracking-wide text-slate-500">الترتيب</th>
                    <th className="text-right px-6 py-4 text-xs font-black tracking-wide text-slate-500">الطالب</th>
                    <th className="text-center px-6 py-4 text-xs font-black tracking-wide text-slate-500">الدرجة</th>
                    <th className="text-center px-6 py-4 text-xs font-black tracking-wide text-slate-500">النسبة</th>
                    <th className="text-center px-6 py-4 text-xs font-black tracking-wide text-slate-500">الوقت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaderboard.map((entry) => (
                    <tr key={`${entry.rank}-${entry.student_name}`} className={`hover:bg-slate-50/50 ${entry.rank <= 3 ? 'bg-amber-50/30' : ''}`}>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center">
                          {entry.rank <= 3 ? (
                            <span className="text-xl">{entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}</span>
                          ) : (
                            <span className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center font-black text-sm text-slate-600">
                              {entry.rank}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white font-black">
                            {entry.student_name.charAt(0)}
                          </div>
                          <span className="font-bold text-slate-900">{entry.student_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-black text-slate-900">
                        {entry.score}/{entry.total_score}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-black ${
                          entry.percentage >= 80 ? 'bg-emerald-50 text-emerald-700' :
                          entry.percentage >= 60 ? 'bg-amber-50 text-amber-700' :
                          'bg-red-50 text-red-700'
                        }`}>
                          {Math.round(entry.percentage)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-mono text-sm font-bold text-slate-600 flex items-center justify-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatTime(entry.completion_time_seconds)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};
