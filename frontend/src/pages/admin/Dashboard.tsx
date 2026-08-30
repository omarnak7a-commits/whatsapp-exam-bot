import { useData } from '@/contexts/DataContext'
import { useNavigate } from '@/router'

function StatCard({ label, value, color, icon }: { label: string; value: number | string; color: string; icon: React.ReactNode }) {
  return (
    <div className={`bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-black text-gray-800">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  )
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'مسودة', color: 'bg-gray-100 text-gray-600' },
  published: { label: 'منشور', color: 'bg-green-100 text-green-700' },
  closed: { label: 'مغلق', color: 'bg-red-100 text-red-600' },
}

export default function Dashboard() {
  const { exams, stats } = useData()
  const navigate = useNavigate()

  const totalExams = stats?.totalExams ?? 0
  const publishedExams = stats?.publishedExams ?? 0
  const totalParticipants = stats?.totalStudents ?? 0
  const avgScore = Math.round(stats?.averageScorePercentage ?? 0)

  const recentExams = [...exams].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5)

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-800">الرئيسية</h1>
        <p className="text-gray-500 text-sm mt-1">مرحباً بك في لوحة التحكم</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="إجمالي الامتحانات"
          value={totalExams}
          color="bg-indigo-500"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
        />
        <StatCard
          label="الامتحانات المنشورة"
          value={publishedExams}
          color="bg-green-500"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          label="إجمالي المشاركين"
          value={totalParticipants}
          color="bg-teal-500"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        />
        <StatCard
          label="متوسط الدرجات"
          value={avgScore + '%'}
          color="bg-amber-500"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>}
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">أحدث الامتحانات</h2>
          <button onClick={() => navigate('/admin/exams')} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
            عرض الكل
          </button>
        </div>
        {recentExams.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-sm mb-4">لا توجد امتحانات حتى الآن</p>
            <button
              onClick={() => navigate('/admin/exams/new')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700"
            >
              إنشاء امتحان
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">الامتحان</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">الحالة</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">الأسئلة</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">المشاركون</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">تاريخ الإنشاء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentExams.map(exam => {
                  const st = STATUS_LABELS[exam.status]
                  const qCount = exam.questionCount
                  const pCount = exam.attemptCount
                  return (
                    <tr key={exam.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate('/admin/exams')}>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-800 text-sm">{exam.title}</p>
                        {exam.description && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{exam.description}</p>}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${st.color}`}>{st.label}</span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">{qCount}</td>
                      <td className="px-5 py-4 text-sm text-gray-600">{pCount}</td>
                      <td className="px-5 py-4 text-sm text-gray-500">{formatDate(exam.createdAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
