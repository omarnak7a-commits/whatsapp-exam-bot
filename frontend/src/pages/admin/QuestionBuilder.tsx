import { useState, useEffect } from 'react'
import { useData, Question, QuestionType } from '@/contexts/DataContext'
import { useNavigate, useParams } from '@/router'

function uid() { return Math.random().toString(36).slice(2) }

interface LocalOption { id: string; text: string; isCorrect: boolean }

interface QuestionEditorProps {
  onSave: (q: { text: string; type: QuestionType; options: { text: string; isCorrect: boolean; orderIndex: number }[] }) => void
  onCancel: () => void
  initial?: { text: string; type: QuestionType; options: LocalOption[] }
}

function QuestionEditor({ onSave, onCancel, initial }: QuestionEditorProps) {
  const [type, setType] = useState<QuestionType>(initial?.type || 'multiple_choice')
  const [text, setText] = useState(initial?.text || '')
  const [options, setOptions] = useState<LocalOption[]>(
    initial?.options ||
    (type === 'true_false'
      ? [{ id: uid(), text: 'صح', isCorrect: true }, { id: uid(), text: 'غلط', isCorrect: false }]
      : [{ id: uid(), text: '', isCorrect: true }, { id: uid(), text: '', isCorrect: false }])
  )

  function switchType(t: QuestionType) {
    setType(t)
    if (t === 'true_false') {
      setOptions([{ id: uid(), text: 'صح', isCorrect: true }, { id: uid(), text: 'غلط', isCorrect: false }])
    } else {
      setOptions([{ id: uid(), text: '', isCorrect: true }, { id: uid(), text: '', isCorrect: false }])
    }
  }

  function addOption() {
    if (options.length >= 4) return
    setOptions(prev => [...prev, { id: uid(), text: '', isCorrect: false }])
  }

  function removeOption(id: string) {
    if (options.length <= 2) return
    setOptions(prev => prev.filter(o => o.id !== id))
  }

  function setCorrect(id: string) {
    setOptions(prev => prev.map(o => ({ ...o, isCorrect: o.id === id })))
  }

  function updateOptionText(id: string, t: string) {
    setOptions(prev => prev.map(o => o.id === id ? { ...o, text: t } : o))
  }

  function handleSave() {
    if (!text.trim()) return
    if (type === 'multiple_choice' && options.some(o => !o.text.trim())) return
    const mappedOptions = options.map((o, i) => ({ text: o.text, isCorrect: o.isCorrect, orderIndex: i }))
    onSave({ text, type, options: mappedOptions })
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-indigo-200 shadow-lg p-6 space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">نوع السؤال</label>
        <div className="flex gap-2">
          {[{ v: 'multiple_choice', l: 'اختيار من متعدد' }, { v: 'true_false', l: 'صح أو غلط' }].map(({ v, l }) => (
            <button
              key={v}
              type="button"
              onClick={() => switchType(v as QuestionType)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold border ${type === v ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">نص السؤال *</label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={2}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm bg-gray-50 resize-none"
          placeholder="اكتب السؤال هنا..."
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-gray-700">الخيارات (اختر الإجابة الصحيحة)</label>
          {type === 'multiple_choice' && options.length < 4 && (
            <button type="button" onClick={addOption} className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold">+ إضافة خيار</button>
          )}
        </div>
        <div className="space-y-2">
          {options.map(opt => (
            <div key={opt.id} className={`flex items-center gap-3 p-3 rounded-xl border ${opt.isCorrect ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
              <button type="button" onClick={() => setCorrect(opt.id)} className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${opt.isCorrect ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}>
                {opt.isCorrect && <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
              </button>
              {type === 'true_false' ? (
                <span className="text-sm font-medium text-gray-800 flex-1">{opt.text}</span>
              ) : (
                <input
                  value={opt.text}
                  onChange={e => updateOptionText(opt.id, e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none text-gray-800 placeholder-gray-400"
                  placeholder="نص الخيار..."
                />
              )}
              {type === 'multiple_choice' && options.length > 2 && (
                <button type="button" onClick={() => removeOption(opt.id)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={handleSave} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700">
          حفظ السؤال
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200">
          إلغاء
        </button>
      </div>
    </div>
  )
}

export default function QuestionBuilder() {
  const { getExam, getQuestionsForExam, loadQuestions, createQuestion, updateQuestion, deleteQuestion, reorderQuestions, publishExam } = useData()
  const navigate = useNavigate()
  const params = useParams()
  const exam = getExam(params.id || '')
  const questions = getQuestionsForExam(params.id || '')

  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Pull this exam's questions from the database whenever the exam changes.
  useEffect(() => {
    if (params.id) loadQuestions(params.id).catch(err => {
      setError(err instanceof Error ? err.message : 'فشل تحميل الأسئلة')
    })
  }, [params.id, loadQuestions])

  async function run(action: () => Promise<void>) {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع، حاول مرة أخرى')
    } finally {
      setBusy(false)
    }
  }

  if (!exam) return (
    <div className="text-center py-20">
      <p className="text-gray-500">الامتحان غير موجود</p>
      <button onClick={() => navigate('/admin/exams')} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold">العودة</button>
    </div>
  )

  function handleAdd(q: { text: string; type: QuestionType; options: { text: string; isCorrect: boolean; orderIndex: number }[] }) {
    run(async () => {
      await createQuestion({ examId: exam!.id, text: q.text, type: q.type, orderIndex: questions.length, options: q.options })
      setAdding(false)
    })
  }

  function handleEdit(id: string, q: { text: string; type: QuestionType; options: { text: string; isCorrect: boolean; orderIndex: number }[] }) {
    run(async () => {
      await updateQuestion(id, { text: q.text, type: q.type, options: q.options })
      setEditing(null)
    })
  }

  function moveUp(idx: number) {
    if (idx === 0) return
    const ids = questions.map(q => q.id)
    ;[ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]]
    run(() => reorderQuestions(exam!.id, ids))
  }

  function moveDown(idx: number) {
    if (idx === questions.length - 1) return
    const ids = questions.map(q => q.id)
    ;[ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]]
    run(() => reorderQuestions(exam!.id, ids))
  }

  function handlePublish() {
    run(async () => {
      await publishExam(exam!.id)
      navigate('/admin/exams')
    })
  }

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/exam/${exam!.slug}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const STATUS_LABELS: Record<string, string> = { draft: 'مسودة', published: 'منشور', closed: 'مغلق' }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => navigate('/admin/exams')} className="text-gray-400 hover:text-indigo-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
            <h1 className="text-2xl font-black text-gray-800">{exam.title}</h1>
          </div>
          <p className="text-sm text-gray-500">{questions.length} سؤال · {STATUS_LABELS[exam.status]}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {exam.status === 'draft' && (
            <button onClick={handlePublish} disabled={questions.length === 0} className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 disabled:opacity-40">
              نشر
            </button>
          )}
          {exam.status === 'published' && (
            <button onClick={copyLink} className={`px-4 py-2 rounded-xl text-sm font-bold ${copied ? 'bg-green-100 text-green-700' : 'bg-teal-600 text-white hover:bg-teal-700'}`}>
              {copied ? '✓ تم النسخ' : 'نسخ الرابط'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600 text-center">{error}</div>
      )}

      {questions.length === 0 && !adding && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm mb-1">لا توجد أسئلة بعد</p>
          <p className="text-gray-400 text-xs">أضف أسئلة لهذا الامتحان</p>
        </div>
      )}

      <div className="space-y-3">
        {questions.map((q, idx) => {
          if (editing === q.id) {
            return (
              <QuestionEditor
                key={q.id}
                initial={{ text: q.text, type: q.type, options: q.options.map(o => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })) }}
                onSave={data => handleEdit(q.id, data)}
                onCancel={() => setEditing(null)}
              />
            )
          }
          return (
            <div key={q.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start gap-4">
                <div className="flex flex-col gap-1">
                  <button onClick={() => moveUp(idx)} disabled={idx === 0} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                  </button>
                  <span className="text-xs font-bold text-indigo-500 text-center">{idx + 1}</span>
                  <button onClick={() => moveDown(idx)} disabled={idx === questions.length - 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${q.type === 'true_false' ? 'bg-teal-100 text-teal-700' : 'bg-indigo-100 text-indigo-700'}`}>
                      {q.type === 'true_false' ? 'صح أو غلط' : 'اختيار متعدد'}
                    </span>
                  </div>
                  <p className="font-semibold text-gray-800 text-sm mb-3">{q.text}</p>
                  <div className="flex flex-wrap gap-2">
                    {q.options.map(opt => (
                      <span key={opt.id} className={`px-3 py-1 rounded-full text-xs font-medium ${opt.isCorrect ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-gray-100 text-gray-600'}`}>
                        {opt.isCorrect && '✓ '}{opt.text}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => setEditing(q.id)} className="p-2 rounded-lg hover:bg-indigo-50 text-indigo-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button onClick={() => setConfirmDel(q.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {adding ? (
        <QuestionEditor onSave={handleAdd} onCancel={() => setAdding(false)} />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full py-4 rounded-2xl border-2 border-dashed border-indigo-200 text-indigo-600 font-bold text-sm hover:border-indigo-400 hover:bg-indigo-50 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          إضافة سؤال
        </button>
      )}

      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-800 mb-2">حذف السؤال</h3>
            <p className="text-gray-500 text-sm mb-5">هل أنت متأكد من حذف هذا السؤال؟</p>
            <div className="flex gap-3">
              <button onClick={() => { const id = confirmDel; setConfirmDel(null); run(() => deleteQuestion(id, exam!.id)) }} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600">حذف</button>
              <button onClick={() => setConfirmDel(null)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
