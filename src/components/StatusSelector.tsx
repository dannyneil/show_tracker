'use client';

import type { ShowStatus } from '@/types';

interface StatusSelectorProps {
  status: ShowStatus;
  onChange: (status: ShowStatus) => void;
  disabled?: boolean;
}

const statuses: { value: ShowStatus; label: string; icon: string; activeClass: string }[] = [
  {
    value: 'to_watch',
    label: 'To Watch',
    icon: '📋',
    activeClass: 'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/40 dark:to-yellow-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700 shadow-sm shadow-amber-100 dark:shadow-none'
  },
  {
    value: 'watching',
    label: 'Watching',
    icon: '▶️',
    activeClass: 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/40 dark:to-indigo-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 shadow-sm shadow-blue-100 dark:shadow-none'
  },
  {
    value: 'watched',
    label: 'Watched',
    icon: '✓',
    activeClass: 'bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/40 dark:to-green-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700 shadow-sm shadow-emerald-100 dark:shadow-none'
  },
];

export default function StatusSelector({ status, onChange, disabled }: StatusSelectorProps) {
  return (
    <div className="flex gap-2">
      {statuses.map((s) => (
        <button
          key={s.value}
          onClick={() => onChange(s.value)}
          disabled={disabled}
          className={`px-3 py-1.5 text-sm rounded-xl border transition-all flex items-center gap-1.5 font-medium ${
            status === s.value
              ? s.activeClass
              : 'bg-gray-50/50 dark:bg-gray-800/50 text-gray-400 border-gray-200/50 dark:border-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-600 dark:hover:text-gray-300'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span className="text-xs">{s.icon}</span>
          {s.label}
        </button>
      ))}
    </div>
  );
}
