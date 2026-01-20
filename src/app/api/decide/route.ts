import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { helpMeDecide, helpMeDecideDeep } from '@/lib/claude';
import type { ShowWithTags, Tag } from '@/types';

// GET - Fetch the last saved recommendation
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    const { data } = await supabase
      .from('recommendations')
      .select('quick_pick, deep_analysis, updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

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

    const supabase = await createServerSupabaseClient();

    // Get rating tag IDs (Loved, Liked, Didn't Like)
    const { data: ratingTags } = await supabase
      .from('tags')
      .select('id, name')
      .in('name', ['Loved', 'Liked', "Didn't Like"]);

    const lovedTagId = ratingTags?.find((t) => t.name === 'Loved')?.id;
    const likedTagId = ratingTags?.find((t) => t.name === 'Liked')?.id;
    const dislikedTagId = ratingTags?.find((t) => t.name === "Didn't Like")?.id;

    // Get shows tagged as "Loved"
    const { data: lovedShows } = lovedTagId
      ? await supabase
          .from('shows')
          .select(`*, show_tags!inner (tag_id, tags (*))`)
          .eq('show_tags.tag_id', lovedTagId)
      : { data: [] };

    // Get shows tagged as "Liked"
    const { data: likedShows } = likedTagId
      ? await supabase
          .from('shows')
          .select(`*, show_tags!inner (tag_id, tags (*))`)
          .eq('show_tags.tag_id', likedTagId)
      : { data: [] };

    // Get shows tagged as "Didn't Like"
    const { data: dislikedShows } = dislikedTagId
      ? await supabase
          .from('shows')
          .select(`*, show_tags!inner (tag_id, tags (*))`)
          .eq('show_tags.tag_id', dislikedTagId)
      : { data: [] };

    // Get all to_watch shows
    const { data: toWatchShows } = await supabase
      .from('shows')
      .select(`
        *,
        show_tags (
          tag_id,
          tags (*)
        )
      `)
      .eq('status', 'to_watch');

    // Transform the data - extract tags from show_tags relation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transformShow = (show: any): ShowWithTags => ({
      ...show,
      tags: show.show_tags?.map((st: { tags: Tag }) => st.tags) || [],
    });

    const transformedLoved = (lovedShows || []).map(transformShow);
    const transformedLiked = (likedShows || []).map(transformShow);
    const transformedDisliked = (dislikedShows || []).map(transformShow);

    const transformedToWatch = (toWatchShows || []).map(transformShow);

    if (transformedToWatch.length === 0) {
      return NextResponse.json({
        recommendation: "Your watchlist is empty! Add some shows first, then come back for recommendations.",
      });
    }

    // Use deep analysis with web search if requested, otherwise quick mode
    const recommendation = deep
      ? await helpMeDecideDeep(transformedLoved, transformedLiked, transformedDisliked, transformedToWatch)
      : await helpMeDecide(transformedLoved, transformedLiked, transformedDisliked, transformedToWatch);

    // Save the recommendation to the database
    // First check if a record exists
    const { data: existing } = await supabase
      .from('recommendations')
      .select('id')
      .limit(1)
      .single();

    if (existing) {
      // Update existing record
      await supabase
        .from('recommendations')
        .update(deep ? { deep_analysis: recommendation } : { quick_pick: recommendation })
        .eq('id', existing.id);
    } else {
      // Insert new record
      await supabase
        .from('recommendations')
        .insert(deep ? { deep_analysis: recommendation } : { quick_pick: recommendation });
    }

    return NextResponse.json({ recommendation, deep });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}
