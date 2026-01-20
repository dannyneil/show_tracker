'use client';

import { useState, useEffect } from 'react';

interface TrendingShow {
  tmdb_id: number;
  title: string;
  type: 'movie' | 'tv';
  poster_url: string | null;
  year: number | null;
  overview: string;
  rating: number;
}

interface DiscoverModalProps {
  onClose: () => void;
  onAdd: (show: TrendingShow) => Promise<void>;
  existingTmdbIds: number[];
}

export default function DiscoverModal({ onClose, onAdd, existingTmdbIds }: DiscoverModalProps) {
  const [trending, setTrending] = useState<TrendingShow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingIds, setAddingIds] = useState<Set<number>>(new Set());
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const response = await fetch('/api/trending');
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setTrending(data);
      } catch {
        setError('Failed to load trending content. Please try again.');
      }
      setIsLoading(false);
    };
    fetchTrending();
  }, []);

  const handleAdd = async (show: TrendingShow) => {
    setAddingIds((prev) => new Set(prev).add(show.tmdb_id));
    try {
      await onAdd(show);
      setAddedIds((prev) => new Set(prev).add(show.tmdb_id));
    } catch {
      // Error handled by parent
    }
    setAddingIds((prev) => {
      const next = new Set(prev);
      next.delete(show.tmdb_id);
      return next;
    });
  };

  const isAlreadyAdded = (tmdbId: number) =>
    existingTmdbIds.includes(tmdbId) || addedIds.has(tmdbId);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#faf7f2]/98 dark:bg-[#252320]/98 backdrop-blur-xl rounded-3xl shadow-2xl shadow-amber-900/10 dark:shadow-none max-w-4xl w-full max-h-[85vh] overflow-hidden border border-amber-200/40 dark:border-amber-900/30">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-amber-200/30 dark:border-amber-900/20 bg-gradient-to-r from-amber-50/50 to-orange-50/30 dark:from-amber-900/10 dark:to-orange-900/10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <span className="text-2xl">🔥</span>
            </div>
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                Trending Now
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                What&apos;s hot this week on TMDb
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-100px)]">
          {isLoading && (
            <div className="text-center py-16">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-orange-200 dark:border-orange-800" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-orange-600 animate-spin" />
                <div className="absolute inset-3 rounded-full bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 flex items-center justify-center">
                  <span className="text-2xl">🔥</span>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-300 font-medium">
                Loading trending content...
              </p>
            </div>
          )}

          {error && (
            <div className="text-center py-10">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-red-600 dark:text-red-400 font-medium mb-6">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-foreground font-medium rounded-xl transition-all"
              >
                Try Again
              </button>
            </div>
          )}

          {!isLoading && !error && trending.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {trending.map((show) => {
                const isAdding = addingIds.has(show.tmdb_id);
                const isAdded = isAlreadyAdded(show.tmdb_id);

                return (
                  <div
                    key={`${show.type}-${show.tmdb_id}`}
                    className="group relative bg-white dark:bg-gray-800/50 rounded-xl overflow-hidden border border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg hover:shadow-amber-900/10 dark:hover:shadow-none transition-all"
                  >
                    {/* Poster */}
                    <div className="aspect-[2/3] relative bg-gray-100 dark:bg-gray-800">
                      {show.poster_url ? (
                        <img
                          src={show.poster_url}
                          alt={show.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">
                          {show.type === 'movie' ? '🎬' : '📺'}
                        </div>
                      )}

                      {/* Rating badge */}
                      <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 backdrop-blur-sm rounded-lg flex items-center gap-1">
                        <span className="text-yellow-400 text-xs">★</span>
                        <span className="text-white text-xs font-medium">{show.rating.toFixed(1)}</span>
                      </div>

                      {/* Type badge */}
                      <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 backdrop-blur-sm rounded-lg">
                        <span className="text-white text-xs font-medium uppercase">{show.type}</span>
                      </div>

                      {/* Overlay on hover */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                        <p className="text-white/90 text-xs line-clamp-3 mb-3">
                          {show.overview || 'No description available.'}
                        </p>
                        <button
                          onClick={() => handleAdd(show)}
                          disabled={isAdding || isAdded}
                          className={`w-full py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                            isAdded
                              ? 'bg-green-500/80 text-white cursor-default'
                              : isAdding
                              ? 'bg-gray-500/80 text-white cursor-wait'
                              : 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Added
                            </>
                          ) : isAdding ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Adding...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Add to List
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <h3 className="font-medium text-sm text-foreground truncate">{show.title}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {show.year || 'Unknown year'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-amber-200/30 dark:border-amber-900/20 bg-gray-50/50 dark:bg-gray-800/30 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all shadow-md shadow-indigo-500/25 text-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
