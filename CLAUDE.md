# CLAUDE.md - Mission Cycling Retrospective

## Quick Start

```bash
npm install
npm run dev    # http://localhost:3000
```

**Demo Mode:** Add `?demo` to URL to force the intro sequence without clearing DB.

## Project Overview

A broadcast-style leaderboard display for **Mission Cycling**, a San Francisco cycling club, showcasing their 2008-2022 era. The design mimics vintage TV sports broadcasts with modern web tech.

**Live URL:** https://missioncyclingorg.vercel.app

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS + custom CSS in `globals.css`
- **Animations:** Framer Motion
- **Language:** TypeScript
- **Database:** Supabase (PostgreSQL)
- **Auth:** Strava OAuth
- **Deployment:** Vercel (auto-deploys from GitHub main)

## Architecture

### Data Flow (Hybrid Model)
```
User clicks "Connect with Strava"
  → OAuth redirect → Strava authorizes → callback with code
  → Exchange code for tokens → Store in Supabase users table
  → Background sync starts:
    1. Fetch segment efforts for 8 segments (2008-2019)
    2. Fetch activity history (paginated, up to 900 rides)
    3. Store in segment_efforts + activities tables
    4. Match best times → create verified leaderboard entries
    5. Mark sync complete
  → Greatest Hits generated lazily (on first /api/greatest-hits/me call)
  → User sees their Highlights reveal
  → Broadcast starts with verified-only leaderboards
```

### Leaderboard States
- **ghost** — scraped data, hidden from display (in DB only)
- **verified** — Strava effort confirms, full color, profile pic, checkmark
- **unclaimed** — empty slots shown as "[ UNCLAIMED ]" in gray

**Key Decision:** Leaderboards ONLY show verified entries. Ghost entries stay in Supabase but are hidden from display.

## File Structure

```
app/
  page.tsx                    # Main orchestrator (splash → auth → sync → hits → broadcast)
  globals.css                 # All custom CSS
  layout.tsx                  # Root layout with Typekit fonts

  api/
    auth/
      strava/route.ts         # Initiates Strava OAuth redirect
      callback/route.ts       # Handles OAuth callback, creates user, starts sync
    user/me/route.ts          # Returns current authenticated user + sync progress
    sync/route.ts             # Background sync endpoint (segment efforts + activities)
    segments/route.ts         # Returns segments with verified leaderboard entries
    greatest-hits/me/route.ts # Returns user's generated greatest hits
    migrate-ghosts/route.ts   # One-time migration of JSON ghosts to Supabase

components/
  SplashScreen.tsx            # Click-to-start intro (gated mode with Strava button)
  SyncSequence.tsx            # Sync progress display with animated counters
  GreatestHitsReveal.tsx      # Post-sync personal highlights (3-5 cards)
  LeaderboardCard.tsx         # Main segment display (preview + leaderboard phases)
  LeaderboardRow.tsx          # Individual leaderboard row with animations
  ElevationProfile.tsx        # Animated SVG elevation chart
  Ticker.tsx                  # Bottom scrolling ticker with sponsors
  CommercialBreak.tsx         # Sponsor breaks between segments

lib/
  supabase.ts                 # Supabase client (server + browser)
  sync.ts                     # Full sync logic with progress reporting
  strava.ts                   # Strava API wrappers + token management
  greatest-hits.ts            # Personal superlative generator
  leaderboard.ts              # Ghost→verified transitions, rank calculation
  ticker-stories.ts           # Tier 1/2/3 story generators
  weather.ts                  # Open-Meteo historical weather
  sequence.ts                 # Broadcast sequence builder

data/
  segments.json               # Static segment data (8 segments)
  club-lore.ts                # Tier 3 curated stories

types/
  index.ts                    # All TypeScript types

public/
  video/                      # Background videos (~10-28MB each)
  sponsors/                   # Sponsor logos (transparent PNGs)
  sponsors/_audio/            # Sponsor voiceover clips (19 sponsors + intros)
  segment_audio/              # Segment voiceover clips (2 per segment)
  *.mp3                       # Background music (3 tracks)
```

## Onboarding Flow

### 1. Splash Screen (Gated Mode)
- Black background, MC logo centered
- "PREMIUM SUFFERING SINCE 2008"
- **[ Connect with Strava ]** button (Strava orange #FC4C02)
- Mobile visitors see "desktop required" message

### 2. Welcome Screen (0-3 seconds)
- Profile pic fades in (from Strava)
- "Welcome back, [First Name]" with city/state

### 3. Sync Sequence (30-90 seconds)
- Ambient audio plays (`/segment_audio/sync soundtrack 3.mp3`)
- Progress bar with animated counters
- Real-time messages: "Scanning Hawk Hill..." → "47 attempts. Best: 7:42"
- Date range and total distance display

### 4. Your Highlights Reveal
- "YOUR HIGHLIGHTS" title (2.5s)
- 3-5 personalized stat cards (4.5s each)
- Skip button available: `[skip]`
- Cards show title, big stat value, description

### 5. Broadcast Mode
- Background music starts
- First segment loads with voiceover
- Full leaderboard rotation begins
- Commercial breaks every 2-3 segments

## Commercial Breaks

Between segments, the CommercialBreak component plays:
1. **Intro clip** (random from 2 variations)
2. **"Sponsored by"** transition
3. **2-3 sponsor logos** with individual voiceover reads
4. Crossfade transitions between sponsors

Audio files in `/public/sponsors/_audio/`:
- `Mission cycling.mp3`, `The Mission Cycling Club of San Francisco.mp3` (intros)
- `sponsored by.mp3` (transition)
- `and 01.mp3`, `and 02.mp3`, `and 03.mp3` (conjunctions)
- Individual sponsor reads: `tartine bakery.mp3`, `delfina.mp3`, etc.

## Segment Audio

Each segment has 2 voiceover variations in `/public/segment_audio/`:
- `hawk hill 01.mp3`, `hawk hill 02.mp3`
- `radio road 01.mp3`, `radio road 02.mp3`
- etc.

Volume: 40% (`audio.volume = 0.40`)

## Current Segments (8 total)

| Segment | Strava ID | Category | Distance | Elevation |
|---------|-----------|----------|----------|-----------|
| Hawk Hill | 229781 | Cat 4 | 1.65mi | 511ft |
| Radio Road | 241885 | Cat 3 | 1.49mi | 563ft |
| Old La Honda | 8109834 | Cat 2 | 3.13mi | 1275ft |
| Hwy 1 from Muir Beach | 4793848 | Cat 3 | 1.91mi | 694ft |
| Alpe d'Huez | 652851 | HC | 7.47mi | 3436ft |
| Four Corners | TBD | Cat 3 | 2.12mi | 822ft |
| BoFax Climb | TBD | Cat 2 | 3.93mi | 1486ft |
| Bourg d'Oisans | TBD | Cat 4 | 7.73mi | 813ft |

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>

# Strava OAuth
STRAVA_CLIENT_ID=60
STRAVA_CLIENT_SECRET=<secret>
NEXT_PUBLIC_BASE_URL=http://localhost:3000  # or production URL

# Feature Flags
NEXT_PUBLIC_GATE_MODE=gated  # 'gated' requires Strava auth, 'open' allows browsing
```

## Animation Timing

```
INITIAL_DELAY = 800ms         # Delay before card opens
CLOSE_DURATION = 600ms        # Card close animation
SEGMENT_DURATION = 38000ms    # Total time per segment
VIEWING_DURATION = 30000ms    # 30s viewing complete leaderboard

# Sync Sequence
Poll interval: 1500ms
Progress bar animation: ease-out

# Greatest Hits Reveal
Title hold: 2500ms
Card duration: 4500ms each
Fadeout: 1000ms

# Commercial Break
Intro: 3000ms
Sponsor logo: 4000ms each
Crossfade: 800ms
```

## Brand Colors

```css
--mc-blue: #BAE0F7;           /* Primary brand color (Pantone 290) */
--strava-orange: #FC4C02;     /* Strava CTA */
--ticker-bg: #1a1d21;         /* Ticker background */
```

## Common Tasks

### Test onboarding flow
```bash
# Add ?demo to URL to force intro sequence
http://localhost:3000?demo
```

### Change segment duration
Edit `VIEWING_DURATION` in `page.tsx`

### Change music volume
Edit `audioRef.current.volume` in `page.tsx` (currently 0.11)

### Change voiceover volume
Edit `audio.volume` in `LeaderboardCard.tsx` (currently 0.40)

### Add new sponsor
1. Add logo to `/public/sponsors/`
2. Add voiceover to `/public/sponsors/_audio/`
3. Update `SPONSORS` array in `Ticker.tsx`
4. Update sponsor list in `CommercialBreak.tsx`

## Database Schema (Supabase)

Key tables:
- `users` — Strava athletes with tokens, sync status, profile data
- `activities` — User ride history (2008-2019)
- `segment_efforts` — Best times per user per segment
- `leaderboard_entries` — Verified leaderboard rows (status: ghost/verified)
- `greatest_hits` — Generated personal superlatives
- `ticker_stories` — Generated ticker content (Tier 1/2/3)
- `weather_daily` — Historical SF weather (for Tier 2 stats)

## Deployment

- **GitHub:** https://github.com/dylan-monday/missioncycling
- **Vercel:** Auto-deploys on push to main
- **Supabase:** Project ID in env vars

## Related Documentation

- `BACKLOG_V2.md` — Full implementation plan and session guide
- `AUTH_UX_SPEC.md` — Detailed onboarding/auth flow spec
- `COMMERCIAL_BREAK_SPEC.md` — Sponsor break specifications
- `STAT_CATALOG.md` — All computable stats for Greatest Hits and Ticker
- `CC_SESSION_ONBOARDING.md` — Onboarding implementation details
- `CONTENT_PLAN.md` — Interstitials, club lore, asset inventory

## Vercel Deployment

All these environment variables must be set in Vercel Dashboard → Settings → Environment Variables:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `STRAVA_CLIENT_ID` | Strava API app client ID |
| `STRAVA_CLIENT_SECRET` | Strava API app secret |
| `NEXT_PUBLIC_BASE_URL` | Production URL (https://missioncyclingorg.vercel.app) |
| `NEXT_PUBLIC_GATE_MODE` | Set to `gated` to require Strava auth |

**Strava API Settings** (https://www.strava.com/settings/api):
- Authorization Callback Domain: `missioncyclingorg.vercel.app`

## Known Issues

- Videos must be web-compressed (<100MB) for GitHub
- Browser autoplay policy blocks audio until user interaction
- Some segment Strava IDs are TBD (Four Corners, BoFax, Bourg d'Oisans)
- Stale cookies after clearing user data cause auth loops (clear cookies to fix)

## Debugging

### Clear user data for fresh test
Run in Supabase SQL Editor (replace strava_id with actual ID):
```sql
DELETE FROM leaderboard_entries WHERE user_id = (SELECT id FROM users WHERE strava_id = 1205);
DELETE FROM greatest_hits WHERE user_id = (SELECT id FROM users WHERE strava_id = 1205);
DELETE FROM segment_efforts WHERE user_id = (SELECT id FROM users WHERE strava_id = 1205);
DELETE FROM activities WHERE user_id = (SELECT id FROM users WHERE strava_id = 1205);
DELETE FROM athlete_koms WHERE user_id = (SELECT id FROM users WHERE strava_id = 1205);
DELETE FROM users WHERE strava_id = 1205;
```
Then clear browser cookies or use incognito.

### Test API endpoints
```javascript
// In browser console on the site
fetch('/api/user/me').then(r => r.json()).then(console.log)
```

### Check session cookie
DevTools → Application → Cookies → look for `mc_session`

## Recent Fixes (Feb 24, 2026)

### Audio Issues
- **Highlights audio not playing**: Audio element now renders in all app states so ref is always available
- **Audio stopping during transitions**: GreatestHitsReveal only fades out audio if it owns it (not when using external ref)
- **Audio continuing through states**: Highlights audio continues through broadcast_intro, fades out when entering broadcast

### Auth/Session Issues
- **Cookie not persisting**: Fixed by setting cookie on `NextResponse` object instead of using `cookies().set()` (required for App Router redirects)
- **Auth loop (Strava → splash → Strava)**: New users with `sync_status='pending'` now go directly to welcome screen, not back to splash

### Sync/Performance Issues
- **Sync timeout on Vercel**: With large activity counts (700+), sync was timing out during greatest hits generation. Fixed by lazy-loading greatest hits - they're now generated on-demand when `/api/greatest-hits/me` is called, not during sync

### Visual Issues
- **Skip button flickering**: Moved outside AnimatePresence for stable positioning during card transitions
- **Content showing through fadeout**: Added z-index to highlights overlay

## Supabase Security Hardening (Feb 25, 2026)

Resolved all 3 errors and 8 warnings from Supabase Security Advisor:

- **RLS enabled** on `segments`, `sponsors`, `sync_log` — segments/sponsors get public SELECT policy, sync_log has no anon access (service role only)
- **Function search_path set** on `recalculate_ranks`, `get_user_rank`, `get_surrounding_riders`
- **Overly permissive RLS policies replaced** on `athlete_koms` and `weather_daily` — dropped "always true" INSERT/UPDATE/DELETE policies, replaced with single SELECT-only policy. Service role bypasses RLS for writes.

## Future Work

- [ ] Club membership gating (restrict to MC Strava club members, ID: 15)
- [ ] Weather data integration (Tier 2 stats)
- [ ] Find Me view (show user's rank + surrounding riders)
- [ ] Club intro sequence (first-time cinematic)
- [ ] Aggregate leaderboards (KOM standings, Iron Rider)
- [ ] Keyboard navigation (arrows, space, F for fullscreen)
- [ ] Kiosk mode for event display

---

*Last updated: February 25, 2026*
