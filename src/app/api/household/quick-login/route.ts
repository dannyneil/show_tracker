import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import bcrypt from 'bcryptjs';

// GET - Get current quick login configuration
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

    // Get household quick login info (don't return the hash!)
    const { data: household } = await supabase
      .from('households')
      .select('quick_login_slug')
      .eq('id', membership.household_id)
      .single();

    const enabled = !!household?.quick_login_slug;
    const slug = household?.quick_login_slug || null;

    return NextResponse.json({
      enabled,
      slug,
      url: enabled ? `${process.env.NEXT_PUBLIC_APP_URL || ''}/quick/${slug}` : null,
    });
  } catch (error) {
    console.error('Error fetching quick login config:', error);
    return NextResponse.json({ error: 'Failed to fetch quick login config' }, { status: 500 });
  }
}

// POST - Set up or update quick login
export async function POST(request: NextRequest) {
  console.log('=== QUICK LOGIN SETUP POST CALLED ===');

  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();
    console.log('Request body:', { slug: body.slug, passphraseLength: body.passphrase?.length });

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    console.log('Current user:', user?.id);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check user is owner
    const { data: membership, error: membershipError } = await supabase
      .from('household_members')
      .select('household_id, role')
      .eq('user_id', user.id)
      .single();

    console.log('Membership lookup:', { membership, error: membershipError });

    if (!membership || membership.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can configure quick login' }, { status: 403 });
    }

    const { slug, passphrase } = body;

    // Validate slug
    if (!slug || typeof slug !== 'string') {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
    }

    const trimmedSlug = slug.trim().toLowerCase();

    // Slug must be alphanumeric with hyphens only, 3-50 characters
    if (!/^[a-z0-9-]{3,50}$/.test(trimmedSlug)) {
      return NextResponse.json({
        error: 'Slug must be 3-50 characters, lowercase letters, numbers, and hyphens only'
      }, { status: 400 });
    }

    // Validate passphrase
    if (!passphrase || typeof passphrase !== 'string') {
      return NextResponse.json({ error: 'Passphrase is required' }, { status: 400 });
    }

    const trimmedPassphrase = passphrase.trim();

    // Passphrase must be at least 8 characters
    if (trimmedPassphrase.length < 8) {
      return NextResponse.json({
        error: 'Passphrase must be at least 8 characters'
      }, { status: 400 });
    }

    // Check if slug is already taken by another household
    const { data: existingHousehold } = await supabase
      .from('households')
      .select('id')
      .eq('quick_login_slug', trimmedSlug)
      .neq('id', membership.household_id)
      .single();

    if (existingHousehold) {
      return NextResponse.json({
        error: 'This slug is already taken. Please choose a different one.'
      }, { status: 409 });
    }

    // Hash the passphrase
    console.log('Hashing passphrase...');
    const hashedPassphrase = await bcrypt.hash(trimmedPassphrase, 10);
    console.log('Passphrase hashed successfully, hash length:', hashedPassphrase.length);

    // Update household with quick login credentials
    console.log('Updating household:', membership.household_id);
    const { data: updateResult, error } = await supabase
      .from('households')
      .update({
        quick_login_slug: trimmedSlug,
        quick_login_passphrase_hash: hashedPassphrase,
      })
      .eq('id', membership.household_id)
      .select();

    console.log('Update result:', { data: updateResult, error });

    if (error) {
      console.error('Error updating quick login:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Verify the update worked
    const { data: verifyHousehold } = await supabase
      .from('households')
      .select('id, quick_login_slug')
      .eq('id', membership.household_id)
      .single();

    console.log('Verification read:', verifyHousehold);

    return NextResponse.json({
      success: true,
      slug: trimmedSlug,
      url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/quick/${trimmedSlug}`,
    });
  } catch (error) {
    console.error('Error setting up quick login:', error);
    return NextResponse.json({ error: 'Failed to set up quick login' }, { status: 500 });
  }
}

// DELETE - Disable quick login
export async function DELETE() {
  try {
    const supabase = await createServerSupabaseClient();

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
      return NextResponse.json({ error: 'Only owners can disable quick login' }, { status: 403 });
    }

    // Clear quick login credentials
    const { error } = await supabase
      .from('households')
      .update({
        quick_login_slug: null,
        quick_login_passphrase_hash: null,
      })
      .eq('id', membership.household_id);

    if (error) {
      console.error('Error disabling quick login:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disabling quick login:', error);
    return NextResponse.json({ error: 'Failed to disable quick login' }, { status: 500 });
  }
}
