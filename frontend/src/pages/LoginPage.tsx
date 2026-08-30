import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from '../components/ui/Logo';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Mail, Lock, AlertCircle, Sparkles, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/admin');
    } catch (err: any) {
      setError(err.message || 'فشل تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFF] dark:bg-[#070B1A] flex items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-brand-500/10 to-accent-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-br from-brand-600/10 to-purple-500/10 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4" />

      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center relative z-10">
        {/* Left - Branding */}
        <div className="hidden lg:block space-y-8">
          <Link to="/">
            <Logo size="lg" showText showTagline />
          </Link>
          
          <div className="space-y-6">
            <div>
              <h1 className="text-5xl font-black text-slate-900 dark:text-white leading-tight">
                لوحة تحكم
                <br />
                <span className="bg-gradient-to-r from-brand-600 to-accent-500 bg-clip-text text-transparent">
                  جبت كام؟
                </span>
              </h1>
              <p className="text-slate-600 dark:text-slate-300 text-lg mt-4 leading-relaxed">
                منصة امتحانات عصرية لإدارة الاختبارات، متابعة النتائج، ومعرفة ترتيب الطلاب لحظياً
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'امتحانات منشأة', value: '500+', color: 'brand' },
                { label: 'طالب مشارك', value: '10K+', color: 'emerald' },
                { label: 'متوسط الرضا', value: '98%', color: 'amber' },
                { label: 'دعم فني', value: '24/7', color: 'purple' },
              ].map((stat, i) => (
                <div key={i} className="bg-white/60 dark:bg-slate-800/60 backdrop-blur border border-slate-200/50 dark:border-slate-700/50 rounded-2xl p-4">
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{stat.value}</p>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
              <div className="flex -space-x-2">
                {[1,2,3].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 border-2 border-white dark:border-slate-900 flex items-center justify-center text-white font-bold text-xs">
                    {String.fromCharCode(64+i)}
                  </div>
                ))}
              </div>
              <span>موثوق من قبل مئات المعلمين</span>
            </div>
          </div>
        </div>

        {/* Right - Login Form */}
        <Card className="border-2 border-slate-100 dark:border-slate-800 shadow-2xl shadow-brand-500/5 p-8">
          <div className="lg:hidden mb-8">
            <Logo size="md" showText showTagline />
          </div>

          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-brand-50 dark:bg-brand-950/50 border border-brand-200/50 dark:border-brand-800/30 rounded-full px-3 py-1 text-xs font-black text-brand-700 dark:text-brand-300 mb-4">
              <Sparkles className="w-3 h-3" />
              <span>تسجيل دخول الإدارة</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">أهلاً بيك تاني! 👋</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">سجل دخولك عشان تكمل إدارة امتحاناتك</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 p-4 rounded-2xl text-sm flex gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="font-bold">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-black text-slate-700 dark:text-slate-200 mb-3">البريد الإلكتروني</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@jebtkam.com"
                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 pr-12 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 transition-all font-medium"
                />
                <Mail className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-black text-slate-700 dark:text-slate-200 mb-3">كلمة المرور</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 pr-12 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 transition-all font-medium"
                />
                <Lock className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <Button
              type="submit"
              loading={loading}
              fullWidth
              size="lg"
              className="mt-2"
            >
              {loading ? 'جاري الدخول...' : 'دخول اللوحة'}
              {!loading && <ArrowRight className="w-5 h-5 mr-2 rotate-180" />}
            </Button>

            <div className="text-center pt-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                البيانات الافتراضية: <span className="font-mono font-bold">admin@exam.com / admin123</span>
              </p>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
            <Link to="/" className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
              ← العودة للمنصة الرئيسية
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};
