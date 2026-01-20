'use client';

import { useState } from 'react';

interface DecideHelperProps {
  onClose: () => void;
}

export default function DecideHelper({ onClose }: DecideHelperProps) {
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGetRecommendation = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/decide', { method: 'POST' });
      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setRecommendation(data.recommendation);
      }
    } catch {
      setError('Failed to get recommendations. Please try again.');
    }

    setIsLoading(false);
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
          {!recommendation && !isLoading && !error && (
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
                onClick={handleGetRecommendation}
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
                onClick={handleGetRecommendation}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-foreground font-medium rounded-xl transition-all"
              >
                Try Again
              </button>
            </div>
          )}

          {recommendation && (
            <div>
              <div className="bg-gradient-to-br from-gray-50 to-indigo-50/50 dark:from-gray-700/50 dark:to-indigo-900/20 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-600/50">
                <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed">
                  {recommendation}
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-gray-200/50 dark:border-gray-700/50 flex justify-between items-center">
                <button
                  onClick={handleGetRecommendation}
                  className="px-5 py-2.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all font-medium flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Try Again
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all shadow-md shadow-indigo-500/25"
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
