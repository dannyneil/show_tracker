import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import type { ShowStatus } from '@/types';

// GET single show
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    const { data: show, error } = await supabase
      .from('shows')
      .select(`
        *,
        show_tags (
          tag_id,
          tags (*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    const transformedShow = {
      ...show,
      tags: show.show_tags?.map((st: { tags: unknown }) => st.tags) || [],
      show_tags: undefined,
    };

    return NextResponse.json(transformedShow);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to fetch show' }, { status: 500 });
  }
}

// PATCH - Update show
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    const updates: Partial<{
      status: ShowStatus;
      ai_summary: string;
    }> = {};

    if (body.status) updates.status = body.status;
    if (body.ai_summary) updates.ai_summary = body.ai_summary;

    const { data: show, error } = await supabase
      .from('shows')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(show);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to update show' }, { status: 500 });
  }
}

// DELETE show
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase
      .from('shows')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to delete show' }, { status: 500 });
  }
}
