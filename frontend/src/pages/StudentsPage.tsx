import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { Student } from '../types';
import { Search, UserCheck, MessageSquare, Award, Percent } from 'lucide-react';

export const StudentsPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Student[]>('/students');
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

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.whatsapp_number.includes(searchTerm)
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">سجل الطلاب</h2>
          <p className="text-slate-400 text-sm mt-1">عرض الطلاب المتفاعلين عبر واتساب ومتابعة أدائهم</p>
        </div>

        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="البحث باسم الطالب أو رقم الواتساب..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 pr-11 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <Search className="w-5 h-5 text-slate-400 absolute right-3.5 top-3" />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">جاري تحميل سجل الطلاب...</div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-slate-800/30 border border-slate-700/60 rounded-3xl p-12 text-center text-slate-400">
          لا يوجد طلاب مطبقون لبحثك.
        </div>
      ) : (
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-3xl overflow-hidden shadow-xl">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-700/60">
              <tr>
                <th className="px-6 py-4">اسم الطالب</th>
                <th className="px-6 py-4">رقم الواتساب</th>
                <th className="px-6 py-4">عدد المحاولات</th>
                <th className="px-6 py-4">متوسط النسبة</th>
                <th className="px-6 py-4">أفضل درجة</th>
                <th className="px-6 py-4">تاريخ الانضمام</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {filteredStudents.map((s) => (
                <tr key={s.id} className="hover:bg-slate-800/80 transition">
                  <td className="px-6 py-4 font-bold text-white flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-700 flex items-center justify-center text-slate-200">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <span>{s.name}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-300 font-mono" dir="ltr">
                    +{s.whatsapp_number}
                  </td>
                  <td className="px-6 py-4 text-slate-300 font-bold">{s.total_attempts ?? 0}</td>
                  <td className="px-6 py-4 text-emerald-400 font-bold">{s.average_score ?? 0}%</td>
                  <td className="px-6 py-4 text-cyan-400 font-bold">{s.best_score ?? 0}%</td>
                  <td className="px-6 py-4 text-slate-400 text-xs">
                    {new Date(s.created_at).toLocaleDateString('ar-EG')}
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
