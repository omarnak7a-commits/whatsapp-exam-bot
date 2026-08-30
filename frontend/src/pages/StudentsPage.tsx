import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Search, Users, Trophy, Clock, BookOpen, TrendingUp } from 'lucide-react';

interface Student {
  id: number;
  name: string;
  total_attempts: number;
  average_percentage: number;
  best_percentage: number;
  exams_count: number;
  last_attempt_at?: string;
}

export const StudentsPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Student[]>(`/students?search=${search}`);
      setStudents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStudents();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-black text-slate-900">المشاركون</h1>
        <p className="text-slate-500 mt-1 font-medium">متابعة أداء المشاركين وإحصائياتهم — بدون حسابات، كله بالاسم بس</p>
      </div>

      <Card padding="sm">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم الطالب..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-4 pr-11 py-3 text-sm font-medium focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20"
            />
          </div>
          <button type="submit" className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-colors">
            بحث
          </button>
        </form>
      </Card>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-48 bg-slate-100 rounded-[24px] animate-pulse" />
          ))}
        </div>
      ) : students.length === 0 ? (
        <Card className="text-center py-16">
          <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="font-black text-slate-900">لسه مفيش طلاب</h3>
          <p className="text-sm text-slate-500 mt-2">أول ما الطلاب يبدأوا يمتحنوا هتظهر بياناتهم هنا</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {students.map((student) => (
            <Card key={student.id} hover className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-brand-500/5 to-purple-500/5 rounded-full blur-2xl -translate-y-16 translate-x-16" />
              
              <div className="relative">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white font-black text-lg">
                    {student.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-slate-900 truncate">{student.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {student.last_attempt_at ? `آخر ظهور: ${new Date(student.last_attempt_at).toLocaleDateString('ar-EG')}` : 'لم يشارك بعد'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-2xl p-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-1">
                      <BookOpen className="w-4 h-4" />
                      <span>المحاولات</span>
                    </div>
                    <p className="text-xl font-black text-slate-900">{student.total_attempts}</p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-1">
                      <Trophy className="w-4 h-4" />
                      <span>أفضل نتيجة</span>
                    </div>
                    <p className="text-xl font-black text-emerald-600">{Math.round(student.best_percentage)}%</p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-1">
                      <TrendingUp className="w-4 h-4" />
                      <span>المتوسط</span>
                    </div>
                    <p className="text-xl font-black text-brand-600">{Math.round(student.average_percentage)}%</p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-1">
                      <Clock className="w-4 h-4" />
                      <span>الامتحانات</span>
                    </div>
                    <p className="text-xl font-black text-slate-900">{student.exams_count}</p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
