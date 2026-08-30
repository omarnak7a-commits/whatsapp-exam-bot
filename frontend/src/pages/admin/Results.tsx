import { useState } from 'react'
import { useData } from '@/contexts/DataContext'
import { useNavigate } from '@/router'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  in_progress: { label: 'جارٍ', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'مكتمل', color: 'bg-green-100 text-green-700' },
  expired: { label: 'منتهي الصلاحية', color: 'bg-red-100 text-red-600' },
}

function fmtTime(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function Results() {
  const { attempts, exams } = useData()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterExam, setFilterExam] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const filtered = attempts
    .filter(a => {
      if (search && !a.studentName.includes(search)) return false
      if (filterExam && a.examId !== filterExam) return false
      if (filterStatus && a.status !== filterStatus) return false
      return true
    })
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-800">النتائج</h1>
        <p className="text-gray-500 text-sm mt-1">{attempts.length} محاولة</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="بحث بالاسم..."
          className="px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm bg-white flex-1 min-w-40"
        />
        <select
          value={filterExam}
          onChange={e => setFilterExam(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none text-sm bg-white"
        >
          <option value="">جميع الامتحانات</option>
          {exams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none text-sm bg-white"
        >
          <option value="">جميع الحالات</option>
          <option value="completed">مكتمل</option>
          <option value="expired">منتهي</option>
          <option value="in_progress">جارٍ</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <p className="text-gray-400 text-sm">لا توجد نتائج</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">الطالب</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">الامتحان</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">الدرجة</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">النسبة</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 hidden md:table-cell">الوقت</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 hidden lg:table-cell">البداية</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">الحالة</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(a => {
                  const exam = exams.find(e => e.id === a.examId)
                  const st = STATUS_LABELS[a.status]
                  return (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4 font-medium text-gray-800 text-sm">{a.studentName}</td>
                      <td className="px-5 py-4 text-sm text-gray-600">{exam?.title || '—'}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-gray-800">{a.score}/{a.totalQuestions}</td>
                      <td className="px-5 py-4">
                        <span className={`text-sm font-bold ${a.percentage >= 60 ? 'text-green-600' : 'text-red-500'}`}>{Math.round(a.percentage)}%</span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500 hidden md:table-cell" dir="ltr">{a.completionTimeSeconds ? fmtTime(a.completionTimeSeconds) : '—'}</td>
                      <td className="px-5 py-4 text-xs text-gray-400 hidden lg:table-cell">{fmtDate(a.startedAt)}</td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${st.color}`}>{st.label}</span>
                      </td>
                      <td className="px-5 py-4">
                        <button onClick={() => navigate(`/admin/results/${a.id}`)} className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold">تفاصيل</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
