import { useState, FormEvent } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { apiFetch } from '@/api/client'

export default function Settings() {
  const { admin, updateAdmin } = useAuth()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState(admin?.name || '')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [pwMessage, setPwMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [pwSaving, setPwSaving] = useState(false)

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const updated = await apiFetch<{ name: string; email: string }>('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ name: name.trim() }),
      })
      updateAdmin({ name: updated.name })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل حفظ التغييرات')
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault()
    setPwSaving(true)
    setPwMessage(null)
    try {
      await apiFetch('/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      })
      setPwMessage({ ok: true, text: 'تم تغيير كلمة المرور بنجاح' })
      setCurrentPassword('')
      setNewPassword('')
    } catch (err) {
      setPwMessage({ ok: false, text: err instanceof Error ? err.message : 'فشل تغيير كلمة المرور' })
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-black text-gray-800">الإعدادات</h1>
        <p className="text-gray-500 text-sm mt-1">إعدادات حساب المدير</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-bold text-gray-800 mb-5">معلومات الحساب</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">الاسم</label>
            <input value={name} onChange={e => setName(e.target.value)} minLength={2} required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm bg-gray-50" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">البريد الإلكتروني</label>
            <input value={admin?.email || ''} disabled className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-gray-50 text-gray-400 cursor-not-allowed" dir="ltr" />
          </div>
          {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600 text-center">{error}</div>}
          <button type="submit" disabled={saving} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60">
            {saved ? '✓ تم الحفظ' : saving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-bold text-gray-800 mb-5">تغيير كلمة المرور</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">كلمة المرور الحالية</label>
            <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm bg-gray-50" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">كلمة المرور الجديدة</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm bg-gray-50" />
            <p className="text-xs text-gray-400 mt-1">6 أحرف على الأقل</p>
          </div>
          {pwMessage && (
            <div className={`rounded-xl p-3 text-sm text-center border ${pwMessage.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
              {pwMessage.text}
            </div>
          )}
          <button type="submit" disabled={pwSaving} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60">
            {pwSaving ? 'جارٍ التغيير...' : 'تغيير كلمة المرور'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-bold text-gray-800 mb-2">معلومات المنصة</h2>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex justify-between py-2 border-b border-gray-50">
            <span>اسم المنصة</span>
            <span className="font-semibold text-indigo-600">جبت كام؟</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-50">
            <span>العلامة المائية</span>
            <span className="font-semibold text-teal-600">مس ايه فايز</span>
          </div>
          <div className="flex justify-between py-2">
            <span>الإصدار</span>
            <span className="font-semibold text-gray-500">1.0.0</span>
          </div>
        </div>
      </div>
    </div>
  )
}
