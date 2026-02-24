// =============================================================================
// Mission Cycling — Core Types
// =============================================================================

// --- Strava OAuth & User ---

export interface StravaTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp
}

export interface User {
  id: string; // Supabase UUID
  strava_id: number;
  name: string;
  first_name: string;
  last_name: string;
  profile_pic: string | null;
  city: string | null;
  state: string | null;
  connected_at: string; // ISO timestamp
  last_sync_at: string | null;
  tokens: StravaTokens;
  // Computed on sync
  total_rides: number | null;
  total_distance_mi: number | null;
  total_elevation_ft: number | null;
  member_since: string | null; // Earliest activity date
  last_ride: string | null; // Most recent activity date
}

// --- Segments ---

export interface Segment {
  id: string; // URL-safe slug ("hawk-hill")
  name: string;
  strava_id: number;
  location: string;
  distance: { km: number; mi: number };
  elevation: { gain_ft: number; lowest_ft: number; highest_ft: number };
  grade: number;
  category: string; // "Cat 4", "Cat 3", "Cat 2", "Cat 1", "HC"
  club_members: number;
  visible: boolean;
  video_url: string | null;
  elevation_svg: string | null; // Cached SVG path from Strava streams
}

// --- Leaderboard ---

export type LeaderboardEntryStatus = 'ghost' | 'claimed' | 'verified';

export interface LeaderboardEntry {
  id: string;
  segment_id: string;
  rank: number;
  rider_name: string | null; // null = fully unclaimed
  time_seconds: number; // Canonical time in seconds
  time_display: string; // Formatted "8:23" or "1:06:08"
  gap_seconds: number | null; // Gap to leader
  gap_display: string | null; // "+0:47"
  date: string | null; // ISO date of effort
  speed_mph: number | null;
  power_watts: number | null;

  // Status & ownership
  status: LeaderboardEntryStatus;
  user_id: string | null; // FK to users table
  strava_effort_id: number | null; // Strava segment effort ID

  // Display
  profile_pic: string | null; // From Strava if verified
}

// Ghost = scraped data, no one has claimed it
// Claimed = name fuzzy-matched to a user, pending verification
// Verified = user authenticated AND their Strava effort matches this time

// --- Segment Efforts (raw from Strava, stored per user) ---

export interface SegmentEffort {
  id: string;
  user_id: string;
  segment_id: string;
  strava_effort_id: number;
  elapsed_time: number; // seconds
  moving_time: number; // seconds
  start_date: string; // ISO timestamp
  average_watts: number | null;
  average_heartrate: number | null;
  max_heartrate: number | null;
  pr_rank: number | null; // 1, 2, 3, or null
}

// --- Activities (for deep stats / ticker stories) ---

export interface ActivitySummary {
  id: string;
  user_id: string;
  strava_activity_id: number;
  name: string;
  distance_mi: number;
  moving_time_seconds: number;
  elapsed_time_seconds: number;
  total_elevation_gain_ft: number;
  start_date: string; // ISO timestamp
  start_date_local: string; // ISO timestamp (local tz)
  average_speed_mph: number | null;
  max_speed_mph: number | null;
  average_watts: number | null;
  kilojoules: number | null;
  suffer_score: number | null;
}

// --- Weather (cached from Open-Meteo) ---

export interface DailyWeather {
  date: string; // "2017-02-07"
  temperature_max_f: number;
  temperature_min_f: number;
  temperature_mean_f: number;
  precipitation_inches: number;
  wind_speed_max_mph: number;
  wind_gusts_max_mph: number;
  weather_code: number; // WMO weather code
}

// --- Greatest Hits (generated per user on auth) ---

export interface GreatestHit {
  id: string;
  user_id: string;
  category: GreatestHitCategory;
  title: string; // Short label: "Iron Legs"
  description: string; // "You climbed 8,400 ft on Oct 12, 2017"
  stat_value: string; // "8,400 ft"
  stat_label: string; // "Single-day elevation record"
  segment_id: string | null; // If segment-specific
  activity_id: string | null;
  rank: number | null; // Your rank in this category among club
  generated_at: string; // ISO timestamp
}

export type GreatestHitCategory =
  | 'fastest_segment' // Your best segment time
  | 'most_attempts' // Most times on a segment
  | 'most_improved' // Biggest PR improvement
  | 'iron_rider' // Most segments completed
  | 'longest_ride' // Longest single ride
  | 'biggest_climb' // Most elevation in one ride
  | 'most_rides_year' // Most rides in a calendar year
  | 'most_consistent' // Longest streak of weekly rides
  | 'early_bird' // Most rides starting before 7am
  | 'night_owl' // Most rides starting after 6pm
  | 'all_weather' // Rides in worst conditions
  | 'first_ride' // Earliest ride date
  | 'last_ride' // Most recent ride date
  | 'total_distance' // Cumulative distance
  | 'total_elevation' // Cumulative elevation
  | 'custom'; // Manually assigned superlative

// --- Ticker Stories ---

export type TickerTier = 1 | 2 | 3;

export type TickerCategory =
  | 'segment_record' // Current segment leader
  | 'segment_stat' // Segment-specific computed stat
  | 'club_stat' // Club-wide aggregate
  | 'rivalry' // Two riders close in time
  | 'historical' // Deep-cut date/weather stat
  | 'club_lore' // Manually curated story
  | 'promo' // Merch, CTA, sponsor
  | 'tagline'; // "Premium Suffering Since 2008"

export interface TickerStory {
  id: string;
  tier: TickerTier;
  category: TickerCategory;
  text: string; // The actual ticker text
  segment_id: string | null; // If relevant to a specific segment
  weight: number; // Higher = more likely to show (1-10)
  generated: boolean; // false = manually curated
  source_data: Record<string, any> | null; // Metadata for regeneration
}

// --- Interstitials ---

export type InterstitialType =
  | 'sponsor' // Sponsor card with logo + voiceover
  | 'merch' // Merchandise promo
  | 'club_photo' // Historical photo with caption
  | 'did_you_know' // Big stat card
  | 'club_lore' // Story moment from Tier 3
  | 'greatest_hit'; // Highlight a member's greatest hit

export interface Interstitial {
  id: string;
  type: InterstitialType;
  title: string | null; // Optional header
  body: string; // Main text or caption
  image_url: string | null; // Photo, logo, or merch image
  audio_url: string | null; // Voiceover clip
  duration_ms: number; // How long to display (3000-8000ms)
  weight: number; // Selection weight
  active: boolean;
  metadata: Record<string, any> | null;
}

// --- Sponsors ---

export interface Sponsor {
  id: string;
  name: string;
  logo_url: string;
  voiceover_url: string | null; // AI-generated name read
  tagline: string | null; // "Tartine — Bread worth the wait"
  active: boolean;
  order_index: number;
}

// --- Broadcast Sequence ---

export type SequenceItemType = 'leaderboard' | 'interstitial';

export interface SequenceItem {
  type: SequenceItemType;
  // For leaderboard:
  segment_id?: string;
  leaderboard_view?: 'top10' | 'find_me' | 'kom_standings' | 'iron_rider';
  // For interstitial:
  interstitial?: Interstitial;
}

// The broadcast is a sequence of SequenceItems.
// Interstitials are inserted every 2-3 leaderboards.
// "Commercial breaks" are 2-3 interstitials in a row.
