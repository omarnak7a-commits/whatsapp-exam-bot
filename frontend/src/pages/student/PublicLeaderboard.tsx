import { useState, useEffect } from 'react'
import { useData } from '@/contexts/DataContext'
import { useParams } from '@/router'
import Logo from '@/components/Logo'

function fmtTime(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

const MEDALS = ['🥇', '🥈', '🥉']

export default function PublicLeaderboard() {
  const { fetchPublicLeaderboard } = useData()
  const params = useParams()
  const slug = params.slug || ''

  const [entries, setEntries] = useState<
    Array<{ rank: number; studentName: string; score: number; totalScore: number; percentage: number; completionTimeSeconds: number }>
  >([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return
    fetchPublicLeaderboard(slug)
      .then(setEntries)
      .catch(err => setError(err instanceof Error ? err.message : 'تعذر تحميل قائمة الترتيب'))
      .finally(() => setLoading(false))
  }, [slug, fetchPublicLeaderboard])

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-teal-50">
      <div className="flex justify-center pt-6 pb-4">
        <Logo size="md" />
      </div>

      <div className="max-w-md mx-auto px-4 pb-10">
        <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100 border border-indigo-50 overflow-hidden">
          <div className="p-5 border-b border-gray-100 text-center">
            <h1 className="font-black text-gray-800">🏆 قائمة الترتيب</h1>
            <p className="text-gray-500 text-sm mt-1">ترتيب الطلاب حسب الدرجة ثم الأسرع وقتاً</p>
          </div>

          {loading ? (
            <div className="p-12 flex justify-center">
              <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <div className="text-5xl mb-4">🔒</div>
              <p className="text-gray-500 text-sm">{error}</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-400 text-sm">لا توجد نتائج بعد</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {entries.map((a, idx) => (
                <div key={`${a.rank}-${idx}`} className={`flex items-center gap-3 px-5 py-4 ${idx < 3 ? 'bg-amber-50/40' : ''}`}>
                  <span className="text-lg w-8 text-center">{MEDALS[idx] || `#${a.rank}`}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm flex-shrink-0">
                        {a.studentName[0]}
                      </div>
                      <p className="text-sm font-bold text-gray-800 truncate">{a.studentName}</p>
                    </div>
                  </div>
                  <div className="text-left" dir="ltr">
                    <p className={`text-sm font-bold ${a.percentage >= 60 ? 'text-green-600' : 'text-red-500'}`}>{a.score}/{a.totalScore}</p>
                    <p className="text-xs text-gray-400">{fmtTime(a.completionTimeSeconds)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
