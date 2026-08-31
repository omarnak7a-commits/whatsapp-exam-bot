import { useState, FormEvent, useEffect } from 'react'
import { useData, PublicExamInfo } from '@/contexts/DataContext'
import { useNavigate, useParams } from '@/router'
import { ApiError } from '@/api/client'
import Logo from '@/components/Logo'

function ErrorCard({ icon, title, message }: { icon: string; title: string; message: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-teal-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">{icon}</div>
        <h1 className="text-xl font-black text-gray-800 mb-2">{title}</h1>
        <p className="text-gray-500 text-sm">{message}</p>
      </div>
    </div>
  )
}

export default function ExamStart() {
  const { fetchPublicExam, startAttempt } = useData()
  const navigate = useNavigate()
  const params = useParams()
  const slug = params.slug || ''

  const [exam, setExam] = useState<PublicExamInfo | null>(null)
  const [loadError, setLoadError] = useState('')
  const [pageLoading, setPageLoading] = useState(true)

  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)
  // Set when the backend answers 409: this name already used its single attempt.
  const [blockedMessage, setBlockedMessage] = useState('')

  // Fetch the real exam info from the public API.
  useEffect(() => {
    if (!slug) return
    setPageLoading(true)
    fetchPublicExam(slug)
      .then(setExam)
      .catch(err => setLoadError(err instanceof Error ? err.message : 'تعذر تحميل الامتحان'))
      .finally(() => setPageLoading(false))
  }, [slug, fetchPublicExam])

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-teal-50 flex items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (loadError || !exam) {
    // The server distinguishes: not found (404), not published (403 draft), closed (403).
    const msg = loadError || 'لم نتمكن من العثور على هذا الامتحان.'
    if (/مغلق/.test(msg)) return <ErrorCard icon="⏰" title="الامتحان مغلق" message="انتهى الوقت المحدد لهذا الامتحان." />
    if (/غير منشور/.test(msg)) return <ErrorCard icon="🔒" title="الامتحان لم يتم نشره بعد" message="تواصل مع معلمك للحصول على الرابط الصحيح." />
    return <ErrorCard icon="😕" title="الرابط غير صحيح" message={msg} />
  }

  async function handleStart(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('يجب كتابة الاسم'); return }
    setError('')
    setStarting(true)
    try {
      const { attemptId } = await startAttempt(exam!.slug, name.trim())
      navigate(`/exam/${exam!.slug}/take/${attemptId}`)
    } catch (err) {
      // 409 Conflict = this student name already has an attempt on this exam.
      // No attempt was created and we must NOT navigate to the exam page.
      if (err instanceof ApiError && err.status === 409) {
        setBlockedMessage(err.message || 'لقد دخلت هذا الامتحان من قبل، ولا يُسمح لك بإعادته.')
        setStarting(false)
        return
      }
      setError(err instanceof Error ? err.message : 'تعذر بدء الامتحان، حاول مرة أخرى')
      setStarting(false)
    }
  }

  if (blockedMessage) {
    return <ErrorCard icon="🚫" title="لا يمكن بدء الامتحان" message={blockedMessage} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Logo size="md" />
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-indigo-100 border border-indigo-50 overflow-hidden">
          <div className="bg-gradient-to-l from-indigo-600 to-teal-500 p-6 text-white">
            <h1 className="text-2xl font-black mb-1">{exam.title}</h1>
            {exam.description && <p className="text-indigo-100 text-sm">{exam.description}</p>}
          </div>

          <div className="p-6">
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-indigo-50 rounded-xl p-3 text-center">
                <p className="text-xl font-black text-indigo-600">{exam.questionsCount}</p>
                <p className="text-xs text-indigo-500 mt-0.5">سؤال</p>
              </div>
              <div className="bg-teal-50 rounded-xl p-3 text-center">
                <p className="text-xl font-black text-teal-600">{exam.durationMinutes}</p>
                <p className="text-xs text-teal-500 mt-0.5">دقيقة</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <p className="text-xl font-black text-amber-600">{exam.instantFeedback ? 'فوري' : 'لاحق'}</p>
                <p className="text-xs text-amber-500 mt-0.5">التصحيح</p>
              </div>
            </div>

            <form onSubmit={handleStart} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">اكتب اسمك للبدء</label>
                <input
                  value={name}
                  onChange={e => { setName(e.target.value); setError('') }}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent text-base bg-gray-50"
                  placeholder="الاسم الكامل"
                  required
                />
                {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
              </div>

              <button
                type="submit"
                disabled={starting || exam.questionsCount === 0}
                className="w-full py-4 rounded-xl bg-gradient-to-l from-indigo-600 to-teal-500 text-white font-black text-lg hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
              >
                {starting ? (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                  </svg>
                ) : exam.questionsCount === 0 ? 'لا توجد أسئلة' : '▶ ابدأ الامتحان'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
