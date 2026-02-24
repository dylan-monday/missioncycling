// =============================================================================
// Mission Cycling — Leaderboard Service
// =============================================================================
//
// Manages the hybrid leaderboard:
// - Ghost entries (scraped data, unverified)
// - Claimed entries (user matched by name, not yet confirmed by Strava)
// - Verified entries (user's Strava effort matches the time)
//
// When a user authenticates:
// 1. Fetch their best time per segment from Strava
// 2. Check if a ghost entry exists with a matching name
// 3. If yes: upgrade to verified (or update time if Strava time is different)
// 4. If no ghost match: insert new entry, re-rank
// 5. Recalculate gaps
// =============================================================================

import { secondsToDisplay, metersToMiles, metersToFeet, mpsToMph } from './strava';

// =============================================================================
// Types
// =============================================================================

interface GhostEntry {
  id: string;
  segment_id: string;
  rank: number;
  rider_name: string | null;
  time_seconds: number;
  time_display: string;
  date: string | null;
  status: 'ghost';
}

interface StravaEffort {
  segment_id: string;
  elapsed_time: number; // seconds
  start_date: string;
  average_watts: number | null;
}

interface UserInfo {
  id: string; // Supabase user ID
  strava_id: number;
  name: string;
  first_name: string;
  last_name: string;
  profile_pic: string | null;
}

export interface LeaderboardUpdate {
  action: 'verified_ghost' | 'updated_ghost' | 'new_entry' | 'no_change';
  segment_id: string;
  old_rank: number | null;
  new_rank: number;
  time_seconds: number;
  time_display: string;
  ghost_id: string | null; // ID of the ghost that was claimed
}

// =============================================================================
// Core: Process a user's segment efforts against the leaderboard
// =============================================================================

export function processUserEfforts(
  user: UserInfo,
  bestEffortPerSegment: Map<string, StravaEffort>,
  existingGhosts: GhostEntry[]
): LeaderboardUpdate[] {
  const updates: LeaderboardUpdate[] = [];

  for (const [segmentId, effort] of bestEffortPerSegment) {
    const segmentGhosts = existingGhosts.filter(g => g.segment_id === segmentId);
    const timeDisplay = secondsToDisplay(effort.elapsed_time);

    // Try to find a matching ghost by name
    const nameMatch = findNameMatch(user, segmentGhosts);

    if (nameMatch) {
      // Ghost found with matching name
      const timeDiff = Math.abs(nameMatch.time_seconds - effort.elapsed_time);

      if (timeDiff < 5) {
        // Times match closely — verify the ghost
        updates.push({
          action: 'verified_ghost',
          segment_id: segmentId,
          old_rank: nameMatch.rank,
          new_rank: nameMatch.rank, // Rank unchanged
          time_seconds: effort.elapsed_time,
          time_display: timeDisplay,
          ghost_id: nameMatch.id,
        });
      } else {
        // Name matches but time is different — update with Strava time
        // (Strava is authoritative)
        updates.push({
          action: 'updated_ghost',
          segment_id: segmentId,
          old_rank: nameMatch.rank,
          new_rank: -1, // Will be recalculated
          time_seconds: effort.elapsed_time,
          time_display: timeDisplay,
          ghost_id: nameMatch.id,
        });
      }
    } else {
      // No ghost match — this is a new entry
      updates.push({
        action: 'new_entry',
        segment_id: segmentId,
        old_rank: null,
        new_rank: -1, // Will be calculated after insert
        time_seconds: effort.elapsed_time,
        time_display: timeDisplay,
        ghost_id: null,
      });
    }
  }

  return updates;
}

// =============================================================================
// Name Matching
// =============================================================================

/**
 * Fuzzy match a user to ghost entries by name.
 * Strava names can vary: "John Smith" vs "John S." vs "J Smith"
 */
function findNameMatch(user: UserInfo, ghosts: GhostEntry[]): GhostEntry | null {
  const userFirst = normalize(user.first_name);
  const userLast = normalize(user.last_name);
  const userFull = normalize(user.name);

  for (const ghost of ghosts) {
    if (!ghost.rider_name) continue;
    const ghostName = normalize(ghost.rider_name);

    // Exact match
    if (ghostName === userFull) return ghost;

    // First + Last initial (Strava club activity format: "John S.")
    const firstPlusInitial = `${userFirst} ${userLast.charAt(0)}`;
    if (ghostName === firstPlusInitial || ghostName === `${firstPlusInitial}.`) return ghost;

    // First name + full last name
    if (ghostName === `${userFirst} ${userLast}`) return ghost;

    // Handle reversed names
    if (ghostName === `${userLast} ${userFirst}`) return ghost;

    // Partial match: both first and last name appear in ghost name
    if (ghostName.includes(userFirst) && ghostName.includes(userLast)) return ghost;

    // Levenshtein distance for typos (threshold: 2)
    if (levenshtein(ghostName, userFull) <= 2) return ghost;
  }

  return null;
}

function normalize(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

// Simple Levenshtein distance
function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// =============================================================================
// Rank Calculation
// =============================================================================

interface RankableEntry {
  id: string;
  time_seconds: number;
  status: string;
}

export function calculateRanks(entries: RankableEntry[]): Map<string, { rank: number; gap_seconds: number | null; gap_display: string | null }> {
  const sorted = [...entries].sort((a, b) => a.time_seconds - b.time_seconds);
  const leaderTime = sorted.length > 0 ? sorted[0].time_seconds : 0;

  const result = new Map<string, { rank: number; gap_seconds: number | null; gap_display: string | null }>();

  sorted.forEach((entry, index) => {
    const rank = index + 1;
    const gap = rank === 1 ? null : entry.time_seconds - leaderTime;
    const gapDisplay = gap !== null ? `+${secondsToDisplay(gap)}` : null;

    result.set(entry.id, { rank, gap_seconds: gap, gap_display: gapDisplay });
  });

  return result;
}

// =============================================================================
// "Find Me" View — Get surrounding riders
// =============================================================================

export interface FindMeResult {
  userRank: number;
  userEntry: RankableEntry & { rider_name: string };
  surroundingEntries: (RankableEntry & {
    rank: number;
    rider_name: string | null;
    status: string;
    gap_display: string | null;
    isCurrentUser: boolean;
  })[];
  totalEntries: number;
  gapToTop10: number | null; // Seconds needed to crack top 10
}

export function buildFindMeView(
  allEntries: (RankableEntry & { rider_name: string | null; user_id: string | null; status: string })[],
  userId: string,
  contextSize: number = 5 // Show N above and N below
): FindMeResult | null {
  const sorted = [...allEntries].sort((a, b) => a.time_seconds - b.time_seconds);
  const leaderTime = sorted[0]?.time_seconds || 0;

  // Find the user
  const userIndex = sorted.findIndex(e => e.user_id === userId);
  if (userIndex === -1) return null;

  const userEntry = sorted[userIndex];
  const userRank = userIndex + 1;

  // Get surrounding entries
  const startIndex = Math.max(0, userIndex - contextSize);
  const endIndex = Math.min(sorted.length, userIndex + contextSize + 1);
  const surrounding = sorted.slice(startIndex, endIndex);

  const surroundingWithMeta = surrounding.map((entry, i) => {
    const rank = startIndex + i + 1;
    const gap = entry.time_seconds - leaderTime;
    return {
      ...entry,
      rank,
      gap_display: rank === 1 ? null : `+${secondsToDisplay(gap)}`,
      isCurrentUser: entry.user_id === userId,
    };
  });

  // Gap to top 10
  const tenth = sorted[9];
  const gapToTop10 = tenth && userRank > 10
    ? userEntry.time_seconds - tenth.time_seconds
    : null;

  return {
    userRank,
    userEntry: { ...userEntry, rider_name: userEntry.rider_name || 'Unknown' },
    surroundingEntries: surroundingWithMeta,
    totalEntries: sorted.length,
    gapToTop10,
  };
}
