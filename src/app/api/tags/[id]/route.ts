import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

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

// PATCH - Update a household tag
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    const householdId = await getHouseholdId(supabase);
    if (!householdId) {
      return NextResponse.json({ error: 'No household found' }, { status: 404 });
    }

    // Check that this tag belongs to the user's household (not a global tag)
    const { data: existingTag } = await supabase
      .from('tags')
      .select('household_id')
      .eq('id', id)
      .single();

    if (!existingTag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    if (existingTag.household_id === null) {
      return NextResponse.json({ error: 'Cannot modify global tags' }, { status: 403 });
    }

    if (existingTag.household_id !== householdId) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    const updates: Record<string, string> = {};
    if (body.name) updates.name = body.name.trim();
    if (body.color) updates.color = body.color;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const { data: tag, error } = await supabase
      .from('tags')
      .update(updates)
      .eq('id', id)
      .eq('household_id', householdId)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A tag with this name already exists' }, { status: 409 });
      }
      console.error('Error updating tag:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(tag);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to update tag' }, { status: 500 });
  }
}

// DELETE - Delete a household tag
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    const householdId = await getHouseholdId(supabase);
    if (!householdId) {
      return NextResponse.json({ error: 'No household found' }, { status: 404 });
    }

    // Check that this tag belongs to the user's household (not a global tag)
    const { data: existingTag } = await supabase
      .from('tags')
      .select('household_id')
      .eq('id', id)
      .single();

    if (!existingTag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    if (existingTag.household_id === null) {
      return NextResponse.json({ error: 'Cannot delete global tags' }, { status: 403 });
    }

    if (existingTag.household_id !== householdId) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', id)
      .eq('household_id', householdId);

    if (error) {
      console.error('Error deleting tag:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 });
  }
}
