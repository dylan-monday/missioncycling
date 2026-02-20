# CLAUDE.md - Mission Cycling Retrospective

## Quick Start

```bash
npm install
npm run dev    # http://localhost:3000
```

## Project Overview

A broadcast-style leaderboard display for **Mission Cycling**, a San Francisco cycling club, showcasing their 2008-2022 era. The design mimics vintage TV sports broadcasts with modern web tech.

**Live URL:** https://missioncycling.vercel.app

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS + custom CSS in `globals.css`
- **Animations:** Framer Motion
- **Language:** TypeScript
- **Data:** Local JSON (`/data/segments.json`)
- **Deployment:** Vercel (auto-deploys from GitHub main)

## Key Files

```
app/
  page.tsx          # Main broadcast display (splash → card → ticker)
  globals.css       # All custom CSS (variables, card, ticker, splash)
  layout.tsx        # Root layout with Typekit fonts

components/
  SplashScreen.tsx  # Click-to-start intro screen
  LeaderboardCard.tsx  # Main segment display card
  LeaderboardRow.tsx   # Animated leaderboard rows
  Ticker.tsx        # Bottom scrolling ticker with sponsors

data/
  segments.json     # All segment + leaderboard data (8 segments)

public/
  video/            # Background videos (web-compressed, ~10-28MB each)
  sponsors/         # Sponsor logos for ticker
  *.mp3             # Background music tracks (3 tracks)
```

## How It Works

### 1. Splash Screen
- Full black screen with MC logo
- "PREMIUM SUFFERING SINCE 2008" tagline
- Click anywhere to start (triggers audio + video backgrounds)

### 2. Main Display
- **Video Background:** Crossfades between segment-specific videos
- **Card:** Opens from center with animated frame edges
- **Left Panel:** Logo, segment name, stats (distance, elevation, grade)
- **Right Panel:** Animated leaderboard (top 3 hero → full 10 rows)
- **Auto-advance:** 38 seconds per segment, or click frame edges to navigate

### 3. Ticker
- Double blue lines (MC brand)
- Rotating sponsor logos (10s interval)
- Scrolling stats: segment records, member spotlights, club stats
- "PREMIUM SUFFERING SINCE 2008" every 5th item
- Strava CTA button

### 4. Background Music
- 3 tracks: Victory Circuit, Triomphe en VHS, Stadium Flash '86
- Random track on start, different track when one ends
- Press **M** key to toggle music on/off
- Volume: 11% (subtle background)

## Segment Data Structure

```typescript
{
  id: string;              // URL-safe ID (e.g., "hawk-hill")
  name: string;            // Display name
  strava_id: number;       // Strava segment ID
  location: string;        // "Marin Headlands, CA"
  distance: { km, mi };
  elevation: { gain_ft, lowest_ft, highest_ft };
  grade: number;           // Average grade %
  category: string;        // "Cat 4", "HC", etc.
  clubMembers: number;     // Total club members with times
  visible: boolean;        // Show/hide in rotation
  mission_cycling_leaderboard: [
    { rank, name, date, time, speed, power, claimed }
  ]
}
```

## Current Segments (8 total)

1. Hawk Hill - Marin Headlands (1.65mi, 511ft, 6.8%)
2. Radio Road - San Bruno Mountain (1.49mi, 563ft, 7.2%)
3. Old La Honda - Woodside (3.13mi, 1275ft, 7.8%)
4. Hwy 1 from Muir Beach - Marin (1.91mi, 694ft, 6.0%)
5. Alpe d'Huez - France (7.47mi, 3436ft, 8.8%)
6. Four Corners Climb - Mill Valley (2.12mi, 822ft, 5.4%)
7. BoFax Climb - Marin County (3.93mi, 1486ft, 7.1%)
8. Bourg d'Oisans > Bourg d'Arud - France (7.73mi, 813ft, 1.6%)

## Video Background Mapping

Videos are in `/public/video/` and mapped by segment ID in `page.tsx`:

```typescript
const SEGMENT_VIDEOS = {
  'hawk-hill': '/video/mc broadcast 01.mp4',
  'radio-road': '/video/mc broadcast 02.mp4',
  'old-la-honda': '/video/mc broadcast 03.mp4',
  'hwy1-muir-beach': '/video/mc broadcast 04.mp4',
  'alpe-dhuez': '/video/mc broadcast 05.mp4',
  'four-corners': '/video/mc broadcast 01.mp4',
  'bofax-climb': '/video/mc broadcast 02.mp4',
  'bourg-doisans': '/video/mc broadcast 05.mp4',
};
```

## CSS Architecture

All custom styles in `globals.css`:
- CSS variables in `:root` for colors, sizing
- `.splash-screen` - Intro screen styles
- `.main-container` - Centered card container
- `.card`, `.card-left`, `.card-right` - Main card layout
- `.frame-edge` - Clickable navigation arrows
- `.leaderboard`, `.leaderboard-row` - Leaderboard grid
- `.ticker`, `.ticker-scroll` - Bottom ticker

## Animation Timing

```
LEADERBOARD_ANIMATION = 8000ms   # Time for leaderboard to fully appear
VIEWING_DURATION = 30000ms       # 30s viewing complete leaderboard
SEGMENT_DURATION = 38000ms       # Total time per segment
CLOSE_DURATION = 600ms           # Card close animation
INITIAL_DELAY = 800ms            # Delay before card opens
```

## Brand Colors

```css
--mc-blue: #BAE0F7;        /* Primary brand color */
--strava-orange: #FC4C02;  /* Strava CTA */
--ticker-bg: #1a1d21;      /* Ticker background */
```

## Adding New Segments

1. Get Strava segment data (PDF screenshot or API)
2. Add entry to `/data/segments.json`
3. Map video in `SEGMENT_VIDEOS` in `page.tsx`
4. Segment will appear in rotation automatically

## Common Tasks

### Change segment duration
Edit `VIEWING_DURATION` in `page.tsx` (currently 30000ms)

### Add new sponsor
Add logo to `/public/sponsors/` and update `SPONSORS` array in `Ticker.tsx`

### Change music volume
Edit `audioRef.current.volume` value in `page.tsx` (currently 0.11)

### Add new music track
Add MP3 to `/public/` and update `AUDIO_TRACKS` array in `page.tsx`

## Deployment

- **GitHub:** https://github.com/dylan-monday/missioncycling
- **Vercel:** Auto-deploys on push to main
- **Environment Variables (if using Supabase):**
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Known Issues

- TypeScript warning in `LeaderboardRow.tsx` (Framer Motion transition type) - doesn't affect runtime
- Videos must be web-compressed (<100MB) for GitHub

## Future Work

- [ ] Strava OAuth for "Claim Your Spot"
- [ ] Real-time leaderboard updates via Supabase
- [ ] Keyboard navigation (arrow keys)
- [ ] Full-screen mode
- [ ] More video backgrounds for new segments
