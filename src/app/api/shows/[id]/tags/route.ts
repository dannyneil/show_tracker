import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// POST - Add tag to show
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: showId } = await params;
    const supabase = await createServerSupabaseClient();
    const { tagId } = await request.json();

    const { error } = await supabase
      .from('show_tags')
      .insert({ show_id: showId, tag_id: tagId });

    if (error) {
      // Ignore duplicate key errors
      if (error.code === '23505') {
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to add tag' }, { status: 500 });
  }
}

// DELETE - Remove tag from show
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: showId } = await params;
    const supabase = await createServerSupabaseClient();
    const { tagId } = await request.json();

    const { error } = await supabase
      .from('show_tags')
      .delete()
      .eq('show_id', showId)
      .eq('tag_id', tagId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to remove tag' }, { status: 500 });
  }
}
