// =============================================================================
// Mission Cycling — User's Greatest Hits API
// =============================================================================
//
// GET /api/greatest-hits/me
// Returns the authenticated user's generated greatest hits.
// If none exist, generates them on-demand (lazy generation).
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase';
import { generateGreatestHits } from '@/lib/greatest-hits';

const SESSION_COOKIE_NAME = 'mc_session';

// Segment ID to name mapping
const SEGMENT_NAMES: Record<string, string> = {
  '229781': 'Hawk Hill',
  '241885': 'Radio Road',
  '8109834': 'Old La Honda',
  '4793848': 'Hwy 1 from Muir Beach',
  '652851': "Alpe d'Huez",
  '1173191': 'Four Corners',
  '1707949': 'BoFax Climb',
  '3681888': "Bourg d'Oisans",
};

export async function GET(request: NextRequest) {
  try {
    // Read session cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = sessionCookie.value;
    const supabase = createServerSupabaseClient();

    // First, try to fetch existing greatest hits
    const { data: existingHits, error: fetchError } = await supabase
      .from('greatest_hits')
      .select('id, category, title, description, stat_value, stat_label, segment_id, activity_strava_id, rank_in_club, percentile')
      .eq('user_id', userId)
      .limit(5);

    if (fetchError) {
      console.error('[/api/greatest-hits/me] Error fetching hits:', fetchError);
    }

    // If hits exist, return them
    if (existingHits && existingHits.length > 0) {
      return NextResponse.json(existingHits);
    }

    // No hits exist - generate them on-demand
    console.log('[/api/greatest-hits/me] No hits found, generating on-demand...');

    // Get user info
    const { data: user } = await supabase
      .from('users')
      .select('id, name')
      .eq('id', userId)
      .single();

    if (!user) {
      return NextResponse.json([]);
    }

    // Fetch activities from database
    const { data: userActivities } = await supabase
      .from('activities')
      .select('strava_activity_id, name, distance_mi, moving_time_seconds, total_elevation_gain_ft, start_date_local, average_speed_mph, average_watts')
      .eq('user_id', userId);

    // Fetch segment efforts from database
    const { data: userEfforts } = await supabase
      .from('segment_efforts')
      .select('segment_id, elapsed_time, start_date, pr_rank')
      .eq('user_id', userId);

    if (!userActivities || userActivities.length === 0) {
      console.log('[/api/greatest-hits/me] No activities found for user');
      return NextResponse.json([]);
    }

    // Format data for greatest hits generator
    const activitiesData = {
      activities: userActivities.map(a => ({
        strava_activity_id: a.strava_activity_id,
        name: a.name,
        distance_mi: a.distance_mi,
        moving_time_seconds: a.moving_time_seconds,
        total_elevation_gain_ft: a.total_elevation_gain_ft,
        start_date_local: a.start_date_local,
        average_speed_mph: a.average_speed_mph,
        average_watts: a.average_watts,
      })),
    };

    const effortsData = {
      efforts: (userEfforts || []).map(e => ({
        segment_id: e.segment_id,
        segment_name: SEGMENT_NAMES[e.segment_id] || e.segment_id,
        elapsed_time: e.elapsed_time,
        start_date: e.start_date,
        pr_rank: e.pr_rank,
      })),
    };

    // Generate hits (no weather data for now)
    const hits = generateGreatestHits(user.name, activitiesData, effortsData, [], null);
    console.log('[/api/greatest-hits/me] Generated', hits.length, 'greatest hits');

    // Store hits in database for future requests
    if (hits.length > 0) {
      const hitsToInsert = hits.map(hit => ({
        user_id: userId,
        category: hit.category,
        title: hit.title,
        description: hit.description,
        stat_value: hit.stat_value,
        stat_label: hit.stat_label,
        segment_id: hit.segment_id,
        activity_strava_id: hit.activity_strava_id,
        rank_in_club: hit.rank_in_club,
        percentile: hit.percentile,
      }));

      const { error: insertError } = await supabase
        .from('greatest_hits')
        .insert(hitsToInsert);

      if (insertError) {
        console.error('[/api/greatest-hits/me] Failed to store hits:', insertError);
      }
    }

    // Return the generated hits
    return NextResponse.json(hits.slice(0, 5).map(hit => ({
      id: crypto.randomUUID(),
      category: hit.category,
      title: hit.title,
      description: hit.description,
      stat_value: hit.stat_value,
      stat_label: hit.stat_label,
      segment_id: hit.segment_id,
      activity_strava_id: hit.activity_strava_id,
      rank_in_club: hit.rank_in_club,
      percentile: hit.percentile,
    })));
  } catch (error) {
    console.error('[/api/greatest-hits/me] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
