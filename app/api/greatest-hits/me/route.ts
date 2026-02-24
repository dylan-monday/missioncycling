// =============================================================================
// Mission Cycling — User's Greatest Hits API
// =============================================================================
//
// GET /api/greatest-hits/me
// Returns the authenticated user's generated greatest hits.
// Called after sync completes to show the personalized reveal sequence.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase';

const SESSION_COOKIE_NAME = 'mc_session';

export async function GET(request: NextRequest) {
  try {
    // Read session cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = sessionCookie.value;

    // Fetch greatest hits from Supabase
    const supabase = createServerSupabaseClient();
    const { data: hits, error } = await supabase
      .from('greatest_hits')
      .select('id, category, title, description, stat_value, stat_label, segment_id, activity_strava_id, rank_in_club, percentile')
      .eq('user_id', userId)
      .limit(5);

    if (error) {
      console.error('[/api/greatest-hits/me] Error fetching hits:', error);
      // Return empty array if table doesn't exist or other error
      return NextResponse.json([]);
    }

    // Return hits array (may be empty if no hits generated yet)
    return NextResponse.json(hits || []);
  } catch (error) {
    console.error('[/api/greatest-hits/me] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
