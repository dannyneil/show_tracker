'use client';

import { useState, useEffect } from 'react';

interface DecideHelperProps {
  onClose: () => void;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function DecideHelper({ onClose }: DecideHelperProps) {
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [deepAnalysis, setDeepAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDeep, setIsLoadingDeep] = useState(false);
  const [isLoadingPrevious, setIsLoadingPrevious] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Load previous recommendation on mount
  useEffect(() => {
    const fetchPrevious = async () => {
      try {
        const response = await fetch('/api/decide');
        const data = await response.json();
        if (data.quickPick) {
          setRecommendation(data.quickPick);
          setDeepAnalysis(data.deepAnalysis);
          setLastUpdated(data.updatedAt);
        }
      } catch {
        // Silently fail - user can generate new recommendation
      }
      setIsLoadingPrevious(false);
    };
    fetchPrevious();
  }, []);

  const handleGetRecommendation = async (deep = false) => {
    if (deep) {
      setIsLoadingDeep(true);
    } else {
      setIsLoading(true);
      setRecommendation(null);
      setDeepAnalysis(null);
      setLastUpdated(null);
    }
    setError(null);

    try {
      const response = await fetch('/api/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deep }),
      });
      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else if (deep) {
        setDeepAnalysis(data.recommendation);
      } else {
        setRecommendation(data.recommendation);
      }
      // Update timestamp to now
      setLastUpdated(new Date().toISOString());
    } catch {
      setError('Failed to get recommendations. Please try again.');
    }

    if (deep) {
      setIsLoadingDeep(false);
    } else {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#faf7f2]/98 dark:bg-[#252320]/98 backdrop-blur-xl rounded-3xl shadow-2xl shadow-amber-900/10 dark:shadow-none max-w-2xl w-full max-h-[85vh] overflow-hidden border border-amber-200/40 dark:border-amber-900/30">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-amber-200/30 dark:border-amber-900/20 bg-gradient-to-r from-amber-50/50 to-orange-50/30 dark:from-amber-900/10 dark:to-orange-900/10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <span className="text-2xl">🎲</span>
            </div>
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Help Me Decide
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                AI-powered recommendations based on your taste
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
          {isLoadingPrevious && (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent mx-auto" />
              <p className="text-sm text-gray-500 mt-3">Loading...</p>
            </div>
          )}

          {!isLoadingPrevious && !recommendation && !isLoading && !error && (
            <div className="text-center py-10">
              <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 flex items-center justify-center">
                <span className="text-5xl">🍿</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Can&apos;t decide what to watch?
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
                We&apos;ll analyze your watchlist and shows you&apos;ve tagged as &quot;Liked&quot;
                to give you personalized recommendations.
              </p>
              <button
                onClick={() => handleGetRecommendation(false)}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-105 flex items-center gap-2 mx-auto"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Get Recommendations
              </button>
            </div>
          )}

          {isLoading && (
            <div className="text-center py-16">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-purple-200 dark:border-purple-800" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-600 animate-spin" />
                <div className="absolute inset-3 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 flex items-center justify-center">
                  <span className="text-2xl">🤔</span>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-300 font-medium">
                Analyzing your taste...
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                This may take a few seconds
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
                onClick={() => handleGetRecommendation(false)}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-foreground font-medium rounded-xl transition-all"
              >
                Try Again
              </button>
            </div>
          )}

          {recommendation && (
            <div>
              <div className="bg-gradient-to-br from-gray-50 to-indigo-50/50 dark:from-gray-700/50 dark:to-indigo-900/20 rounded-2xl p-5 border border-gray-200/50 dark:border-gray-600/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400">
                    <span>⚡</span> Quick Pick
                  </div>
                  {lastUpdated && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {formatTimeAgo(lastUpdated)}
                    </span>
                  )}
                </div>
                <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed text-sm">
                  {recommendation}
                </div>
              </div>

              {/* Deep Analysis Section */}
              {!deepAnalysis && !isLoadingDeep && (
                <button
                  onClick={() => handleGetRecommendation(true)}
                  className="mt-4 w-full px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20 dark:hover:from-amber-900/30 dark:hover:to-orange-900/30 text-amber-700 dark:text-amber-300 font-medium rounded-xl border border-amber-200/50 dark:border-amber-800/50 transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <span>🔍</span>
                  Get deeper analysis with critic reviews
                </button>
              )}

              {isLoadingDeep && (
                <div className="mt-4 p-4 bg-amber-50/50 dark:bg-amber-900/10 rounded-xl border border-amber-200/30 dark:border-amber-800/30">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-amber-600 border-t-transparent" />
                    <div>
                      <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Searching reviews...</p>
                      <p className="text-xs text-amber-600/70 dark:text-amber-400/70">This may take 15-30 seconds</p>
                    </div>
                  </div>
                </div>
              )}

              {deepAnalysis && (
                <div className="mt-4 bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-900/20 dark:to-orange-900/10 rounded-2xl p-5 border border-amber-200/50 dark:border-amber-800/30">
                  <div className="flex items-center gap-2 mb-3 text-sm font-medium text-amber-700 dark:text-amber-300">
                    <span>🔍</span> Deep Dive (with critic reviews)
                  </div>
                  <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed text-sm">
                    {deepAnalysis}
                  </div>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-gray-200/50 dark:border-gray-700/50 flex justify-between items-center">
                <button
                  onClick={() => handleGetRecommendation(false)}
                  className="px-4 py-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all font-medium flex items-center gap-2 text-sm"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  New Pick
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all shadow-md shadow-indigo-500/25 text-sm"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
