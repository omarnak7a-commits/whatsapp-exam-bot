import { useState, useEffect } from 'react'
import { useData, PublicResult } from '@/contexts/DataContext'
import { useParams } from '@/router'
import Logo from '@/components/Logo'

function fmtTime(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

const MEDALS = ['🥇', '🥈', '🥉']

export default function ExamResult() {
  const { fetchPublicResult } = useData()
  const params = useParams()
  const attemptId = params.attemptId || ''

  const [result, setResult] = useState<PublicResult | null>(null)
  const [error, setError] = useState('')

  // Score, ranking and leaderboard all come from the server's calculation.
  useEffect(() => {
    if (!attemptId) return
    fetchPublicResult(attemptId)
      .then(setResult)
      .catch(err => setError(err instanceof Error ? err.message : 'تعذر تحميل النتيجة'))
  }, [attemptId, fetchPublicResult])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    )
  }

  const percentage = Math.round(result.percentage)
  const circumference = 2 * Math.PI * 40
  const strokeDashoffset = circumference - (percentage / 100) * circumference
  const isGood = percentage >= 60
  const myRank = result.ranking || 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-teal-50">
      {/* Header */}
      <div className="flex justify-center pt-6 pb-4">
        <Logo size="md" />
      </div>

      <div className="max-w-md mx-auto px-4 pb-10 space-y-5">
        {/* Score card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100 border border-indigo-50 p-8 text-center">
          <p className="text-gray-500 text-sm mb-1">نتيجة {result.examTitle}</p>
          <h1 className="text-2xl font-black text-gray-800 mb-6">{result.studentName}</h1>

          {/* Circular progress */}
          <div className="flex justify-center mb-6">
            <div className="relative w-28 h-28">
              <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#f3f4f6" strokeWidth="10" />
                <circle
                  cx="50" cy="50" r="40" fill="none"
                  stroke={isGood ? '#22c55e' : '#ef4444'}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  style={{ transition: 'stroke-dashoffset 1s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-2xl font-black ${isGood ? 'text-green-600' : 'text-red-500'}`}>{percentage}%</span>
              </div>
            </div>
          </div>

          <p className="text-4xl font-black text-gray-800 mb-1">{result.score} / {result.totalScore}</p>
          {result.status === 'EXPIRED' && (
            <span className="inline-block px-3 py-1 bg-orange-100 text-orange-600 text-xs font-semibold rounded-full mb-3">انتهى الوقت</span>
          )}

          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="bg-green-50 rounded-2xl p-3">
              <p className="text-xl font-black text-green-600">{result.correctAnswers}</p>
              <p className="text-xs text-green-600 mt-0.5">✅ صحيحة</p>
            </div>
            <div className="bg-red-50 rounded-2xl p-3">
              <p className="text-xl font-black text-red-500">{result.wrongAnswers}</p>
              <p className="text-xs text-red-500 mt-0.5">❌ خاطئة</p>
            </div>
            <div className="bg-indigo-50 rounded-2xl p-3" dir="ltr">
              <p className="text-xl font-black text-indigo-600">{fmtTime(result.completionTimeSeconds)}</p>
              <p className="text-xs text-indigo-600 mt-0.5">⏱️ الوقت</p>
            </div>
          </div>
        </div>

        {/* Rank */}
        {result.leaderboardEnabled && myRank > 0 && (
          <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100 border border-indigo-50 p-6 text-center">
            <p className="text-gray-500 text-sm mb-2">ترتيبك في الامتحان</p>
            <p className="text-5xl font-black text-indigo-600 mb-1">
              {MEDALS[myRank - 1] || `#${myRank}`}
            </p>
            <p className="text-gray-500 text-sm">من أصل {result.totalRanked} مشارك</p>
          </div>
        )}

        {/* Leaderboard */}
        {result.leaderboardEnabled && result.leaderboard.length > 0 && (
          <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100 border border-indigo-50 overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-black text-gray-800">🏆 قائمة الترتيب</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {result.leaderboard.slice(0, 10).map((a, idx) => {
                const isMe = a.studentName === result.studentName
                return (
                  <div key={`${a.rank}-${idx}`} className={`flex items-center gap-3 px-5 py-4 ${isMe ? 'bg-indigo-50' : ''}`}>
                    <span className="text-lg w-8 text-center">{MEDALS[idx] || `#${a.rank}`}</span>
                    <div className="flex-1">
                      <p className={`text-sm font-bold ${isMe ? 'text-indigo-700' : 'text-gray-800'}`}>
                        {a.studentName} {isMe && '(أنت)'}
                      </p>
                    </div>
                    <div className="text-left" dir="ltr">
                      <p className={`text-sm font-bold ${a.percentage >= 60 ? 'text-green-600' : 'text-red-500'}`}>{a.score}/{a.totalScore}</p>
                      <p className="text-xs text-gray-400">{fmtTime(a.completionTimeSeconds)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* One attempt per student: no retake path is offered after the result. */}
        <div className="w-full py-3 px-4 bg-gray-100 text-gray-600 font-bold rounded-2xl text-sm text-center">
          تم تسجيل محاولتك بنجاح، ولا يُسمح بإعادة هذا الامتحان.
        </div>
      </div>
    </div>
  )
}
