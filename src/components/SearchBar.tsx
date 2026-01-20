'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

interface SearchResult {
  tmdb_id: number;
  title: string;
  type: 'movie' | 'tv';
  poster_url: string | null;
  year: number | null;
  overview: string | null;
}

interface SearchBarProps {
  onSelect: (result: SearchResult) => void;
}

export default function SearchBar({ onSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length >= 2) {
        setIsLoading(true);
        try {
          const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
          const data = await response.json();
          setResults(data);
          setIsOpen(true);
        } catch (error) {
          console.error('Search failed:', error);
          setResults([]);
        }
        setIsLoading(false);
      } else {
        setResults([]);
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (result: SearchResult) => {
    onSelect(result);
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl">
      <div className="relative group">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="Search movies and TV shows..."
          className="w-full px-5 py-4 pl-14 rounded-2xl border-2 border-amber-200/40 dark:border-amber-900/30 bg-[#faf7f2]/90 dark:bg-[#252320]/90 backdrop-blur-lg text-foreground placeholder:text-amber-700/40 dark:placeholder:text-amber-200/30 focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-lg shadow-amber-900/5 dark:shadow-none text-lg"
        />
        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors">
          {isLoading ? (
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>
      </div>

      {/* Results dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-3 w-full bg-[#faf7f2]/98 dark:bg-[#252320]/98 backdrop-blur-xl rounded-2xl shadow-2xl border border-amber-200/40 dark:border-amber-900/30 max-h-[400px] overflow-y-auto z-50">
          <div className="p-2">
            {results.map((result) => (
              <button
                key={`${result.type}-${result.tmdb_id}`}
                onClick={() => handleSelect(result)}
                className="w-full flex items-center gap-4 p-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all text-left group"
              >
                {result.poster_url ? (
                  <Image
                    src={result.poster_url}
                    alt={result.title}
                    width={48}
                    height={72}
                    className="rounded-lg object-cover shadow-md"
                  />
                ) : (
                  <div className="w-12 h-18 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-lg flex items-center justify-center">
                    <span className="text-2xl opacity-50">🎬</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{result.title}</p>
                  <p className="text-sm text-gray-500 flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-medium uppercase">
                      {result.type === 'movie' ? 'Movie' : 'TV'}
                    </span>
                    {result.year && <span>{result.year}</span>}
                  </p>
                </div>
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No results */}
      {isOpen && query.length >= 2 && !isLoading && results.length === 0 && (
        <div className="absolute top-full mt-3 w-full bg-[#faf7f2]/98 dark:bg-[#252320]/98 backdrop-blur-xl rounded-2xl shadow-2xl border border-amber-200/40 dark:border-amber-900/30 p-8 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-gray-500">No results found for &quot;{query}&quot;</p>
          <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
        </div>
      )}
    </div>
  );
}
