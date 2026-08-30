import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, Trophy, Settings, Plus, Award } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { to: '/admin', label: 'الرئيسية', icon: LayoutDashboard, exact: true },
    { to: '/admin/exams', label: 'الامتحانات', icon: FileText },
    { to: '/admin/exams/new', label: 'إنشاء امتحان', icon: Plus },
    { to: '/admin/results', label: 'النتائج', icon: Award },
    { to: '/admin/students', label: 'المشاركون', icon: Users },
    { to: '/admin/leaderboard', label: 'الترتيب', icon: Trophy },
    { to: '/admin/settings', label: 'الإعدادات', icon: Settings },
  ];

  return (
    <aside className="w-[280px] hidden lg:block bg-white border-l border-slate-200/60 min-h-[calc(100vh-73px)] p-6 sticky top-[73px] h-fit">
      <div className="space-y-6">
        <NavLink
          to="/admin/exams/new"
          className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white font-bold py-3.5 rounded-2xl shadow-brand transition-all hover:shadow-brand-lg hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-5 h-5" />
          <span>إنشاء امتحان جديد</span>
        </NavLink>

        <nav className="space-y-1.5" aria-label="القائمة الرئيسية">
          <p className="text-[11px] font-black tracking-widest text-slate-400 px-3 py-2">القائمة الرئيسية</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-[14px] transition-all duration-200 ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 border border-brand-200/50 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="pt-6 border-t border-slate-200">
          <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-[20px] p-5 text-white relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-accent-500/20 rounded-full blur-2xl" />
            <h4 className="font-black text-lg relative z-10">جبت كام؟ 🚀</h4>
            <p className="text-sm text-brand-100 mt-1 relative z-10 leading-relaxed">
              منصة امتحانات عصرية وسريعة للطلاب والمعلمين
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs font-bold bg-white/15 backdrop-blur rounded-xl px-3 py-2 w-fit">
              <span className="w-2 h-2 bg-accent-400 rounded-full animate-pulse" />
              <span>النظام يعمل بكفاءة</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export const MobileNav: React.FC = () => {
  const navItems = [
    { to: '/admin', label: 'الرئيسية', icon: LayoutDashboard, exact: true },
    { to: '/admin/exams', label: 'الامتحانات', icon: FileText },
    { to: '/admin/results', label: 'النتائج', icon: Award },
    { to: '/admin/students', label: 'المشاركون', icon: Users },
    { to: '/admin/settings', label: 'الإعدادات', icon: Settings },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 px-2 py-2 z-40" aria-label="التنقل السفلي">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all ${
                  isActive ? 'text-brand-600 bg-brand-50' : 'text-slate-500'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-bold">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
