'use client';

import type { ShowStatus, Tag } from '@/types';
import TagBadge from './TagBadge';

interface FilterBarProps {
  tags: Tag[];
  selectedStatus: ShowStatus | 'all';
  selectedTagIds: string[];
  selectedService: string | null;
  streamingServices: string[];
  onStatusChange: (status: ShowStatus | 'all') => void;
  onTagToggle: (tagId: string) => void;
  onServiceChange: (service: string | null) => void;
}

const statuses: { value: ShowStatus | 'all'; label: string; icon: string }[] = [
  { value: 'all', label: 'All', icon: '📋' },
  { value: 'to_watch', label: 'To Watch', icon: '👀' },
  { value: 'watching', label: 'Watching', icon: '▶️' },
  { value: 'watched', label: 'Watched', icon: '✅' },
  { value: 'parked', label: 'Parked', icon: '⏸️' },
];

export default function FilterBar({
  tags,
  selectedStatus,
  selectedTagIds,
  selectedService,
  streamingServices,
  onStatusChange,
  onTagToggle,
  onServiceChange,
}: FilterBarProps) {
  // Group tags by category
  const tagsByCategory = tags.reduce((acc, tag) => {
    const category = tag.category || 'meta';
    if (!acc[category]) acc[category] = [];
    acc[category].push(tag);
    return acc;
  }, {} as Record<string, Tag[]>);

  return (
    <div className="space-y-6">
      {/* Status filter */}
      <div>
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 block">
          Status
        </label>
        <div className="flex flex-col gap-1.5">
          {statuses.map((s) => (
            <button
              key={s.value}
              onClick={() => onStatusChange(s.value)}
              className={`px-3 py-2.5 text-sm rounded-xl transition-all flex items-center gap-2.5 ${
                selectedStatus === s.value
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-500/25'
                  : 'bg-amber-50/50 dark:bg-amber-900/10 text-amber-800 dark:text-amber-200 hover:bg-amber-100/50 dark:hover:bg-amber-900/20 border border-amber-200/30 dark:border-amber-800/20'
              }`}
            >
              <span className="text-base">{s.icon}</span>
              <span className="font-medium">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Streaming service filter */}
      {streamingServices.length > 0 && (
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 block">
            Streaming
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onServiceChange(null)}
              className={`px-3 py-2 text-sm rounded-xl transition-all ${
                selectedService === null
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-500/25'
                  : 'bg-amber-50/50 dark:bg-amber-900/10 text-amber-800 dark:text-amber-200 hover:bg-amber-100/50 dark:hover:bg-amber-900/20 border border-amber-200/30 dark:border-amber-800/20'
              }`}
            >
              All
            </button>
            {streamingServices.map((service) => (
              <button
                key={service}
                onClick={() => onServiceChange(service)}
                className={`px-3 py-2 text-sm rounded-xl transition-all ${
                  selectedService === service
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-500/25'
                    : 'bg-amber-50/50 dark:bg-amber-900/10 text-amber-800 dark:text-amber-200 hover:bg-amber-100/50 dark:hover:bg-amber-900/20 border border-amber-200/30 dark:border-amber-800/20'
                }`}
              >
                {service}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tag filters by category */}
      {Object.entries(tagsByCategory).map(([category, categoryTags]) => (
        <div key={category}>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 block">
            {category === 'who' ? 'Who\'s Watching' : category === 'meta' ? 'Lists' : category}
          </label>
          <div className="flex flex-wrap gap-2">
            {categoryTags.map((tag) => (
              <TagBadge
                key={tag.id}
                tag={tag}
                selected={selectedTagIds.includes(tag.id)}
                onClick={() => onTagToggle(tag.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
