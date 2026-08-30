import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Logo } from '../ui/Logo';
import { LogOut, Moon, Sun, User } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const { adminName, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800 px-6 py-4">
      <div className="flex items-center justify-between max-w-[1600px] mx-auto">
        <Link to="/admin">
          <Logo size="md" showText showTagline={false} />
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-slate-600" />}
          </button>

          <div className="hidden md:flex items-center gap-3 bg-slate-50 dark:bg-slate-800/60 px-4 py-2 rounded-2xl border border-slate-200/60 dark:border-slate-700/50">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white font-bold text-sm">
              {adminName?.charAt(0) || 'م'}
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">{adminName || 'المدير'}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">مدير النظام</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-10 h-10 md:w-auto md:px-4 md:py-2 rounded-2xl bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200/50 dark:border-red-800/30 flex items-center justify-center gap-2 font-bold text-sm transition-colors"
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
  const { theme, toggleTheme } = useTheme();
  
  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800 px-4 md:px-6 py-3">
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        <Logo size="md" showText showTagline />
        
        <button
          onClick={toggleTheme}
          className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-slate-600" />}
        </button>
      </div>
    </header>
  );
};
