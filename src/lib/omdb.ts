import type { OMDbResponse } from '@/types';

const OMDB_BASE_URL = 'https://www.omdbapi.com';

function getApiKey(): string {
  const key = process.env.OMDB_API_KEY;
  if (!key) {
    throw new Error('OMDB_API_KEY environment variable is not set');
  }
  return key;
}

export interface Ratings {
  imdbRating: number | null;
  rottenTomatoesScore: number | null;
  imdbId: string | null;
}

export async function getRatings(title: string, year?: number, type?: 'movie' | 'tv'): Promise<Ratings> {
  // OMDb uses 'series' for TV shows
  const omdbType = type === 'tv' ? 'series' : type === 'movie' ? 'movie' : undefined;

  const params = new URLSearchParams({
    apikey: getApiKey(),
    t: title,
    ...(year && { y: year.toString() }),
    ...(omdbType && { type: omdbType }),
  });

  const response = await fetch(`${OMDB_BASE_URL}?${params}`);
  const data: OMDbResponse = await response.json();

  // OMDb returns 200 even for errors, check Response field
  if (data.Response === 'False') {
    console.warn('OMDb error for:', title, '-', data.Error);
    return { imdbRating: null, rottenTomatoesScore: null, imdbId: null };
  }

  if (!response.ok) {
    console.error('OMDb fetch failed:', response.statusText);
    return { imdbRating: null, rottenTomatoesScore: null, imdbId: null };
  }

  // Parse IMDB rating
  const imdbRating = data.imdbRating && data.imdbRating !== 'N/A'
    ? parseFloat(data.imdbRating)
    : null;

  // Find Rotten Tomatoes rating
  // OMDb returns ratings in an array like: [{Source: "Internet Movie Database", Value: "8.5/10"}, {Source: "Rotten Tomatoes", Value: "93%"}]
  const rtRating = data.Ratings?.find((r) => r.Source === 'Rotten Tomatoes');
  const rottenTomatoesScore = rtRating?.Value
    ? parseInt(rtRating.Value.replace('%', ''), 10)
    : null;

  // Get IMDB ID for direct linking
  const imdbId = data.imdbID || null;

  return {
    imdbRating: imdbRating && !isNaN(imdbRating) ? imdbRating : null,
    rottenTomatoesScore: rottenTomatoesScore && !isNaN(rottenTomatoesScore) ? rottenTomatoesScore : null,
    imdbId,
  };
}
