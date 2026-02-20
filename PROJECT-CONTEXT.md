# Mission Cycling Retrospective — Project Context

## Overview

A broadcast-style leaderboard display for Mission Cycling, a San Francisco cycling club, showcasing their 2008-2022 era. The design mimics 1988 CBS Sports Sunday aesthetics with a TV broadcast feel.

**Live at:** `http://localhost:3000` (run `npm run dev`)

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
- **Data:** Local JSON files (Strava API integration planned)

---

## File Structure

```
/app
  /page.tsx              — Main broadcast display
  /admin/page.tsx        — Admin panel (segment visibility toggles)
  /layout.tsx            — Root layout
  /globals.css           — Global styles, CRT effects, animations

/components
  /BroadcastBackground.tsx  — Background image + gradient overlays
  /ScanLines.tsx            — CRT scan line effects
  /Leaderboard.tsx          — Main leaderboard with animation phases
  /LeaderboardRow.tsx       — Individual row with phase-aware animations
  /SegmentSelector.tsx      — Tab buttons to switch segments

/data
  /club.json             — Club metadata (name, tagline, member count)
  /segments.json         — All segments with leaderboard data

/lib
  /parseMarkdown.ts      — Utility types/functions for data parsing

/public
  /mc_logo.svg           — Mission Cycling logo (horizontal)
  /mc_emblem.svg         — Mission Cycling emblem (circular)
  /hawkhill.jpg          — Background image
  /jersey_white.png      — 1st place jersey
  /jersey_green.png      — 2nd place jersey
  /jersey_black_blue.png — 3rd place jersey
  /jersey_black.png      — 4th+ place jersey

/_assets                 — Source assets (not served)
/_scraped info           — Original Strava data scrape + screenshots
```

---

## Data Sources

### Club Info (`/data/club.json`)
- Club ID: 15
- Name: Mission Cycling
- Location: San Francisco, CA
- Tagline: "The sexiest cycling club on 18th Street."
- Members: 161
- Era: 2008-2022

### Segments (`/data/segments.json`)
Each segment has:
- `id`, `name`, `strava_id`, `url`, `location`
- `distance` (km/mi), `elevation` (gain, lowest, highest)
- `grade`, `category` (Cat 4, Cat 3, HC)
- `clubMembers`, `clubBestTime`
- `visible` (toggle for admin)
- `mission_cycling_leaderboard[]` — array of entries

### Leaderboard Entry Shape
```typescript
{
  rank: number;
  name: string | null;      // null = unclaimed
  date: string | null;
  time: string;             // "8:23" or "1:06:08"
  speed: string | null;
  claimed: boolean;
}
```

### Current Segments
1. **Hawk Hill** (Cat 4) — Marin Headlands, 1.65mi, 511ft, 6.8%
2. **Radio Road from Underpass** (Cat 3) — San Bruno Mountain, 1.49mi, 563ft, 7.2%
3. **Old La Honda Road** (Cat 3) — Woodside, 3.0mi, 1290ft, 7.3%
4. **Hwy 1 Climb from Muir Beach** (Cat 3) — Marin County, 1.91mi, 694ft, 6.0%
5. **Alpe d'Huez** (HC) — France, 7.47mi, 3436ft, 8.8%

---

## Features Implemented

### Main Display (`/`)
- [x] 16:9 fixed aspect ratio (letterboxed)
- [x] Background image with gradient overlays
- [x] CRT scan lines (static + moving)
- [x] Segment selector tabs
- [x] Auto-advance segments every 30 seconds
- [x] Click anywhere to advance to next segment
- [x] Strava CTA button (placeholder, links to #)

### Leaderboard Animations
- [x] Dramatic segment title entrance (slam + blur + glow)
- [x] Stats slide in from right
- [x] Category badge pops in
- [x] **Top 3 appear sequentially, BIGGER** (1.25x scale, 500ms stagger)
- [x] **Pause**, then top 3 shrink to normal
- [x] Rows 4-10 appear sequentially (120ms stagger)
- [x] Club record bar fades in last

### Row Styling
- [x] Jersey icons by rank:
  - 1st: White jersey
  - 2nd: Green jersey
  - 3rd: Black/blue jersey
  - 4th+: Black jersey
  - Unclaimed: No jersey
- [x] Leader row: Yellow background + "LEADER" badge
- [x] Top 3: White/transparent gradient background
- [x] Unclaimed: "[ UNCLAIMED ]" in gray
- [x] Time gaps calculated from leader
- [x] Italic names with 2px black outline text-shadow

### Admin Panel (`/admin`)
- [x] List all segments
- [x] Toggle visibility per segment
- [x] Preview segment title styling
- [x] Add segment by Strava ID (local state only)

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

## CRT/Broadcast Effects

### In `globals.css`
- `.broadcast-frame::before` — Horizontal scan lines (2px interval, 0.3 opacity)
- `.broadcast-frame::after` — Vignette + RGB fringing

### In `ScanLines.tsx`
- Moving scan line bar (8px, sweeps down every 6s)
- CRT flicker (2% opacity variation)
- Phosphor glow simulation

### In `BroadcastBackground.tsx`
- Background image (`/hawkhill.jpg`)
- Left-to-right dark gradient (for text readability)
- Warm broadcast color wash (red top-left, blue bottom-right)
- CRT vignette

---

## Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

---

## TODO / Future Work

### Data
- [ ] Parse full leaderboard data from screenshot PNGs
- [ ] Wire up Strava OAuth for "Claim Your Spot"
- [ ] Fetch real segment data via Strava API
- [ ] Persist admin changes to JSON files

### Features
- [ ] Keyboard navigation (arrow keys to change segments)
- [ ] Sound effects for animations (optional)
- [ ] Full-screen mode button
- [ ] Segment-specific background images
- [ ] Weekly leaderboard view
- [ ] Member profile pages

### Polish
- [ ] Loading state between segments
- [ ] Exit animations when leaving segment
- [ ] More VHS artifacts (tracking lines, color bleed)
- [ ] "LIVE" indicator animation

---

## Brand Assets

| Asset | Path | Notes |
|-------|------|-------|
| Logo (horizontal) | `/public/mc_logo.svg` | "SF" text with cycling figure |
| Emblem (circular) | `/public/mc_emblem.svg` | Full wordmark in circle |
| Background | `/public/hawkhill.jpg` | Hawk Hill climb photo |
| White jersey | `/public/jersey_white.png` | 1st place |
| Green jersey | `/public/jersey_green.png` | 2nd place |
| Black/blue jersey | `/public/jersey_black_blue.png` | 3rd place |
| Black jersey | `/public/jersey_black.png` | 4th and below |

---

## Original Data Source

See `/_scraped info/mission-cycling-data.md` for the full Strava data capture including:
- Club overview and metadata
- Global leaderboards for each segment
- Club-filtered leaderboard data (from authenticated screenshots)
- Screenshot file index

---

*Last updated: 2026-02-19*
