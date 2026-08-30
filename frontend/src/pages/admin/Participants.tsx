import { useData } from '@/contexts/DataContext'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function Participants() {
  const { students } = useData()

  // Real aggregated data from the students API, sorted by average score.
  const participants = [...students]
    .map(s => ({
      id: s.id,
      name: s.name,
      examCount: s.examsCount,
      avgScore: Math.round(s.averagePercentage),
      bestScore: Math.round(s.bestPercentage),
      lastAttempt: s.lastAttemptAt,
    }))
    .sort((a, b) => b.avgScore - a.avgScore)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-800">المشاركون</h1>
        <p className="text-gray-500 text-sm mt-1">{participants.length} طالب</p>
      </div>

      {participants.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <p className="text-gray-400 text-sm">لا يوجد مشاركون بعد</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">الطالب</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">الامتحانات</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">متوسط الدرجات</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">أفضل درجة</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 hidden md:table-cell">آخر محاولة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {participants.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm flex-shrink-0">
                          {p.name[0]}
                        </div>
                        <span className="font-semibold text-gray-800 text-sm">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">{p.examCount}</td>
                    <td className="px-5 py-4">
                      <span className={`text-sm font-bold ${p.avgScore >= 60 ? 'text-green-600' : 'text-red-500'}`}>{p.avgScore}%</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-bold text-indigo-600">{p.bestScore}%</span>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-400 hidden md:table-cell">{p.lastAttempt ? fmtDate(p.lastAttempt) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
