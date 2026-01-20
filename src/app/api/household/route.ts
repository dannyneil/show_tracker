import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// GET - Get current user's household info
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user's household membership
    const { data: membership } = await supabase
      .from('household_members')
      .select('household_id, role')
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'No household found' }, { status: 404 });
    }

    // Get household details
    const { data: household } = await supabase
      .from('households')
      .select('id, name')
      .eq('id', membership.household_id)
      .single();

    // Get all members
    const { data: members } = await supabase
      .from('household_members')
      .select('id, email, role, created_at')
      .eq('household_id', membership.household_id)
      .order('created_at', { ascending: true });

    // Get pending invitations
    const { data: invitations } = await supabase
      .from('household_invitations')
      .select('id, email, created_at')
      .eq('household_id', membership.household_id)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      household,
      members: members || [],
      invitations: invitations || [],
      currentUserRole: membership.role,
      currentUserId: user.id,
    });
  } catch (error) {
    console.error('Error fetching household:', error);
    return NextResponse.json({ error: 'Failed to fetch household' }, { status: 500 });
  }
}

// PATCH - Update household name
export async function PATCH(request: NextRequest) {
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
      return NextResponse.json({ error: 'Only owners can update household' }, { status: 403 });
    }

    const { name } = body;
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('households')
      .update({ name: name.trim() })
      .eq('id', membership.household_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating household:', error);
    return NextResponse.json({ error: 'Failed to update household' }, { status: 500 });
  }
}
