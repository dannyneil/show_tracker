import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import bcrypt from 'bcryptjs';

// Rate limiting: Track attempts in memory (for simple implementation)
// In production, you'd use Redis or similar
const attemptCache = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxAttempts = 5, windowMs = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const existing = attemptCache.get(key);

  if (!existing || existing.resetAt < now) {
    attemptCache.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (existing.count >= maxAttempts) {
    return false;
  }

  existing.count++;
  return true;
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0] ||
         request.headers.get('x-real-ip') ||
         'unknown';
}

// POST - Authenticate with quick login
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();
    const { slug, passphrase } = body;

    // Validate inputs
    if (!slug || typeof slug !== 'string') {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
    }

    if (!passphrase || typeof passphrase !== 'string') {
      return NextResponse.json({ error: 'Passphrase is required' }, { status: 400 });
    }

    const trimmedSlug = slug.trim().toLowerCase();
    const clientIp = getClientIp(request);

    // Rate limiting by slug and IP
    const slugRateLimitKey = `slug:${trimmedSlug}`;
    const ipRateLimitKey = `ip:${clientIp}`;

    if (!checkRateLimit(slugRateLimitKey) || !checkRateLimit(ipRateLimitKey)) {
      // Log failed attempt
      await supabase
        .from('quick_login_attempts')
        .insert({
          slug: trimmedSlug,
          ip_address: clientIp,
          success: false,
        })
        .then(() => {}, () => {}); // Ignore errors on logging

      return NextResponse.json({
        error: 'Too many attempts. Please try again in 15 minutes.'
      }, { status: 429 });
    }

    // Look up household by slug
    const { data: household, error: householdError } = await supabase
      .from('households')
      .select('id, quick_login_passphrase_hash')
      .eq('quick_login_slug', trimmedSlug)
      .single();

    if (householdError || !household || !household.quick_login_passphrase_hash) {
      // Log failed attempt
      await supabase
        .from('quick_login_attempts')
        .insert({
          slug: trimmedSlug,
          ip_address: clientIp,
          success: false,
        })
        .then(() => {}, () => {}); // Ignore errors on logging

      return NextResponse.json({
        error: 'Invalid quick login credentials'
      }, { status: 401 });
    }

    // Verify passphrase
    const passphraseMatch = await bcrypt.compare(passphrase.trim(), household.quick_login_passphrase_hash);

    if (!passphraseMatch) {
      // Log failed attempt
      await supabase
        .from('quick_login_attempts')
        .insert({
          slug: trimmedSlug,
          ip_address: clientIp,
          success: false,
        })
        .then(() => {}, () => {}); // Ignore errors on logging

      return NextResponse.json({
        error: 'Invalid quick login credentials'
      }, { status: 401 });
    }

    // Success! Now we need to find a user from this household to sign in as
    // Get the owner of this household (most appropriate user)
    const { data: owner } = await supabase
      .from('household_members')
      .select('user_id, email')
      .eq('household_id', household.id)
      .eq('role', 'owner')
      .single();

    if (!owner) {
      return NextResponse.json({
        error: 'No owner found for this household'
      }, { status: 500 });
    }

    // Log successful attempt
    await supabase
      .from('quick_login_attempts')
      .insert({
        slug: trimmedSlug,
        ip_address: clientIp,
        success: true,
      })
      .then(() => {}, () => {}); // Ignore errors on logging

    // Use service role to create a session directly (bypasses email verification)
    // This requires SUPABASE_SERVICE_ROLE_KEY environment variable
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY not configured');
      return NextResponse.json({
        error: 'Quick login is not properly configured. Please contact support.'
      }, { status: 500 });
    }

    // Create admin client with service role
    const { createClient } = await import('@supabase/supabase-js');
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Generate a session for this user
    // Using the Admin API to create a session without email verification
    const { data: sessionData, error: sessionError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: owner.email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || ''}/`,
      },
    });

    if (sessionError || !sessionData) {
      console.error('Error generating session:', sessionError);
      return NextResponse.json({
        error: 'Failed to create session. Please try again.'
      }, { status: 500 });
    }

    // Return the redirect URL which contains the auth tokens
    // The client will navigate to this URL to establish the session
    return NextResponse.json({
      success: true,
      redirectUrl: sessionData.properties.action_link,
    });

  } catch (error) {
    console.error('Error processing quick login:', error);
    return NextResponse.json({ error: 'Failed to process quick login' }, { status: 500 });
  }
}
