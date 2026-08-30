import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Logo } from '../ui/Logo';
import { LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const { adminName, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-6 py-4">
      <div className="flex items-center justify-between max-w-[1600px] mx-auto">
        <Link to="/admin" aria-label="جبت كام؟ - الرئيسية">
          <Logo size="md" showText showTagline={false} />
        </Link>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200/60">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white font-bold text-sm">
              {adminName?.charAt(0) || 'م'}
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-slate-900 leading-none">{adminName || 'المدير'}</p>
              <p className="text-[11px] text-slate-500">مدير النظام</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-10 h-10 md:w-auto md:px-4 md:py-2 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/50 flex items-center justify-center gap-2 font-bold text-sm transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">خروج</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export const PublicNavbar: React.FC = () => {
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-4 md:px-6 py-3">
      <div className="flex items-center justify-center max-w-6xl mx-auto">
        <Logo size="md" showText showTagline />
      </div>
    </header>
  );
};
