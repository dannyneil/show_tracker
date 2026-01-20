import type { TMDbSearchResult, TMDbSearchResponse, TMDbWatchProvidersResponse } from '@/types';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

function getAuthHeaders(): HeadersInit {
  const token = process.env.TMDB_API_KEY;
  if (!token) {
    throw new Error('TMDB_API_KEY environment variable is not set');
  }
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export async function searchShows(query: string): Promise<TMDbSearchResult[]> {
  const response = await fetch(
    `${TMDB_BASE_URL}/search/multi?query=${encodeURIComponent(query)}&include_adult=false`,
    { headers: getAuthHeaders() }
  );

  if (!response.ok) {
    throw new Error(`TMDb search failed: ${response.statusText}`);
  }

  const data: TMDbSearchResponse = await response.json();

  // Filter to only movies and TV shows
  return data.results.filter(
    (item) => item.media_type === 'movie' || item.media_type === 'tv'
  );
}

export async function getShowDetails(tmdbId: number, type: 'movie' | 'tv') {
  const response = await fetch(
    `${TMDB_BASE_URL}/${type}/${tmdbId}`,
    { headers: getAuthHeaders() }
  );

  if (!response.ok) {
    throw new Error(`TMDb details fetch failed: ${response.statusText}`);
  }

  return response.json();
}

export async function getWatchProviders(tmdbId: number, type: 'movie' | 'tv'): Promise<string[]> {
  const response = await fetch(
    `${TMDB_BASE_URL}/${type}/${tmdbId}/watch/providers`,
    { headers: getAuthHeaders() }
  );

  if (!response.ok) {
    return [];
  }

  const data: TMDbWatchProvidersResponse = await response.json();

  // Get US streaming providers (flatrate = subscription services)
  const usProviders = data.results?.US?.flatrate || [];

  // Map provider names we care about
  const streamingServices = usProviders
    .map((p) => p.provider_name)
    .filter((name) =>
      ['Netflix', 'Hulu', 'Amazon Prime Video', 'Disney Plus', 'HBO Max', 'Max',
       'Peacock', 'Apple TV Plus', 'Apple TV+', 'Paramount Plus', 'Paramount+'].includes(name)
    )
    // Normalize names
    .map((name) => {
      if (name === 'Amazon Prime Video') return 'Prime Video';
      if (name === 'Disney Plus') return 'Disney+';
      if (name === 'Apple TV Plus') return 'Apple TV+';
      if (name === 'Paramount Plus') return 'Paramount+';
      if (name === 'HBO Max') return 'Max';
      return name;
    });

  // Remove duplicates
  return [...new Set(streamingServices)];
}

export function getPosterUrl(posterPath: string | null, size: 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'original' = 'w342'): string | null {
  if (!posterPath) return null;
  return `${TMDB_IMAGE_BASE_URL}/${size}${posterPath}`;
}

// Map TMDb genres to our tag names
const GENRE_MAP: Record<string, string> = {
  // Movies
  'Action': 'Action',
  'Adventure': 'Action',
  'Comedy': 'Funny',
  'Drama': 'Drama',
  'Horror': 'Thriller',
  'Romance': 'Romcom',
  'Science Fiction': 'Scifi',
  'Thriller': 'Thriller',
  'Documentary': 'Documentary',
  'Mystery': 'Mystery',
  'Crime': 'Thriller',
  'Fantasy': 'Scifi',
  // TV specific
  'Action & Adventure': 'Action',
  'Sci-Fi & Fantasy': 'Scifi',
};

export async function getGenres(tmdbId: number, type: 'movie' | 'tv'): Promise<string[]> {
  try {
    const details = await getShowDetails(tmdbId, type);
    const genres: Array<{ id: number; name: string }> = details.genres || [];

    // Map TMDb genres to our tag names
    const mappedGenres: string[] = [];
    for (const genre of genres) {
      const mappedName = GENRE_MAP[genre.name];
      if (mappedName) {
        mappedGenres.push(mappedName);
      }
    }

    // Remove duplicates
    return [...new Set(mappedGenres)];
  } catch {
    return [];
  }
}

export function getYear(dateString: string | undefined): number | null {
  if (!dateString) return null;
  const year = parseInt(dateString.split('-')[0], 10);
  return isNaN(year) ? null : year;
}

export interface TrendingItem {
  id: number;
  title: string;
  type: 'movie' | 'tv';
  poster_path: string | null;
  release_date: string | null;
  overview: string;
  vote_average: number;
}

export async function getTrending(timeWindow: 'day' | 'week' = 'week'): Promise<TrendingItem[]> {
  const [moviesRes, tvRes] = await Promise.all([
    fetch(
      `${TMDB_BASE_URL}/trending/movie/${timeWindow}`,
      { headers: getAuthHeaders() }
    ),
    fetch(
      `${TMDB_BASE_URL}/trending/tv/${timeWindow}`,
      { headers: getAuthHeaders() }
    ),
  ]);

  if (!moviesRes.ok || !tvRes.ok) {
    throw new Error('Failed to fetch trending content');
  }

  const [moviesData, tvData] = await Promise.all([
    moviesRes.json(),
    tvRes.json(),
  ]);

  const movies: TrendingItem[] = moviesData.results.slice(0, 10).map((m: {
    id: number;
    title: string;
    poster_path: string | null;
    release_date?: string;
    overview: string;
    vote_average: number;
  }) => ({
    id: m.id,
    title: m.title,
    type: 'movie' as const,
    poster_path: m.poster_path,
    release_date: m.release_date || null,
    overview: m.overview,
    vote_average: m.vote_average,
  }));

  const tvShows: TrendingItem[] = tvData.results.slice(0, 10).map((t: {
    id: number;
    name: string;
    poster_path: string | null;
    first_air_date?: string;
    overview: string;
    vote_average: number;
  }) => ({
    id: t.id,
    title: t.name,
    type: 'tv' as const,
    poster_path: t.poster_path,
    release_date: t.first_air_date || null,
    overview: t.overview,
    vote_average: t.vote_average,
  }));

  // Interleave movies and TV shows, sorted by rating
  const combined = [...movies, ...tvShows].sort((a, b) => b.vote_average - a.vote_average);
  return combined.slice(0, 20);
}
