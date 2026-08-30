import { useData } from '@/contexts/DataContext'

function fmtTime(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

const MEDALS = ['🥇', '🥈', '🥉']

export default function AdminLeaderboard() {
  const { attempts, exams } = useData()

  const completed = attempts
    .filter(a => a.status === 'completed')
    .sort((a, b) => {
      if (b.percentage !== a.percentage) return b.percentage - a.percentage
      return a.completionTimeSeconds - b.completionTimeSeconds
    })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-800">الترتيب</h1>
        <p className="text-gray-500 text-sm mt-1">ترتيب جميع الطلاب في جميع الامتحانات</p>
      </div>

      {completed.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <p className="text-gray-400 text-sm">لا توجد نتائج بعد</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">الترتيب</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">الطالب</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">الامتحان</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">الدرجة</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">النسبة</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">الوقت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {completed.map((a, idx) => {
                  const exam = exams.find(e => e.id === a.examId)
                  const medal = MEDALS[idx] || ''
                  return (
                    <tr key={a.id} className={`hover:bg-gray-50 ${idx < 3 ? 'bg-amber-50/40' : ''}`}>
                      <td className="px-5 py-4">
                        <span className="text-lg">{medal || `#${idx + 1}`}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm flex-shrink-0">
                            {a.studentName[0]}
                          </div>
                          <span className="font-semibold text-gray-800 text-sm">{a.studentName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">{exam?.title || '—'}</td>
                      <td className="px-5 py-4 text-sm font-bold text-gray-800">{a.score}/{a.totalQuestions}</td>
                      <td className="px-5 py-4">
                        <span className={`text-sm font-bold ${a.percentage >= 60 ? 'text-green-600' : 'text-red-500'}`}>{Math.round(a.percentage)}%</span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500" dir="ltr">{fmtTime(a.completionTimeSeconds)}</td>
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
