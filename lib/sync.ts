// =============================================================================
// Mission Cycling — Sync Service
// =============================================================================
//
// Core sync logic extracted so it can be called from:
// - OAuth callback (immediately after auth)
// - /api/sync endpoint (manual re-sync)
//
// =============================================================================

import {
  getSegmentEfforts,
  getActivities,
  getAthleteKoms,
  refreshToken,
  metersToMiles,
  metersToFeet,
  secondsToDisplay,
  CLUB_SEGMENT_IDS,
} from '@/lib/strava';
import { createServerSupabaseClient, updateUserTokens } from '@/lib/supabase';
import { processUserEfforts, calculateRanks } from '@/lib/leaderboard';
import { generateGreatestHits } from '@/lib/greatest-hits';

// Segment ID to slug mapping
const SEGMENT_ID_TO_SLUG: Record<number, string> = {
  229781: 'hawk-hill',
  241885: 'radio-road',
  8109834: 'old-la-honda',
  4793848: 'hwy1-muir-beach',
  652851: 'alpe-dhuez',
  1173191: 'four-corners',
  1707949: 'bofax-climb',
  3681888: 'bourg-doisans',
};

export interface SyncResults {
  segmentEfforts: { fetched: number; stored: number; errors: string[] };
  activities: { fetched: number; stored: number; errors: string[] };
  koms: { fetched: number; stored: number; errors: string[] };
  leaderboard: { verified: number; updated: number; newEntries: number };
  userStats: {
    total_rides: number | null;
    total_distance_mi: number | null;
    total_elevation_ft: number | null;
    member_since: string | null;
    last_ride: string | null;
    kom_count: number | null;
  };
}

export interface SyncUser {
  id: string;
  strava_id: number;
  name: string;
  first_name: string;
  last_name: string;
  profile_pic: string | null;
  access_token: string;
  refresh_token: string;
  token_expires_at: number;
}

// Segment names for display
const SEGMENT_NAMES: Record<string, string> = {
  'hawk-hill': 'Hawk Hill',
  'radio-road': 'Radio Road',
  'old-la-honda': 'Old La Honda',
  'hwy1-muir-beach': 'Hwy 1 from Muir Beach',
  'alpe-dhuez': 'Alpe d\'Huez',
  'four-corners': 'Four Corners',
  'bofax-climb': 'BoFax Climb',
  'bourg-doisans': 'Bourg d\'Oisans',
};

/**
 * Update sync progress in the user row
 */
async function updateSyncProgress(
  supabase: any,
  userId: string,
  progress: {
    step: 'segment_efforts' | 'activities' | 'greatest_hits' | 'complete';
    current_segment?: string;
    current_segment_name?: string;
    segments_complete?: number;
    segments_total?: number;
    efforts_found?: number;
    best_time_display?: string;
    best_date?: string;
    most_recent_date?: string;
    activities_found?: number;
    activities_page?: number;
    activities_pages_total?: number;
    total_distance?: string;
    total_elevation?: string;
    total_hours?: string;
    first_ride?: string;
    last_ride?: string;
    message?: string;
  }
) {
  await supabase
    .from('users')
    .update({
      sync_status: progress.step === 'complete' ? 'complete' : 'syncing',
      sync_progress: progress,
    })
    .eq('id', userId);
}

/**
 * Run a full sync for a user.
 * Can be called with a fresh access_token (from OAuth) or will refresh if needed.
 */
export async function runUserSync(
  user: SyncUser,
  accessToken?: string // Optional fresh token from OAuth
): Promise<SyncResults> {
  console.log('[Sync] Starting sync for', user.name, 'Strava ID:', user.strava_id);

  const supabase = createServerSupabaseClient();
  let token = accessToken || user.access_token;

  // Set initial syncing status
  await supabase
    .from('users')
    .update({
      sync_status: 'syncing',
      sync_progress: {
        step: 'segment_efforts',
        segments_complete: 0,
        segments_total: CLUB_SEGMENT_IDS.length,
        efforts_found: 0,
        message: 'Starting sync...',
      },
    })
    .eq('id', user.id);

  // Check if token needs refresh (only if not provided fresh)
  if (!accessToken) {
    const now = Math.floor(Date.now() / 1000);
    if (user.token_expires_at < now) {
      console.log('[Sync] Token expired, refreshing...');
      try {
        const newTokens = await refreshToken(user.refresh_token);
        token = newTokens.access_token;
        await updateUserTokens(user.id, newTokens);
        console.log('[Sync] Token refreshed');
      } catch (err) {
        console.error('[Sync] Token refresh failed:', err);
        throw new Error('Token refresh failed');
      }
    }
  }

  const syncResults: SyncResults = {
    segmentEfforts: { fetched: 0, stored: 0, errors: [] },
    activities: { fetched: 0, stored: 0, errors: [] },
    koms: { fetched: 0, stored: 0, errors: [] },
    leaderboard: { verified: 0, updated: 0, newEntries: 0 },
    userStats: {
      total_rides: null,
      total_distance_mi: null,
      total_elevation_ft: null,
      member_since: null,
      last_ride: null,
      kom_count: null,
    },
  };

  // -------------------------------------------------------------------------
  // Step 1: Fetch and store segment efforts (2008-2019 only)
  // -------------------------------------------------------------------------
  console.log('[Sync] Fetching segment efforts for', CLUB_SEGMENT_IDS.length, 'segments (2008-2019)...');

  // Date range for segment efforts
  const START_DATE = '2008-01-01T00:00:00Z';
  const END_DATE = '2019-12-31T23:59:59Z';

  const bestEffortPerSegment = new Map<string, {
    segment_id: string;
    elapsed_time: number;
    start_date: string;
    average_watts: number | null;
    strava_effort_id: number;
  }>();

  let segmentsProcessed = 0;
  let totalEffortsFound = 0;

  for (const segmentId of CLUB_SEGMENT_IDS) {
    const segmentSlug = SEGMENT_ID_TO_SLUG[segmentId];
    const segmentName = SEGMENT_NAMES[segmentSlug] || segmentSlug;

    // Update progress: scanning this segment
    await updateSyncProgress(supabase, user.id, {
      step: 'segment_efforts',
      current_segment: segmentSlug,
      current_segment_name: segmentName,
      segments_complete: segmentsProcessed,
      segments_total: CLUB_SEGMENT_IDS.length,
      efforts_found: totalEffortsFound,
      message: `Scanning ${segmentName}...`,
    });

    try {
      const efforts = await getSegmentEfforts(token, segmentId, {
        startDate: START_DATE,
        endDate: END_DATE,
      });
      syncResults.segmentEfforts.fetched += efforts.length;
      totalEffortsFound += efforts.length;

      if (efforts.length === 0) continue;

      // Find best effort (lowest elapsed_time)
      const bestEffort = efforts.reduce((best: any, current: any) =>
        current.elapsed_time < best.elapsed_time ? current : best
      );

      bestEffortPerSegment.set(segmentSlug, {
        segment_id: segmentSlug,
        elapsed_time: bestEffort.elapsed_time,
        start_date: bestEffort.start_date,
        average_watts: bestEffort.average_watts || null,
        strava_effort_id: bestEffort.id,
      });

      // Store all efforts in segment_efforts table (batched for speed)
      const effortsToInsert = efforts.map((effort: any) => ({
        user_id: user.id,
        segment_id: segmentSlug,
        strava_effort_id: effort.id,
        elapsed_time: effort.elapsed_time,
        moving_time: effort.moving_time,
        start_date: effort.start_date,
        average_watts: effort.average_watts ? Math.round(effort.average_watts) : null,
        average_heartrate: effort.average_heartrate ? Math.round(effort.average_heartrate) : null,
        max_heartrate: effort.max_heartrate ? Math.round(effort.max_heartrate) : null,
        pr_rank: effort.pr_rank || null,
      }));

      const { error: batchError } = await supabase
        .from('segment_efforts')
        .upsert(effortsToInsert, { onConflict: 'strava_effort_id' });

      if (batchError) {
        console.error('[Sync] Failed to batch store efforts:', batchError);
      } else {
        syncResults.segmentEfforts.stored += efforts.length;
      }

      // Find most recent effort
      const mostRecentEffort = efforts.reduce((recent: any, current: any) =>
        new Date(current.start_date) > new Date(recent.start_date) ? current : recent
      );

      // Format dates for display
      const formatDateShort = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      };

      console.log(`[Sync] ${segmentSlug}: ${efforts.length} efforts, best: ${secondsToDisplay(bestEffort.elapsed_time)}`);

      // Update progress with results for this segment
      segmentsProcessed++;
      await updateSyncProgress(supabase, user.id, {
        step: 'segment_efforts',
        current_segment: segmentSlug,
        current_segment_name: segmentName,
        segments_complete: segmentsProcessed,
        segments_total: CLUB_SEGMENT_IDS.length,
        efforts_found: efforts.length,
        best_time_display: secondsToDisplay(bestEffort.elapsed_time),
        best_date: formatDateShort(bestEffort.start_date),
        most_recent_date: formatDateShort(mostRecentEffort.start_date),
        message: `${efforts.length} attempts. Best: ${secondsToDisplay(bestEffort.elapsed_time)}`,
      });
    } catch (err) {
      console.error(`[Sync] Error fetching segment ${segmentId}:`, err);
      syncResults.segmentEfforts.errors.push(`Segment ${segmentId}: ${err}`);
      segmentsProcessed++;
    }
  }

  // -------------------------------------------------------------------------
  // Step 2: Fetch and store activities (2008-2019 only)
  // -------------------------------------------------------------------------
  console.log('[Sync] Fetching activities (2008-2019)...');

  // Update progress: starting activities
  await updateSyncProgress(supabase, user.id, {
    step: 'activities',
    segments_complete: CLUB_SEGMENT_IDS.length,
    segments_total: CLUB_SEGMENT_IDS.length,
    message: 'Searching your ride history...',
  });

  // Date range: Jan 1, 2008 to Dec 31, 2019
  const AFTER_DATE = Math.floor(new Date('2008-01-01').getTime() / 1000);
  const BEFORE_DATE = Math.floor(new Date('2020-01-01').getTime() / 1000);

  let page = 1;
  let hasMore = true;
  let totalDistance = 0;
  let totalElevation = 0;
  let totalMovingTime = 0; // in seconds
  let totalRides = 0;
  let earliestRide: string | null = null;
  let latestRide: string | null = null;

  while (hasMore && page <= 10) { // Max 10 pages = 1000 activities
    try {
      const activities = await getActivities(token, {
        page,
        perPage: 100,
        after: AFTER_DATE,
        before: BEFORE_DATE,
      });
      syncResults.activities.fetched += activities.length;

      if (activities.length === 0) {
        hasMore = false;
        break;
      }

      // Process activities and build batch insert array
      const activitiesToInsert = [];
      for (const activity of activities) {
        // Only store rides
        if (activity.type !== 'Ride') continue;

        totalRides++;
        const distanceMi = metersToMiles(activity.distance);
        const elevationFt = metersToFeet(activity.total_elevation_gain);

        totalDistance += distanceMi;
        totalElevation += elevationFt;
        totalMovingTime += activity.moving_time || 0;

        // Track earliest/latest ride
        const rideDate = activity.start_date_local || activity.start_date;
        if (!earliestRide || rideDate < earliestRide) earliestRide = rideDate;
        if (!latestRide || rideDate > latestRide) latestRide = rideDate;

        activitiesToInsert.push({
          user_id: user.id,
          strava_activity_id: activity.id,
          name: activity.name,
          distance_mi: distanceMi,
          moving_time_seconds: activity.moving_time,
          elapsed_time_seconds: activity.elapsed_time,
          total_elevation_gain_ft: elevationFt,
          start_date: activity.start_date,
          start_date_local: activity.start_date_local,
          average_speed_mph: activity.average_speed ? Math.round(metersToMiles(activity.average_speed * 3600) * 10) / 10 : null,
          max_speed_mph: activity.max_speed ? Math.round(metersToMiles(activity.max_speed * 3600) * 10) / 10 : null,
          average_watts: activity.average_watts ? Math.round(activity.average_watts) : null,
          kilojoules: activity.kilojoules ? Math.round(activity.kilojoules) : null,
          suffer_score: activity.suffer_score ? Math.round(activity.suffer_score) : null,
        });
      }

      // Batch insert all activities from this page
      if (activitiesToInsert.length > 0) {
        const { error: batchError } = await supabase
          .from('activities')
          .upsert(activitiesToInsert, { onConflict: 'strava_activity_id' });

        if (batchError) {
          console.error('[Sync] Failed to batch store activities:', batchError);
        } else {
          syncResults.activities.stored += activitiesToInsert.length;
        }
      }

      console.log(`[Sync] Page ${page}: ${activities.length} activities`);

      // Update progress after each page
      const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      };

      // Calculate hours in saddle
      const totalHours = Math.round(totalMovingTime / 3600);

      await updateSyncProgress(supabase, user.id, {
        step: 'activities',
        activities_found: totalRides,
        activities_page: page,
        activities_pages_total: 10,
        total_distance: Math.round(totalDistance).toLocaleString(),
        total_elevation: Math.round(totalElevation).toLocaleString(),
        total_hours: totalHours.toLocaleString(),
        first_ride: earliestRide ? formatDate(earliestRide) : undefined,
        last_ride: latestRide ? formatDate(latestRide) : undefined,
        message: `${totalRides.toLocaleString()} rides found`,
      });

      page++;

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (err) {
      console.error(`[Sync] Error fetching activities page ${page}:`, err);
      syncResults.activities.errors.push(`Page ${page}: ${err}`);
      break;
    }
  }

  // Update progress with activity totals
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  if (totalRides > 0) {
    await updateSyncProgress(supabase, user.id, {
      step: 'activities',
      activities_found: totalRides,
      total_distance: Math.round(totalDistance).toLocaleString(),
      first_ride: earliestRide ? formatDate(earliestRide) : undefined,
      last_ride: latestRide ? formatDate(latestRide) : undefined,
      message: `Found ${totalRides.toLocaleString()} rides`,
    });
  }

  // -------------------------------------------------------------------------
  // Step 3: Fetch KOMs/QOMs
  // -------------------------------------------------------------------------
  console.log('[Sync] Fetching KOMs...');

  let komCount = 0;
  const komsData: Array<{
    segment_id: number;
    segment_name: string;
    kom_type: 'kom' | 'qom';
    time_seconds: number;
    time_display: string;
  }> = [];

  try {
    // Fetch all KOMs (paginated)
    let komPage = 1;
    let hasMoreKoms = true;

    while (hasMoreKoms && komPage <= 5) {
      const koms = await getAthleteKoms(token, user.strava_id, { page: komPage, perPage: 100 });
      syncResults.koms.fetched += koms.length;

      if (koms.length === 0) {
        hasMoreKoms = false;
        break;
      }

      for (const kom of koms) {
        komCount++;
        komsData.push({
          segment_id: kom.segment?.id || kom.id,
          segment_name: kom.segment?.name || kom.name || 'Unknown Segment',
          kom_type: kom.kom_type === 'qom' ? 'qom' : 'kom',
          time_seconds: kom.elapsed_time || kom.pr_elapsed_time || 0,
          time_display: secondsToDisplay(kom.elapsed_time || kom.pr_elapsed_time || 0),
        });
      }

      komPage++;

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`[Sync] Found ${komCount} KOMs/QOMs`);

    // Store KOMs in database
    if (komsData.length > 0) {
      // Delete existing KOMs for this user
      await supabase
        .from('athlete_koms')
        .delete()
        .eq('user_id', user.id);

      // Insert new KOMs
      const komsToInsert = komsData.map(kom => ({
        user_id: user.id,
        strava_segment_id: kom.segment_id,
        segment_name: kom.segment_name,
        kom_type: kom.kom_type,
        time_seconds: kom.time_seconds,
        time_display: kom.time_display,
      }));

      const { error: komError } = await supabase
        .from('athlete_koms')
        .insert(komsToInsert);

      if (komError) {
        console.error('[Sync] Failed to store KOMs:', komError);
        syncResults.koms.errors.push(`Failed to store: ${komError.message}`);
      } else {
        syncResults.koms.stored = komsData.length;
      }
    }
  } catch (err) {
    console.error('[Sync] Error fetching KOMs:', err);
    syncResults.koms.errors.push(`Fetch error: ${err}`);
  }

  // -------------------------------------------------------------------------
  // Step 4: Update user aggregate stats
  // -------------------------------------------------------------------------
  console.log('[Sync] Updating user stats...');

  // Update progress: generating greatest hits
  await updateSyncProgress(supabase, user.id, {
    step: 'greatest_hits',
    activities_found: totalRides,
    total_distance: Math.round(totalDistance).toLocaleString(),
    message: 'Generating your greatest hits...',
  });

  // Store user stats (but don't mark complete yet - greatest hits still pending)
  const userStats = {
    total_rides: totalRides,
    total_distance_mi: Math.round(totalDistance * 100) / 100,
    total_elevation_ft: Math.round(totalElevation),
    member_since: earliestRide ? earliestRide.split('T')[0] : null,
    last_ride: latestRide ? latestRide.split('T')[0] : null,
    kom_count: komCount,
    last_sync_at: new Date().toISOString(),
    // sync_status stays 'syncing' until after greatest hits
  };

  const { error: updateError } = await supabase
    .from('users')
    .update(userStats)
    .eq('id', user.id);

  if (updateError) {
    console.error('[Sync] Failed to update user stats:', updateError);
  } else {
    syncResults.userStats = {
      total_rides: userStats.total_rides,
      total_distance_mi: userStats.total_distance_mi,
      total_elevation_ft: userStats.total_elevation_ft,
      member_since: userStats.member_since,
      last_ride: userStats.last_ride,
      kom_count: userStats.kom_count,
    };
    console.log('[Sync] User stats updated:', userStats);
  }

  // -------------------------------------------------------------------------
  // Step 5: Ghost → Verified leaderboard matching
  // -------------------------------------------------------------------------
  console.log('[Sync] Running leaderboard matching...');

  // Fetch existing ghost entries
  const { data: ghostEntries, error: ghostError } = await supabase
    .from('leaderboard_entries')
    .select('*')
    .eq('status', 'ghost');

  if (ghostError) {
    console.error('[Sync] Failed to fetch ghosts:', ghostError);
  } else if (ghostEntries && bestEffortPerSegment.size > 0) {
    const userInfo = {
      id: user.id,
      strava_id: user.strava_id,
      name: user.name,
      first_name: user.first_name,
      last_name: user.last_name,
      profile_pic: user.profile_pic,
    };

    const updates = processUserEfforts(userInfo, bestEffortPerSegment, ghostEntries);

    for (const update of updates) {
      if (update.action === 'verified_ghost' && update.ghost_id) {
        // Upgrade ghost to verified
        const { error } = await supabase
          .from('leaderboard_entries')
          .update({
            status: 'verified',
            user_id: user.id,
            profile_pic: user.profile_pic,
            time_seconds: update.time_seconds,
            time_display: update.time_display,
          })
          .eq('id', update.ghost_id);

        if (!error) syncResults.leaderboard.verified++;
      } else if (update.action === 'updated_ghost' && update.ghost_id) {
        // Update ghost with new time
        const { error } = await supabase
          .from('leaderboard_entries')
          .update({
            status: 'verified',
            user_id: user.id,
            profile_pic: user.profile_pic,
            time_seconds: update.time_seconds,
            time_display: update.time_display,
          })
          .eq('id', update.ghost_id);

        if (!error) syncResults.leaderboard.updated++;
      } else if (update.action === 'new_entry') {
        // Insert new entry
        const { error } = await supabase
          .from('leaderboard_entries')
          .insert({
            segment_id: update.segment_id,
            rider_name: user.name,
            time_seconds: update.time_seconds,
            time_display: update.time_display,
            date: bestEffortPerSegment.get(update.segment_id)?.start_date?.split('T')[0] || null,
            status: 'verified',
            user_id: user.id,
            profile_pic: user.profile_pic,
            rank: 0, // Will be recalculated
          });

        if (!error) syncResults.leaderboard.newEntries++;
      }
    }

    // Recalculate ranks for affected segments
    const affectedSegments = new Set(updates.map(u => u.segment_id));
    for (const segmentId of affectedSegments) {
      const { data: entries } = await supabase
        .from('leaderboard_entries')
        .select('id, time_seconds, status')
        .eq('segment_id', segmentId);

      if (entries) {
        const ranks = calculateRanks(entries);
        for (const [entryId, rankData] of ranks) {
          await supabase
            .from('leaderboard_entries')
            .update({
              rank: rankData.rank,
              gap_seconds: rankData.gap_seconds,
              gap_display: rankData.gap_display,
            })
            .eq('id', entryId);
        }
      }
    }

    console.log('[Sync] Leaderboard updates:', syncResults.leaderboard);
  }

  // -------------------------------------------------------------------------
  // Step 6: Generate Greatest Hits
  // -------------------------------------------------------------------------
  console.log('[Sync] Generating greatest hits...');

  try {
    // Fetch activities from database
    const { data: userActivities } = await supabase
      .from('activities')
      .select('strava_activity_id, name, distance_mi, moving_time_seconds, total_elevation_gain_ft, start_date_local, average_speed_mph, average_watts')
      .eq('user_id', user.id);

    // Fetch segment efforts from database
    const { data: userEfforts } = await supabase
      .from('segment_efforts')
      .select('segment_id, elapsed_time, start_date, pr_rank')
      .eq('user_id', user.id);

    if (userActivities && userEfforts) {
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
        efforts: userEfforts.map(e => ({
          segment_id: e.segment_id,
          segment_name: SEGMENT_NAMES[e.segment_id] || e.segment_id,
          elapsed_time: e.elapsed_time,
          start_date: e.start_date,
          pr_rank: e.pr_rank,
        })),
      };

      // Generate hits (no weather data for now)
      const hits = generateGreatestHits(user.name, activitiesData, effortsData, [], null);

      console.log('[Sync] Generated', hits.length, 'greatest hits');

      // Delete existing hits for this user
      await supabase
        .from('greatest_hits')
        .delete()
        .eq('user_id', user.id);

      // Insert new hits
      if (hits.length > 0) {
        const hitsToInsert = hits.map(hit => ({
          user_id: user.id,
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
          console.error('[Sync] Failed to insert greatest hits:', insertError);
        } else {
          console.log('[Sync] Inserted', hits.length, 'greatest hits');
        }
      }
    }
  } catch (err) {
    console.error('[Sync] Greatest hits generation failed (non-fatal):', err);
  }

  // -------------------------------------------------------------------------
  // Step 7: Mark sync complete
  // -------------------------------------------------------------------------
  await supabase
    .from('users')
    .update({ sync_status: 'complete' })
    .eq('id', user.id);

  // Log sync completion
  await supabase.from('sync_log').insert({
    user_id: user.id,
    status: 'completed',
    details: syncResults,
  });

  console.log('[Sync] Complete!', syncResults);

  return syncResults;
}
