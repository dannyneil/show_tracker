import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getRatings } from '@/lib/omdb';

// POST /api/shows/[id]/refresh-ratings - Refresh ratings for a single show
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    // Get the show
    const { data: show, error: fetchError } = await supabase
      .from('shows')
      .select('id, tmdb_id, title, year, type')
      .eq('id', id)
      .single();

    if (fetchError || !show) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 });
    }

    // Fetch fresh ratings from OMDb
    const ratings = await getRatings(
      show.title,
      show.year || undefined,
      show.type as 'movie' | 'tv'
    );

    // Update the show with new ratings
    const { data: updatedShow, error: updateError } = await supabase
      .from('shows')
      .update({
        imdb_rating: ratings.imdbRating,
        rotten_tomatoes_score: ratings.rottenTomatoesScore,
        imdb_id: ratings.imdbId,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedShow);
  } catch (error) {
    console.error('Error refreshing ratings:', error);
    return NextResponse.json(
      { error: 'Failed to refresh ratings' },
      { status: 500 }
    );
  }
}
