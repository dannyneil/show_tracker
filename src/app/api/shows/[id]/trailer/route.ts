import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getTrailer } from '@/lib/tmdb';

// GET trailer for a show
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    // Fetch the show to get tmdb_id and type
    const { data: show, error } = await supabase
      .from('shows')
      .select('tmdb_id, type')
      .eq('id', id)
      .single();

    if (error || !show) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 });
    }

    // Fetch trailer from TMDb
    const trailerKey = await getTrailer(show.tmdb_id, show.type);

    if (!trailerKey) {
      return NextResponse.json({ error: 'No trailer available' }, { status: 404 });
    }

    return NextResponse.json({ trailerKey });
  } catch (error) {
    console.error('Error fetching trailer:', error);
    return NextResponse.json({ error: 'Failed to fetch trailer' }, { status: 500 });
  }
}
