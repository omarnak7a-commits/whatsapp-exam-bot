import { useState, useEffect } from 'react'
import { useData, AdminAttemptDetail } from '@/contexts/DataContext'
import { useNavigate, useParams } from '@/router'

function fmtTime(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function ResultDetail() {
  const { fetchAttemptDetail } = useData()
  const navigate = useNavigate()
  const params = useParams()

  const [attempt, setAttempt] = useState<AdminAttemptDetail | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!params.id) return
    fetchAttemptDetail(params.id)
      .then(setAttempt)
      .catch(err => {
        const message = err instanceof Error ? err.message : ''
        if (/غير موجود|404/.test(message)) setNotFound(true)
        else setError(message || 'فشل تحميل تفاصيل النتيجة')
      })
  }, [params.id, fetchAttemptDetail])

  if (error) {
    return (
      <div className="text-center py-20 space-y-3">
        <p className="text-red-500 text-sm">{error}</p>
        <button onClick={() => navigate('/admin/results')} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold">العودة</button>
      </div>
    )
  }

  if (notFound || !attempt) {
    return (
      <div className="text-center py-20">
        {!notFound && !attempt && !error && (
          <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin mx-auto" />
        )}
        {notFound && (
          <>
            <p className="text-gray-500">المحاولة غير موجودة</p>
            <button onClick={() => navigate('/admin/results')} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold">العودة</button>
          </>
        )}
      </div>
    )
  }

  const percentage = Math.round(attempt.percentage)

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin/results')} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
        <div>
          <h1 className="text-2xl font-black text-gray-800">{attempt.studentName}</h1>
          <p className="text-sm text-gray-500">{attempt.examTitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-black text-indigo-600">{attempt.score}/{attempt.totalQuestions}</p>
          <p className="text-xs text-gray-500 mt-1">الدرجة</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <p className={`text-2xl font-black ${percentage >= 60 ? 'text-green-600' : 'text-red-500'}`}>{percentage}%</p>
          <p className="text-xs text-gray-500 mt-1">النسبة</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center" dir="ltr">
          <p className="text-2xl font-black text-gray-700">{attempt.completionTimeSeconds ? fmtTime(attempt.completionTimeSeconds) : '—'}</p>
          <p className="text-xs text-gray-500 mt-1">الوقت</p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="font-bold text-gray-800">تفاصيل الإجابات</h2>
        {attempt.answers.map((answer, idx) => {
          const answered = !!answer.selectedOptionText
          return (
            <div key={idx} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start gap-3">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5 ${!answered ? 'bg-gray-100 text-gray-500' : answer.isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                  {!answered ? idx + 1 : answer.isCorrect ? '✓' : '✗'}
                </span>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 text-sm mb-2">س{idx + 1}: {answer.questionText}</p>
                  {answered ? (
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-600">إجابة الطالب: <span className={`font-semibold ${answer.isCorrect ? 'text-green-600' : 'text-red-500'}`}>{answer.selectedOptionText || '—'}</span></p>
                      {!answer.isCorrect && answer.correctOptionText && <p className="text-gray-600">الإجابة الصحيحة: <span className="font-semibold text-green-600">{answer.correctOptionText}</span></p>}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">لم يتم الإجابة</p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
