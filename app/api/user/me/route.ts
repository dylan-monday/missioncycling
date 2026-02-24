// =============================================================================
// Mission Cycling — Current User API
// =============================================================================
//
// GET /api/user/me
// Returns the authenticated user's data based on the mc_session cookie.
// Used by the frontend to check session status and poll sync progress.
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

    // Fetch user from Supabase
    const supabase = createServerSupabaseClient();
    const { data: user, error } = await supabase
      .from('users')
      .select('id, strava_id, name, first_name, last_name, profile_pic, city, state, sync_status, sync_progress')
      .eq('id', userId)
      .single();

    // Handle missing columns gracefully (sync_status, sync_progress may not exist yet)
    if (error) {
      // Try without the new columns
      if (error.code === '42703') {
        const { data: userBasic, error: basicError } = await supabase
          .from('users')
          .select('id, strava_id, name, first_name, last_name, profile_pic, city, state')
          .eq('id', userId)
          .single();

        if (basicError || !userBasic) {
          console.error('[/api/user/me] User not found:', basicError);
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({
          ...userBasic,
          sync_status: 'pending',
          sync_progress: null,
        });
      }

      console.error('[/api/user/me] User not found:', error);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Return user data (without sensitive fields like tokens)
    return NextResponse.json({
      id: user.id,
      strava_id: user.strava_id,
      name: user.name,
      first_name: user.first_name,
      last_name: user.last_name,
      profile_pic: user.profile_pic,
      city: user.city,
      state: user.state,
      sync_status: user.sync_status || 'pending',
      sync_progress: user.sync_progress || null,
    });
  } catch (error) {
    console.error('[/api/user/me] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
