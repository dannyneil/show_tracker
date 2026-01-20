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

// GET all tags (global + household-specific via RLS)
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: tags, error } = await supabase
      .from('tags')
      .select('*')
      .order('category')
      .order('name');

    if (error) {
      console.error('Error fetching tags:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(tags || []);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}

// POST - Create a new household tag
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    const { name, color, category } = body;

    if (!name || !color || !category) {
      return NextResponse.json({ error: 'Name, color, and category are required' }, { status: 400 });
    }

    const householdId = await getHouseholdId(supabase);
    if (!householdId) {
      return NextResponse.json({ error: 'No household found' }, { status: 404 });
    }

    const { data: tag, error } = await supabase
      .from('tags')
      .insert({
        name: name.trim(),
        color,
        category,
        household_id: householdId,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A tag with this name already exists' }, { status: 409 });
      }
      console.error('Error creating tag:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 });
  }
}
