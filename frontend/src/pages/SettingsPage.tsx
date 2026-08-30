import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Logo } from '../components/ui/Logo';
import { User, Lock, Save, Palette, CheckCircle2, AlertCircle } from 'lucide-react';

interface Me {
  id: number;
  name: string;
  email: string;
}

export const SettingsPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    apiFetch<Me>('/auth/me')
      .then((me) => {
        setName(me.name);
        setEmail(me.email);
      })
      .catch(() => undefined);
  }, []);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    if (!name.trim()) {
      setProfileMsg({ ok: false, text: 'الاسم مطلوب' });
      return;
    }
    setSavingProfile(true);
    try {
      const me = await apiFetch<Me>('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      setName(me.name);
      setEmail(me.email);
      localStorage.setItem('admin_name', me.name);
      localStorage.setItem('admin_email', me.email);
      setProfileMsg({ ok: true, text: 'تم حفظ البيانات بنجاح ✅' });
    } catch (err: any) {
      setProfileMsg({ ok: false, text: err.message || 'حدث خطأ، حاول مرة أخرى' });
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword.length < 6) {
      setPasswordMsg({ ok: false, text: 'كلمة المرور الجديدة لازم تكون 6 أحرف على الأقل' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ ok: false, text: 'تأكيد كلمة المرور غير مطابق' });
      return;
    }
    setSavingPassword(true);
    try {
      await apiFetch('/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMsg({ ok: true, text: 'تم تغيير كلمة المرور بنجاح ✅' });
    } catch (err: any) {
      setPasswordMsg({ ok: false, text: err.message || 'حدث خطأ، حاول مرة أخرى' });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-3xl font-black text-slate-900">الإعدادات</h1>
        <p className="text-slate-500 mt-1 font-medium">إدارة حسابك وهوية المنصة</p>
      </div>

      <Card>
        <h3 className="font-black text-slate-900 text-lg mb-6 flex items-center gap-2">
          <User className="w-5 h-5 text-brand-600" />
          بيانات الحساب
        </h3>
        {profileMsg && (
          <div
            className={`mb-4 p-3 rounded-2xl text-sm font-bold flex items-center gap-2 ${
              profileMsg.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}
            role="status"
          >
            {profileMsg.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {profileMsg.text}
          </div>
        )}
        <form onSubmit={saveProfile} className="space-y-5">
          <div>
            <label className="block text-sm font-black text-slate-700 mb-2">الاسم</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-black text-slate-700 mb-2">البريد الإلكتروني</label>
            <Input type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <Button type="submit" loading={savingProfile}>
            <Save className="w-4 h-4 ml-2" />
            حفظ التغييرات
          </Button>
        </form>
      </Card>

      <Card>
        <h3 className="font-black text-slate-900 text-lg mb-6 flex items-center gap-2">
          <Lock className="w-5 h-5 text-brand-600" />
          تغيير كلمة المرور
        </h3>
        {passwordMsg && (
          <div
            className={`mb-4 p-3 rounded-2xl text-sm font-bold flex items-center gap-2 ${
              passwordMsg.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}
            role="status"
          >
            {passwordMsg.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {passwordMsg.text}
          </div>
        )}
        <form onSubmit={savePassword} className="space-y-5">
          <div>
            <label className="block text-sm font-black text-slate-700 mb-2">كلمة المرور الحالية</label>
            <Input type="password" dir="ltr" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-black text-slate-700 mb-2">كلمة المرور الجديدة</label>
              <Input type="password" dir="ltr" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-black text-slate-700 mb-2">تأكيد كلمة المرور</label>
              <Input type="password" dir="ltr" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
          </div>
          <Button type="submit" loading={savingPassword}>
            <Lock className="w-4 h-4 ml-2" />
            تغيير كلمة المرور
          </Button>
        </form>
      </Card>

      <Card>
        <h3 className="font-black text-slate-900 text-lg mb-6 flex items-center gap-2">
          <Palette className="w-5 h-5 text-brand-600" />
          هوية المنصة
        </h3>
        <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-5">
          <Logo size="lg" showText showTagline />
        </div>
        <div className="grid md:grid-cols-2 gap-4 mt-4 text-sm">
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <p className="text-xs font-black text-slate-500 mb-1">اسم المنصة</p>
            <p className="font-black text-slate-900">جبت كام؟</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <p className="text-xs font-black text-slate-500 mb-1">العلامة المائية داخل الامتحانات</p>
            <p className="font-black text-slate-900">مس ايه فايز</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SettingsPage;
