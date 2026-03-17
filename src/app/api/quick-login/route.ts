import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import bcrypt from 'bcryptjs';

// Explicitly set runtime to nodejs (edge runtime doesn't support bcrypt)
export const runtime = 'nodejs';

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

// GET - Health check endpoint to verify route exists
export async function GET() {
  return NextResponse.json({
    message: 'Quick login API is available',
    methods: ['POST'],
    runtime: 'nodejs'
  });
}

// POST - Authenticate with quick login
export async function POST(request: NextRequest) {
  console.log('=== QUICK LOGIN POST HANDLER CALLED ===');
  console.log('Request URL:', request.url);
  console.log('Request method:', request.method);

  try {
    console.log('Creating Supabase client...');
    const supabase = await createServerSupabaseClient();

    console.log('Parsing request body...');
    const body = await request.json();
    const { slug, passphrase } = body;
    console.log('Received slug:', slug);

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
    console.log('Looking up household with slug:', trimmedSlug);
    const { data: household, error: householdError } = await supabase
      .from('households')
      .select('id, quick_login_passphrase_hash')
      .eq('quick_login_slug', trimmedSlug)
      .single();

    console.log('Household lookup result:', {
      found: !!household,
      hasError: !!householdError,
      error: householdError,
      hasPassphraseHash: !!(household?.quick_login_passphrase_hash),
      householdId: household?.id
    });

    if (householdError || !household || !household.quick_login_passphrase_hash) {
      console.error('Failed household lookup:', {
        error: householdError,
        household: household,
        hasPassphraseHash: !!(household?.quick_login_passphrase_hash)
      });

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
    console.log('Verifying passphrase...');
    console.log('Passphrase length:', passphrase.trim().length);
    console.log('Hash present:', !!household.quick_login_passphrase_hash);

    const passphraseMatch = await bcrypt.compare(passphrase.trim(), household.quick_login_passphrase_hash);
    console.log('Passphrase match result:', passphraseMatch);

    if (!passphraseMatch) {
      console.error('Passphrase does not match');

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

    console.log('Passphrase verified successfully!');

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

    // Generate a magic link OTP
    console.log('Attempting to generate link for email:', owner.email);
    console.log('Using service role key:', serviceRoleKey.substring(0, 10) + '...');

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: owner.email,
    });

    if (linkError) {
      console.error('Error generating link:', linkError);
      console.error('Error details:', JSON.stringify(linkError, null, 2));
      return NextResponse.json({
        error: `Supabase admin error: ${linkError.message || 'Unknown error'}`,
        details: linkError
      }, { status: 500 });
    }

    if (!linkData || !linkData.properties) {
      console.error('Link data is missing:', linkData);
      return NextResponse.json({
        error: 'No link data returned from Supabase'
      }, { status: 500 });
    }

    console.log('Link data received:', {
      hasEmailOtp: !!linkData.properties.email_otp,
      hasHashedToken: !!linkData.properties.hashed_token,
      verificationType: linkData.properties.verification_type
    });

    // Use verifyOtp with the generated OTP to get actual session tokens
    const emailOtp = linkData.properties.email_otp;
    if (!emailOtp) {
      console.error('No email_otp in link data');
      return NextResponse.json({
        error: 'Failed to generate OTP for authentication'
      }, { status: 500 });
    }

    console.log('Verifying OTP to get session tokens...');
    const { data: verifyData, error: verifyError } = await adminClient.auth.verifyOtp({
      email: owner.email,
      token: emailOtp,
      type: 'email',
    });

    console.log('Verify OTP result:', {
      hasSession: !!verifyData?.session,
      hasUser: !!verifyData?.user,
      error: verifyError
    });

    if (verifyError) {
      console.error('Error verifying OTP:', verifyError);
      return NextResponse.json({
        error: `Failed to verify OTP: ${verifyError.message}`
      }, { status: 500 });
    }

    if (!verifyData?.session) {
      console.error('No session returned from verifyOtp');
      return NextResponse.json({
        error: 'Failed to create session'
      }, { status: 500 });
    }

    const accessToken = verifyData.session.access_token;
    const refreshToken = verifyData.session.refresh_token;

    console.log('Successfully obtained session tokens');

    // Return the session tokens for the client to set
    // This avoids cross-origin cookie issues in incognito mode
    return NextResponse.json({
      success: true,
      accessToken,
      refreshToken,
    });

  } catch (error) {
    console.error('=== CRITICAL ERROR IN QUICK LOGIN ===');
    console.error('Error processing quick login:', error);
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');

    return NextResponse.json({
      error: 'Failed to process quick login',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
