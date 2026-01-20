'use client';

import type { Tag } from '@/types';

interface TagBadgeProps {
  tag: Tag;
  onClick?: () => void;
  onRemove?: () => void;
  selected?: boolean;
  size?: 'sm' | 'md';
}

export default function TagBadge({ tag, onClick, onRemove, selected, size = 'md' }: TagBadgeProps) {
  const sizeClasses = size === 'sm' ? 'text-xs px-2.5 py-1' : 'text-sm px-3 py-1.5';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg font-medium transition-all ${sizeClasses} ${
        onClick ? 'cursor-pointer hover:scale-105 hover:shadow-sm' : ''
      } ${selected ? 'ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-gray-800' : ''}`}
      style={{
        backgroundColor: `${tag.color}18`,
        color: tag.color,
        borderLeft: `3px solid ${tag.color}`,
      }}
      onClick={onClick}
    >
      {tag.name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
}
