# Mission Cycling — Product Backlog v2 (Implementation Guide)

*Updated: February 22, 2026*

This document is the source of truth for what we're building and in what order. It's designed to be fed to Claude Code alongside the codebase for implementation sessions.

---

## Data Strategy: The Hybrid Model

Strava removed public segment leaderboards from their API. Each user who authenticates via OAuth only grants access to **their own** data. No club-wide leaderboard endpoint exists.

**Our approach: Ghost leaderboard + crowdsourced verification.**

| Layer | Source | When |
|---|---|---|
| Ghost leaderboard | Scraped Strava screenshots → `segments.json` | Exists now |
| Verified entries | Individual OAuth → user's best segment efforts | Each user login |
| Activity history | Individual OAuth → all user rides | Each user login |
| Weather data | Open-Meteo historical API (free, no key) | One-time bulk fetch |
| Club lore | Manual curation | Ongoing editorial |

Every member who authenticates contributes their data to Supabase. After 40-50 logins, the leaderboard is rebuilt organically — richer than Strava's because we also have activity history, weather crossovers, and computed superlatives.

---

## Launch Strategy: Hybrid Provocation

### Pre-Launch: Seed Group (~10 riders)
- Dylan authenticates first, appears on every leaderboard
- Recruit ~10 riders to auth before public email
- Each seed rider gets Greatest Hits generated, leaderboard entries verified
- Ticker has real stats. Experience isn't barren.

### Launch Email
*"I'm currently #1 on Hawk Hill. Someone come fix that."*

The site shows ghost leaderboards (faded, unverified), Dylan ranked where he shouldn't be, prominent "Connect with Strava" CTA. Ego does the rest.

### Post-Launch Progression
1. Fast riders log in first (ego). Top 10s become legitimate.
2. Mid-pack riders log in for "Find Me" view. Ticker gets richer.
3. After ~40 logins, backfill remaining spots with ghost data.

---

## Immediate Reward: Greatest Hits

The moment you authenticate, you get a personal highlight reel. You don't have to be fast to be interesting.

**Categories (generated from Strava data):**
- `fastest_segment` — "Your best time on Hawk Hill: 7:42, #31 of 161"
- `most_attempts` — "You've done Hawk Hill 47 times. That's more than 89% of the club."
- `most_improved` — "You shaved 2:14 off your Old La Honda time between 2014 and 2019"
- `biggest_climb` — "8,400 ft of climbing on Oct 12, 2017"
- `longest_ride` — "142 miles on June 8, 2019"
- `iron_rider` — "You've conquered 6 of 8 Mission Cycling segments"
- `most_rides_year` — "147 rides in 2016. That's 2.8 per week."
- `early_bird` / `night_owl` — "23 rides before 7am. Dawn patrol."
- `all_weather` — "48 miles in 2.1 inches of rain on Feb 7, 2017. Respect."
- `first_ride` / `last_ride` — "Member since March 2011"
- `total_distance` — "12,400 miles. That's SF to New York and back. Twice."
- `custom` — Everyone gets a title, even if it's niche: "Most Hawk Hill attempts in 2016"

**Implementation:** `lib/greatest-hits.ts` — analyzer runs on auth, stores results in `greatest_hits` table.

---

## Leaderboard: Ghost → Verified

### Visual States
| Status | Look | How it gets there |
|---|---|---|
| **Ghost** | Faded row, no profile pic, "?" or dim jersey icon | Scraped data, no one has claimed it |
| **Claimed** | Partial color, matched name | User authed, name fuzzy-matched to ghost |
| **Verified** | Full color, profile pic, Strava orange checkmark, jersey | User's Strava effort confirms the time |

### Transition Logic
When a user authenticates:
1. Fetch their segment efforts via `GET /segment_efforts?segment_id={id}`
2. Find their best time per segment
3. Fuzzy-match their name against ghost entries (Levenshtein distance ≤ 2)
4. If match found + times within 5s → verify ghost, attach user_id + profile pic
5. If match found + times differ → update with Strava time (authoritative), re-rank
6. If no match → insert new entry, re-rank entire segment

**Implementation:** `lib/leaderboard.ts` — `processUserEfforts()` handles all transitions.

### "Find Me" View
When authenticated user views a segment where they're ranked:
- Show positions (rank-5) through (rank+5) centered on them
- Their row highlighted with distinct style (Strava orange border/glow)
- Bottom stat: "You'd need to shave 47 seconds to crack the top 10"

**Implementation:** `lib/leaderboard.ts` — `buildFindMeView()`, Supabase function `get_surrounding_riders()`.

---

## Ticker: Three Tiers

### Tier 1: Auto-generated (from Strava data as users sync)
- Segment records: "[Segment] Record: [Name] — [Time]"
- Rivalries: "Closest battle on Hawk Hill: [Name] and [Name] separated by 2 seconds"
- Club stats: "Combined club mileage: 847,293 miles"
- Superlatives: "Longest club ride ever: [Name] — 142 miles"
- CTA: "37 unclaimed spots on Old La Honda — Connect Strava to claim yours"

### Tier 2: Weather crossovers (Strava data × Open-Meteo)
- "Coldest club ride: [Name] — 62 miles at 38°F on Jan 14, 2014"
- "Wettest ride ever: [Name] — 48 miles in 2.1 inches of rain"
- "Most rides in 2017: [Name] — 147 rides"
- "3 riders went out on Christmas 2015. Priorities."
- "First Mission Cycling ride on record: [Name] — Oct 12, 2008"
- "Last Mission Cycling ride logged: [Name] — Nov 3, 2022"

### Tier 3: Curated club lore (editorial, manual)
- "The sexiest cycling club on 18th Street — Est. 2008"
- "Flour+Water post-ride pasta: the unofficial recovery protocol since 2012"
- "Hawk Hill: Where PRs are made and legs are broken."
- [FILL] Collect real stories from members

### Ticker Engine
Weighted random selection, context-aware:
- Boosts segment-specific stories 2.5× when that segment is active
- Never repeats within N stories
- Rotates through categories for variety

**Implementation:** `lib/ticker-stories.ts` — generators + `selectNextStory()` engine.

---

## Interstitials & Commercial Breaks

Between every 2-3 leaderboard segments, insert a "commercial break" (2-3 cards):

### Types
| Type | Content | Duration |
|---|---|---|
| `sponsor` | Full-screen logo + AI voiceover: "Mission Cycling. Sponsored by Tartine." | 4-5s |
| `merch` | MC merchandise photo + URL + promo code | 5s |
| `club_photo` | Historical club photo with Ken Burns effect + caption | 5s |
| `did_you_know` | Big stat card: "DID YOU KNOW? MC members have climbed Everest 47× collectively." | 5s |
| `club_lore` | Tier 3 story as full-screen card (origin story, era cards, memorable moments) | 5-6s |
| `greatest_hit` | Highlight a member's greatest hit (with permission) | 5s |

### Scheduling Rules
- Never interrupt mid-leaderboard
- Vary types within a break (don't show 3 sponsors in a row)
- Randomize selection, don't repeat within session
- Special leaderboards (KOM standings, Iron Rider) appear after a commercial break

**Implementation:** `lib/sequence.ts` — `buildSequence()` + `SequenceManager` class.

---

## Backend Files (Already Built)

These files are ready to integrate into the Next.js codebase:

```
lib/
  schema.sql           — Supabase tables, indexes, RLS, helper functions, segment seeds
  strava.ts            — OAuth flow, token refresh, all API wrappers, sync plan
  greatest-hits.ts     — Personal superlative generator (runs on auth)
  ticker-stories.ts    — Tier 1/2/3 generators + weighted ticker engine
  weather.ts           — Open-Meteo historical fetch + weather superlatives
  leaderboard.ts       — Ghost→verified transitions, name matching, rank calc, Find Me
  sequence.ts          — Broadcast sequence builder + runtime manager

types/
  index.ts             — Full TypeScript types for all data models

data/
  club-lore.ts         — Tier 3 ticker stories + interstitials with [FILL] placeholders
```

---

## Implementation Order (for Claude Code sessions)

### Session 1: Database & Auth Foundation
**Goal:** Supabase tables live, OAuth flow works, first user can authenticate.

1. Run `schema.sql` in Supabase SQL Editor
2. Set environment variables in Vercel + `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (for server-side writes)
   - `STRAVA_CLIENT_ID` (60)
   - `STRAVA_CLIENT_SECRET`
   - `NEXT_PUBLIC_BASE_URL`
3. Create `/app/api/auth/strava/route.ts` — redirects to Strava OAuth
4. Create `/app/api/auth/callback/route.ts` — exchanges code, creates user in Supabase, starts sync
5. Create `/lib/supabase.ts` — server + client Supabase clients
6. Integrate `lib/strava.ts` for token exchange + refresh
7. Update Strava app callback domain: `missioncycling.org` (or staging URL)
8. **Test:** Click "Connect with Strava" → authenticate → user row appears in Supabase

### Session 2: Sync & Leaderboard Hydration
**Goal:** Authenticated user's segment efforts + activities flow into Supabase. Ghost entries transition to verified.

1. Build `/app/api/sync/route.ts` — background sync endpoint
   - Fetches segment efforts for all 8 segments (5 with real Strava IDs)
   - Fetches activity history (paginated, up to 500 rides)
   - Stores in `segment_efforts` and `activities` tables
   - Updates user's aggregate stats
2. Migrate existing `segments.json` ghost data into `leaderboard_entries` table
3. Integrate `lib/leaderboard.ts` — `processUserEfforts()` to upgrade ghosts
4. Wire up rank recalculation after each sync
5. **Test:** Auth → sync completes → ghost entry upgrades to verified → rank recalculates

### Session 3: Weather Data & Ticker
**Goal:** Weather cache populated. Ticker stories auto-generating.

1. Create `/app/api/weather/seed/route.ts` — one-time endpoint to fetch 2008-2022 weather from Open-Meteo and bulk insert into `weather_daily`
2. Run the seed (takes ~15 API calls, one per year)
3. After each user sync, run `generateTier1Stories()` and `generateTier2Stories()` → insert/upsert into `ticker_stories`
4. Seed Tier 3 stories from `data/club-lore.ts` into `ticker_stories` table
5. Update `Ticker.tsx` component to fetch from Supabase instead of placeholder data
6. Wire up `selectNextStory()` engine with segment context
7. **Test:** Ticker shows real stats, rotates through tiers, boosts current segment stories

### Session 4: Greatest Hits & Auth Reward
**Goal:** User authenticates → immediately sees their personal highlight reel.

1. After sync completes, run `generateGreatestHits()` → store in `greatest_hits` table
2. Build `GreatestHitsCard.tsx` component — broadcast-style reveal of 3-5 top hits
3. Wire into sequence: Greatest Hits card plays immediately after auth before returning to leaderboard rotation
4. Cross-reference with weather data for Tier 2 hits (rain rides, cold rides, etc.)
5. **Test:** Auth → sync → Greatest Hits card appears with personalized stats

### Session 5: Ghost/Verified Visual States
**Goal:** Leaderboard rows look different based on ghost/claimed/verified status.

1. Update `LeaderboardRow.tsx` to accept `status` prop
2. Ghost style: faded opacity, no profile pic, dim jersey, slightly desaturated
3. Verified style: full color, profile pic, Strava orange checkmark badge, jersey icon
4. Animate the transition: when a ghost goes verified mid-session, it "comes to life" (opacity + color + scale pulse)
5. Update data fetch in `LeaderboardCard.tsx` to pull from Supabase instead of static JSON
6. **Test:** Leaderboard shows mix of ghost and verified rows with distinct styles

### Session 6: Find Me View
**Goal:** Authenticated users can see their rank + surrounding riders.

1. Build `/app/api/leaderboard/find-me/route.ts` — returns surrounding riders for a user on a segment
2. Build `FindMeView.tsx` component (same broadcast animation style)
3. Add view toggle or automatic alternation (Top 10 first rotation, Find Me second)
4. Show "You'd need to shave X seconds to crack the top 10" stat
5. **Test:** Auth user sees themselves highlighted at rank #43 with riders 38-48 around them

### Session 7: Club Intro Sequence
**Goal:** First-time viewers see a 20-30 second cinematic intro before leaderboards.

1. Build `ClubIntro.tsx` component
2. Sequence: Logo reveal → animated stat counters (161 members, 8 segments, 14 years) → segment location map → "Let's see who suffered best" → fade to first segment
3. Store first-visit flag in localStorage (skip on return)
4. Wire into `lib/sequence.ts` as first item when `isFirstVisit: true`
5. **Test:** First visit shows intro, subsequent visits skip to leaderboards

### Session 8: Commercial Breaks & Interstitials
**Goal:** Sponsor spots, club photos, "Did You Know?" cards play between segments.

1. Seed `interstitials` and `sponsors` tables with initial content
2. Build `InterstitialCard.tsx` — full-screen card with type-specific layouts
3. Build `CommercialBreak.tsx` — plays 2-3 interstitials in sequence
4. Wire `lib/sequence.ts` into `page.tsx` — replace simple segment rotation with full sequence
5. **Stretch:** AI voiceover for sponsor spots (ElevenLabs or similar)
6. **Test:** Every 2-3 segments, a commercial break plays with varied content

### Session 9: Aggregate Leaderboards
**Goal:** Club KOM standings and Iron Rider leaderboards.

1. Build `/app/api/leaderboard/kom/route.ts` — query who holds the most #1 positions across segments
2. Build `/app/api/leaderboard/iron-rider/route.ts` — who has times on the most segments + combined time
3. Build `AggregateLeaderboard.tsx` component (different column layout than segment leaderboards)
4. Insert into sequence after commercial breaks
5. **Test:** KOM standings show correctly, Iron Rider shows segments-completed count

### Session 10: Polish & Kiosk Mode
1. Keyboard navigation (arrows, space to pause, F for fullscreen, M for music)
2. Kiosk/attract mode (auto-start, continuous loop, QR code overlay)
3. Preload next segment video
4. Analytics (Vercel Analytics or Plausible)
5. "The Monument" — scrolling credits of all 161 members as closing sequence

---

## Strava API Rate Limits

200 requests per 15 minutes, 2,000 per day.

**Per-user sync cost:** ~15-25 API calls
- 1 athlete stats call
- 5-8 segment effort calls (one per segment with real Strava ID)
- 5-10 activity history pages (100 per page)

**Day-one risk:** If 30 people auth on launch day = ~600 calls. Well within limits.

**Mitigation:**
- Queue syncs if multiple users auth simultaneously
- Cache everything in Supabase (no repeat fetches)
- Token refresh only when expired (check `expires_at` before every call)
- Log all API calls in `sync_log` table for debugging

---

## Asset Work

- [ ] **Frame edge metallic shine** — Current `frame edge.png` has solid bar + shadow baked into one image. To add broadcast-quality metallic shine animation:
  1. Split into `frame-edge-shadow.png` (just the drop shadow) and `frame-edge-solid.png` (bar + nav button with brushed metal/chrome texture)
  2. CSS will stack layers and animate shine sweep across solid layer only
  3. Consider subtle animated gradient highlight that travels across the chrome surface

---

## Open Questions

- [ ] **Strava IDs for Four Corners, BoFax, Bourg d'Oisans** — need real segment IDs
- [ ] **Club photos** — where do these live? Is there an archive?
- [ ] **Merchandise** — does MC have merch for sale? URL and promo code?
- [ ] **AI voiceover** — ElevenLabs? What voice style? Classic broadcaster? Cost?
- [ ] **Club historian** — who has institutional memory for Tier 3 stories?
- [ ] **"The Monument"** — full 161-member list. Source from Strava club members API?
- [ ] **Social sharing** — generate OG image cards for individual rider stats?

---

## Future Features

### Club Membership Gating
**Priority:** Before public launch

Currently anyone with Strava can authenticate and add their data. Before opening to the public, restrict data contribution to verified MC club members:

1. **On Strava auth callback**, check if user is a member of Mission Cycling club (ID: 15)
2. **If member**: Allow full experience (sync, greatest hits, leaderboard verification)
3. **If not member**: Show message "This experience is for Mission Cycling members. [Join the club on Strava]" with link to `https://www.strava.com/clubs/15`
4. **Later (post-content)**: Open passive viewing to anyone (no auth required), but data contribution remains club-only

**Implementation notes:**
- Strava API: `GET /athlete/clubs` returns user's club memberships
- Check for club ID 15 in the response
- Store `is_mc_member` boolean on user record
- Gate sync/verification behind membership check

### Other Future Work
- [ ] Find Me view (show user's rank + surrounding riders)
- [ ] Club intro sequence (first-time cinematic)
- [ ] Aggregate leaderboards (KOM standings, Iron Rider)
- [ ] Keyboard navigation (arrows, space, F for fullscreen)
- [ ] Kiosk mode for event display

---

## Files to Add to Repo

Copy these into the existing Next.js project:

```bash
# From this working session:
cp lib/schema.sql         → /lib/schema.sql        # Run in Supabase SQL Editor
cp lib/strava.ts          → /lib/strava.ts          # Replaces existing stub
cp lib/greatest-hits.ts   → /lib/greatest-hits.ts   # New
cp lib/ticker-stories.ts  → /lib/ticker-stories.ts  # New
cp lib/weather.ts         → /lib/weather.ts         # New
cp lib/leaderboard.ts     → /lib/leaderboard.ts     # New
cp lib/sequence.ts        → /lib/sequence.ts        # New
cp types/index.ts         → /types/index.ts         # New
cp data/club-lore.ts      → /data/club-lore.ts      # New
```

These files are self-contained with no external dependencies beyond the existing Next.js/TypeScript setup plus the Supabase JS client (`@supabase/supabase-js`).

---

*This is a living document. Update as features ship and priorities shift.*
