// =============================================================================
// Mission Cycling — Segments API
// =============================================================================
//
// GET /api/segments
// Returns all visible segments with their leaderboards from Supabase
// Falls back to static JSON if Supabase is unavailable
// =============================================================================

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import segmentsData from '@/data/segments.json';

function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

function formatGapDisplay(gapSeconds: number): string {
  const minutes = Math.floor(gapSeconds / 60);
  const seconds = gapSeconds % 60;
  if (minutes > 0) {
    return `+${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  return `+${seconds}s`;
}

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();

    // Fetch segments
    const { data: segmentsDb, error: segmentsError } = await supabase
      .from('segments')
      .select('*')
      .eq('visible', true)
      .order('id');

    if (segmentsError || !segmentsDb || segmentsDb.length === 0) {
      console.log('[Segments API] Using fallback data:', segmentsError?.message);
      return NextResponse.json({ segments: getStaticSegments(), source: 'static' });
    }

    // Fetch all leaderboards
    const { data: leaderboardsDb, error: leaderboardsError } = await supabase
      .from('leaderboard_entries')
      .select('*')
      .order('rank', { ascending: true });

    if (leaderboardsError) {
      console.error('[Segments API] Leaderboard error:', leaderboardsError);
    }

    // Group leaderboards by segment, deduplicating ghost vs verified entries
    // If a rider has both a ghost and verified entry, keep only the verified one
    const leaderboardsBySegment: Record<string, any[]> = {};
    (leaderboardsDb || []).forEach(entry => {
      if (!leaderboardsBySegment[entry.segment_id]) {
        leaderboardsBySegment[entry.segment_id] = [];
      }

      const segmentEntries = leaderboardsBySegment[entry.segment_id];
      const riderName = entry.rider_name?.toLowerCase().trim();

      // Check if we already have an entry for this rider
      const existingIndex = segmentEntries.findIndex(e =>
        e.rider_name?.toLowerCase().trim() === riderName
      );

      if (existingIndex >= 0) {
        const existing = segmentEntries[existingIndex];
        // Keep verified over claimed over ghost
        const statusPriority = { verified: 3, claimed: 2, ghost: 1 };
        const existingPriority = statusPriority[existing.status as keyof typeof statusPriority] || 1;
        const newPriority = statusPriority[entry.status as keyof typeof statusPriority] || 1;

        if (newPriority > existingPriority) {
          // Replace with higher priority entry
          segmentEntries[existingIndex] = entry;
        }
        // Otherwise keep existing (it's higher or equal priority)
      } else {
        // No existing entry for this rider, add it
        segmentEntries.push(entry);
      }
    });

    // Sort each segment's entries by time and take top 10, then re-rank with gaps
    Object.keys(leaderboardsBySegment).forEach(segmentId => {
      const entries = leaderboardsBySegment[segmentId];
      // Sort by time_seconds ascending (fastest first)
      entries.sort((a, b) => a.time_seconds - b.time_seconds);
      const top10 = entries.slice(0, 10);
      const leaderTime = top10[0]?.time_seconds || 0;

      // Re-assign ranks and calculate gaps
      leaderboardsBySegment[segmentId] = top10.map((entry, idx) => {
        const gap = idx === 0 ? null : entry.time_seconds - leaderTime;
        const gapDisplay = gap !== null ? formatGapDisplay(gap) : null;
        return {
          ...entry,
          rank: idx + 1,
          gap_seconds: gap,
          gap_display: gapDisplay,
        };
      });
    });

    // Build response
    const segments = segmentsDb.map(seg => ({
      id: seg.id,
      name: seg.name,
      strava_id: seg.strava_id,
      location: seg.location,
      distance: { km: seg.distance_km, mi: seg.distance_mi },
      elevation: { gain_ft: seg.elevation_gain_ft },
      grade: seg.grade,
      category: seg.category,
      clubMembers: seg.club_members,
      visible: seg.visible,
      mission_cycling_leaderboard: (leaderboardsBySegment[seg.id] || []).map(entry => ({
        id: entry.id,
        rank: entry.rank,
        name: entry.rider_name,
        rider_name: entry.rider_name,
        time: entry.time_display,
        time_seconds: entry.time_seconds,
        time_display: entry.time_display,
        gap_seconds: entry.gap_seconds,
        gap_display: entry.gap_display,
        date: entry.date,
        speed: entry.speed_mph ? `${entry.speed_mph} mi/h` : null,
        speed_mph: entry.speed_mph,
        power: entry.power_watts ? `${entry.power_watts} W` : null,
        power_watts: entry.power_watts,
        status: entry.status || 'ghost',
        claimed: entry.status === 'verified' || entry.status === 'claimed',
        user_id: entry.user_id,
        profile_pic: entry.profile_pic,
      })),
    }));

    // Debug: log first segment's first entry to verify status
    if (segments[0]?.mission_cycling_leaderboard[0]) {
      const firstEntry = segments[0].mission_cycling_leaderboard[0];
      console.log('[Segments API] Sample entry:', {
        name: firstEntry.name,
        status: firstEntry.status,
        claimed: firstEntry.claimed,
      });
    }

    return NextResponse.json({ segments, source: 'supabase' });
  } catch (error) {
    console.error('[Segments API] Error:', error);
    return NextResponse.json({ segments: getStaticSegments(), source: 'static' });
  }
}

function getStaticSegments() {
  return segmentsData.segments
    .filter(s => s.visible)
    .map(seg => ({
      ...seg,
      mission_cycling_leaderboard: seg.mission_cycling_leaderboard.map(entry => ({
        ...entry,
        rider_name: entry.name,
        time_seconds: parseTimeToSeconds(entry.time),
        time_display: entry.time,
        status: 'ghost',
        user_id: null,
        profile_pic: null,
      })),
    }));
}
