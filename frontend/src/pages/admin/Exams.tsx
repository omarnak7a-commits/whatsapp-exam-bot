import { useState } from 'react'
import { useData } from '@/contexts/DataContext'
import { useNavigate } from '@/router'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'مسودة', color: 'bg-gray-100 text-gray-600' },
  published: { label: 'منشور', color: 'bg-green-100 text-green-700' },
  closed: { label: 'مغلق', color: 'bg-red-100 text-red-600' },
}

export default function Exams() {
  const { exams, attempts, deleteExam, publishExam, closeExam, duplicateExam } = useData()
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function run(action: () => Promise<void>) {
    setError('')
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع، حاول مرة أخرى')
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  function copyLink(slug: string) {
    const url = `${window.location.origin}/exam/${slug}`
    navigator.clipboard.writeText(url)
    setCopied(slug)
    setTimeout(() => setCopied(null), 2000)
  }

  const sorted = [...exams].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-800">الامتحانات</h1>
          <p className="text-gray-500 text-sm mt-1">{exams.length} امتحان</p>
        </div>
        <button
          onClick={() => navigate('/admin/exams/new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          إنشاء امتحان
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600 text-center">
          {error}
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="font-bold text-gray-700 mb-1">لا توجد امتحانات حتى الآن</h3>
          <p className="text-gray-400 text-sm mb-5">ابدأ بإنشاء أول امتحان لك</p>
          <button
            onClick={() => navigate('/admin/exams/new')}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700"
          >
            إنشاء امتحان
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(exam => {
            const st = STATUS_LABELS[exam.status]
            const qCount = exam.questionCount
            const pCount = exam.attemptCount
            const avgPct = (() => {
              const done = attempts.filter(a => a.examId === exam.id && a.status === 'completed')
              if (!done.length) return null
              return Math.round(done.reduce((s, a) => s + a.percentage, 0) / done.length)
            })()

            return (
              <div key={exam.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-bold text-gray-800">{exam.title}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${st.color}`}>{st.label}</span>
                    </div>
                    {exam.description && <p className="text-sm text-gray-500 mt-1 line-clamp-1">{exam.description}</p>}
                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-500 flex-wrap">
                      <span>{qCount} سؤال</span>
                      <span>·</span>
                      <span>{pCount} مشارك</span>
                      <span>·</span>
                      <span>{exam.durationMinutes} دقيقة</span>
                      {avgPct !== null && <><span>·</span><span>متوسط {avgPct}%</span></>}
                      <span>·</span>
                      <span>{formatDate(exam.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-50">
                  <button
                    onClick={() => navigate(`/admin/exams/${exam.id}/edit`)}
                    className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    تعديل
                  </button>
                  <button
                    onClick={() => navigate(`/admin/exams/${exam.id}/questions`)}
                    className="px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg"
                  >
                    الأسئلة
                  </button>
                  {exam.status === 'draft' && (
                    <button
                      onClick={() => run(() => publishExam(exam.id))}
                      className="px-3 py-1.5 text-xs font-semibold text-green-600 hover:bg-green-50 rounded-lg"
                    >
                      نشر
                    </button>
                  )}
                  {exam.status === 'published' && (
                    <>
                      <button
                        onClick={() => run(() => closeExam(exam.id))}
                        className="px-3 py-1.5 text-xs font-semibold text-orange-600 hover:bg-orange-50 rounded-lg"
                      >
                        إغلاق
                      </button>
                      <button
                        onClick={() => copyLink(exam.slug)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${copied === exam.slug ? 'bg-green-100 text-green-700' : 'text-teal-600 hover:bg-teal-50'}`}
                      >
                        {copied === exam.slug ? '✓ تم النسخ' : 'نسخ الرابط'}
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => run(() => duplicateExam(exam.id))}
                    className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    تكرار
                  </button>
                  <button
                    onClick={() => navigate('/admin/results')}
                    className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    النتائج
                  </button>
                  <button
                    onClick={() => setConfirmDelete(exam.id)}
                    className="px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    حذف
                  </button>
                </div>

                {exam.status === 'published' && (
                  <div className="mt-3 flex items-center gap-2 bg-indigo-50 rounded-xl p-3">
                    <svg className="w-4 h-4 text-indigo-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <span className="text-xs text-indigo-700 font-mono truncate" dir="ltr">
                      {window.location.origin}/exam/{exam.slug}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Delete confirmation dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-800 mb-2">حذف الامتحان</h3>
            <p className="text-gray-500 text-sm mb-5">هل أنت متأكد من حذف هذا الامتحان؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex gap-3">
              <button
                onClick={() => { run(() => deleteExam(confirmDelete)); setConfirmDelete(null) }}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600"
              >
                حذف
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
