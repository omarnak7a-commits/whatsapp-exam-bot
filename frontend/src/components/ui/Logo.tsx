import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  showTagline?: boolean;
  className?: string;
}

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

/**
 * Brand logo for the platform "جبت كام؟".
 * Uses the 3D clock + checklist mark (public/logo.png).
 */
export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  showTagline = false,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-3 ${className}`} dir="rtl">
      <img
        src="/logo.png"
        alt="شعار جبت كام؟"
        className={`${sizeClasses[size]} rounded-xl object-contain flex-shrink-0`}
        draggable={false}
      />
      {showText && (
        <div className="flex flex-col">
          <span className={`${textSizeClasses[size]} font-black text-brand-900 leading-none tracking-tight`}>
            جبت كام؟
          </span>
          {showTagline && (
            <span className="text-[10px] md:text-xs font-bold text-brand-600 mt-0.5 tracking-wide">
              امتحن، اعرف نتيجتك، وشوف ترتيبك
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export const LogoMark: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 40 }) => (
  <img
    src="/logo.png"
    alt="شعار جبت كام؟"
    className={`${className} rounded-xl object-contain`}
    style={{ width: size, height: size }}
    draggable={false}
  />
);
