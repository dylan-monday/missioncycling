// =============================================================================
// Mission Cycling — Greatest Hits Generator
// =============================================================================
//
// After a user authenticates and their data syncs, we analyze their
// activities and segment efforts to find their personal superlatives.
//
// Everyone gets a highlight reel. You don't have to be fast to be interesting.
// =============================================================================

import { secondsToDisplay } from './strava';

interface UserActivities {
  activities: {
    strava_activity_id: number;
    name: string;
    distance_mi: number;
    moving_time_seconds: number;
    total_elevation_gain_ft: number;
    start_date_local: string;
    average_speed_mph: number | null;
    average_watts: number | null;
  }[];
}

interface UserEfforts {
  efforts: {
    segment_id: string;
    segment_name: string;
    elapsed_time: number;
    start_date: string;
    pr_rank: number | null;
  }[];
}

interface WeatherDay {
  date: string;
  temperature_max_f: number;
  temperature_min_f: number;
  precipitation_inches: number;
  wind_gusts_max_mph: number;
}

interface ClubContext {
  total_synced_members: number;
  segment_effort_counts: Record<string, number[]>; // segment_id -> array of effort counts per user
  activity_distances: number[]; // all max distances across users
  activity_elevations: number[]; // all max elevations across users
}

export interface GreatestHitResult {
  category: string;
  title: string;
  description: string;
  stat_value: string;
  stat_label: string;
  segment_id: string | null;
  activity_strava_id: number | null;
  rank_in_club: number | null;
  percentile: number | null;
}

// =============================================================================
// Main Generator
// =============================================================================

export function generateGreatestHits(
  userName: string,
  activities: UserActivities,
  efforts: UserEfforts,
  weather: WeatherDay[],
  clubContext: ClubContext | null
): GreatestHitResult[] {
  const hits: GreatestHitResult[] = [];
  const weatherMap = new Map(weather.map(w => [w.date, w]));

  // --- Segment-based hits ---
  hits.push(...generateSegmentHits(userName, efforts));

  // --- Activity-based hits ---
  hits.push(...generateActivityHits(userName, activities, weatherMap));

  // --- Weather crossover hits ---
  hits.push(...generateWeatherHits(userName, activities, weatherMap));

  // --- Consistency / dedication hits ---
  hits.push(...generateConsistencyHits(userName, activities));

  // --- Date-based hits ---
  hits.push(...generateDateHits(userName, activities));

  // Sort by impressiveness (we'll rank them later) and take top 5-8
  // Every user should get at least 3 hits
  return hits.slice(0, 8);
}

// =============================================================================
// Segment Hits
// =============================================================================

function generateSegmentHits(userName: string, { efforts }: UserEfforts): GreatestHitResult[] {
  const hits: GreatestHitResult[] = [];

  // Group efforts by segment
  const bySegment = new Map<string, typeof efforts>();
  for (const e of efforts) {
    if (!bySegment.has(e.segment_id)) bySegment.set(e.segment_id, []);
    bySegment.get(e.segment_id)!.push(e);
  }

  // Find the segment with most attempts - that's their "home turf"
  let homeTurfSeg = '';
  let homeTurfName = '';
  let homeTurfAttempts = 0;
  let homeTurfBestTime = 0;
  for (const [segId, segEfforts] of bySegment) {
    if (segEfforts.length > homeTurfAttempts) {
      homeTurfAttempts = segEfforts.length;
      homeTurfSeg = segId;
      homeTurfName = segEfforts[0].segment_name;
      const best = segEfforts.reduce((a, b) => (a.elapsed_time < b.elapsed_time ? a : b));
      homeTurfBestTime = best.elapsed_time;
    }
  }

  if (homeTurfAttempts >= 5) {
    hits.push({
      category: 'home_turf',
      title: 'Home Turf',
      description: `${homeTurfAttempts} attempts on ${homeTurfName}. PR: ${secondsToDisplay(homeTurfBestTime)}`,
      stat_value: `${homeTurfAttempts}×`,
      stat_label: homeTurfName,
      segment_id: homeTurfSeg,
      activity_strava_id: null,
      rank_in_club: null,
      percentile: null,
    });
  }

  // Most improved (biggest PR drop on a segment) - pick the best one only
  let bestImprovement = 0;
  let bestImprovementSeg = '';
  let bestImprovementName = '';
  for (const [segId, segEfforts] of bySegment) {
    if (segEfforts.length < 2) continue;
    const sorted = [...segEfforts].sort(
      (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    );
    const first = sorted[0];
    const best = sorted.reduce((a, b) => (a.elapsed_time < b.elapsed_time ? a : b));
    const improvement = first.elapsed_time - best.elapsed_time;
    if (improvement > bestImprovement) {
      bestImprovement = improvement;
      bestImprovementSeg = segId;
      bestImprovementName = best.segment_name;
    }
  }

  if (bestImprovement > 30) {
    hits.push({
      category: 'most_improved',
      title: 'Leveled Up',
      description: `Dropped ${secondsToDisplay(bestImprovement)} off your ${bestImprovementName} PR over time.`,
      stat_value: `-${secondsToDisplay(bestImprovement)}`,
      stat_label: bestImprovementName,
      segment_id: bestImprovementSeg,
      activity_strava_id: null,
      rank_in_club: null,
      percentile: null,
    });
  }

  // Iron Rider — segments completed
  const segmentsCompleted = bySegment.size;
  if (segmentsCompleted >= 3) {
    const label =
      segmentsCompleted >= 8
        ? 'The Completionist'
        : segmentsCompleted >= 5
          ? 'Well-Rounded'
          : 'Explorer';
    hits.push({
      category: 'iron_rider',
      title: label,
      description: `You've conquered ${segmentsCompleted} of 8 Mission Cycling segments.`,
      stat_value: `${segmentsCompleted}/8`,
      stat_label: 'Segments completed',
      segment_id: null,
      activity_strava_id: null,
      rank_in_club: null,
      percentile: null,
    });
  }

  return hits;
}

// =============================================================================
// Activity Hits
// =============================================================================

function generateActivityHits(
  userName: string,
  { activities }: UserActivities,
  weatherMap: Map<string, WeatherDay>
): GreatestHitResult[] {
  const hits: GreatestHitResult[] = [];
  if (activities.length === 0) return hits;

  // Longest ride
  const longest = activities.reduce((a, b) => (a.distance_mi > b.distance_mi ? a : b));
  if (longest.distance_mi > 20) {
    hits.push({
      category: 'longest_ride',
      title: 'Road Warrior',
      description: `Your longest ride: ${longest.distance_mi.toFixed(1)} miles on ${formatDate(longest.start_date_local)}`,
      stat_value: `${longest.distance_mi.toFixed(1)} mi`,
      stat_label: 'Longest single ride',
      segment_id: null,
      activity_strava_id: longest.strava_activity_id,
      rank_in_club: null,
      percentile: null,
    });
  }

  // Biggest climbing day
  const biggestClimb = activities.reduce((a, b) =>
    a.total_elevation_gain_ft > b.total_elevation_gain_ft ? a : b
  );
  if (biggestClimb.total_elevation_gain_ft > 2000) {
    hits.push({
      category: 'biggest_climb',
      title: 'Iron Legs',
      description: `${biggestClimb.total_elevation_gain_ft.toLocaleString()} ft of climbing on ${formatDate(biggestClimb.start_date_local)}`,
      stat_value: `${biggestClimb.total_elevation_gain_ft.toLocaleString()} ft`,
      stat_label: 'Single-day elevation record',
      segment_id: null,
      activity_strava_id: biggestClimb.strava_activity_id,
      rank_in_club: null,
      percentile: null,
    });
  }

  // Total distance
  const totalMiles = activities.reduce((sum, a) => sum + a.distance_mi, 0);
  if (totalMiles > 100) {
    const earthCircumferences = totalMiles / 24901;
    const descriptor =
      totalMiles > 24901
        ? `That's ${earthCircumferences.toFixed(1)}× around the Earth.`
        : totalMiles > 5000
          ? "That's more than the Tour de France. Several times over."
          : `That's the distance from SF to ${totalMiles > 3000 ? 'New York' : totalMiles > 1500 ? 'Denver' : 'Portland'}.`;

    hits.push({
      category: 'total_distance',
      title: 'Mile Collector',
      description: `${Math.round(totalMiles).toLocaleString()} total miles with Mission Cycling. ${descriptor}`,
      stat_value: `${Math.round(totalMiles).toLocaleString()} mi`,
      stat_label: 'Total distance',
      segment_id: null,
      activity_strava_id: null,
      rank_in_club: null,
      percentile: null,
    });
  }

  return hits;
}

// =============================================================================
// Weather Crossover Hits (Tier 2)
// =============================================================================

function generateWeatherHits(
  userName: string,
  { activities }: UserActivities,
  weatherMap: Map<string, WeatherDay>
): GreatestHitResult[] {
  const hits: GreatestHitResult[] = [];

  for (const activity of activities) {
    const date = activity.start_date_local.split('T')[0];
    const weather = weatherMap.get(date);
    if (!weather) continue;

    // Rode in heavy rain
    if (weather.precipitation_inches > 0.5 && activity.distance_mi > 15) {
      hits.push({
        category: 'all_weather',
        title: 'Rain or Shine',
        description: `${activity.distance_mi.toFixed(1)} miles in ${weather.precipitation_inches.toFixed(1)}" of rain on ${formatDate(activity.start_date_local)}. Respect.`,
        stat_value: `${weather.precipitation_inches.toFixed(1)}"`,
        stat_label: 'Rain endured',
        segment_id: null,
        activity_strava_id: activity.strava_activity_id,
        rank_in_club: null,
        percentile: null,
      });
      break; // Only one weather hit
    }

    // Rode in extreme cold
    if (weather.temperature_max_f < 45 && activity.distance_mi > 15) {
      hits.push({
        category: 'all_weather',
        title: 'Cold Blooded',
        description: `${activity.distance_mi.toFixed(1)} miles when it was ${weather.temperature_max_f}°F on ${formatDate(activity.start_date_local)}`,
        stat_value: `${weather.temperature_max_f}°F`,
        stat_label: 'Coldest ride',
        segment_id: null,
        activity_strava_id: activity.strava_activity_id,
        rank_in_club: null,
        percentile: null,
      });
      break;
    }

    // Rode in heavy wind
    if (weather.wind_gusts_max_mph > 30 && activity.distance_mi > 10) {
      hits.push({
        category: 'all_weather',
        title: 'Headwind Hero',
        description: `${activity.distance_mi.toFixed(1)} miles in ${weather.wind_gusts_max_mph.toFixed(0)} mph gusts on ${formatDate(activity.start_date_local)}`,
        stat_value: `${weather.wind_gusts_max_mph.toFixed(0)} mph`,
        stat_label: 'Windiest ride',
        segment_id: null,
        activity_strava_id: activity.strava_activity_id,
        rank_in_club: null,
        percentile: null,
      });
      break;
    }
  }

  return hits;
}

// =============================================================================
// Consistency Hits
// =============================================================================

function generateConsistencyHits(
  userName: string,
  { activities }: UserActivities
): GreatestHitResult[] {
  const hits: GreatestHitResult[] = [];
  if (activities.length === 0) return hits;

  // Most rides in a calendar year
  const byYear = new Map<number, number>();
  for (const a of activities) {
    const year = new Date(a.start_date_local).getFullYear();
    byYear.set(year, (byYear.get(year) || 0) + 1);
  }
  let bestYear = 0;
  let bestYearCount = 0;
  for (const [year, count] of byYear) {
    if (count > bestYearCount) {
      bestYear = year;
      bestYearCount = count;
    }
  }
  if (bestYearCount > 20) {
    hits.push({
      category: 'most_rides_year',
      title: `${bestYear} Was Your Year`,
      description: `${bestYearCount} rides in ${bestYear}. That's roughly ${(bestYearCount / 52).toFixed(1)} per week.`,
      stat_value: `${bestYearCount}`,
      stat_label: `Rides in ${bestYear}`,
      segment_id: null,
      activity_strava_id: null,
      rank_in_club: null,
      percentile: null,
    });
  }

  // Early bird vs night owl
  let earlyCount = 0;
  let lateCount = 0;
  for (const a of activities) {
    const hour = new Date(a.start_date_local).getHours();
    if (hour < 7) earlyCount++;
    if (hour >= 18) lateCount++;
  }
  if (earlyCount > 10) {
    hits.push({
      category: 'early_bird',
      title: 'Dawn Patrol',
      description: `${earlyCount} rides before 7am. The rest of us were still in bed.`,
      stat_value: `${earlyCount}`,
      stat_label: 'Pre-dawn rides',
      segment_id: null,
      activity_strava_id: null,
      rank_in_club: null,
      percentile: null,
    });
  } else if (lateCount > 10) {
    hits.push({
      category: 'night_owl',
      title: 'Night Moves',
      description: `${lateCount} rides starting after 6pm. Sunset specialist.`,
      stat_value: `${lateCount}`,
      stat_label: 'Evening rides',
      segment_id: null,
      activity_strava_id: null,
      rank_in_club: null,
      percentile: null,
    });
  }

  return hits;
}

// =============================================================================
// Date-based Hits
// =============================================================================

function generateDateHits(
  userName: string,
  { activities }: UserActivities
): GreatestHitResult[] {
  const hits: GreatestHitResult[] = [];
  if (activities.length === 0) return hits;

  // Sort by date
  const sorted = [...activities].sort(
    (a, b) => new Date(a.start_date_local).getTime() - new Date(b.start_date_local).getTime()
  );

  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  // Member since
  hits.push({
    category: 'first_ride',
    title: 'Day One',
    description: `Your first ride: "${first.name}" on ${formatDate(first.start_date_local)}`,
    stat_value: formatDate(first.start_date_local),
    stat_label: 'First recorded ride',
    segment_id: null,
    activity_strava_id: first.strava_activity_id,
    rank_in_club: null,
    percentile: null,
  });

  // Holiday rides
  const holidays = findHolidayRides(activities);
  if (holidays.length > 0) {
    const h = holidays[0];
    hits.push({
      category: 'custom',
      title: h.title,
      description: h.description,
      stat_value: h.stat_value,
      stat_label: h.holiday,
      segment_id: null,
      activity_strava_id: h.activity_strava_id,
      rank_in_club: null,
      percentile: null,
    });
  }

  return hits;
}

// =============================================================================
// Helpers
// =============================================================================

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function findHolidayRides(
  activities: UserActivities['activities']
): {
  title: string;
  description: string;
  stat_value: string;
  holiday: string;
  activity_strava_id: number;
}[] {
  const results: any[] = [];

  for (const a of activities) {
    const d = new Date(a.start_date_local);
    const month = d.getMonth() + 1;
    const day = d.getDate();

    let holiday = '';
    let title = '';

    if (month === 12 && day === 25) {
      holiday = 'Christmas';
      title = 'Santa Rides a Bike';
    } else if (month === 1 && day === 1) {
      holiday = "New Year's Day";
      title = 'Starting Strong';
    } else if (month === 7 && day === 4) {
      holiday = 'July 4th';
      title = 'Freedom Ride';
    } else if (month === 11 && day >= 22 && day <= 28 && d.getDay() === 4) {
      holiday = 'Thanksgiving';
      title = 'Earning the Turkey';
    }

    if (holiday) {
      results.push({
        title,
        description: `${a.distance_mi.toFixed(1)} miles on ${holiday} ${d.getFullYear()}. Priorities.`,
        stat_value: `${a.distance_mi.toFixed(1)} mi`,
        holiday,
        activity_strava_id: a.strava_activity_id,
      });
    }
  }

  return results;
}
