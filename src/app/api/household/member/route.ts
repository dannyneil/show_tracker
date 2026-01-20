import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// DELETE - Remove a member from household
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check user is owner
    const { data: membership } = await supabase
      .from('household_members')
      .select('household_id, role')
      .eq('user_id', user.id)
      .single();

    if (!membership || membership.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can remove members' }, { status: 403 });
    }

    const { memberId } = body;
    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    // Get the member to remove
    const { data: memberToRemove } = await supabase
      .from('household_members')
      .select('user_id, role')
      .eq('id', memberId)
      .eq('household_id', membership.household_id)
      .single();

    if (!memberToRemove) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Can't remove yourself
    if (memberToRemove.user_id === user.id) {
      return NextResponse.json({ error: "You can't remove yourself" }, { status: 400 });
    }

    // Can't remove another owner
    if (memberToRemove.role === 'owner') {
      return NextResponse.json({ error: "You can't remove another owner" }, { status: 400 });
    }

    const { error } = await supabase
      .from('household_members')
      .delete()
      .eq('id', memberId)
      .eq('household_id', membership.household_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }
}
