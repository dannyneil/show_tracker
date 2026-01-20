'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { ShowWithTags, ShowStatus, Tag } from '@/types';
import TagBadge from './TagBadge';
import StatusSelector from './StatusSelector';
import TrailerModal from './TrailerModal';

interface ShowCardProps {
  show: ShowWithTags;
  allTags: Tag[];
  onStatusChange: (status: ShowStatus) => void;
  onDelete: () => void;
  onAddTag: (tagId: string) => void;
  onRemoveTag: (tagId: string) => void;
}

// Get streaming service search URL for a show
function getStreamingUrl(service: string, title: string, type: 'movie' | 'tv'): string {
  const encodedTitle = encodeURIComponent(title);

  switch (service) {
    case 'Netflix':
      return `https://www.netflix.com/search?q=${encodedTitle}`;
    case 'Hulu':
      return `https://www.hulu.com/search?q=${encodedTitle}`;
    case 'Prime Video':
      return `https://www.amazon.com/s?k=${encodedTitle}&i=instant-video`;
    case 'Disney+':
      return `https://www.disneyplus.com/search/${encodedTitle}`;
    case 'Max':
      return `https://play.max.com/search?q=${encodedTitle}`;
    case 'Peacock':
      return `https://www.peacocktv.com/search?q=${encodedTitle}`;
    case 'Apple TV+':
      return `https://tv.apple.com/search?term=${encodedTitle}`;
    case 'Paramount+':
      return `https://www.paramountplus.com/search/?q=${encodedTitle}`;
    default:
      // Fallback to JustWatch search
      return `https://www.justwatch.com/us/search?q=${encodedTitle}`;
  }
}

export default function ShowCard({
  show,
  allTags,
  onStatusChange,
  onDelete,
  onAddTag,
  onRemoveTag,
}: ShowCardProps) {
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [isLoadingTrailer, setIsLoadingTrailer] = useState(false);

  const availableTags = allTags.filter(
    (tag) => !show.tags.some((t) => t.id === tag.id)
  );

  const handleWatchTrailer = async () => {
    setIsLoadingTrailer(true);
    try {
      const response = await fetch(`/api/shows/${show.id}/trailer`);
      if (response.ok) {
        const data = await response.json();
        setTrailerKey(data.trailerKey);
      } else {
        alert('No trailer available for this show');
      }
    } catch {
      alert('Failed to load trailer');
    } finally {
      setIsLoadingTrailer(false);
    }
  };

  return (
    <div className="group relative bg-[#faf7f2]/80 dark:bg-[#252320]/80 backdrop-blur-lg rounded-2xl shadow-sm border border-amber-200/30 dark:border-amber-900/20 hover:shadow-xl hover:shadow-amber-900/10 dark:hover:shadow-none hover:border-amber-300/50 dark:hover:border-amber-800/30 transition-all duration-300 hover:z-10">
      <div className="flex">
        {/* Poster */}
        <div className="w-28 sm:w-36 flex-shrink-0 overflow-hidden rounded-l-2xl relative">
          {show.poster_url ? (
            <Image
              src={show.poster_url}
              alt={show.title}
              width={144}
              height={216}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full min-h-[168px] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
              <span className="text-4xl opacity-50">🎬</span>
            </div>
          )}
          {/* Type badge */}
          <div className="absolute top-2 left-2">
            <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-black/60 text-white rounded-md backdrop-blur-sm">
              {show.type}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-5 flex flex-col min-w-0">
          <div className="flex justify-between items-start gap-2 mb-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-lg text-foreground truncate">
                {show.title}
              </h3>
              <p className="text-sm text-gray-500">
                {show.year && <span>{show.year}</span>}
              </p>
            </div>
            <button
              onClick={onDelete}
              className="flex-shrink-0 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
              title="Remove from list"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>

          {/* Ratings and Trailer */}
          <div className="flex flex-wrap gap-2 mb-3">
            {show.imdb_rating && (
              <a
                href={show.imdb_id
                  ? `https://www.imdb.com/title/${show.imdb_id}/`
                  : `https://www.imdb.com/find/?q=${encodeURIComponent(show.title)}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/30 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors cursor-pointer"
                title="View on IMDb"
              >
                <span className="text-amber-600 dark:text-amber-400 font-bold text-xs">IMDb</span>
                <span className="font-semibold text-sm text-amber-700 dark:text-amber-300">{show.imdb_rating}</span>
                <svg className="w-3 h-3 text-amber-500 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
            {show.rotten_tomatoes_score && (
              <a
                href={`https://www.rottentomatoes.com/search?search=${encodeURIComponent(show.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 dark:bg-red-900/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors cursor-pointer"
                title="View on Rotten Tomatoes"
              >
                <span className="text-red-600 dark:text-red-400 font-bold text-xs">RT</span>
                <span className="font-semibold text-sm text-red-700 dark:text-red-300">{show.rotten_tomatoes_score}%</span>
                <svg className="w-3 h-3 text-red-500 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
            <button
              onClick={handleWatchTrailer}
              disabled={isLoadingTrailer}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 rounded-lg hover:from-purple-100 hover:to-indigo-100 dark:hover:from-purple-900/50 dark:hover:to-indigo-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Watch Trailer"
            >
              {isLoadingTrailer ? (
                <>
                  <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-medium text-purple-600 dark:text-purple-400">Loading...</span>
                </>
              ) : (
                <>
                  <svg className="w-3 h-3 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span className="text-xs font-medium text-purple-600 dark:text-purple-400">Trailer</span>
                </>
              )}
            </button>
          </div>

          {/* Streaming Services */}
          {show.streaming_services && show.streaming_services.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {show.streaming_services.map((service) => (
                <a
                  key={service}
                  href={getStreamingUrl(service, show.title, show.type)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-2.5 py-1 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-750 rounded-lg text-gray-600 dark:text-gray-300 font-medium border border-gray-200/50 dark:border-gray-600/50 hover:from-indigo-50 hover:to-indigo-100 dark:hover:from-indigo-900/30 dark:hover:to-indigo-800/30 hover:text-indigo-600 dark:hover:text-indigo-300 hover:border-indigo-200 dark:hover:border-indigo-700 transition-all cursor-pointer"
                  title={`Search on ${service}`}
                >
                  {service}
                </a>
              ))}
            </div>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {show.tags.map((tag) => (
              <TagBadge
                key={tag.id}
                tag={tag}
                size="sm"
                onRemove={() => onRemoveTag(tag.id)}
              />
            ))}
            {availableTags.length > 0 && (
              <div className="relative group/tag">
                <button className="text-xs px-2.5 py-1 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-lg text-gray-400 hover:border-indigo-300 hover:text-indigo-500 dark:hover:border-indigo-500 dark:hover:text-indigo-400 transition-colors font-medium">
                  + Add tag
                </button>
                {/* Invisible bridge to prevent hover gap */}
                <div className="absolute left-0 top-full h-2 w-full hidden group-hover/tag:block" />
                <div className="absolute left-0 top-full pt-2 hidden group-hover/tag:block z-50">
                  <div className="bg-[#faf7f2]/98 dark:bg-[#252320]/98 backdrop-blur-xl rounded-xl shadow-2xl border border-amber-200/40 dark:border-amber-900/30 p-3 min-w-[220px] max-w-[320px]">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2.5 font-semibold uppercase tracking-wide">Click to add</p>
                    <div className="flex flex-wrap gap-1.5">
                      {availableTags.map((tag) => (
                        <TagBadge
                          key={tag.id}
                          tag={tag}
                          size="sm"
                          onClick={() => onAddTag(tag.id)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Status */}
          <div className="mt-auto pt-2 border-t border-gray-100 dark:border-gray-700/50">
            <StatusSelector status={show.status} onChange={onStatusChange} />
          </div>
        </div>
      </div>

      {/* Trailer Modal */}
      {trailerKey && (
        <TrailerModal
          trailerKey={trailerKey}
          title={show.title}
          onClose={() => setTrailerKey(null)}
        />
      )}
    </div>
  );
}
