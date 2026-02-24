# Mission Cycling Retrospective

## Project Overview

A broadcast-style web experience celebrating Mission Cycling, a San Francisco cycling club active from 2008-2022. The app displays segment leaderboards with a modern sports broadcast aesthetic (NBC Tour de France style), featuring animated reveals, video backgrounds, and nostalgic club data.

**Tagline:** "Premium Suffering Since 2008"

**Live URL:** https://missioncycling.vercel.app (pending)
**Domain:** missioncycling.org

---

## Tech Stack

| Service | Details |
|---------|---------|
| **Framework** | Next.js 14 (App Router) |
| **Styling** | Tailwind CSS |
| **Animation** | Framer Motion |
| **Database** | Supabase (https://rtkpxftshujcqdznyncq.supabase.co) |
| **Hosting** | Vercel (dylan-monday/missioncycling) |
| **Auth** | Strava OAuth (Client ID: 60) |
| **Repo** | https://github.com/dylan-monday/missioncycling |

---

## Brand Assets

| Asset | Location | Notes |
|-------|----------|-------|
| Primary Logo | `/_assets/mc_logo.svg` | Circular badge, Pantone 290 blue (#BAE0F7) |
| Secondary Emblem | `/_assets/mc_emblem.svg` | MC/SF mark |
| Jersey Icons | `/_assets/mission_*_shirts_60x60.png` | White (1st), Black/Blue (2nd), Green (3rd), Black (4+) |
| Sponsor Logos | `/_sponsors/` | Tartine, Flour+Water, Bespoke, Weird Fish, etc. |
| Video Backgrounds | `/public/videos/mc_broadcast_01-05.mp4` | Compressed drone footage per segment |
| Audio Tracks | `/public/audio/mc_theme_01-03.mp3` | Randomized broadcast theme music |

**Typography:** Tablet Gothic (via Adobe Fonts)
**Primary Accent:** #BAE0F7 (Pantone 290)
**Strava Orange:** #FC4C02

---

## Current Segments

| Segment | Strava ID | Distance | Elevation | Grade | Cat |
|---------|-----------|----------|-----------|-------|-----|
| Hawk Hill | 229781 | 1.65mi | 511ft | 6.8% | 4 |
| Radio Road from Underpass | 241885 | 1.49mi | 563ft | 7.2% | 3 |
| Old La Honda Road | 8109834 | 3.13mi | 1275ft | 7.8% | 2 |
| Hwy 1 Climb from Muir Beach | 4793848 | 1.91mi | 694ft | 6.0% | 3 |
| Alpe d'Huez | 652851 | 7.47mi | 3436ft | 8.8% | HC |

---

## User Flow

```
1. SPLASH SCREEN
   - Black background
   - MC logo centered
   - "PREMIUM SUFFERING SINCE 2008"
   - "Click to begin"
   - On click: random audio track starts, fade to main view

2. SEGMENT CARD OPENS
   - Video background fades in (segment-specific)
   - Frosted glass card slides up
   - Left panel: Logo, segment name, stats

3. SEGMENT PREVIEW (right side of card)
   - Animated elevation profile draws in
   - Stats appear: Distance, Elevation, Grade, Category
   - Hold 4 seconds

4. TOP 3 REVEAL
   - Preview fades out
   - Top 3 riders slam in dramatically (large, with jerseys)
   - Hold 2 seconds

5. FULL LEADERBOARD
   - Top 3 compress
   - Rows 4-10 fade in
   - Ticker scrolls at bottom

6. NAVIGATION
   - Left/right arrows to switch segments
   - Repeat from step 2 for new segment
```

---

## Components

### Built
- [x] Splash screen with audio initialization
- [x] Main broadcast card (frosted glass)
- [x] Leaderboard rows with jersey icons
- [x] Bottom ticker with sponsor rotation
- [x] Segment navigation arrows
- [x] Video backgrounds
- [x] Double line (Pantone 290) above ticker

### In Progress
- [ ] Segment preview with animated elevation profile
- [ ] Top 3 hero animation state
- [ ] Dynamic ticker content (real stats, not placeholder)

### Not Started
- [ ] Strava OAuth ("Claim Your Spot")
- [ ] Supabase data layer
- [ ] Admin panel for segment management
- [ ] "Find Me" view (personalized rank)
- [ ] Attract/kiosk mode (auto-rotate segments)

---

## Ticker Content (Dynamic)

The ticker should rotate through meaningful, engaging stats:

**Segment-Specific:**
- "[Segment] Record: [Name] — [Time]"
- "Most [Segment] Attempts: [Name] — [X] efforts"
- "Latest PR: [Name] — [Time] ([Date])"
- "[X] unclaimed spots — Claim yours"

**Club-Wide:**
- "Local Legend: [Name] — [X] total segment attempts"
- "Total club miles 2008-2022: 847,293"
- "Club Members Active: [X]"
- "Premium Suffering Since 2008"

---

## Data Structure

### Supabase Tables

```sql
-- Segments
CREATE TABLE segments (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  strava_id TEXT UNIQUE,
  distance TEXT,
  elevation TEXT,
  grade TEXT,
  category TEXT,
  location TEXT,
  video_url TEXT,
  elevation_svg TEXT,
  enabled BOOLEAN DEFAULT true
);

-- Users (Strava OAuth)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  strava_id TEXT UNIQUE NOT NULL,
  name TEXT,
  profile_pic TEXT,
  connected_at TIMESTAMP
);

-- Leaderboard Entries
CREATE TABLE leaderboard_entries (
  id UUID PRIMARY KEY,
  segment_id UUID REFERENCES segments(id),
  rank INTEGER NOT NULL,
  rider_name TEXT NOT NULL,
  time TEXT NOT NULL,
  gap TEXT,
  date TEXT,
  user_id UUID REFERENCES users(id),
  claimed BOOLEAN DEFAULT false
);

-- Sponsors
CREATE TABLE sponsors (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  active BOOLEAN DEFAULT true,
  order_index INTEGER
);
```

---

## Strava API Integration

**App Details:**
- Client ID: 60
- Callback Domain: missioncycling.org (update from localhost)
- Scopes needed: `read`, `activity:read`

**Endpoints to Use:**
- `GET /segments/{id}` — Segment details
- `GET /segments/{id}/leaderboard` — Club leaderboard
- `GET /segments/{id}/streams` — Elevation data for profile SVG
- `GET /athlete` — User info after OAuth

**OAuth Flow:**
1. User clicks "Claim Your Spot"
2. Redirect to Strava authorization
3. User approves, redirects back with code
4. Exchange code for access token
5. Fetch user's segment efforts
6. Match to leaderboard, mark as "claimed"
7. Their name appears with verified badge

---

## Future Features

### Phase 2: Full Strava Integration
- [ ] Live leaderboard data from Strava API
- [ ] Claim your spot OAuth flow
- [ ] Verified badges for claimed riders
- [ ] Auto-generated elevation profiles from stream data

### Phase 3: Engagement
- [ ] "Find Me" personalized view (your rank ± 5 riders)
- [ ] Shareable stats cards (social images)
- [ ] Push notifications for new PRs
- [ ] Head-to-head comparisons

### Phase 4: Kiosk/Display Mode
- [ ] Auto-rotate through segments
- [ ] Interstitials between segments (sponsor cards, club photos, stats)
- [ ] QR code overlay for "Scan to Claim"
- [ ] Optimized for bike shop wall displays

### Phase 5: Archive & Nostalgia
- [ ] Historic photos gallery
- [ ] Club timeline (2008-2022)
- [ ] "The Monument" — scrolling credits of all members
- [ ] Sponsor memorial ("Thanks to our partners")

---

## Design References

**Primary Inspiration:** NBC Tour de France broadcast graphics (2022)
- Frosted glass cards over mountain backgrounds
- Yellow jersey iconography
- Stats reveal animations
- Ticker with stage info

**Original Direction (shelved):** 1988 CBS Sports Sunday aesthetic
- Red-to-blue gradients
- Chunky yellow italic type with black outlines
- VHS scan lines
- Decided modern broadcast was more achievable

**Design Files:** `/_design reference/` folder contains mockups for:
- Splash screen
- Card closed state
- Card opening state
- Top 3 hero state
- Full 10 leaderboard

---

## Audio

Three broadcast theme tracks (randomized on load):
- `/public/audio/mc_theme_01.mp3`
- `/public/audio/mc_theme_02.mp3`
- `/public/audio/mc_theme_03.mp3`

**Suno Prompts Used:**
```
Main Theme:
1986 TV sports broadcast theme, Tour de France coverage, John Tesh era CBS sports, triumphant synthesizer fanfare, Oberheim OB-8 brass stabs, LinnDrum percussion, gated reverb snare, ascending melodic motif, heroic and emotional, European grandeur, cycling montage energy, analog warmth, VHS tape saturation, 100 BPM, instrumental, no vocals, 30 second loop

Style tags: 80s sports theme, synth orchestra, broadcast music, cinematic, triumphant, analog synthesizer, retro TV
```

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://rtkpxftshujcqdznyncq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[from Supabase dashboard]
STRAVA_CLIENT_ID=60
STRAVA_CLIENT_SECRET=[from Strava API settings]
```

---

## Quick Commands

```bash
# Run locally
npm run dev

# Push to GitHub (auto-deploys to Vercel)
git add .
git commit -m "message"
git push origin main

# Compress video files
ffmpeg -i "input.mp4" -c:v libx264 -crf 25 -preset slow -an -movflags +faststart -vf "scale=1920:1080" output_web.mp4
```

---

## Current Issues / Blockers

1. **Card opacity** — Still tweaking the frosted glass effect to match NBC reference
2. **Segment preview** — Elevation profile animation not yet implemented
3. **Top 3 hero state** — Animation sequence not yet built
4. **Ticker content** — Currently placeholder, needs real dynamic stats
5. **Strava API** — Not yet connected, running on static data

---

## Files Reference

```
/missioncycling
├── /app
│   ├── page.tsx              # Main broadcast view
│   ├── /admin                 # Admin panel (future)
│   └── /api                   # API routes for Strava OAuth
├── /components
│   ├── SplashScreen.tsx
│   ├── BroadcastCard.tsx
│   ├── Leaderboard.tsx
│   ├── LeaderboardRow.tsx
│   ├── SegmentPreview.tsx     # TODO: elevation animation
│   ├── ElevationProfile.tsx   # TODO: SVG drawing
│   ├── Ticker.tsx
│   └── VideoBackground.tsx
├── /public
│   ├── /assets               # Logos, jerseys
│   ├── /videos               # Background clips
│   ├── /audio                # Theme music
│   └── /sponsors             # Sponsor logos
├── /data
│   └── segments.json         # Static segment data
└── /lib
    ├── supabase.ts
    └── strava.ts
```

---

## Contact / Credits

**Project Lead:** Dylan DiBona
**Club:** Mission Cycling (San Francisco, 2008-2022)
**Website:** missioncycling.org

---

*Last Updated: February 2026*
