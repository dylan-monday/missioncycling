// =============================================================================
// Mission Cycling — Supabase Client
// =============================================================================
//
// Server and client-side Supabase instances.
// Server client uses service role key for writes (users, tokens).
// Client instance uses anon key for public reads.
//
// Environment variables required:
// - NEXT_PUBLIC_SUPABASE_URL
// - NEXT_PUBLIC_SUPABASE_ANON_KEY
// - SUPABASE_SERVICE_ROLE_KEY (server only)
// =============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy-loaded clients to avoid build-time errors when env vars aren't set
let _supabaseClient: SupabaseClient | null = null;
let _supabaseServerClient: SupabaseClient | null = null;

// -----------------------------------------------------------------------------
// Client-side Supabase (public, anon key)
// Use this in React components for reading public data
// -----------------------------------------------------------------------------
export function getSupabaseClient(): SupabaseClient {
  if (!_supabaseClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      throw new Error('Missing Supabase environment variables');
    }

    _supabaseClient = createClient(url, anonKey);
  }
  return _supabaseClient;
}

// Legacy export for backwards compatibility
export const supabase = {
  get client() {
    return getSupabaseClient();
  },
};

// -----------------------------------------------------------------------------
// Server-side Supabase (service role key, bypasses RLS)
// Use this in API routes for creating users, storing tokens, etc.
// NEVER expose the service role key to the client
// -----------------------------------------------------------------------------
export function createServerSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase server environment variables');
  }

  // Create a new client each time for server-side to avoid connection pooling issues
  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// -----------------------------------------------------------------------------
// Helper: Get user by Strava ID
// -----------------------------------------------------------------------------
export async function getUserByStravaId(stravaId: number) {
  const supabaseServer = createServerSupabaseClient();
  const { data, error } = await supabaseServer
    .from('users')
    .select('*')
    .eq('strava_id', stravaId)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned (not an error for us)
    throw error;
  }

  return data;
}

// -----------------------------------------------------------------------------
// Helper: Create or update user after OAuth
// -----------------------------------------------------------------------------
export async function upsertUser(userData: {
  strava_id: number;
  name: string;
  first_name: string;
  last_name: string;
  profile_pic: string | null;
  city: string | null;
  state: string | null;
  access_token: string;
  refresh_token: string;
  expires_at: number;
}) {
  const supabaseServer = createServerSupabaseClient();

  const { data, error } = await supabaseServer
    .from('users')
    .upsert(
      {
        strava_id: userData.strava_id,
        name: userData.name,
        first_name: userData.first_name,
        last_name: userData.last_name,
        profile_pic: userData.profile_pic,
        city: userData.city,
        state: userData.state,
        access_token: userData.access_token,
        refresh_token: userData.refresh_token,
        token_expires_at: userData.expires_at, // Unix timestamp (bigint)
        connected_at: new Date().toISOString(),
      },
      {
        onConflict: 'strava_id',
      }
    )
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

// -----------------------------------------------------------------------------
// Helper: Update user tokens after refresh
// -----------------------------------------------------------------------------
export async function updateUserTokens(
  userId: string,
  tokens: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  }
) {
  const supabaseServer = createServerSupabaseClient();

  const { error } = await supabaseServer
    .from('users')
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: tokens.expires_at, // Unix timestamp (bigint)
    })
    .eq('id', userId);

  if (error) {
    throw error;
  }
}

// -----------------------------------------------------------------------------
// Helper: Log sync activity
// -----------------------------------------------------------------------------
export async function logSync(
  userId: string,
  status: 'started' | 'completed' | 'error',
  details?: Record<string, unknown>
) {
  const supabaseServer = createServerSupabaseClient();

  const { error } = await supabaseServer.from('sync_log').insert({
    user_id: userId,
    status,
    details,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error('Failed to log sync:', error);
  }
}
