import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getRatings } from '@/lib/omdb';

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();

    // Get all shows
    const { data: shows, error } = await supabase
      .from('shows')
      .select('id, title, year, type');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!shows || shows.length === 0) {
      return NextResponse.json({ message: 'No shows to update', updated: 0 });
    }

    let updated = 0;
    const errors: string[] = [];

    // Update ratings for each show
    for (const show of shows) {
      try {
        const ratings = await getRatings(show.title, show.year || undefined, show.type as 'movie' | 'tv');

        if (ratings.imdbRating || ratings.rottenTomatoesScore || ratings.imdbId) {
          const { error: updateError } = await supabase
            .from('shows')
            .update({
              imdb_rating: ratings.imdbRating,
              rotten_tomatoes_score: ratings.rottenTomatoesScore,
              imdb_id: ratings.imdbId,
            })
            .eq('id', show.id);

          if (updateError) {
            errors.push(`Failed to update ${show.title}: ${updateError.message}`);
          } else {
            updated++;
          }
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 250));
      } catch (err) {
        errors.push(`Error fetching ratings for ${show.title}: ${err}`);
      }
    }

    return NextResponse.json({
      message: `Updated ratings for ${updated} of ${shows.length} shows`,
      updated,
      total: shows.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Refresh ratings error:', error);
    return NextResponse.json({ error: 'Failed to refresh ratings' }, { status: 500 });
  }
}
