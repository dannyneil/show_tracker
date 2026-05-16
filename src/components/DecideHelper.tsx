'use client';

import { useState, useEffect } from 'react';

interface Tag {
  id: string;
  name: string;
  color: string;
  category: string;
}

interface InputContext {
  lovedShows: string[];
  likedShows: string[];
  dislikedShows: string[];
  poolShows: string[];
  filters: {
    loved: string[];
    liked: string[];
    disliked: string[];
    pool: string[];
  };
  prompt: string | null;
}

interface DecideHelperProps {
  onClose: () => void;
}

export default function DecideHelper({ onClose }: DecideHelperProps) {
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);

  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [lovedTags, setLovedTags] = useState<string[]>(['Loved']);
  const [likedTags, setLikedTags] = useState<string[]>(['Liked']);
  const [dislikedTags, setDislikedTags] = useState<string[]>(["Didn't Like"]);
  const [poolTags, setPoolTags] = useState<string[]>([]);

  const [inputContext, setInputContext] = useState<InputContext | null>(null);
  const [showInputContext, setShowInputContext] = useState(false);

  useEffect(() => {
    fetch('/api/tags')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setAvailableTags(data); })
      .catch(() => {});
  }, []);

  const toggleTag = (tagName: string, currentTags: string[], setTags: (tags: string[]) => void) => {
    if (currentTags.includes(tagName)) {
      setTags(currentTags.filter((t) => t !== tagName));
    } else {
      setTags([...currentTags, tagName]);
    }
  };

  const handleGetRecommendation = async () => {
    setIsLoading(true);
    setIsLoadingContext(true);
    setRecommendation(null);
    setInputContext(null);
    setShowInputContext(false);
    setError(null);

    const body = JSON.stringify({ lovedTags, likedTags, dislikedTags, poolTags });
    const headers = { 'Content-Type': 'application/json' };

    const contextPromise = fetch('/api/decide/context', { method: 'POST', headers, body })
      .then((r) => r.json())
      .then((ctx) => {
        if (!ctx.error) {
          setInputContext(ctx);
          setShowInputContext(true);
        }
      })
      .finally(() => setIsLoadingContext(false));

    const recommendationPromise = fetch('/api/decide', { method: 'POST', headers, body })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setRecommendation(data.recommendation);
          if (data.model) setModel(data.model);
          // Update with full inputContext including the prompt
          if (data.inputContext) setInputContext(data.inputContext);
        }
      })
      .catch(() => {
        setError('Failed to get recommendations. Please try again.');
      })
      .finally(() => setIsLoading(false));

    await Promise.allSettled([contextPromise, recommendationPromise]);
  };

  const TagSelector = ({
    label,
    description,
    selectedTags,
    setSelectedTags,
  }: {
    label: string;
    description: string;
    selectedTags: string[];
    setSelectedTags: (tags: string[]) => void;
  }) => (
    <div className="mb-3">
      <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</div>
      <div className="text-xs text-gray-400 dark:text-gray-500 mb-2">{description}</div>
      <div className="flex flex-wrap gap-1.5">
        {availableTags.map((tag) => (
          <button
            key={tag.id}
            onClick={() => toggleTag(tag.name, selectedTags, setSelectedTags)}
            className={`px-2 py-0.5 text-xs rounded-full transition-all ${
              selectedTags.includes(tag.name)
                ? 'ring-2 ring-offset-1 ring-indigo-500 dark:ring-offset-gray-800'
                : 'opacity-50 hover:opacity-75'
            }`}
            style={{ backgroundColor: tag.color + '30', color: tag.color }}
          >
            {tag.name}
          </button>
        ))}
      </div>
    </div>
  );

  const hasCustomFilters =
    JSON.stringify(lovedTags) !== JSON.stringify(['Loved']) ||
    JSON.stringify(likedTags) !== JSON.stringify(['Liked']) ||
    JSON.stringify(dislikedTags) !== JSON.stringify(["Didn't Like"]) ||
    poolTags.length > 0;

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
            <div className="text-center py-6">
              <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 flex items-center justify-center">
                <span className="text-4xl">🍿</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Can&apos;t decide what to watch?
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto text-sm">
                Get personalized recommendations with critic reviews, based on your taste.
              </p>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`mb-4 px-3 py-1.5 text-xs rounded-lg transition-all flex items-center gap-1.5 mx-auto ${
                  hasCustomFilters
                    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                {showFilters ? 'Hide Filters' : 'Customize Filters'}
                {hasCustomFilters && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
              </button>

              {showFilters && (
                <div className="text-left bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 mb-6 border border-gray-200/50 dark:border-gray-700/50">
                  <TagSelector
                    label="Shows I Loved"
                    description="Tags that identify your favorites"
                    selectedTags={lovedTags}
                    setSelectedTags={setLovedTags}
                  />
                  <TagSelector
                    label="Shows I Liked"
                    description="Tags that identify shows you enjoyed"
                    selectedTags={likedTags}
                    setSelectedTags={setLikedTags}
                  />
                  <TagSelector
                    label="Shows I Didn't Like"
                    description="Tags for shows to avoid similar to"
                    selectedTags={dislikedTags}
                    setSelectedTags={setDislikedTags}
                  />
                  <TagSelector
                    label="Filter Watchlist By"
                    description="Only recommend from shows with these tags (leave empty for all)"
                    selectedTags={poolTags}
                    setSelectedTags={setPoolTags}
                  />
                  <button
                    onClick={() => {
                      setLovedTags(['Loved']);
                      setLikedTags(['Liked']);
                      setDislikedTags(["Didn't Like"]);
                      setPoolTags([]);
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mt-2"
                  >
                    Reset to defaults
                  </button>
                </div>
              )}

              <button
                onClick={handleGetRecommendation}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-105 flex items-center gap-2 mx-auto"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Get Recommendation
              </button>
            </div>
          )}

          {isLoading && (
            <div>
              <div className="text-center py-8">
                <div className="relative w-20 h-20 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full border-4 border-purple-200 dark:border-purple-800" />
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-600 animate-spin" />
                  <div className="absolute inset-3 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 flex items-center justify-center">
                    <span className="text-2xl">🤔</span>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-300 font-medium">
                  Analyzing your taste &amp; searching reviews...
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  This may take 30–60 seconds
                </p>
              </div>

              {/* Show input context as soon as it resolves, so user can read while waiting */}
              {isLoadingContext && (
                <p className="text-xs text-center text-gray-400 dark:text-gray-500 pb-4">
                  Loading what&apos;s being sent to Claude...
                </p>
              )}
              {inputContext && (
                <div className="mt-2">
                  <button
                    onClick={() => setShowInputContext(!showInputContext)}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
                  >
                    <svg
                      className={`w-3 h-3 transition-transform ${showInputContext ? 'rotate-90' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {showInputContext ? 'Hide' : 'Show'} what was sent to Claude
                  </button>
                  {showInputContext && (
                    <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs overflow-x-auto space-y-3">
                      <div>
                        <div className="text-gray-500 dark:text-gray-400 font-semibold mb-1">Input Data:</div>
                        <div className="font-mono space-y-2">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Filters: </span>
                            <span className="text-gray-700 dark:text-gray-300">
                              Loved={inputContext.filters.loved.join('+')} |
                              Liked={inputContext.filters.liked.join('+')} |
                              Disliked={inputContext.filters.disliked.join('+')} |
                              Pool={inputContext.filters.pool.join('+')}
                            </span>
                          </div>
                          <div>
                            <span className="text-green-600 dark:text-green-400">Loved ({inputContext.lovedShows.length}): </span>
                            <span className="text-gray-700 dark:text-gray-300">
                              {inputContext.lovedShows.length > 0 ? inputContext.lovedShows.join(', ') : '(none)'}
                            </span>
                          </div>
                          <div>
                            <span className="text-blue-600 dark:text-blue-400">Liked ({inputContext.likedShows.length}): </span>
                            <span className="text-gray-700 dark:text-gray-300">
                              {inputContext.likedShows.length > 0 ? inputContext.likedShows.join(', ') : '(none)'}
                            </span>
                          </div>
                          <div>
                            <span className="text-red-600 dark:text-red-400">Disliked ({inputContext.dislikedShows.length}): </span>
                            <span className="text-gray-700 dark:text-gray-300">
                              {inputContext.dislikedShows.length > 0 ? inputContext.dislikedShows.join(', ') : '(none)'}
                            </span>
                          </div>
                          <div>
                            <span className="text-purple-600 dark:text-purple-400">Watchlist Pool ({inputContext.poolShows.length}): </span>
                            <span className="text-gray-700 dark:text-gray-300">
                              {inputContext.poolShows.length > 0 ? inputContext.poolShows.join(', ') : '(none)'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
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
              <div className="mb-4 flex items-center gap-2">
                <button
                  onClick={handleGetRecommendation}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all shadow-md shadow-indigo-500/25 flex items-center gap-2 text-sm"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  New Pick
                </button>
                <button
                  onClick={() => {
                    setRecommendation(null);
                    setShowFilters(true);
                  }}
                  className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all font-medium flex items-center gap-1.5 text-sm"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  Edit Filters
                </button>
              </div>

              {hasCustomFilters && (
                <div className="mb-3 flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Custom filters applied
                </div>
              )}

              <div className="bg-gradient-to-br from-gray-50 to-indigo-50/50 dark:from-gray-700/50 dark:to-indigo-900/20 rounded-2xl p-5 border border-gray-200/50 dark:border-gray-600/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400">
                      <span>🔍</span> Recommendation
                    </div>
                    {model && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">{model}</span>
                    )}
                  </div>
                </div>
                <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed text-sm">
                  {recommendation}
                </div>
              </div>

              {inputContext && (
                <div className="mt-3">
                  <button
                    onClick={() => setShowInputContext(!showInputContext)}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
                  >
                    <svg
                      className={`w-3 h-3 transition-transform ${showInputContext ? 'rotate-90' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {showInputContext ? 'Hide' : 'Show'} what was sent to Claude
                  </button>
                  {showInputContext && (
                    <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs overflow-x-auto space-y-3">
                      {inputContext.prompt && (
                        <div>
                          <div className="text-gray-500 dark:text-gray-400 font-semibold mb-1">Prompt sent to Claude:</div>
                          <div className="whitespace-pre-wrap font-mono text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700">
                            {inputContext.prompt}
                          </div>
                        </div>
                      )}
                      <div>
                        <div className="text-gray-500 dark:text-gray-400 font-semibold mb-1">Input Data:</div>
                        <div className="font-mono space-y-2">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Filters: </span>
                            <span className="text-gray-700 dark:text-gray-300">
                              Loved={inputContext.filters.loved.join('+')} |
                              Liked={inputContext.filters.liked.join('+')} |
                              Disliked={inputContext.filters.disliked.join('+')} |
                              Pool={inputContext.filters.pool.join('+')}
                            </span>
                          </div>
                          <div>
                            <span className="text-green-600 dark:text-green-400">Loved ({inputContext.lovedShows.length}): </span>
                            <span className="text-gray-700 dark:text-gray-300">
                              {inputContext.lovedShows.length > 0 ? inputContext.lovedShows.join(', ') : '(none)'}
                            </span>
                          </div>
                          <div>
                            <span className="text-blue-600 dark:text-blue-400">Liked ({inputContext.likedShows.length}): </span>
                            <span className="text-gray-700 dark:text-gray-300">
                              {inputContext.likedShows.length > 0 ? inputContext.likedShows.join(', ') : '(none)'}
                            </span>
                          </div>
                          <div>
                            <span className="text-red-600 dark:text-red-400">Disliked ({inputContext.dislikedShows.length}): </span>
                            <span className="text-gray-700 dark:text-gray-300">
                              {inputContext.dislikedShows.length > 0 ? inputContext.dislikedShows.join(', ') : '(none)'}
                            </span>
                          </div>
                          <div>
                            <span className="text-purple-600 dark:text-purple-400">Watchlist Pool ({inputContext.poolShows.length}): </span>
                            <span className="text-gray-700 dark:text-gray-300">
                              {inputContext.poolShows.length > 0 ? inputContext.poolShows.join(', ') : '(none)'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
