'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientSupabase } from '@/lib/supabase';
import SearchBar from '@/components/SearchBar';
import ShowCard from '@/components/ShowCard';
import FilterBar from '@/components/FilterBar';
import DecideHelper from '@/components/DecideHelper';
import type { ShowWithTags, Tag, ShowStatus } from '@/types';

interface SearchResult {
  tmdb_id: number;
  title: string;
  type: 'movie' | 'tv';
  poster_url: string | null;
  year: number | null;
  overview: string | null;
}

export default function Home() {
  const [shows, setShows] = useState<ShowWithTags[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isRefreshingRatings, setIsRefreshingRatings] = useState(false);
  const [showDecideHelper, setShowDecideHelper] = useState(false);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<ShowStatus | 'all'>('all');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedService, setSelectedService] = useState<string | null>(null);

  // Get unique streaming services from all shows
  const streamingServices = [...new Set(shows.flatMap((s) => s.streaming_services || []))].sort();

  const fetchData = useCallback(async () => {
    try {
      const [showsRes, tagsRes] = await Promise.all([
        fetch('/api/shows'),
        fetch('/api/tags'),
      ]);

      const showsData = await showsRes.json();
      const tagsData = await tagsRes.json();

      setShows(showsData);
      setTags(tagsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddShow = async (result: SearchResult) => {
    setIsAdding(true);
    try {
      const response = await fetch('/api/shows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      });

      if (response.ok) {
        const newShow = await response.json();
        setShows((prev) => [newShow, ...prev]);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add show');
      }
    } catch {
      alert('Failed to add show');
    }
    setIsAdding(false);
  };

  const handleStatusChange = async (showId: string, status: ShowStatus) => {
    try {
      const response = await fetch(`/api/shows/${showId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        setShows((prev) =>
          prev.map((s) => (s.id === showId ? { ...s, status } : s))
        );
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleDeleteShow = async (showId: string) => {
    if (!confirm('Remove this show from your list?')) return;

    try {
      const response = await fetch(`/api/shows/${showId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setShows((prev) => prev.filter((s) => s.id !== showId));
      }
    } catch (error) {
      console.error('Failed to delete show:', error);
    }
  };

  const handleAddTag = async (showId: string, tagId: string) => {
    try {
      const response = await fetch(`/api/shows/${showId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagId }),
      });

      if (response.ok) {
        const tag = tags.find((t) => t.id === tagId);
        if (tag) {
          setShows((prev) =>
            prev.map((s) =>
              s.id === showId ? { ...s, tags: [...s.tags, tag] } : s
            )
          );
        }
      }
    } catch (error) {
      console.error('Failed to add tag:', error);
    }
  };

  const handleRemoveTag = async (showId: string, tagId: string) => {
    try {
      const response = await fetch(`/api/shows/${showId}/tags`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagId }),
      });

      if (response.ok) {
        setShows((prev) =>
          prev.map((s) =>
            s.id === showId
              ? { ...s, tags: s.tags.filter((t) => t.id !== tagId) }
              : s
          )
        );
      }
    } catch (error) {
      console.error('Failed to remove tag:', error);
    }
  };

  const handleLogout = async () => {
    const supabase = createClientSupabase();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const handleRefreshRatings = async () => {
    setIsRefreshingRatings(true);
    try {
      const response = await fetch('/api/shows/refresh-ratings', { method: 'POST' });
      const data = await response.json();

      if (data.updated > 0) {
        // Refresh the shows list to get updated ratings
        await fetchData();
        alert(`Updated ratings for ${data.updated} shows!`);
      } else {
        alert(data.message || 'No ratings were updated');
      }
    } catch {
      alert('Failed to refresh ratings');
    }
    setIsRefreshingRatings(false);
  };

  // Filter shows
  const filteredShows = shows.filter((show) => {
    if (selectedStatus !== 'all' && show.status !== selectedStatus) return false;
    if (selectedTagIds.length > 0 && !show.tags.some((t) => selectedTagIds.includes(t.id))) return false;
    if (selectedService && !show.streaming_services?.includes(selectedService)) return false;
    return true;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f0e8] dark:bg-[#1a1918] bg-grid-pattern">
        <div className="text-4xl mb-4">🎬</div>
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
        <p className="mt-4 text-gray-500">Loading your watchlist...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f0e8] dark:bg-[#1a1918] bg-grid-pattern">
      {/* Header */}
      <header className="bg-[#faf7f2]/90 dark:bg-[#252320]/90 backdrop-blur-lg border-b border-amber-200/30 dark:border-amber-900/20 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <span className="text-xl">🎬</span>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Neil&apos;s Reels
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Family Watchlist</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowDecideHelper(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 flex items-center gap-2"
              >
                <span>🎲</span>
                <span className="hidden sm:inline">Help Me Decide</span>
              </button>
              <button
                onClick={handleLogout}
                className="p-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                title="Sign Out"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="mt-6 flex justify-center">
            <SearchBar onSelect={handleAddShow} />
          </div>
          {isAdding && (
            <div className="mt-3 flex items-center justify-center gap-2 text-sm text-indigo-600 dark:text-indigo-400">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent" />
              Adding to your list...
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar filters */}
          <aside className="w-72 flex-shrink-0 hidden lg:block">
            <div className="sticky top-28 bg-[#faf7f2]/80 dark:bg-[#252320]/80 backdrop-blur-lg rounded-2xl p-5 border border-amber-200/30 dark:border-amber-900/20 shadow-xl shadow-amber-900/5 dark:shadow-none">
              <h2 className="font-semibold text-foreground mb-5 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters
              </h2>
              <FilterBar
                tags={tags}
                selectedStatus={selectedStatus}
                selectedTagIds={selectedTagIds}
                selectedService={selectedService}
                streamingServices={streamingServices}
                onStatusChange={setSelectedStatus}
                onTagToggle={(tagId) =>
                  setSelectedTagIds((prev) =>
                    prev.includes(tagId)
                      ? prev.filter((id) => id !== tagId)
                      : [...prev, tagId]
                  )
                }
                onServiceChange={setSelectedService}
              />
            </div>
          </aside>

          {/* Show list */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Your Watchlist</h2>
                <p className="text-sm text-gray-500">
                  {filteredShows.length} {filteredShows.length === 1 ? 'show' : 'shows'}
                  {selectedStatus !== 'all' && ` · ${selectedStatus.replace('_', ' ')}`}
                </p>
              </div>
              <button
                onClick={handleRefreshRatings}
                disabled={isRefreshingRatings}
                className="px-4 py-2 text-sm bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 dark:hover:from-amber-900/50 dark:hover:to-orange-900/50 text-amber-700 dark:text-amber-300 rounded-xl border border-amber-200/50 dark:border-amber-800/50 disabled:opacity-50 transition-all shadow-sm hover:shadow flex items-center gap-2"
                title="Refresh IMDb & Rotten Tomatoes ratings"
              >
                <svg className={`w-4 h-4 ${isRefreshingRatings ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {isRefreshingRatings ? 'Updating...' : 'Update Ratings'}
              </button>
            </div>

            {filteredShows.length === 0 ? (
              <div className="text-center py-16 bg-[#faf7f2]/80 dark:bg-[#252320]/80 backdrop-blur-lg rounded-2xl border border-amber-200/30 dark:border-amber-900/20 shadow-xl shadow-amber-900/5 dark:shadow-none">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 flex items-center justify-center">
                  <span className="text-4xl">🍿</span>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No shows yet</h3>
                <p className="text-gray-500 max-w-sm mx-auto">
                  Search for a movie or TV show above to start building your watchlist.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredShows.map((show) => (
                  <ShowCard
                    key={show.id}
                    show={show}
                    allTags={tags}
                    onStatusChange={(status) => handleStatusChange(show.id, status)}
                    onDelete={() => handleDeleteShow(show.id)}
                    onAddTag={(tagId) => handleAddTag(show.id, tagId)}
                    onRemoveTag={(tagId) => handleRemoveTag(show.id, tagId)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Decide Helper Modal */}
      {showDecideHelper && (
        <DecideHelper onClose={() => setShowDecideHelper(false)} />
      )}
    </div>
  );
}
