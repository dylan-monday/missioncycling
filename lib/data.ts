// =============================================================================
// Mission Cycling — Data Fetching Layer
// =============================================================================
//
// Fetches segment and leaderboard data from Supabase with fallback to static JSON.
// =============================================================================

import { createClientSupabaseClient } from './supabase';
import segmentsData from '@/data/segments.json';

export interface LeaderboardEntry {
  id?: string;
  rank: number;
  rider_name: string | null;
  time_seconds: number;
  time_display: string;
  gap_seconds: number | null;
  gap_display: string | null;
  date: string | null;
  speed_mph: number | null;
  power_watts: number | null;
  status: 'ghost' | 'claimed' | 'verified';
  user_id: string | null;
  profile_pic: string | null;
}

export interface Segment {
  id: string;
  name: string;
  strava_id: number;
  location: string;
  distance: { km: number; mi: number };
  elevation: { gain_m?: number; gain_ft: number };
  grade: number;
  category: string;
  clubMembers: number;
  clubBestTime?: string;
  visible: boolean;
  mission_cycling_leaderboard: LeaderboardEntry[];
}

// Cache for segments to avoid repeated fetches
let segmentsCache: Segment[] | null = null;
let segmentsCacheTime = 0;
const CACHE_TTL = 60000; // 1 minute

/**
 * Fetch leaderboard entries for a segment from Supabase
 */
export async function getSegmentLeaderboard(segmentId: string): Promise<LeaderboardEntry[]> {
  try {
    const supabase = createClientSupabaseClient();

    const { data, error } = await supabase
      .from('leaderboard_entries')
      .select('*')
      .eq('segment_id', segmentId)
      .order('rank', { ascending: true })
      .limit(10);

    if (error) {
      console.error('[Data] Failed to fetch leaderboard:', error);
      return getFallbackLeaderboard(segmentId);
    }

    if (!data || data.length === 0) {
      return getFallbackLeaderboard(segmentId);
    }

    return data.map(entry => ({
      id: entry.id,
      rank: entry.rank,
      rider_name: entry.rider_name,
      time_seconds: entry.time_seconds,
      time_display: entry.time_display,
      gap_seconds: entry.gap_seconds,
      gap_display: entry.gap_display,
      date: entry.date,
      speed_mph: entry.speed_mph,
      power_watts: entry.power_watts,
      status: entry.status || 'ghost',
      user_id: entry.user_id,
      profile_pic: entry.profile_pic,
    }));
  } catch (error) {
    console.error('[Data] Error fetching leaderboard:', error);
    return getFallbackLeaderboard(segmentId);
  }
}

/**
 * Fallback to static JSON data
 */
function getFallbackLeaderboard(segmentId: string): LeaderboardEntry[] {
  const segment = segmentsData.segments.find(s => s.id === segmentId);
  if (!segment) return [];

  return segment.mission_cycling_leaderboard.map(entry => ({
    rank: entry.rank,
    rider_name: entry.name,
    time_seconds: parseTimeToSeconds(entry.time),
    time_display: entry.time,
    gap_seconds: null,
    gap_display: null,
    date: entry.date,
    speed_mph: entry.speed ? parseFloat(entry.speed) : null,
    power_watts: entry.power ? parseInt(entry.power) : null,
    status: 'ghost' as const,
    user_id: null,
    profile_pic: null,
  }));
}

/**
 * Get all visible segments with their leaderboards
 */
export async function getSegmentsWithLeaderboards(): Promise<Segment[]> {
  // Check cache
  if (segmentsCache && Date.now() - segmentsCacheTime < CACHE_TTL) {
    return segmentsCache;
  }

  try {
    const supabase = createClientSupabaseClient();

    // Fetch segments
    const { data: segmentsDb, error: segmentsError } = await supabase
      .from('segments')
      .select('*')
      .eq('visible', true)
      .order('id');

    if (segmentsError || !segmentsDb || segmentsDb.length === 0) {
      console.log('[Data] Using fallback segment data');
      return getStaticSegments();
    }

    // Fetch all leaderboards in parallel
    const segmentsWithLeaderboards = await Promise.all(
      segmentsDb.map(async (seg) => {
        const leaderboard = await getSegmentLeaderboard(seg.id);
        return {
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
          mission_cycling_leaderboard: leaderboard,
        };
      })
    );

    // Update cache
    segmentsCache = segmentsWithLeaderboards;
    segmentsCacheTime = Date.now();

    return segmentsWithLeaderboards;
  } catch (error) {
    console.error('[Data] Error fetching segments:', error);
    return getStaticSegments();
  }
}

/**
 * Get static segments from JSON (fallback)
 */
function getStaticSegments(): Segment[] {
  return segmentsData.segments
    .filter(s => s.visible)
    .map(seg => ({
      id: seg.id,
      name: seg.name,
      strava_id: seg.strava_id,
      location: seg.location,
      distance: seg.distance,
      elevation: seg.elevation,
      grade: seg.grade,
      category: seg.category,
      clubMembers: seg.clubMembers,
      clubBestTime: seg.clubBestTime,
      visible: seg.visible,
      mission_cycling_leaderboard: seg.mission_cycling_leaderboard.map(entry => ({
        rank: entry.rank,
        rider_name: entry.name,
        time_seconds: parseTimeToSeconds(entry.time),
        time_display: entry.time,
        gap_seconds: null,
        gap_display: null,
        date: entry.date,
        speed_mph: entry.speed ? parseFloat(entry.speed) : null,
        power_watts: entry.power ? parseInt(entry.power) : null,
        status: 'ghost' as const,
        user_id: null,
        profile_pic: null,
      })),
    }));
}

function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

/**
 * Invalidate the segments cache (call after sync or data changes)
 */
export function invalidateSegmentsCache() {
  segmentsCache = null;
  segmentsCacheTime = 0;
}
