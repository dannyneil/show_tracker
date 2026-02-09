import { createBrowserClient } from '@supabase/ssr';

// Client-side Supabase client with extended session (6 months)
export function createClientSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        // Set cookies to last 6 months (180 days)
        maxAge: 180 * 24 * 60 * 60, // 180 days in seconds
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      },
    }
  );
}
