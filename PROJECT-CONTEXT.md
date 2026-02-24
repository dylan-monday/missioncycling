# Mission Cycling Retrospective — Project Context

## Overview

A broadcast-style leaderboard display for Mission Cycling, a San Francisco cycling club, showcasing their 2008-2022 era. The design mimics 1988 CBS Sports Sunday aesthetics with a TV broadcast feel.

**Live at:** https://missioncyclingorg.vercel.app
**Repo:** https://github.com/dylan-monday/missioncycling

---

## Design Direction

**Aesthetic:** 1988 CBS Sports Sunday broadcast
- Red-to-blue gradient backgrounds
- Chunky yellow italic type (Impact font) with heavy black outlines
- VHS scan lines and CRT texture overlays
- Sequential "slam in" row animations
- Warm analog broadcast feel
- 16:9 aspect ratio, no scrolling (letterboxed on non-16:9 screens)

**Primary Color:** Pantone 290 (`#BAE0F7`)

---

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS 3.4
- **Animations:** Framer Motion
- **Language:** TypeScript
- **Database:** Supabase (PostgreSQL)
- **Auth:** Strava OAuth
- **Deployment:** Vercel

---

## Architecture: The Hybrid Model

Strava removed public segment leaderboards from their API. Each user who authenticates via OAuth only grants access to **their own** data.

**Our approach: Ghost leaderboard + crowdsourced verification.**

| Layer | Source | When |
|---|---|---|
| Ghost leaderboard | Scraped Strava screenshots → Supabase | Seeded, hidden from display |
| Verified entries | Individual OAuth → user's best segment efforts | Each user login |
| Activity history | Individual OAuth → all user rides (2008-2019) | Each user login |
| Greatest Hits | Generated from user's activity + effort data | After each sync |

**Key Decision:** Leaderboards ONLY show verified entries. Ghost entries stay in Supabase but are hidden from display. Empty slots appear as "[ UNCLAIMED ]".

---

## File Structure

```
/app
  /page.tsx                    — Main orchestrator (splash → auth → sync → hits → broadcast)
  /admin/page.tsx              — Admin panel (segment visibility toggles)
  /test-commercial/page.tsx    — Commercial break testing
  /layout.tsx                  — Root layout with Typekit fonts
  /globals.css                 — Global styles, card, ticker, splash animations

  /api
    /auth/strava/route.ts      — Initiates Strava OAuth redirect
    /auth/callback/route.ts    — Handles OAuth callback, creates user
    /user/me/route.ts          — Returns authenticated user + sync progress
    /sync/route.ts             — Background sync (efforts + activities)
    /segments/route.ts         — Returns segments with verified leaderboards
    /greatest-hits/me/route.ts — Returns user's generated greatest hits
    /migrate-ghosts/route.ts   — One-time ghost migration

/components
  /SplashScreen.tsx            — Gated mode with Strava button
  /SyncSequence.tsx            — Sync progress with animated counters
  /GreatestHitsReveal.tsx      — Post-sync personal highlights
  /LeaderboardCard.tsx         — Main segment display (preview + leaderboard)
  /LeaderboardRow.tsx          — Individual row with phase-aware animations
  /ElevationProfile.tsx        — Animated SVG elevation chart
  /Ticker.tsx                  — Bottom scrolling ticker
  /CommercialBreak.tsx         — Sponsor breaks between segments

/lib
  /supabase.ts                 — Supabase client (server + browser)
  /sync.ts                     — Full sync logic with progress reporting
  /strava.ts                   — Strava API wrappers + token management
  /greatest-hits.ts            — Personal superlative generator
  /leaderboard.ts              — Ghost→verified, rank calculation
  /ticker-stories.ts           — Tier 1/2/3 story generators
  /weather.ts                  — Open-Meteo historical weather
  /sequence.ts                 — Broadcast sequence builder

/data
  /segments.json               — All segment data (8 segments)
  /club-lore.ts                — Tier 3 curated stories

/types
  /index.ts                    — All TypeScript types

/public
  /video/                      — Background videos (~10-28MB each)
  /sponsors/                   — Sponsor logos (transparent PNGs)
  /sponsors/_audio/            — Sponsor voiceover clips
  /segment_audio/              — Segment voiceover clips
  /*.mp3                       — Background music (3 tracks)
```

---

## Onboarding Flow (Gated Mode)

### Complete User Journey

```
1. SPLASH SCREEN
   - Black background, MC logo centered
   - "PREMIUM SUFFERING SINCE 2008"
   - [ Connect with Strava ] button (orange #FC4C02)
   - Mobile: "desktop required" message

2. STRAVA OAUTH
   - Redirect to Strava → authorize → callback
   - Create/update user in Supabase
   - Set mc_session cookie
   - Start background sync

3. WELCOME SCREEN (2-3 seconds)
   - Profile pic fades in (from Strava)
   - "Welcome back, [First Name]"
   - "[City], [State]"

4. SYNC SEQUENCE (30-90 seconds)
   - Ambient audio: sync soundtrack 3.mp3
   - Progress bar with animated counters
   - Real-time messages: "Scanning Hawk Hill..." → "47 attempts. Best: 7:42"
   - Segment efforts + activities fetched from Strava
   - Greatest Hits generated at end

5. GREATEST HITS REVEAL
   - "YOUR GREATEST HITS" title (2.5s)
   - 3-5 personalized stat cards (4.5s each)
   - [skip] button available
   - Crossfade between cards

6. BROADCAST MODE
   - Background music starts (random track)
   - First segment loads with voiceover
   - Full leaderboard rotation begins
   - Commercial breaks every 2-3 segments
```

---

## Leaderboard System

### Entry States
| Status | Look | How it gets there |
|---|---|---|
| **Ghost** | Hidden from display | Scraped data, in DB only |
| **Verified** | Full color, profile pic, checkmark | User's Strava effort confirms |
| **Unclaimed** | "[ UNCLAIMED ]" gray text | Empty slot in top 10 |

### Display Rules
- Fetch leaderboard WHERE status = 'verified'
- Always show 10 rows (fill with unclaimed if fewer verified)
- Calculate ranks and time gaps dynamically
- Show profile pics for verified entries

---

## Commercial Breaks

Plays between every 2-3 segments:

1. **Intro clip** (random from 2 variations)
2. **"Sponsored by"** transition audio
3. **2-3 sponsor logos** with individual voiceover reads
4. Crossfade transitions between sponsors

### Audio Assets (`/public/sponsors/_audio/`)
- Intros: `Mission cycling.mp3`, `The Mission Cycling Club of San Francisco.mp3`
- Transition: `sponsored by.mp3`
- Conjunctions: `and 01.mp3`, `and 02.mp3`, `and 03.mp3`
- 19 individual sponsor reads

---

## Segment Audio

Each segment has 2 voiceover variations in `/public/segment_audio/`:
```
hawk hill 01.mp3, hawk hill 02.mp3
radio road 01.mp3, radio road 02.mp3
old la honda 01.mp3, old la honda 02.mp3
highway one 01.mp3, highway one 02.mp3
four corners 01.mp3, four corners 02.mp3
Bofax 01.mp3, Bofax 02.mp3
bourg d'oisans 01.mp3, bourg d'oisans 02.mp3
alpe d'huez 01.mp3, alpe d'huez 02.mp3
```

Also: `sync soundtrack 1.mp3`, `sync soundtrack 2.mp3`, `sync soundtrack 3.mp3`

---

## Current Segments (8 total)

| # | Segment | Strava ID | Category | Distance | Elevation | Grade |
|---|---------|-----------|----------|----------|-----------|-------|
| 1 | Hawk Hill | 229781 | Cat 4 | 1.65mi | 511ft | 6.8% |
| 2 | Radio Road | 241885 | Cat 3 | 1.49mi | 563ft | 7.2% |
| 3 | Old La Honda | 8109834 | Cat 2 | 3.13mi | 1275ft | 7.8% |
| 4 | Hwy 1 from Muir Beach | 4793848 | Cat 3 | 1.91mi | 694ft | 6.0% |
| 5 | Alpe d'Huez | 652851 | HC | 7.47mi | 3436ft | 8.8% |
| 6 | Four Corners | TBD | Cat 3 | 2.12mi | 822ft | 5.4% |
| 7 | BoFax Climb | TBD | Cat 2 | 3.93mi | 1486ft | 7.1% |
| 8 | Bourg d'Oisans | TBD | Cat 4 | 7.73mi | 813ft | 1.6% |

---

## Animation Timeline (per segment)

| Time | Event |
|------|-------|
| 0.0s | Segment loads |
| 0.0-0.5s | Red title bar slams in from left |
| 0.15-0.75s | Segment name slams in (scale 1.5→1, blur→clear) |
| 0.4-0.55s | Corner accents flash in |
| 0.6-1.0s | Stats slide in from right |
| 0.8s | Category badge pops in |
| 1.2s | **Phase: top3-big** — #1 appears BIG |
| 1.7s | #2 appears BIG |
| 2.2s | #3 appears BIG |
| 3.5s | **Phase: top3-shrink** — Top 3 shrink to normal |
| 4.2s | **Phase: rest** — Rows 4-10 appear (120ms stagger) |
| ~5.7s | Club record bar fades in |
| 30s | Auto-advance to next segment |

---

## Database Schema (Supabase)

### Core Tables
- `users` — Strava athletes with tokens, sync status, profile data
- `activities` — User ride history (strava_activity_id, distance, time, elevation, date)
- `segment_efforts` — Best times per user per segment (elapsed_time, pr_rank)
- `leaderboard_entries` — Verified leaderboard rows (status: ghost/verified, rank, time)
- `greatest_hits` — Generated personal superlatives (title, stat_value, description)
- `ticker_stories` — Generated ticker content (tier, text, segment_id)
- `weather_daily` — Historical SF weather for Tier 2 stats

### Key Fields on `users`
```typescript
{
  id: uuid,
  strava_id: number,
  name: string,
  first_name: string,
  profile_pic: string,
  city: string,
  state: string,
  access_token: string,
  refresh_token: string,
  token_expires_at: timestamp,
  sync_status: 'pending' | 'syncing' | 'complete',
  sync_progress: jsonb,
  total_rides: number,
  total_distance_mi: number,
  total_elevation_ft: number,
  member_since: date,
  last_ride: date
}
```

---

## Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
STRAVA_CLIENT_ID=60
STRAVA_CLIENT_SECRET=<secret>
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_GATE_MODE=gated
```

---

## Related Documentation

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Quick reference for Claude Code sessions |
| `BACKLOG_V2.md` | Full implementation plan, session guide |
| `AUTH_UX_SPEC.md` | Detailed onboarding/auth flow spec |
| `COMMERCIAL_BREAK_SPEC.md` | Sponsor break specifications |
| `STAT_CATALOG.md` | All computable stats (Greatest Hits, Ticker) |
| `CC_SESSION_ONBOARDING.md` | Onboarding implementation details |
| `CONTENT_PLAN.md` | Interstitials, club lore, asset inventory |

---

## Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Test onboarding flow (demo mode)
http://localhost:3000?demo
```

---

## TODO / Future Work

### Data
- [ ] Weather data seed (Open-Meteo historical fetch)
- [ ] Tier 2 ticker stories (weather crossovers)
- [ ] Missing Strava IDs (Four Corners, BoFax, Bourg d'Oisans)

### Features
- [ ] Find Me view (user's rank + surrounding riders)
- [ ] Club intro sequence (first-time cinematic)
- [ ] Aggregate leaderboards (KOM standings, Iron Rider)
- [ ] Keyboard navigation (arrows, space, F for fullscreen)
- [ ] Kiosk mode for event display

### Polish
- [ ] Loading state between segments
- [ ] More VHS artifacts (tracking lines, color bleed)
- [ ] "LIVE" indicator animation
- [ ] Mobile-optimized version

---

*Last updated: February 22, 2026*
