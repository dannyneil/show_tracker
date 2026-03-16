'use client';

import { useState, useEffect } from 'react';
import { formatShowList } from '@/lib/claude';
import type { ShowWithTags } from '@/types';

interface NaturalLanguageQueryProps {
  onClose: () => void;
}

export default function NaturalLanguageQuery({ onClose }: NaturalLanguageQueryProps) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isQuerying, setIsQuerying] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load user preferences on mount and build the pre-populated query
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const response = await fetch('/api/shows');
        const shows: ShowWithTags[] = await response.json();

        // Categorize shows by tags (same logic as Decide helper)
        const lovedShows = shows.filter((s) => s.tags?.some((t) => t.name === 'Loved'));
        const likedShows = shows.filter((s) => s.tags?.some((t) => t.name === 'Liked'));
        const dislikedShows = shows.filter((s) => s.tags?.some((t) => t.name === "Didn't Like"));
        const toWatchShows = shows.filter((s) => s.status === 'to_watch');

        // Format using the same logic as the Decide helper
        const lovedList = formatShowList(lovedShows);
        const likedList = formatShowList(likedShows);
        const dislikedList = formatShowList(dislikedShows);
        const toWatchList = formatShowList(toWatchShows, true); // Include ratings for watchlist

        // Build pre-populated query with the same format as Decide
        let prePopulatedQuery = '';

        prePopulatedQuery += '## Shows I LOVED (favorites):\n';
        prePopulatedQuery += lovedList || '(None yet)';
        prePopulatedQuery += '\n\n';

        prePopulatedQuery += '## Shows I Liked:\n';
        prePopulatedQuery += likedList || '(None yet)';
        prePopulatedQuery += '\n\n';

        prePopulatedQuery += '## Shows I Didn\'t Like (avoid similar):\n';
        prePopulatedQuery += dislikedList || '(None yet)';
        prePopulatedQuery += '\n\n';

        prePopulatedQuery += '## My Watchlist:\n';
        prePopulatedQuery += toWatchList || '(Empty)';
        prePopulatedQuery += '\n\n';

        prePopulatedQuery += 'IMPORTANT: Pay attention to any notes I\'ve included. These notes provide important context about my preferences and concerns.\n\n';

        prePopulatedQuery += '---\n\n';
        prePopulatedQuery += '**My question:**\n';
        prePopulatedQuery += 'Show me a happy TV show that I would enjoy.\n\n';
        prePopulatedQuery += '(You can edit everything above to customize your query!)';

        setQuery(prePopulatedQuery);
      } catch (err) {
        console.error('Failed to load preferences:', err);
        setQuery('Show me a happy TV show that I would enjoy.');
      }
      setIsLoading(false);
    };

    fetchPreferences();
  }, []);

  const handleSubmit = async () => {
    setIsQuerying(true);
    setError(null);
    setResponse(null);

    try {
      const response = await fetch('/api/natural-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setResponse(data.response);
      }
    } catch (err) {
      setError('Failed to process your query. Please try again.');
    }

    setIsQuerying(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#faf7f2]/98 dark:bg-[#252320]/98 backdrop-blur-xl rounded-3xl shadow-2xl shadow-amber-900/10 dark:shadow-none max-w-3xl w-full max-h-[85vh] overflow-hidden border border-amber-200/40 dark:border-amber-900/30">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-amber-200/30 dark:border-amber-900/20 bg-gradient-to-r from-amber-50/50 to-orange-50/30 dark:from-amber-900/10 dark:to-orange-900/10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30">
              <span className="text-2xl">💬</span>
            </div>
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Natural Language Query
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Ask anything in your own words
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
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {isLoading ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-600 border-t-transparent mx-auto" />
              <p className="text-sm text-gray-500 mt-3">Loading your preferences...</p>
            </div>
          ) : (
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Your Query (fully editable)
                </label>
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full h-64 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm text-gray-700 dark:text-gray-300 font-mono resize-y"
                  placeholder="Type your query here..."
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  💡 Tip: Edit the pre-populated text above to customize what information Claude sees. Add your own question at the end!
                </p>
              </div>

              {!response && !isQuerying && (
                <button
                  onClick={handleSubmit}
                  disabled={!query.trim()}
                  className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-semibold rounded-2xl transition-all shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Ask Claude
                </button>
              )}

              {isQuerying && (
                <div className="text-center py-16">
                  <div className="relative w-20 h-20 mx-auto mb-6">
                    <div className="absolute inset-0 rounded-full border-4 border-green-200 dark:border-green-800" />
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-green-600 animate-spin" />
                    <div className="absolute inset-3 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 flex items-center justify-center">
                      <span className="text-2xl">🤔</span>
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 font-medium">
                    Processing your query...
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    This may take a few seconds
                  </p>
                </div>
              )}

              {error && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                  <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                </div>
              )}

              {response && (
                <div className="mt-4">
                  <div className="bg-gradient-to-br from-gray-50 to-green-50/50 dark:from-gray-700/50 dark:to-green-900/20 rounded-2xl p-5 border border-gray-200/50 dark:border-gray-600/50">
                    <div className="flex items-center gap-2 mb-3 text-sm font-medium text-green-600 dark:text-green-400">
                      <span>✨</span> Claude&apos;s Response
                    </div>
                    <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed text-sm">
                      {response}
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={handleSubmit}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium rounded-lg transition-all shadow-md shadow-green-500/25 flex items-center justify-center gap-2 text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Ask Again
                    </button>
                    <button
                      onClick={() => {
                        setResponse(null);
                        setError(null);
                      }}
                      className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all font-medium text-sm"
                    >
                      Edit Query
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
