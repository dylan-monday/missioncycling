/**
 * Markdown parser for Mission Cycling data
 * This utility can be used to parse the mission-cycling-data.md file
 * and generate the JSON data files.
 *
 * Usage: Run this script with Node.js to regenerate data files
 *
 * For now, the data has been manually parsed and stored in /data/segments.json
 */

export interface LeaderboardEntry {
  rank: number;
  name: string | null;
  date: string | null;
  time: string;
  speed: string | null;
  claimed: boolean;
}

export interface Segment {
  id: string;
  name: string;
  strava_id: number;
  url: string;
  location: string;
  distance: {
    km: number;
    mi: number;
  };
  elevation: {
    gain_m: number;
    gain_ft: number;
    lowest_m?: number;
    highest_m?: number;
  };
  grade: number;
  category: string;
  globalEfforts: number;
  globalAthletes: number;
  clubMembers: number;
  clubBestTime: string;
  visible: boolean;
  mission_cycling_leaderboard: LeaderboardEntry[];
}

export interface Club {
  name: string;
  id: number;
  location: string;
  tagline: string;
  memberCount: number;
  era: string;
  website: string;
  stravaUrl: string;
  clubType: string;
  sport: string;
  inviteOnly: boolean;
  primaryColor: string;
  coverPhoto: string;
  avatar: string;
}

/**
 * Parse time string to calculate gaps
 */
export function parseTimeToSeconds(time: string): number {
  if (!time || time === '—') return 0;
  const parts = time.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

/**
 * Format time gap from leader
 */
export function formatGap(leaderTime: string, entryTime: string): string {
  const leaderSeconds = parseTimeToSeconds(leaderTime);
  const entrySeconds = parseTimeToSeconds(entryTime);
  const gap = entrySeconds - leaderSeconds;

  if (gap <= 0) return '';

  const minutes = Math.floor(gap / 60);
  const seconds = gap % 60;

  if (minutes > 0) {
    return `+${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  return `+${seconds}s`;
}

/**
 * Generate a slug from segment name
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
