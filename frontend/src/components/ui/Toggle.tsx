import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

/** Accessible ON/OFF switch used for exam behaviour settings. */
export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, label, description, icon, disabled }) => {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div className="w-10 h-10 rounded-2xl bg-brand-50 border border-brand-200/50 flex items-center justify-center text-brand-600 flex-shrink-0">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-black text-slate-800 text-sm">{label}</p>
          {description && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{description}</p>}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 flex-shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/30 ${'' /* RTL: knob anchored to the right */}
          checked ? 'bg-brand-600' : 'bg-slate-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all duration-200 ${
            checked ? 'right-6' : 'right-1'
          }`}
        />
      </button>
    </div>
  );
};

export default Toggle;
