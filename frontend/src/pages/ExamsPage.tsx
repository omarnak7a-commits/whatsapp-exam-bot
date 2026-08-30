import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { FileText, Plus, Clock, Users, Eye, Edit, Trash2, Share2, Copy, MoreVertical, Search, Filter } from 'lucide-react';
import { examLink, copyExamLink } from '../utils/examLink';

interface Exam {
  id: number;
  title: string;
  description?: string;
  public_slug?: string;
  duration_minutes: number;
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
  total_questions_count: number;
  total_attempts_count: number;
  created_at: string;
  published_at?: string;
}

export const ExamsPage: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');

  const fetchExams = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Exam[]>('/exams');
      setExams(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('متأكد عايز تحذف الامتحان ده؟')) return;
    try {
      await apiFetch(`/exams/${id}`, { method: 'DELETE' });
      fetchExams();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePublish = async (id: number) => {
    try {
      await apiFetch(`/exams/${id}/publish`, { method: 'POST' });
      fetchExams();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleClose = async (id: number) => {
    try {
      await apiFetch(`/exams/${id}/close`, { method: 'POST' });
      fetchExams();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const copyLink = (slug?: string) => {
    if (!slug) return;
    copyExamLink(slug);
  };

  const filteredExams = exams.filter(exam => {
    const matchesSearch = exam.title.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || exam.status === filter;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return <Badge variant="success">منشور</Badge>;
      case 'DRAFT':
        return <Badge variant="warning">مسودة</Badge>;
      case 'CLOSED':
        return <Badge variant="danger">مغلق</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">الامتحانات</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">إدارة وإنشاء الامتحانات الخاصة بيك</p>
        </div>
        <Link to="/admin/exams/new">
          <Button size="lg">
            <Plus className="w-5 h-5 ml-2" />
            إنشاء امتحان
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card padding="sm" className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ابحث عن امتحان..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-4 pr-11 py-3 text-sm font-medium focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 transition-all"
          />
        </div>
        <div className="flex gap-2">
          {[
            { value: 'all', label: 'الكل' },
            { value: 'PUBLISHED', label: 'منشور' },
            { value: 'DRAFT', label: 'مسودة' },
            { value: 'CLOSED', label: 'مغلق' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2.5 rounded-2xl text-sm font-bold border transition-all ${
                filter === f.value
                  ? 'bg-brand-600 text-white border-brand-600 shadow-brand'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </Card>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-64 bg-slate-100 dark:bg-slate-800 rounded-[24px] animate-pulse" />
          ))}
        </div>
      ) : filteredExams.length === 0 ? (
        <Card className="text-center py-16">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white">لسه مفيش امتحانات</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">ابدأ بإنشاء أول امتحان ليك وشاركه مع الطلاب</p>
          <Link to="/admin/exams/new" className="inline-block mt-6">
            <Button>
              <Plus className="w-5 h-5 ml-2" />
              إنشاء امتحان جديد
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExams.map((exam) => (
            <Card key={exam.id} hover className="group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-brand-500/5 to-accent-500/5 rounded-full blur-2xl -translate-y-16 translate-x-16 group-hover:from-brand-500/10 group-hover:to-accent-500/10 transition-all" />
              
              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  {getStatusBadge(exam.status)}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => copyLink(exam.public_slug)}
                      className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
                      title="نسخ الرابط"
                    >
                      <Copy className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </button>
                    <Link
                      to={`/admin/exams/${exam.id}`}
                      className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
                    >
                      <Edit className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </Link>
                  </div>
                </div>

                <Link to={`/admin/exams/${exam.id}`} className="block">
                  <h3 className="font-black text-slate-900 dark:text-white text-lg leading-tight line-clamp-2 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    {exam.title}
                  </h3>
                  {exam.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                      {exam.description}
                    </p>
                  )}
                </Link>

                <div className="flex items-center gap-4 mt-4 text-xs">
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-bold">
                    <FileText className="w-4 h-4" />
                    {exam.total_questions_count} سؤال
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-bold">
                    <Clock className="w-4 h-4" />
                    {exam.duration_minutes} دقيقة
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-bold">
                    <Users className="w-4 h-4" />
                    {exam.total_attempts_count}
                  </span>
                </div>

                {exam.public_slug && exam.status === 'PUBLISHED' && (
                  <div className="mt-4 p-3 bg-brand-50 dark:bg-brand-950/30 border border-brand-200/50 dark:border-brand-800/30 rounded-2xl">
                    <p className="text-[11px] font-black text-brand-700 dark:text-brand-300 tracking-wide">رابط الامتحان (لينك حقيقي)</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p
                        className="text-xs font-mono text-brand-600 dark:text-brand-400 truncate flex-1"
                        dir="ltr"
                        title={examLink(exam.public_slug) || undefined}
                      >
                        {examLink(exam.public_slug)}
                      </p>
                      <button
                        onClick={() => copyLink(exam.public_slug)}
                        className="text-[11px] font-black bg-brand-600 text-white px-3 py-1 rounded-full hover:bg-brand-700 transition-colors flex-shrink-0"
                      >
                        نسخ
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mt-5">
                  {exam.status === 'DRAFT' && (
                    <Button size="sm" onClick={() => handlePublish(exam.id)} className="flex-1">
                      نشر
                    </Button>
                  )}
                  {exam.status === 'PUBLISHED' && (
                    <>
                      <Link to={`/exam/${exam.public_slug}`} target="_blank" className="flex-1">
                        <Button size="sm" variant="secondary" fullWidth>
                          <Eye className="w-4 h-4 ml-1" />
                          عرض
                        </Button>
                      </Link>
                      <Button size="sm" variant="secondary" onClick={() => handleClose(exam.id)} className="flex-1">
                        إغلاق
                      </Button>
                    </>
                  )}
                  {exam.status === 'CLOSED' && (
                    <Button size="sm" onClick={() => handlePublish(exam.id)} className="flex-1">
                      إعادة نشر
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(exam.id)} className="px-3">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
