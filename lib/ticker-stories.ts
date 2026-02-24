// =============================================================================
// Mission Cycling — Ticker Story Generator
// =============================================================================
//
// Three tiers of ticker content:
//
// Tier 1: Auto-generated from Strava data (segment records, club stats)
// Tier 2: Cross-referenced with weather data (rides in extreme conditions)
// Tier 3: Manually curated club lore (interstitials + ticker)
//
// Stories are generated after each user sync and stored in Supabase.
// The ticker engine pulls active stories weighted by relevance.
// =============================================================================

import { secondsToDisplay } from './strava';

// Types matching the Supabase schema
interface TickerStory {
  tier: 1 | 2 | 3;
  category: string;
  text: string;
  segment_id: string | null;
  weight: number;
  generated: boolean;
  source_data: Record<string, any> | null;
}

// Input data shapes
interface LeaderboardEntry {
  segment_id: string;
  segment_name: string;
  rank: number;
  rider_name: string | null;
  time_seconds: number;
  time_display: string;
  date: string | null;
  status: string;
}

interface ActivityRow {
  user_name: string;
  distance_mi: number;
  total_elevation_gain_ft: number;
  start_date_local: string;
  ride_date: string;
}

interface SegmentEffortRow {
  user_name: string;
  segment_id: string;
  segment_name: string;
  effort_count: number;
  best_time: number;
  first_effort_date: string;
  latest_effort_date: string;
}

interface WeatherDay {
  date: string;
  temperature_max_f: number;
  temperature_min_f: number;
  precipitation_inches: number;
  wind_gusts_max_mph: number;
}

// =============================================================================
// Tier 1: Auto-generated from Strava data
// =============================================================================

export function generateTier1Stories(
  leaderboard: LeaderboardEntry[],
  effortStats: SegmentEffortRow[],
  activities: ActivityRow[]
): TickerStory[] {
  const stories: TickerStory[] = [];

  // --- Segment Records ---
  const segmentGroups = groupBy(leaderboard, 'segment_id');

  for (const [segId, entries] of Object.entries(segmentGroups)) {
    const sorted = entries.sort((a, b) => a.rank - b.rank);
    const leader = sorted[0];
    if (!leader || !leader.rider_name) continue;

    // Record holder
    stories.push({
      tier: 1,
      category: 'segment_record',
      text: `${leader.segment_name} Record: ${leader.rider_name} — ${leader.time_display}`,
      segment_id: segId,
      weight: 8,
      generated: true,
      source_data: { entry_rank: 1 },
    });

    // Closest battle (smallest gap between consecutive riders)
    for (let i = 0; i < sorted.length - 1; i++) {
      const gap = sorted[i + 1].time_seconds - sorted[i].time_seconds;
      if (gap > 0 && gap < 5 && sorted[i].rider_name && sorted[i + 1].rider_name) {
        stories.push({
          tier: 1,
          category: 'rivalry',
          text: `Closest battle on ${leader.segment_name}: ${sorted[i].rider_name} and ${sorted[i + 1].rider_name} separated by just ${gap.toFixed(0)} seconds`,
          segment_id: segId,
          weight: 7,
          generated: true,
          source_data: { riders: [sorted[i].rider_name, sorted[i + 1].rider_name], gap },
        });
        break; // Just the closest one per segment
      }
    }

    // Unclaimed spots
    const unclaimed = entries.filter(e => e.status === 'ghost').length;
    if (unclaimed > 0) {
      stories.push({
        tier: 1,
        category: 'promo',
        text: `${unclaimed} unclaimed spots on ${leader.segment_name} — Connect Strava to claim yours`,
        segment_id: segId,
        weight: 4,
        generated: true,
        source_data: { unclaimed_count: unclaimed },
      });
    }
  }

  // --- Most attempts on a segment ---
  const topAttempts = [...effortStats].sort((a, b) => b.effort_count - a.effort_count);
  if (topAttempts.length > 0) {
    const top = topAttempts[0];
    stories.push({
      tier: 1,
      category: 'club_stat',
      text: `${top.user_name} has ridden ${top.segment_name} ${top.effort_count} times. Glutton for punishment.`,
      segment_id: top.segment_id,
      weight: 6,
      generated: true,
      source_data: { user: top.user_name, count: top.effort_count },
    });
  }

  // --- Club-wide stats ---
  if (activities.length > 0) {
    const totalMiles = activities.reduce((sum, a) => sum + a.distance_mi, 0);
    const totalElevation = activities.reduce((sum, a) => sum + a.total_elevation_gain_ft, 0);
    const uniqueRiders = new Set(activities.map(a => a.user_name)).size;

    stories.push({
      tier: 1,
      category: 'club_stat',
      text: `Combined club mileage: ${Math.round(totalMiles).toLocaleString()} miles and counting`,
      segment_id: null,
      weight: 5,
      generated: true,
      source_data: { total_miles: totalMiles },
    });

    const everests = Math.floor(totalElevation / 29032);
    if (everests > 0) {
      stories.push({
        tier: 1,
        category: 'club_stat',
        text: `Mission Cycling has collectively climbed ${everests}× the height of Everest`,
        segment_id: null,
        weight: 6,
        generated: true,
        source_data: { total_elevation: totalElevation, everests },
      });
    }

    stories.push({
      tier: 1,
      category: 'club_stat',
      text: `${uniqueRiders} riders synced and verified. Are you on the board yet?`,
      segment_id: null,
      weight: 3,
      generated: true,
      source_data: { rider_count: uniqueRiders },
    });

    // Longest single ride
    const longestRide = activities.reduce((a, b) => (a.distance_mi > b.distance_mi ? a : b));
    if (longestRide.distance_mi > 50) {
      stories.push({
        tier: 1,
        category: 'club_stat',
        text: `Longest club ride ever: ${longestRide.user_name} — ${longestRide.distance_mi.toFixed(1)} miles on ${formatDate(longestRide.start_date_local)}`,
        segment_id: null,
        weight: 7,
        generated: true,
        source_data: { user: longestRide.user_name, miles: longestRide.distance_mi },
      });
    }

    // Most elevation in a single ride
    const biggestClimb = activities.reduce((a, b) =>
      a.total_elevation_gain_ft > b.total_elevation_gain_ft ? a : b
    );
    if (biggestClimb.total_elevation_gain_ft > 3000) {
      stories.push({
        tier: 1,
        category: 'club_stat',
        text: `Most elevation in a single ride: ${biggestClimb.user_name} — ${biggestClimb.total_elevation_gain_ft.toLocaleString()} ft`,
        segment_id: null,
        weight: 7,
        generated: true,
        source_data: { user: biggestClimb.user_name, elevation: biggestClimb.total_elevation_gain_ft },
      });
    }
  }

  // --- Evergreen ---
  stories.push({
    tier: 1,
    category: 'tagline',
    text: 'Premium Suffering Since 2008',
    segment_id: null,
    weight: 10,
    generated: true,
    source_data: null,
  });

  return stories;
}

// =============================================================================
// Tier 2: Cross-referenced with weather data
// =============================================================================

export function generateTier2Stories(
  activities: ActivityRow[],
  weather: WeatherDay[]
): TickerStory[] {
  const stories: TickerStory[] = [];
  const weatherMap = new Map(weather.map(w => [w.date, w]));

  // Find rides on extreme weather days
  const ridesByDate = groupBy(activities, 'ride_date');

  // Coldest day with a ride
  let coldestRide: { activity: ActivityRow; weather: WeatherDay } | null = null;
  // Wettest ride
  let wettestRide: { activity: ActivityRow; weather: WeatherDay } | null = null;
  // Windiest ride
  let windiestRide: { activity: ActivityRow; weather: WeatherDay } | null = null;
  // Hottest ride
  let hottestRide: { activity: ActivityRow; weather: WeatherDay } | null = null;

  for (const activity of activities) {
    const w = weatherMap.get(activity.ride_date);
    if (!w || activity.distance_mi < 10) continue;

    if (!coldestRide || w.temperature_max_f < coldestRide.weather.temperature_max_f) {
      coldestRide = { activity, weather: w };
    }
    if (!wettestRide || w.precipitation_inches > wettestRide.weather.precipitation_inches) {
      wettestRide = { activity, weather: w };
    }
    if (!windiestRide || w.wind_gusts_max_mph > windiestRide.weather.wind_gusts_max_mph) {
      windiestRide = { activity, weather: w };
    }
    if (!hottestRide || w.temperature_max_f > hottestRide.weather.temperature_max_f) {
      hottestRide = { activity, weather: w };
    }
  }

  if (coldestRide && coldestRide.weather.temperature_max_f < 50) {
    stories.push({
      tier: 2,
      category: 'historical',
      text: `Coldest club ride: ${coldestRide.activity.user_name} — ${coldestRide.activity.distance_mi.toFixed(1)} miles at ${coldestRide.weather.temperature_max_f}°F on ${formatDate(coldestRide.activity.start_date_local)}`,
      segment_id: null,
      weight: 8,
      generated: true,
      source_data: {
        user: coldestRide.activity.user_name,
        temp: coldestRide.weather.temperature_max_f,
        date: coldestRide.activity.ride_date,
      },
    });
  }

  if (wettestRide && wettestRide.weather.precipitation_inches > 0.5) {
    stories.push({
      tier: 2,
      category: 'historical',
      text: `Wettest ride ever: ${wettestRide.activity.user_name} — ${wettestRide.activity.distance_mi.toFixed(1)} miles in ${wettestRide.weather.precipitation_inches.toFixed(1)}" of rain`,
      segment_id: null,
      weight: 8,
      generated: true,
      source_data: {
        user: wettestRide.activity.user_name,
        rain: wettestRide.weather.precipitation_inches,
        date: wettestRide.activity.ride_date,
      },
    });
  }

  if (windiestRide && windiestRide.weather.wind_gusts_max_mph > 25) {
    stories.push({
      tier: 2,
      category: 'historical',
      text: `Windiest ride: ${windiestRide.activity.user_name} — ${windiestRide.activity.distance_mi.toFixed(1)} miles in ${windiestRide.weather.wind_gusts_max_mph.toFixed(0)} mph gusts`,
      segment_id: null,
      weight: 7,
      generated: true,
      source_data: {
        user: windiestRide.activity.user_name,
        wind: windiestRide.weather.wind_gusts_max_mph,
        date: windiestRide.activity.ride_date,
      },
    });
  }

  // --- Year-specific superlatives ---
  for (let year = 2008; year <= 2022; year++) {
    const yearActivities = activities.filter(
      a => new Date(a.start_date_local).getFullYear() === year
    );
    if (yearActivities.length === 0) continue;

    // Most rides in this year
    const rideCountByUser = new Map<string, number>();
    for (const a of yearActivities) {
      rideCountByUser.set(a.user_name, (rideCountByUser.get(a.user_name) || 0) + 1);
    }
    let topRider = '';
    let topCount = 0;
    for (const [name, count] of rideCountByUser) {
      if (count > topCount) {
        topRider = name;
        topCount = count;
      }
    }
    if (topCount > 30) {
      stories.push({
        tier: 2,
        category: 'historical',
        text: `Most rides in ${year}: ${topRider} — ${topCount} rides`,
        segment_id: null,
        weight: 5,
        generated: true,
        source_data: { user: topRider, year, count: topCount },
      });
    }

    // Holiday rides
    const xmasRides = yearActivities.filter(a => {
      const d = new Date(a.start_date_local);
      return d.getMonth() === 11 && d.getDate() === 25;
    });
    if (xmasRides.length > 0) {
      stories.push({
        tier: 2,
        category: 'historical',
        text: `${xmasRides.length} ${xmasRides.length === 1 ? 'rider' : 'riders'} rode on Christmas ${year}. Priorities.`,
        segment_id: null,
        weight: 6,
        generated: true,
        source_data: { year, count: xmasRides.length },
      });
    }
  }

  // --- First and last rides ever ---
  const sortedByDate = [...activities].sort(
    (a, b) => new Date(a.start_date_local).getTime() - new Date(b.start_date_local).getTime()
  );
  if (sortedByDate.length > 0) {
    const first = sortedByDate[0];
    const last = sortedByDate[sortedByDate.length - 1];

    stories.push({
      tier: 2,
      category: 'historical',
      text: `First Mission Cycling ride on record: ${first.user_name} — ${formatDate(first.start_date_local)}`,
      segment_id: null,
      weight: 9,
      generated: true,
      source_data: { user: first.user_name, date: first.ride_date },
    });

    stories.push({
      tier: 2,
      category: 'historical',
      text: `Last Mission Cycling ride logged: ${last.user_name} — ${formatDate(last.start_date_local)}`,
      segment_id: null,
      weight: 9,
      generated: true,
      source_data: { user: last.user_name, date: last.ride_date },
    });
  }

  return stories;
}

// =============================================================================
// Tier 3: Manually curated (loaded from JSON or Supabase)
// =============================================================================

// These are editorial. They come from club knowledge, member interviews,
// and institutional memory. They're the broadcast commentator's notebook.
//
// Store in /data/club-lore.json or directly in the interstitials table.
//
// Examples of what goes here:
// - "The founding ride: October 2008. Three friends. One hill. An idea."
// - "The time 12 riders got lost in the fog on Hawk Hill and ended up in Sausalito"
// - "2019: The year Mission Cycling discovered gravel. And regretted it."
// - "RIP to the countless tubes punctured on Radio Road"
// - "Flour+Water post-ride pasta: the unofficial recovery protocol since 2012"

export const TIER3_TEMPLATE: TickerStory[] = [
  {
    tier: 3,
    category: 'club_lore',
    text: 'The sexiest cycling club on 18th Street — Est. 2008',
    segment_id: null,
    weight: 7,
    generated: false,
    source_data: null,
  },
  {
    tier: 3,
    category: 'club_lore',
    text: '161 members. 8 legendary segments. 14 years of premium suffering.',
    segment_id: null,
    weight: 6,
    generated: false,
    source_data: null,
  },
  // Add more as you collect stories from the club...
];

// =============================================================================
// Ticker Engine (runtime selection)
// =============================================================================

export interface TickerConfig {
  currentSegmentId: string | null;
  recentlyShown: Set<string>; // IDs of recently shown stories
  maxRepeatWindow: number; // Don't repeat within N stories
}

/**
 * Select the next ticker story based on context and weights.
 * Favors segment-specific stories when that segment is active.
 */
export function selectNextStory(
  allStories: (TickerStory & { id: string })[],
  config: TickerConfig
): (TickerStory & { id: string }) | null {
  const eligible = allStories.filter(s => !config.recentlyShown.has(s.id));
  if (eligible.length === 0) return null;

  // Boost weight for current segment stories
  const weighted = eligible.map(s => ({
    ...s,
    effectiveWeight:
      s.weight * (s.segment_id === config.currentSegmentId ? 2.5 : 1),
  }));

  // Weighted random selection
  const totalWeight = weighted.reduce((sum, s) => sum + s.effectiveWeight, 0);
  let random = Math.random() * totalWeight;

  for (const story of weighted) {
    random -= story.effectiveWeight;
    if (random <= 0) return story;
  }

  return weighted[weighted.length - 1];
}

// =============================================================================
// Helpers
// =============================================================================

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of arr) {
    const k = String(item[key]);
    if (!result[k]) result[k] = [];
    result[k].push(item);
  }
  return result;
}
