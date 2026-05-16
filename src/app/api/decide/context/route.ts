import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import type { ShowWithTags, Tag } from '@/types';

async function getShowsWithAllTags(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  tagIds: string[]
): Promise<ShowWithTags[]> {
  if (tagIds.length === 0) return [];

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const lovedTagNames: string[] = body.lovedTags || ['Loved'];
    const likedTagNames: string[] = body.likedTags || ['Liked'];
    const dislikedTagNames: string[] = body.dislikedTags || ["Didn't Like"];
    const poolTagNames: string[] = body.poolTags || [];

    const supabase = await createServerSupabaseClient();

    const { data: allTags } = await supabase.from('tags').select('id, name');
    const tagNameToId = new Map(allTags?.map((t) => [t.name, t.id]) || []);

    const lovedTagIds = lovedTagNames.map((n) => tagNameToId.get(n)).filter(Boolean) as string[];
    const likedTagIds = likedTagNames.map((n) => tagNameToId.get(n)).filter(Boolean) as string[];
    const dislikedTagIds = dislikedTagNames.map((n) => tagNameToId.get(n)).filter(Boolean) as string[];
    const poolTagIds = poolTagNames.map((n) => tagNameToId.get(n)).filter(Boolean) as string[];

    const [lovedShows, likedShows, dislikedShows] = await Promise.all([
      getShowsWithAllTags(supabase, lovedTagIds),
      getShowsWithAllTags(supabase, likedTagIds),
      getShowsWithAllTags(supabase, dislikedTagIds),
    ]);

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let toWatchShows = (toWatchRaw || []).map((show: any): ShowWithTags => ({
      ...show,
      tags: show.show_tags?.map((st: { tags: Tag }) => st.tags) || [],
    }));

    if (poolTagIds.length > 0) {
      toWatchShows = toWatchShows.filter((show) => {
        const showTagIds = show.tags.map((t) => t.id);
        return poolTagIds.every((tagId) => showTagIds.includes(tagId));
      });
    }

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error('Error fetching recommendation context:', error);
    return NextResponse.json({ error: 'Failed to fetch context' }, { status: 500 });
  }
}
