import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, hint, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-bold text-slate-700 mb-2">
          {label}
        </label>
      )}
      <input
        className={`
          w-full bg-white border rounded-2xl px-5 py-3.5
          text-slate-900 placeholder-slate-400
          focus:outline-none focus:ring-4 transition-all duration-200
          ${error 
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' 
            : 'border-slate-200 focus:border-brand-500 focus:ring-brand-500/20'
          }
          ${className}
        `}
        {...props}
      />
      {error && <p className="mt-2 text-sm text-red-500 font-medium">{error}</p>}
      {hint && !error && <p className="mt-2 text-sm text-slate-500">{hint}</p>}
    </div>
  );
};

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-bold text-slate-700 mb-2">
          {label}
        </label>
      )}
      <textarea
        className={`
          w-full bg-white border rounded-2xl px-5 py-3.5
          text-slate-900 placeholder-slate-400
          focus:outline-none focus:ring-4 transition-all duration-200 resize-none
          ${error 
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' 
            : 'border-slate-200 focus:border-brand-500 focus:ring-brand-500/20'
          }
          ${className}
        `}
        {...props}
      />
      {error && <p className="mt-2 text-sm text-red-500 font-medium">{error}</p>}
    </div>
  );
};
