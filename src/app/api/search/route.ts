import { NextResponse, type NextRequest } from 'next/server';
import { searchShows, getPosterUrl, getYear } from '@/lib/tmdb';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  try {
    const results = await searchShows(query);

    // Transform results for the frontend
    const transformedResults = results.map((item) => ({
      tmdb_id: item.id,
      title: item.title || item.name || 'Unknown',
      type: item.media_type as 'movie' | 'tv',
      poster_url: getPosterUrl(item.poster_path),
      year: getYear(item.release_date || item.first_air_date),
      overview: item.overview,
    }));

    return NextResponse.json(transformedResults);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
