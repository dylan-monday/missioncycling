// =============================================================================
// Mission Cycling — Strava API Service
// =============================================================================
//
// Handles OAuth flow, token management, and data fetching.
// All Strava API calls go through this service.
//
// Rate limits: 200 requests per 15 min, 2000 per day
// Strategy: Fetch on auth, cache in Supabase, background sync
// =============================================================================

const STRAVA_BASE = 'https://www.strava.com/api/v3';
const STRAVA_AUTH = 'https://www.strava.com/oauth';

// These come from environment variables
const CLIENT_ID = process.env.STRAVA_CLIENT_ID || '60';
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.NEXT_PUBLIC_BASE_URL
  ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`
  : 'http://localhost:3000/api/auth/callback';

// Our 8 segment Strava IDs (from segments.json)
export const CLUB_SEGMENT_IDS = [
  229781,   // Hawk Hill
  241885,   // Radio Road
  8109834,  // Old La Honda
  4793848,  // Hwy 1 from Muir Beach
  652851,   // Alpe d'Huez
  1173191,  // Four Corners
  1707949,  // BoFax Climb
  3681888,  // Bourg d'Oisans
];

// =============================================================================
// OAuth
// =============================================================================

export function getAuthUrl(state?: string): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'read,activity:read',
    approval_prompt: 'auto',
    ...(state ? { state } : {}),
  });
  return `${STRAVA_AUTH}/authorize?${params}`;
}

export async function exchangeToken(code: string) {
  const res = await fetch(`${STRAVA_AUTH}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  });

  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();

  return {
    access_token: data.access_token as string,
    refresh_token: data.refresh_token as string,
    expires_at: data.expires_at as number,
    athlete: {
      strava_id: data.athlete.id as number,
      name: `${data.athlete.firstname} ${data.athlete.lastname}`,
      first_name: data.athlete.firstname as string,
      last_name: data.athlete.lastname as string,
      profile_pic: data.athlete.profile as string,
      city: data.athlete.city as string | null,
      state: data.athlete.state as string | null,
    },
  };
}

export async function refreshToken(refresh_token: string) {
  const res = await fetch(`${STRAVA_AUTH}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    throw new Error(`Token refresh failed: ${res.status}`);
  }

  const data = await res.json();
  return {
    access_token: data.access_token as string,
    refresh_token: data.refresh_token as string,
    expires_at: data.expires_at as number,
  };
}

// =============================================================================
// Authenticated API calls
// =============================================================================

async function stravaFetch(endpoint: string, accessToken: string, params?: Record<string, string>) {
  const url = new URL(`${STRAVA_BASE}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 429) {
    // Rate limited — check headers for reset time
    const resetAt = res.headers.get('X-RateLimit-Reset');
    throw new Error(`Rate limited. Reset at: ${resetAt}`);
  }

  if (!res.ok) {
    throw new Error(`Strava API error: ${res.status} ${endpoint}`);
  }

  return res.json();
}

// =============================================================================
// Data Fetching
// =============================================================================

/**
 * Get the authenticated athlete's profile
 */
export async function getAthlete(accessToken: string) {
  return stravaFetch('/athlete', accessToken);
}

/**
 * Get athlete's stats (totals for rides, runs, etc.)
 */
export async function getAthleteStats(accessToken: string, athleteId: number) {
  return stravaFetch(`/athletes/${athleteId}/stats`, accessToken);
}

/**
 * Get athlete's KOMs/QOMs (undocumented but working endpoint).
 * Returns segments where the athlete holds KOM or QOM.
 */
export async function getAthleteKoms(
  accessToken: string,
  athleteId: number,
  opts?: { page?: number; perPage?: number }
) {
  const params: Record<string, string> = {
    per_page: String(opts?.perPage || 100),
    page: String(opts?.page || 1),
  };
  return stravaFetch(`/athletes/${athleteId}/koms`, accessToken, params);
}

/**
 * Get segment efforts for a specific segment by the authenticated athlete.
 * Returns ALL efforts — we pick the best time.
 */
export async function getSegmentEfforts(
  accessToken: string,
  segmentId: number,
  opts?: { page?: number; perPage?: number; startDate?: string; endDate?: string }
) {
  const params: Record<string, string> = {
    per_page: String(opts?.perPage || 100),
    page: String(opts?.page || 1),
  };
  if (opts?.startDate) params.start_date_local = opts.startDate;
  if (opts?.endDate) params.end_date_local = opts.endDate;

  return stravaFetch(`/segment_efforts`, accessToken, {
    segment_id: String(segmentId),
    ...params,
  });
}

/**
 * Get segment detail (includes elevation, distance, etc.)
 */
export async function getSegment(accessToken: string, segmentId: number) {
  return stravaFetch(`/segments/${segmentId}`, accessToken);
}

/**
 * Get segment streams (altitude + distance for elevation profile SVGs)
 */
export async function getSegmentStreams(
  accessToken: string,
  segmentId: number,
  keys: string[] = ['altitude', 'distance']
) {
  return stravaFetch(`/segments/${segmentId}/streams`, accessToken, {
    keys: keys.join(','),
    key_type: 'distance',
  });
}

/**
 * Get athlete's activities (paginated).
 * For full history, call repeatedly with incrementing page.
 */
export async function getActivities(
  accessToken: string,
  opts?: { page?: number; perPage?: number; after?: number; before?: number }
) {
  const params: Record<string, string> = {
    per_page: String(opts?.perPage || 100),
    page: String(opts?.page || 1),
  };
  if (opts?.after) params.after = String(opts.after);
  if (opts?.before) params.before = String(opts.before);

  return stravaFetch('/athlete/activities', accessToken, params);
}

/**
 * Get a single activity detail (includes segment_efforts if requested)
 */
export async function getActivity(
  accessToken: string,
  activityId: number,
  includeEfforts: boolean = false
) {
  return stravaFetch(`/activities/${activityId}`, accessToken, {
    include_all_efforts: String(includeEfforts),
  });
}

// =============================================================================
// Sync Orchestration
// =============================================================================

/**
 * Full sync for a newly authenticated user.
 * Called after OAuth callback.
 *
 * Strategy:
 * 1. Fetch athlete profile & stats
 * 2. Fetch segment efforts for each of our 8 segments
 * 3. Fetch activity history (paginated, rides only)
 * 4. Store everything in Supabase
 * 5. Generate greatest hits
 * 6. Update leaderboard (ghost → verified)
 * 7. Regenerate ticker stories
 *
 * This is designed to run as a background job (Vercel serverless or edge function).
 * Total API calls for a full sync: ~15-25 depending on activity count.
 */
export interface SyncPlan {
  userId: string;
  accessToken: string;
  stravaId: number;
  steps: SyncStep[];
}

export interface SyncStep {
  action: string;
  segmentId?: number;
  page?: number;
  status: 'pending' | 'complete' | 'error' | 'skipped';
  itemsFetched?: number;
  error?: string;
}

export function buildSyncPlan(userId: string, accessToken: string, stravaId: number): SyncPlan {
  const steps: SyncStep[] = [];

  // Step 1: Athlete stats
  steps.push({ action: 'fetch_athlete_stats', status: 'pending' });

  // Step 2: Segment efforts for each segment
  for (const segId of CLUB_SEGMENT_IDS) {
    steps.push({
      action: 'fetch_segment_efforts',
      segmentId: segId,
      status: 'pending',
    });
  }

  // Step 3: Activity history (first 5 pages = 500 most recent rides)
  // We'll paginate more if needed
  for (let page = 1; page <= 5; page++) {
    steps.push({
      action: 'fetch_activities',
      page,
      status: 'pending',
    });
  }

  return { userId, accessToken, stravaId, steps };
}

// =============================================================================
// Unit Conversions (Strava returns metric)
// =============================================================================

export function metersToMiles(m: number): number {
  return Math.round(m * 0.000621371 * 100) / 100;
}

export function metersToFeet(m: number): number {
  return Math.round(m * 3.28084);
}

export function mpsToMph(mps: number): number {
  return Math.round(mps * 2.23694 * 100) / 100;
}

export function secondsToDisplay(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
