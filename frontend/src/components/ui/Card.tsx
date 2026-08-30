import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  hover = false,
  padding = 'md'
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div className={`
      bg-white dark:bg-slate-800/80 backdrop-blur-sm
      border border-slate-200/60 dark:border-slate-700/50
      rounded-[24px] shadow-soft
      ${hover ? 'hover:shadow-xl hover:shadow-brand-500/10 hover:-translate-y-1 transition-all duration-300' : ''}
      ${paddingClasses[padding]}
      ${className}
    `}>
      {children}
    </div>
  );
};

export const StatsCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  color?: string;
}> = ({ title, value, icon, trend, color = 'brand' }) => {
  return (
    <Card className="relative overflow-hidden" hover>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-2">{value}</h3>
          {trend && (
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1">
              {trend}
            </p>
          )}
        </div>
        <div className={`
          w-14 h-14 rounded-2xl flex items-center justify-center
          ${color === 'brand' ? 'bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400' : ''}
          ${color === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400' : ''}
          ${color === 'amber' ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400' : ''}
          ${color === 'purple' ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400' : ''}
        `}>
          {icon}
        </div>
      </div>
      <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-gradient-to-br from-brand-500/5 to-transparent rounded-full blur-xl" />
    </Card>
  );
};
