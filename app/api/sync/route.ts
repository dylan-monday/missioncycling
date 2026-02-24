// =============================================================================
// Mission Cycling — Manual Sync Endpoint
// =============================================================================
//
// POST /api/sync
// Triggers a manual re-sync for an authenticated user.
// Primarily used for re-syncing after initial auth or debugging.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase';
import { runUserSync } from '@/lib/sync';

const SESSION_COOKIE_NAME = 'mc_session';

export async function POST(request: NextRequest) {
  console.log('[Sync API] Manual sync requested...');

  // Get user from session cookie
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const supabase = createServerSupabaseClient();

  // Fetch user from database
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    console.error('[Sync API] User not found:', userError);
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const syncUser = {
    id: user.id,
    strava_id: user.strava_id,
    name: user.name,
    first_name: user.first_name,
    last_name: user.last_name,
    profile_pic: user.profile_pic,
    access_token: user.access_token,
    refresh_token: user.refresh_token,
    token_expires_at: user.token_expires_at,
  };

  // Run sync in the background (fire and forget)
  // The sync will update the user's sync_status and sync_progress as it runs
  runUserSync(syncUser).catch((err) => {
    console.error('[Sync API] Background sync failed:', err);
    // Update user status to error
    supabase
      .from('users')
      .update({ sync_status: 'error', sync_progress: { error: String(err) } })
      .eq('id', user.id)
      .then(() => {});
  });

  // Return immediately - client will poll /api/user/me for progress
  return NextResponse.json({
    success: true,
    message: 'Sync started in background',
  });
}
