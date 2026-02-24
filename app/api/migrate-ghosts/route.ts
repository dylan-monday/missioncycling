// =============================================================================
// Mission Cycling — Ghost Data Migration
// =============================================================================
//
// POST /api/migrate-ghosts
// One-time endpoint to migrate ghost leaderboard data from segments.json
// into the leaderboard_entries table in Supabase.
//
// Run this once to seed the database with the scraped leaderboard data.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import segmentsData from '@/data/segments.json';

// Parse time string (e.g., "6:17" or "48:44" or "1:06:08") to seconds
function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 3) {
    // h:mm:ss
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    // m:ss
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

// Parse speed string (e.g., "15.8 mi/h") to number
function parseSpeed(speedStr: string | null): number | null {
  if (!speedStr) return null;
  const match = speedStr.match(/([\d.]+)/);
  return match ? parseFloat(match[1]) : null;
}

// Parse power string (e.g., "464 W") to number
function parsePower(powerStr: string | null): number | null {
  if (!powerStr) return null;
  const match = powerStr.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

export async function POST(request: NextRequest) {
  console.log('[Migrate Ghosts] Starting migration...');

  const supabase = createServerSupabaseClient();
  const results = {
    segments: 0,
    entries: 0,
    errors: [] as string[],
  };

  for (const segment of segmentsData.segments) {
    console.log(`[Migrate Ghosts] Processing ${segment.name}...`);
    results.segments++;

    // First, ensure the segment exists in segments table
    const { error: segmentError } = await supabase
      .from('segments')
      .upsert({
        id: segment.id,
        name: segment.name,
        strava_id: segment.strava_id,
        location: segment.location,
        distance_km: segment.distance.km,
        distance_mi: segment.distance.mi,
        elevation_gain_ft: segment.elevation.gain_ft || segment.elevation.gain_m * 3.28084,
        grade: segment.grade,
        category: segment.category,
        club_members: segment.clubMembers,
        visible: segment.visible,
      }, {
        onConflict: 'id',
      });

    if (segmentError) {
      console.error(`[Migrate Ghosts] Failed to upsert segment ${segment.id}:`, segmentError);
      results.errors.push(`Segment ${segment.id}: ${segmentError.message}`);
    }

    // Get leader time for gap calculation
    const leaderboard = segment.mission_cycling_leaderboard;
    const leaderTimeSeconds = leaderboard.length > 0
      ? parseTimeToSeconds(leaderboard[0].time)
      : 0;

    // Insert leaderboard entries
    for (const entry of leaderboard) {
      const timeSeconds = parseTimeToSeconds(entry.time);
      const gapSeconds = entry.rank === 1 ? null : timeSeconds - leaderTimeSeconds;
      const gapDisplay = gapSeconds !== null
        ? `+${Math.floor(gapSeconds / 60)}:${(gapSeconds % 60).toString().padStart(2, '0')}`
        : null;

      const { error: entryError } = await supabase
        .from('leaderboard_entries')
        .upsert({
          segment_id: segment.id,
          rank: entry.rank,
          rider_name: entry.name,
          time_seconds: timeSeconds,
          time_display: entry.time,
          gap_seconds: gapSeconds,
          gap_display: gapDisplay,
          date: entry.date,
          speed_mph: parseSpeed(entry.speed),
          power_watts: parsePower(entry.power),
          status: 'ghost', // All scraped entries start as ghosts
          user_id: null,
          strava_effort_id: null,
          profile_pic: null,
        }, {
          onConflict: 'segment_id,rank', // Assuming unique constraint on segment_id + rank
          ignoreDuplicates: false,
        });

      if (entryError) {
        // Try without onConflict if the constraint doesn't exist
        const { error: insertError } = await supabase
          .from('leaderboard_entries')
          .insert({
            segment_id: segment.id,
            rank: entry.rank,
            rider_name: entry.name,
            time_seconds: timeSeconds,
            time_display: entry.time,
            gap_seconds: gapSeconds,
            gap_display: gapDisplay,
            date: entry.date,
            speed_mph: parseSpeed(entry.speed),
            power_watts: parsePower(entry.power),
            status: 'ghost',
            user_id: null,
            strava_effort_id: null,
            profile_pic: null,
          });

        if (insertError) {
          console.error(`[Migrate Ghosts] Failed to insert entry:`, insertError);
          results.errors.push(`${segment.id} rank ${entry.rank}: ${insertError.message}`);
        } else {
          results.entries++;
        }
      } else {
        results.entries++;
      }
    }
  }

  console.log('[Migrate Ghosts] Complete!', results);

  return NextResponse.json({
    success: true,
    results,
  });
}
