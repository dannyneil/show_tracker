import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { helpMeDecide, helpMeDecideDeep, cleanupDeepAnalysis } from '@/lib/claude';
import type { ShowWithTags, Tag } from '@/types';

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

// Helper to get shows that have ALL the specified tags
async function getShowsWithAllTags(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  tagIds: string[]
): Promise<ShowWithTags[]> {
  if (tagIds.length === 0) return [];

  // Get shows that have all specified tags
  const { data: shows } = await supabase
    .from('shows')
    .select(`
      *,
      show_tags (
        tag_id,
        tags (*)
      )
    `);

  if (!shows) return [];

  // Filter to shows that have ALL the specified tags
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return shows
    .filter((show) => {
      const showTagIds = show.show_tags?.map((st: { tag_id: string }) => st.tag_id) || [];
      return tagIds.every((tagId) => showTagIds.includes(tagId));
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((show: any) => ({
      ...show,
      tags: show.show_tags?.map((st: { tags: Tag }) => st.tags) || [],
    }));
}

// GET - Fetch the last saved recommendation
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const householdId = await getHouseholdId(supabase);

    let query = supabase
      .from('recommendations')
      .select('quick_pick, deep_analysis, updated_at')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (householdId) {
      query = query.eq('household_id', householdId);
    }

    const { data } = await query.single();

    if (!data) {
      return NextResponse.json({ quickPick: null, deepAnalysis: null });
    }

    return NextResponse.json({
      quickPick: data.quick_pick,
      deepAnalysis: data.deep_analysis,
      updatedAt: data.updated_at,
    });
  } catch (error) {
    console.error('Error fetching recommendation:', error);
    return NextResponse.json({ quickPick: null, deepAnalysis: null });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const deep = body.deep === true;

    // Custom tag filters (arrays of tag names)
    const lovedTagNames: string[] = body.lovedTags || ['Loved'];
    const likedTagNames: string[] = body.likedTags || ['Liked'];
    const dislikedTagNames: string[] = body.dislikedTags || ["Didn't Like"];
    const poolTagNames: string[] = body.poolTags || []; // Additional tags to filter watchlist

    const supabase = await createServerSupabaseClient();
    const householdId = await getHouseholdId(supabase);

    // Get all tags to map names to IDs
    const { data: allTags } = await supabase.from('tags').select('id, name');
    const tagNameToId = new Map(allTags?.map((t) => [t.name, t.id]) || []);

    // Convert tag names to IDs
    const lovedTagIds = lovedTagNames.map((n) => tagNameToId.get(n)).filter(Boolean) as string[];
    const likedTagIds = likedTagNames.map((n) => tagNameToId.get(n)).filter(Boolean) as string[];
    const dislikedTagIds = dislikedTagNames.map((n) => tagNameToId.get(n)).filter(Boolean) as string[];
    const poolTagIds = poolTagNames.map((n) => tagNameToId.get(n)).filter(Boolean) as string[];

    // Get shows with the specified tags
    const [lovedShows, likedShows, dislikedShows] = await Promise.all([
      getShowsWithAllTags(supabase, lovedTagIds),
      getShowsWithAllTags(supabase, likedTagIds),
      getShowsWithAllTags(supabase, dislikedTagIds),
    ]);

    // Get watchlist (to_watch shows), optionally filtered by additional tags
    const { data: toWatchRaw } = await supabase
      .from('shows')
      .select(`
        *,
        show_tags (
          tag_id,
          tags (*)
        )
      `)
      .eq('status', 'to_watch');

    // Transform and filter pool shows
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let toWatchShows = (toWatchRaw || []).map((show: any): ShowWithTags => ({
      ...show,
      tags: show.show_tags?.map((st: { tags: Tag }) => st.tags) || [],
    }));

    // If pool tags specified, filter to shows that have ALL those tags
    if (poolTagIds.length > 0) {
      toWatchShows = toWatchShows.filter((show) => {
        const showTagIds = show.tags.map((t) => t.id);
        return poolTagIds.every((tagId) => showTagIds.includes(tagId));
      });
    }

    if (toWatchShows.length === 0) {
      const filterMsg = poolTagNames.length > 0
        ? `No shows match your filters (to_watch + ${poolTagNames.join(' + ')}). Try different tags.`
        : "Your watchlist is empty! Add some shows first, then come back for recommendations.";
      const inputContext = {
        lovedShows: lovedShows.map((s) => s.title),
        likedShows: likedShows.map((s) => s.title),
        dislikedShows: dislikedShows.map((s) => s.title),
        poolShows: toWatchShows.map((s) => s.title),
        filters: {
          loved: lovedTagNames,
          liked: likedTagNames,
          disliked: dislikedTagNames,
          pool: poolTagNames.length > 0 ? poolTagNames : ['(all to_watch)'],
        },
        prompt: null,
      };
      return NextResponse.json({ recommendation: filterMsg, inputContext });
    }

    // Use deep analysis with web search if requested, otherwise quick mode
    const result = deep
      ? await helpMeDecideDeep(lovedShows, likedShows, dislikedShows, toWatchShows)
      : await helpMeDecide(lovedShows, likedShows, dislikedShows, toWatchShows);

    let recommendation = result.response;

    // Clean up deep analysis output for better formatting
    if (deep) {
      recommendation = await cleanupDeepAnalysis(recommendation);
    }

    // Build input context for transparency
    const inputContext = {
      lovedShows: lovedShows.map((s) => s.title),
      likedShows: likedShows.map((s) => s.title),
      dislikedShows: dislikedShows.map((s) => s.title),
      poolShows: toWatchShows.map((s) => s.title),
      filters: {
        loved: lovedTagNames,
        liked: likedTagNames,
        disliked: dislikedTagNames,
        pool: poolTagNames.length > 0 ? poolTagNames : ['(all to_watch)'],
      },
      prompt: result.prompt,
    };

    // Save the recommendation to the database
    // First check if a record exists for this household
    let existingQuery = supabase
      .from('recommendations')
      .select('id')
      .limit(1);

    if (householdId) {
      existingQuery = existingQuery.eq('household_id', householdId);
    }

    const { data: existing } = await existingQuery.single();

    if (existing) {
      // Update existing record
      await supabase
        .from('recommendations')
        .update(deep ? { deep_analysis: recommendation } : { quick_pick: recommendation })
        .eq('id', existing.id);
    } else {
      // Insert new record with household_id
      await supabase
        .from('recommendations')
        .insert(deep
          ? { deep_analysis: recommendation, household_id: householdId }
          : { quick_pick: recommendation, household_id: householdId }
        );
    }

    return NextResponse.json({ recommendation, deep, inputContext });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}
