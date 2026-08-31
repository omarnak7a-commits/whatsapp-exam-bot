import { useState, useEffect, useMemo } from 'react'
import { useData, AdminLeaderboardEntry } from '@/contexts/DataContext'

function fmtTime(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

const MEDALS = ['🥇', '🥈', '🥉']

export default function AdminLeaderboard() {
  const { exams, fetchExamLeaderboard } = useData()

  // Only exams that can actually have attempts are worth ranking.
  const selectableExams = useMemo(
    () => exams.filter(e => e.status !== 'draft'),
    [exams]
  )

  const [selectedExamId, setSelectedExamId] = useState('')
  const [entries, setEntries] = useState<AdminLeaderboardEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Auto-select the first exam, matching the previous "shows data immediately" UX.
  useEffect(() => {
    if (!selectedExamId && selectableExams.length > 0) {
      setSelectedExamId(selectableExams[0].id)
    }
  }, [selectableExams, selectedExamId])

  // One exam -> one leaderboard. The server filters by exam_id, so entries from
  // other exams can never leak in.
  useEffect(() => {
    if (!selectedExamId) {
      setEntries([])
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    fetchExamLeaderboard(selectedExamId)
      .then(list => { if (!cancelled) setEntries(list) })
      .catch(err => {
        if (!cancelled) {
          setEntries([])
          setError(err instanceof Error ? err.message : 'تعذر تحميل الترتيب')
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [selectedExamId, fetchExamLeaderboard])

  const selectedExam = exams.find(e => e.id === selectedExamId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-800">🏆 ترتيب الطلاب</h1>
        <p className="text-gray-500 text-sm mt-1">
          {selectedExam
            ? `الامتحان: ${selectedExam.title}`
            : 'اختر الامتحان لعرض ترتيب طلابه'}
        </p>
      </div>

      {/* Exam selector */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <label htmlFor="exam-select" className="block text-sm font-semibold text-gray-700 mb-2">
          اختر الامتحان
        </label>
        <select
          id="exam-select"
          value={selectedExamId}
          onChange={e => setSelectedExamId(e.target.value)}
          disabled={selectableExams.length === 0}
          className="w-full md:max-w-md px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent disabled:opacity-60"
        >
          <option value="">— اختر الامتحان —</option>
          {selectableExams.map(exam => (
            <option key={exam.id} value={exam.id}>
              {exam.title}
            </option>
          ))}
        </select>
        {selectableExams.length === 0 && (
          <p className="text-gray-400 text-xs mt-2">لا توجد امتحانات منشورة بعد</p>
        )}
      </div>

      {!selectedExamId ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <p className="text-gray-400 text-sm">اختر امتحاناً لعرض الترتيب</p>
        </div>
      ) : loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 flex justify-center">
          <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <p className="text-gray-400 text-sm">لا توجد نتائج بعد في هذا الامتحان</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">الترتيب</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">الطالب</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">الدرجة</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">النسبة</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">الوقت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {entries.map((e, idx) => {
                  const medal = MEDALS[idx] || ''
                  return (
                    <tr key={`${e.studentId}-${e.rank}-${idx}`} className={`hover:bg-gray-50 ${idx < 3 ? 'bg-amber-50/40' : ''}`}>
                      <td className="px-5 py-4">
                        <span className="text-lg">{medal || `#${e.rank || idx + 1}`}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm flex-shrink-0">
                            {e.studentName[0]}
                          </div>
                          <span className="font-semibold text-gray-800 text-sm">{e.studentName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm font-bold text-gray-800">{e.score}/{e.totalScore}</td>
                      <td className="px-5 py-4">
                        <span className={`text-sm font-bold ${e.percentage >= 60 ? 'text-green-600' : 'text-red-500'}`}>{Math.round(e.percentage)}%</span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500" dir="ltr">{fmtTime(e.completionTimeSeconds)}</td>
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
