// =============================================================================
// Mission Cycling — Club Lore (Tier 3)
// =============================================================================
//
// These are the editorial stories that make this a broadcast, not a spreadsheet.
// Curated from club knowledge, member interviews, institutional memory.
//
// Two uses:
// 1. Ticker stories (short, one-liner)
// 2. Interstitials (full-screen cards between leaderboards)
//
// This file is a TEMPLATE. Fill in real stories as you collect them.
// Each story has a placeholder marker [FILL] for details you need to source.
// =============================================================================

import type { TickerStory, Interstitial } from '../types';

// =============================================================================
// TICKER STORIES (Tier 3) — Short, scrolling at the bottom
// =============================================================================

export const CLUB_LORE_TICKER: Omit<TickerStory, 'id'>[] = [
  // --- Founding & Identity ---
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
  {
    tier: 3,
    category: 'club_lore',
    text: 'Club #15 on Strava. Low number. OG status.',
    segment_id: null,
    weight: 5,
    generated: false,
    source_data: null,
  },

  // --- Segment-specific lore ---
  // [FILL] Add real stories for each segment
  {
    tier: 3,
    category: 'club_lore',
    text: 'Hawk Hill: Where PRs are made and legs are broken.',
    segment_id: 'hawk-hill',
    weight: 6,
    generated: false,
    source_data: null,
  },
  {
    tier: 3,
    category: 'club_lore',
    text: 'Old La Honda: 3.13 miles of truth. No hiding.',
    segment_id: 'old-la-honda',
    weight: 6,
    generated: false,
    source_data: null,
  },
  {
    tier: 3,
    category: 'club_lore',
    text: 'Radio Road: The secret weapon. If you know, you know.',
    segment_id: 'radio-road',
    weight: 5,
    generated: false,
    source_data: null,
  },
  {
    tier: 3,
    category: 'club_lore',
    // [FILL] Which MC members have actually ridden Alpe d'Huez?
    text: 'Alpe d\'Huez: [FILL] MC members have made the pilgrimage.',
    segment_id: 'alpe-dhuez',
    weight: 7,
    generated: false,
    source_data: null,
  },

  // --- Sponsor love ---
  {
    tier: 3,
    category: 'club_lore',
    text: 'Flour+Water post-ride pasta: the unofficial recovery protocol since 2012.',
    segment_id: null,
    weight: 5,
    generated: false,
    source_data: null,
  },
  {
    tier: 3,
    category: 'club_lore',
    // [FILL] Tartine story
    text: 'Tartine morning bun → Hawk Hill → Tartine croissant. The MC trinity.',
    segment_id: null,
    weight: 5,
    generated: false,
    source_data: null,
  },

  // --- Memorable moments ---
  // [FILL] Collect these from members
  // Examples:
  // 'The time 12 riders got lost in the fog on Hawk Hill and ended up in Sausalito'
  // '2019: The year Mission Cycling discovered gravel. And regretted it.'
  // 'RIP to the countless tubes punctured on [segment]'
  // 'That one group ride where everyone flatted on the same pothole'
  // 'The unofficial MC rule: if you drop someone, you buy them coffee'

  // --- Milestone moments ---
  // [FILL] These need real data
  // 'First MC member to break 5 minutes on Hawk Hill: [Name], [Date]'
  // '[Name]\'s 100th Hawk Hill: [Date]. Buy that person a jersey.'
  // 'The day [Name] set the Radio Road record that still stands'
];

// =============================================================================
// INTERSTITIALS (Tier 3) — Full-screen cards between leaderboards
// =============================================================================

export const CLUB_LORE_INTERSTITIALS: Omit<Interstitial, 'id'>[] = [
  // --- Origin Story ---
  {
    type: 'club_lore',
    title: 'HOW IT STARTED',
    // [FILL] Real founding story
    body: 'October 2008. San Francisco. A few friends who liked riding bikes and suffering uphill. Mission Cycling was born.',
    image_url: null, // [FILL] Founding ride photo if available
    audio_url: null,
    duration_ms: 6000,
    weight: 8,
    active: true,
    metadata: { year: 2008, lore_type: 'origin' },
  },
  {
    type: 'club_lore',
    title: 'THE EARLY DAYS',
    // [FILL] Real early club details
    body: '18th Street. Sunday mornings. The same hill, over and over. That was the whole club.',
    image_url: null, // [FILL] Early club photo
    audio_url: null,
    duration_ms: 5000,
    weight: 6,
    active: true,
    metadata: { year: 2009, lore_type: 'history' },
  },

  // --- Era Cards (one per notable year) ---
  // [FILL] These need real club history
  // Template:
  // {
  //   type: 'club_lore',
  //   title: '2014',
  //   body: 'The year [thing happened]. [X] new members. [memorable event].',
  //   image_url: null,
  //   audio_url: null,
  //   duration_ms: 5000,
  //   weight: 5,
  //   active: true,
  //   metadata: { year: 2014, lore_type: 'era' },
  // },

  // --- "Did You Know?" Cards ---
  {
    type: 'did_you_know',
    title: 'DID YOU KNOW?',
    // [FILL] Real stat
    body: 'Mission Cycling members have collectively climbed the equivalent of Everest [FILL] times.',
    image_url: null,
    audio_url: null,
    duration_ms: 5000,
    weight: 7,
    active: true,
    metadata: { stat_type: 'elevation_everests' },
  },
  {
    type: 'did_you_know',
    title: 'DID YOU KNOW?',
    body: 'Club #15 on Strava. That means only 14 clubs were created before Mission Cycling. OG status.',
    image_url: null,
    audio_url: null,
    duration_ms: 5000,
    weight: 6,
    active: true,
    metadata: { stat_type: 'club_number' },
  },
  {
    type: 'did_you_know',
    title: 'DID YOU KNOW?',
    // This one can be auto-generated once weather data is loaded
    body: '[FILL] riders went out on the wettest day in SF in 2016. Premium suffering.',
    image_url: null,
    audio_url: null,
    duration_ms: 5000,
    weight: 7,
    active: false, // Activate once [FILL] is replaced
    metadata: { stat_type: 'weather_extreme' },
  },

  // --- Club Photos ---
  // [FILL] Add real club photos
  // Template:
  // {
  //   type: 'club_photo',
  //   title: null,
  //   body: 'Sunday morning, Hawk Hill, 2016',
  //   image_url: '/photos/hawk-hill-group-2016.jpg',
  //   audio_url: null,
  //   duration_ms: 5000,
  //   weight: 6,
  //   active: true,
  //   metadata: { year: 2016, location: 'Hawk Hill' },
  // },

  // --- The Closing ---
  {
    type: 'club_lore',
    title: '2008 — 2022',
    body: 'Mission Cycling. Premium Suffering. Forever.',
    image_url: null, // MC logo
    audio_url: null,
    duration_ms: 6000,
    weight: 9,
    active: true,
    metadata: { lore_type: 'closing' },
  },
];

// =============================================================================
// "The Monument" — Scrolling credits of all members
// =============================================================================
// This is the end-of-broadcast sequence.
// A slow scroll of every member name, like movie credits.
// Could be the last thing that plays before the loop restarts.
//
// [FILL] Full member list from Strava club
// These could be auto-populated from the club members API endpoint
// or manually entered.

export const MONUMENT_MEMBERS: string[] = [
  // [FILL] All 161 member names
  // Format: "FirstName LastName" or "FirstName L." for privacy
  // Sort: alphabetical, or chronological by join date, or by total miles
];
