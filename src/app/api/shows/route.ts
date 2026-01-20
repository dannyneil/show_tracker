import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getWatchProviders, getGenres } from '@/lib/tmdb';
import { getRatings } from '@/lib/omdb';
import type { ShowStatus, ShowType, Tag } from '@/types';

// Helper to get user's household_id
async function getHouseholdId(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .single();

  return membership?.household_id || null;
}

// GET all shows
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    // Get household_id for filtering (RLS will also enforce this)
    const householdId = await getHouseholdId(supabase);

    let query = supabase
      .from('shows')
      .select(`
        *,
        show_tags (
          tag_id,
          tags (*)
        )
      `)
      .order('created_at', { ascending: false });

    // Filter by household if available
    if (householdId) {
      query = query.eq('household_id', householdId);
    }

    const { data: shows, error } = await query;

    if (error) {
      console.error('Error fetching shows:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform the data to include tags array
    const transformedShows = shows?.map((show) => ({
      ...show,
      tags: show.show_tags?.map((st: { tags: unknown }) => st.tags) || [],
      show_tags: undefined,
    }));

    return NextResponse.json(transformedShows || []);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to fetch shows' }, { status: 500 });
  }
}

// POST - Add a new show
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    const {
      tmdb_id,
      title,
      type,
      poster_url,
      year,
      overview,
      status = 'to_watch',
    }: {
      tmdb_id: number;
      title: string;
      type: ShowType;
      poster_url: string | null;
      year: number | null;
      overview: string | null;
      status?: ShowStatus;
    } = body;

    // Get household_id
    const householdId = await getHouseholdId(supabase);

    if (!householdId) {
      return NextResponse.json({
        error: 'No household found. Please try logging out and back in, or contact support.'
      }, { status: 403 });
    }

    // Build the query for checking existing shows
    let existingQuery = supabase
      .from('shows')
      .select('id')
      .eq('tmdb_id', tmdb_id);

    if (householdId) {
      existingQuery = existingQuery.eq('household_id', householdId);
    }

    const { data: existing } = await existingQuery.single();

    if (existing) {
      return NextResponse.json({ error: 'Show already in your list' }, { status: 409 });
    }

    // Fetch streaming providers, ratings, and genres in parallel
    const [streamingServices, ratings, genreNames] = await Promise.all([
      getWatchProviders(tmdb_id, type).catch(() => []),
      getRatings(title, year || undefined, type).catch(() => ({ imdbRating: null, rottenTomatoesScore: null, imdbId: null })),
      getGenres(tmdb_id, type).catch(() => []),
    ]);

    // Insert the show with household_id
    const { data: show, error } = await supabase
      .from('shows')
      .insert({
        tmdb_id,
        title,
        type,
        poster_url,
        year,
        overview,
        status,
        streaming_services: streamingServices,
        imdb_rating: ratings.imdbRating,
        rotten_tomatoes_score: ratings.rottenTomatoesScore,
        imdb_id: ratings.imdbId,
        household_id: householdId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting show:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Auto-apply genre tags from TMDb
    let appliedTags: Tag[] = [];
    if (genreNames.length > 0 && show) {
      // Look up tags by name
      const { data: matchingTags } = await supabase
        .from('tags')
        .select('*')
        .in('name', genreNames);

      if (matchingTags && matchingTags.length > 0) {
        // Insert show_tags entries
        const showTagEntries = matchingTags.map((tag) => ({
          show_id: show.id,
          tag_id: tag.id,
        }));

        await supabase.from('show_tags').insert(showTagEntries);
        appliedTags = matchingTags;
      }
    }

    return NextResponse.json({ ...show, tags: appliedTags }, { status: 201 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to add show' }, { status: 500 });
  }
}
