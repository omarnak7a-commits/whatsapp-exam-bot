import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { publicFetch } from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Logo } from '../../components/ui/Logo';
import { PublicNavbar } from '../../components/layout/Navbar';
import { Trophy, Clock, Home, Medal } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  student_name: string;
  score: number;
  total_score: number;
  percentage: number;
  completion_time_seconds: number;
  submitted_at?: string;
}

export const PublicLeaderboardPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [examTitle, setExamTitle] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [lb, exam] = await Promise.all([
          publicFetch<LeaderboardEntry[]>(`/public/exams/${slug}/leaderboard`),
          publicFetch<any>(`/public/exams/${slug}`),
        ]);
        setLeaderboard(lb);
        setExamTitle(exam.title);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (slug) fetchData();
  }, [slug]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFF] dark:bg-[#070B1A]" dir="rtl">
      <PublicNavbar />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-[20px] flex items-center justify-center mx-auto mb-4 shadow-xl shadow-amber-500/20">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">لوحة المتصدرين</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2 font-medium">{examTitle}</p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : leaderboard.length === 0 ? (
          <Card className="text-center py-16">
            <Trophy className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="font-black text-slate-900 dark:text-white">لسه مفيش متصدرين</h3>
            <p className="text-sm text-slate-500 mt-2">كون أول واحد يمتحن ويتصدر اللوحة! 🚀</p>
            <Link to={`/exam/${slug}`} className="inline-block mt-6">
              <Button>ابدأ الامتحان</Button>
            </Link>
          </Card>
        ) : (
          <>
            {/* Top 3 */}
            {leaderboard.length >= 3 && (
              <div className="grid md:grid-cols-3 gap-4 mb-8">
                {[1,0,2].map((idx) => {
                  const entry = leaderboard[idx];
                  if (!entry) return null;
                  return (
                    <Card key={entry.rank} className={`text-center ${entry.rank === 1 ? 'border-2 border-amber-200 dark:border-amber-800/50 md:scale-105' : ''}`}>
                      <div className="text-4xl mb-3">
                        {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
                      </div>
                      <h3 className="font-black text-slate-900 dark:text-white">{entry.student_name}</h3>
                      <p className="text-sm text-slate-500 mt-1">{entry.score}/{entry.total_score} • {Math.round(entry.percentage)}%</p>
                      <p className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(entry.completion_time_seconds)}
                      </p>
                    </Card>
                  );
                })}
              </div>
            )}

            <Card padding="none" className="overflow-hidden">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {leaderboard.map((entry) => (
                  <div key={`${entry.rank}-${entry.student_name}`} className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${
                      entry.rank === 1 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' :
                      entry.rank === 2 ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' :
                      entry.rank === 3 ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400' :
                      'bg-slate-50 dark:bg-slate-800 text-slate-500'
                    }`}>
                      {entry.rank <= 3 ? (entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉') : entry.rank}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-900 dark:text-white truncate">{entry.student_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{entry.score}/{entry.total_score} • {formatTime(entry.completion_time_seconds)}</p>
                    </div>
                    
                    <div className="text-left">
                      <p className="font-black text-slate-900 dark:text-white">{Math.round(entry.percentage)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <div className="flex gap-3 mt-8 justify-center">
              <Link to={`/exam/${slug}`}>
                <Button size="lg">
                  ابدأ الامتحان
                </Button>
              </Link>
              <Link to="/">
                <Button variant="secondary" size="lg">
                  <Home className="w-5 h-5 ml-2" />
                  الرئيسية
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
