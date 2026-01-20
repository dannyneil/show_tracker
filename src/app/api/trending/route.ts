import { NextResponse } from 'next/server';
import { getTrending, getPosterUrl, getYear } from '@/lib/tmdb';

export async function GET() {
  try {
    const trending = await getTrending('week');

    // Transform results for the frontend
    const transformedResults = trending.map((item) => ({
      tmdb_id: item.id,
      title: item.title,
      type: item.type,
      poster_url: getPosterUrl(item.poster_path),
      year: getYear(item.release_date || undefined),
      overview: item.overview,
      rating: item.vote_average,
    }));

    return NextResponse.json(transformedResults);
  } catch (error) {
    console.error('Trending fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch trending content' }, { status: 500 });
  }
}
