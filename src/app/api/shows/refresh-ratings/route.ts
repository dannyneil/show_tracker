import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getRatings } from '@/lib/omdb';
import { getGenres } from '@/lib/tmdb';

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();

    // Get all shows with their current tags
    const { data: shows, error } = await supabase
      .from('shows')
      .select(`
        id, tmdb_id, title, year, type,
        show_tags (
          tag_id
        )
      `);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!shows || shows.length === 0) {
      return NextResponse.json({ message: 'No shows to update', updated: 0, tagsAdded: 0 });
    }

    // Get all genre tags (only add these, not personal/mood/meta tags)
    const { data: genreTags } = await supabase
      .from('tags')
      .select('id, name')
      .eq('category', 'genre');

    const genreTagMap = new Map(genreTags?.map((t) => [t.name, t.id]) || []);

    let updated = 0;
    let tagsAdded = 0;
    const errors: string[] = [];

    // Update ratings and tags for each show
    for (const show of shows) {
      try {
        // Fetch ratings from OMDb
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

        // Fetch genres from TMDb and add missing genre tags
        const genreNames = await getGenres(show.tmdb_id, show.type as 'movie' | 'tv').catch(() => []);

        if (genreNames.length > 0) {
          // Get current tag IDs for this show
          const currentTagIds = new Set(
            show.show_tags?.map((st: { tag_id: string }) => st.tag_id) || []
          );

          // Find genre tags that should be added
          const tagsToAdd: { show_id: string; tag_id: string }[] = [];
          for (const genreName of genreNames) {
            const tagId = genreTagMap.get(genreName);
            if (tagId && !currentTagIds.has(tagId)) {
              tagsToAdd.push({ show_id: show.id, tag_id: tagId });
            }
          }

          // Add missing genre tags
          if (tagsToAdd.length > 0) {
            const { error: tagError } = await supabase
              .from('show_tags')
              .insert(tagsToAdd);

            if (tagError) {
              errors.push(`Failed to add tags for ${show.title}: ${tagError.message}`);
            } else {
              tagsAdded += tagsToAdd.length;
            }
          }
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 250));
      } catch (err) {
        errors.push(`Error updating ${show.title}: ${err}`);
      }
    }

    return NextResponse.json({
      message: `Updated ${updated} ratings, added ${tagsAdded} genre tags across ${shows.length} shows`,
      updated,
      tagsAdded,
      total: shows.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Refresh ratings error:', error);
    return NextResponse.json({ error: 'Failed to refresh ratings' }, { status: 500 });
  }
}
