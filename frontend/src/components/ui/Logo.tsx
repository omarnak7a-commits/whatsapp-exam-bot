import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  showTagline?: boolean;
  variant?: 'light' | 'dark' | 'auto';
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ 
  size = 'md', 
  showText = true, 
  showTagline = false,
  variant = 'auto',
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-4xl',
  };

  return (
    <div className={`flex items-center gap-3 ${className}`} dir="rtl">
      {/* Logo Icon - Inspired by uploaded logo */}
      <div className={`${sizeClasses[size]} relative flex-shrink-0`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1E5CFF" />
              <stop offset="100%" stopColor="#0A1931" />
            </linearGradient>
            <linearGradient id="brightBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#1E5CFF" />
            </linearGradient>
            <linearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
          
          {/* Bar chart base */}
          <rect x="10" y="60" width="12" height="25" rx="3" fill="url(#blueGrad)" transform="rotate(-15 16 72)" opacity="0.9"/>
          <rect x="28" y="55" width="10" height="18" rx="2" fill="#10B981" opacity="0.8"/>
          <rect x="44" y="45" width="12" height="30" rx="3" fill="url(#brightBlueGrad)"/>
          <rect x="62" y="50" width="10" height="20" rx="2" fill="url(#greenGrad)" opacity="0.9"/>
          <rect x="78" y="35" width="12" height="40" rx="3" fill="url(#brightBlueGrad)"/>
          
          {/* Arrow */}
          <path d="M55 35 L85 15 L75 10 L85 15 L80 25 Z" fill="#0A1931" />
          <path d="M58 32 L82 12" stroke="#1E5CFF" strokeWidth="4" strokeLinecap="round"/>
          
          {/* Question mark */}
          <path d="M50 15 C35 15 28 25 28 35 C28 45 35 50 42 50 C48 50 52 45 52 40 C52 35 48 32 45 30 C42 28 38 26 38 22 C38 18 42 15 50 15 Z" 
                fill="none" stroke="url(#blueGrad)" strokeWidth="6" strokeLinecap="round"/>
          <circle cx="48" cy="68" r="8" fill="#0A1931"/>
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className={`${textSizeClasses[size]} font-black text-brand-900 dark:text-white leading-none tracking-tight`}>
            جبت كام؟
          </span>
          {showTagline && (
            <span className="text-[10px] md:text-xs font-bold text-brand-600 dark:text-brand-400 mt-0.5 tracking-wide">
              امتحن، اعرف نتيجتك، وشوف ترتيبك
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export const LogoMark: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 40 }) => (
  <div className={className} style={{ width: size, height: size }}>
    <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
      <defs>
        <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E5CFF" />
          <stop offset="100%" stopColor="#0A1931" />
        </linearGradient>
        <linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1E5CFF" />
        </linearGradient>
      </defs>
      <rect x="10" y="60" width="12" height="25" rx="3" fill="url(#g1)" transform="rotate(-15 16 72)" />
      <rect x="28" y="55" width="10" height="18" rx="2" fill="#10B981" />
      <rect x="44" y="45" width="12" height="30" rx="3" fill="url(#g2)" />
      <rect x="62" y="50" width="10" height="20" rx="2" fill="#10B981" />
      <rect x="78" y="35" width="12" height="40" rx="3" fill="url(#g2)" />
      <path d="M55 35 L85 15 L75 10 L85 15 L80 25 Z" fill="#0A1931" />
      <path d="M50 15 C35 15 28 25 28 35 C28 45 35 50 42 50 C48 50 52 45 52 40 C52 35 48 32 45 30 C42 28 38 26 38 22 C38 18 42 15 50 15 Z" fill="none" stroke="url(#g1)" strokeWidth="6" strokeLinecap="round"/>
      <circle cx="48" cy="68" r="8" fill="#0A1931"/>
    </svg>
  </div>
);
