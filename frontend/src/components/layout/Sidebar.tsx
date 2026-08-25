import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, Award, Trophy } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { to: '/', label: 'الرئيسية', icon: LayoutDashboard },
    { to: '/exams', label: 'الامتحانات', icon: FileText },
    { to: '/students', label: 'الطلاب', icon: Users },
    { to: '/results', label: 'النتائج والمحاولات', icon: Award },
    { to: '/leaderboard', label: 'لوحة الأوائل', icon: Trophy },
  ];

  return (
    <aside className="w-64 bg-slate-800/40 border-l border-slate-700/60 min-h-[calc(100vh-73px)] p-4">
      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                  isActive
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};
