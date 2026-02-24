// =============================================================================
// Mission Cycling — Strava OAuth Redirect
// =============================================================================
//
// GET /api/auth/strava
// Redirects the user to Strava's OAuth authorization page.
//
// Query params:
// - redirect (optional): URL to redirect back to after auth completes
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/strava';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const redirectAfter = searchParams.get('redirect') || '/';

  // Encode the post-auth redirect in state (will be passed back in callback)
  const state = Buffer.from(JSON.stringify({ redirect: redirectAfter })).toString('base64');

  const authUrl = getAuthUrl(state);

  return NextResponse.redirect(authUrl);
}
