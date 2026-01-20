import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// POST - Create an invitation
export async function POST(request: NextRequest) {
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
      return NextResponse.json({ error: 'Only owners can invite members' }, { status: 403 });
    }

    const { email } = body;
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if email is already a member
    const { data: existingMember } = await supabase
      .from('household_members')
      .select('id')
      .eq('household_id', membership.household_id)
      .eq('email', normalizedEmail)
      .single();

    if (existingMember) {
      return NextResponse.json({ error: 'This email is already a member' }, { status: 409 });
    }

    // Check if invitation already exists
    const { data: existingInvite } = await supabase
      .from('household_invitations')
      .select('id')
      .eq('household_id', membership.household_id)
      .eq('email', normalizedEmail)
      .single();

    if (existingInvite) {
      return NextResponse.json({ error: 'Invitation already sent to this email' }, { status: 409 });
    }

    // Create invitation
    const { data: invitation, error } = await supabase
      .from('household_invitations')
      .insert({
        household_id: membership.household_id,
        email: normalizedEmail,
        invited_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating invitation:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ invitation }, { status: 201 });
  } catch (error) {
    console.error('Error creating invitation:', error);
    return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
  }
}

// DELETE - Remove an invitation
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
      return NextResponse.json({ error: 'Only owners can remove invitations' }, { status: 403 });
    }

    const { invitationId } = body;
    if (!invitationId) {
      return NextResponse.json({ error: 'Invitation ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('household_invitations')
      .delete()
      .eq('id', invitationId)
      .eq('household_id', membership.household_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing invitation:', error);
    return NextResponse.json({ error: 'Failed to remove invitation' }, { status: 500 });
  }
}
