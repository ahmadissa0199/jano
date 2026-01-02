
import React from 'react';

interface LanguageSelectProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: { label: string; value: string }[];
}

export const LanguageSelect: React.FC<LanguageSelectProps> = ({ label, value, onChange, options }) => {
  return (
    <div className="flex flex-col gap-1 w-full">
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};
