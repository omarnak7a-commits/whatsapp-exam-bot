import { useState, FormEvent } from 'react'
import { useData } from '@/contexts/DataContext'
import { useNavigate } from '@/router'

export default function CreateExam() {
  const { createExam } = useData()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState('30')
  const [instantFeedback, setInstantFeedback] = useState(true)
  const [showCorrect, setShowCorrect] = useState(true)
  const [leaderboard, setLeaderboard] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const exam = await createExam({
        title,
        description,
        durationMinutes: Math.max(1, parseInt(duration) || 30),
        instantFeedback,
        showCorrectAnswers: showCorrect,
        leaderboardEnabled: leaderboard,
      })
      navigate(`/admin/exams/${exam.id}/questions`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل إنشاء الامتحان، حاول مرة أخرى')
      setSaving(false)
    }
  }

  function Toggle({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
    return (
      <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
        <div>
          <p className="font-semibold text-gray-800 text-sm">{label}</p>
          <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
        </div>
        <button
          type="button"
          onClick={() => onChange(!value)}
          className={`relative w-12 h-6 rounded-full transition-colors ${value ? 'bg-indigo-600' : 'bg-gray-200'}`}
        >
          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${value ? 'right-1' : 'left-1'}`} />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-black text-gray-800">إنشاء امتحان جديد</h1>
        <p className="text-gray-500 text-sm mt-1">أضف تفاصيل الامتحان ثم أضف الأسئلة</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600 text-center">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">اسم الامتحان *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent text-sm bg-gray-50"
              placeholder="مثال: امتحان الرياضيات — الفصل الأول"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">وصف الامتحان</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent text-sm bg-gray-50 resize-none"
              placeholder="وصف اختياري..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">مدة الامتحان (بالدقائق)</label>
            <input
              type="number"
              value={duration}
              onChange={e => setDuration(e.target.value)}
              min={1}
              max={180}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent text-sm bg-gray-50"
              dir="ltr"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-bold text-gray-800 mb-1">إعدادات الامتحان</h3>
          <p className="text-xs text-gray-400 mb-4">تحكم في طريقة عرض النتائج للطلاب</p>
          <Toggle label="التصحيح الفوري" desc="يرى الطالب إذا كانت إجابته صحيحة أم خاطئة فوراً" value={instantFeedback} onChange={setInstantFeedback} />
          <Toggle label="إظهار الإجابات الصحيحة" desc="يمكن عرض الإجابات الصحيحة بعد الانتهاء" value={showCorrect} onChange={setShowCorrect} />
          <Toggle label="قائمة الترتيب" desc="يرى الطلاب ترتيبهم بين بعضهم" value={leaderboard} onChange={setLeaderboard} />
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-60">
            {saving ? 'جارٍ الإنشاء...' : 'التالي: إضافة الأسئلة'}
          </button>
          <button type="button" onClick={() => navigate('/admin/exams')} className="px-5 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200">
            إلغاء
          </button>
        </div>
      </form>
    </div>
  )
}
