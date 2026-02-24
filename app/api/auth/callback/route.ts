// =============================================================================
// Mission Cycling — Strava OAuth Callback
// =============================================================================
//
// GET /api/auth/callback
// Handles the OAuth callback from Strava, creates user, runs sync, redirects.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { exchangeToken } from '@/lib/strava';
import { upsertUser } from '@/lib/supabase';

const SESSION_COOKIE_NAME = 'mc_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state');

  console.log('[OAuth Callback] Starting, code:', code ? 'present' : 'missing');

  // Parse state to get redirect URL
  let redirectUrl = '/';
  if (state) {
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
      redirectUrl = decoded.redirect || '/';
    } catch {
      console.log('[OAuth Callback] Failed to parse state');
    }
  }

  // Handle OAuth errors
  if (error) {
    console.error('[OAuth Callback] Strava error:', error);
    const errorUrl = new URL(redirectUrl, request.url);
    errorUrl.searchParams.set('auth_error', error);
    return NextResponse.redirect(errorUrl);
  }

  if (!code) {
    console.error('[OAuth Callback] No code');
    const errorUrl = new URL(redirectUrl, request.url);
    errorUrl.searchParams.set('auth_error', 'no_code');
    return NextResponse.redirect(errorUrl);
  }

  // Step 1: Exchange code for tokens
  let tokenData;
  try {
    console.log('[OAuth Callback] Exchanging token...');
    tokenData = await exchangeToken(code);
    console.log('[OAuth Callback] Token exchange success, athlete:', tokenData.athlete.name);
  } catch (err) {
    console.error('[OAuth Callback] Token exchange failed:', err);
    const errorUrl = new URL(redirectUrl, request.url);
    errorUrl.searchParams.set('auth_error', 'token_exchange_failed');
    return NextResponse.redirect(errorUrl);
  }

  // Step 2: Upsert user to Supabase
  let user;
  try {
    console.log('[OAuth Callback] Upserting user to Supabase...');
    user = await upsertUser({
      strava_id: tokenData.athlete.strava_id,
      name: tokenData.athlete.name,
      first_name: tokenData.athlete.first_name,
      last_name: tokenData.athlete.last_name,
      profile_pic: tokenData.athlete.profile_pic,
      city: tokenData.athlete.city,
      state: tokenData.athlete.state,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: tokenData.expires_at,
    });
    console.log('[OAuth Callback] User upserted, id:', user.id);
  } catch (err) {
    console.error('[OAuth Callback] Supabase upsert failed:', err);
    const errorUrl = new URL(redirectUrl, request.url);
    errorUrl.searchParams.set('auth_error', 'database_error');
    return NextResponse.redirect(errorUrl);
  }

  // Step 3: Set sync_status to pending (frontend will trigger sync after welcome screen)
  console.log('[OAuth Callback] Setting sync_status to pending...');
  try {
    const supabaseServer = (await import('@/lib/supabase')).createServerSupabaseClient();
    await supabaseServer
      .from('users')
      .update({ sync_status: 'pending' })
      .eq('id', user.id);
  } catch (err) {
    console.error('[OAuth Callback] Failed to set sync status (non-fatal):', err);
  }

  // Step 4: Create redirect response with session cookie
  console.log('[OAuth Callback] Success! Redirecting to:', redirectUrl);
  const response = NextResponse.redirect(new URL(redirectUrl, request.url));

  // Set cookie on the response object (required for App Router redirects)
  response.cookies.set(SESSION_COOKIE_NAME, user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });

  return response;
}
