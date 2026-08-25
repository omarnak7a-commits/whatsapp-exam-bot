import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, User, MessageSquare } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { adminName, logout } = useAuth();

  return (
    <header className="bg-slate-800/80 backdrop-blur border-b border-slate-700/60 sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-2 rounded-xl flex items-center justify-center">
          <MessageSquare className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-lg text-white leading-tight">منصة امتحانات واتساب</h1>
          <p className="text-xs text-slate-400">لوحة التحكم الإدارية الذكية</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-700 text-sm">
          <User className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-200 font-medium">{adminName || 'المدير'}</span>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 px-3 py-1.5 rounded-lg text-sm transition-colors"
          title="تسجيل الخروج"
        >
          <LogOut className="w-4 h-4" />
          <span>خروج</span>
        </button>
      </div>
    </header>
  );
};
