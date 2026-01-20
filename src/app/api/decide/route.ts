import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { helpMeDecide } from '@/lib/claude';
import type { ShowWithTags, Tag } from '@/types';

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();

    // Get the "Liked" tag ID
    const { data: likedTag } = await supabase
      .from('tags')
      .select('id')
      .eq('name', 'Liked')
      .single();

    // Get shows tagged as "Liked"
    const { data: likedShows } = await supabase
      .from('shows')
      .select(`
        *,
        show_tags!inner (
          tag_id,
          tags (*)
        )
      `)
      .eq('show_tags.tag_id', likedTag?.id || '');

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

    // Transform the data
    const transformedLiked: ShowWithTags[] = (likedShows || []).map((show) => ({
      ...show,
      tags: show.show_tags?.map((st: { tags: Tag }) => st.tags) || [],
    }));

    const transformedToWatch: ShowWithTags[] = (toWatchShows || []).map((show) => ({
      ...show,
      tags: show.show_tags?.map((st: { tags: Tag }) => st.tags) || [],
    }));

    if (transformedToWatch.length === 0) {
      return NextResponse.json({
        recommendation: "Your watchlist is empty! Add some shows first, then come back for recommendations.",
      });
    }

    const recommendation = await helpMeDecide(transformedLiked, transformedToWatch);

    return NextResponse.json({ recommendation });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}
