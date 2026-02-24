# CLAUDE_CODE_CONTEXT.md — Mission Cycling Backend Implementation

## What This Is
A broadcast-style web experience for Mission Cycling (SF cycling club, 2008-2022). Next.js 14, Tailwind, Framer Motion. The frontend exists and works. Backend data layer is now functional.

**Live:** https://missioncyclingorg.vercel.app
**Repo:** https://github.com/dylan-monday/missioncycling

## What's Been Built

### Completed (Sessions 1-4)
- [x] Supabase schema and tables
- [x] Strava OAuth flow (login, callback, token storage)
- [x] Full sync service (segment efforts + activities)
- [x] Progress reporting during sync (real-time updates)
- [x] Greatest Hits generator
- [x] Verified-only leaderboard display
- [x] Complete onboarding flow (splash → auth → sync → hits → broadcast)
- [x] Commercial breaks with sponsor audio
- [x] Segment voiceovers
- [x] Demo mode (`?demo` URL param)

### Not Yet Built
- [ ] Weather data integration (Tier 2 stats)
- [ ] Find Me view
- [ ] Club intro sequence
- [ ] Aggregate leaderboards (KOM, Iron Rider)
- [ ] Interstitial cards (club photos, did you know, era cards)

## Critical Strava API Constraints
- **No club leaderboard endpoint.** Strava removed it.
- Each OAuth user only grants access to THEIR data
- We get: their segment efforts, activity history, athlete profile
- We don't get: other people's data, club-wide leaderboards
- Rate limits: 200/15min, 2000/day. A full user sync costs ~15-25 calls.
- Club ID: 15. Strava Client ID: 60.

## Architecture

### Data Flow
```
User clicks "Connect with Strava"
  → OAuth redirect → Strava authorizes → callback with code
  → Exchange code for tokens → Store in Supabase users table
  → Background sync starts:
    1. Fetch segment efforts for 8 segments (2008-2019)
    2. Fetch activity history (paginated, up to 900 rides)
    3. Store in segment_efforts + activities tables
    4. Create/update verified leaderboard entries
    5. Generate Greatest Hits
    6. Mark sync complete
  → User sees their Greatest Hits card
  → Broadcast starts with verified-only leaderboards
```

### Leaderboard Entry States
- **ghost** — scraped data, HIDDEN from display (in DB only)
- **verified** — Strava effort confirms, shown with full color + profile pic
- **unclaimed** — empty slots in top 10, shown as "[ UNCLAIMED ]"

**Key Decision:** Leaderboards ONLY show verified entries. Ghosts stay hidden.

### Ticker Tiers
- **Tier 1:** Auto from Strava (segment records, club stats, rivalries)
- **Tier 2:** Strava × Open-Meteo weather (rides in rain/cold/wind) — NOT YET BUILT
- **Tier 3:** Manually curated club lore (stories, founding moments)

## Files in the Codebase

### API Routes
```
app/api/
  auth/strava/route.ts        — Initiates Strava OAuth redirect
  auth/callback/route.ts      — Handles OAuth callback, creates user, starts sync
  user/me/route.ts            — Returns authenticated user + sync progress
  sync/route.ts               — Background sync endpoint
  segments/route.ts           — Returns segments with verified leaderboards
  greatest-hits/me/route.ts   — Returns user's generated greatest hits
  migrate-ghosts/route.ts     — One-time ghost migration
```

### Components
```
components/
  SplashScreen.tsx            — Gated mode with Strava button
  SyncSequence.tsx            — Sync progress with animated counters
  GreatestHitsReveal.tsx      — Post-sync personal highlights (3-5 cards)
  LeaderboardCard.tsx         — Main segment display
  LeaderboardRow.tsx          — Individual leaderboard row
  ElevationProfile.tsx        — Animated SVG elevation chart
  Ticker.tsx                  — Bottom scrolling ticker
  CommercialBreak.tsx         — Sponsor breaks between segments
```

### Library Files
```
lib/
  supabase.ts                 — Supabase client (server + browser)
  sync.ts                     — Full sync logic with progress reporting
  strava.ts                   — Strava API wrappers + token management
  greatest-hits.ts            — Personal superlative generator
  leaderboard.ts              — Rank calculation, gap display
  ticker-stories.ts           — Tier 1/2/3 story generators
  weather.ts                  — Open-Meteo historical weather (not yet seeded)
  sequence.ts                 — Broadcast sequence builder
```

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://rtkpxftshujcqdznyncq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from dashboard>
SUPABASE_SERVICE_ROLE_KEY=<from dashboard>
STRAVA_CLIENT_ID=60
STRAVA_CLIENT_SECRET=<from Strava API settings>
NEXT_PUBLIC_BASE_URL=https://missioncycling.org (or localhost:3000)
NEXT_PUBLIC_GATE_MODE=gated
```

## Key Segments (with real Strava IDs)
| Segment | Strava ID | Slug |
|---|---|---|
| Hawk Hill | 229781 | hawk-hill |
| Radio Road | 241885 | radio-road |
| Old La Honda | 8109834 | old-la-honda |
| Hwy 1 from Muir Beach | 4793848 | hwy1-muir-beach |
| Alpe d'Huez | 652851 | alpe-dhuez |
| Four Corners | TBD | four-corners |
| BoFax Climb | TBD | bofax-climb |
| Bourg d'Oisans | TBD | bourg-doisans |

## Content Plan Reference

See `CONTENT_PLAN.md` for full details on:
- Interstitial card types and specs
- Club lore (Headlands Raiders, Peroni Sprint, Delfina, Gentlemen's Races, etc.)
- Asset needs (photos, apparel shots, era content)
- Sponsor audio inventory (19 sponsors, 2 intros, filenames)
- Segment audio inventory (2 reads per segment, filenames)
- Stat catalog reference (points to `STAT_CATALOG.md`)

## Design Principles
- Broadcast aesthetic (NBC Tour de France style, not a web app)
- Ghost entries are hidden — motivates auth to see more names
- Every member gets something to be proud of (Greatest Hits)
- Ticker tells stories, not just stats
- Commercial breaks make it feel like TV, not a slideshow
- "Premium Suffering Since 2008" is the tone for everything

## Sponsor Assets
- Logos: `/public/sponsors/*.png` (transparent PNGs)
- Audio intros: `/public/sponsors/_audio/Mission cycling.mp3`, `The Mission Cycling Club of San Francisco.mp3`
- Audio transition: `/public/sponsors/_audio/sponsored by.mp3`
- Audio reads: `/public/sponsors/_audio/<sponsor name>.mp3` — 19 total
- Commercial break plays: intro → "sponsored by" → 2-3 sponsor logos with audio reads

## Segment Audio
- Location: `/public/segment_audio/`
- Format: `<segment name> 01.mp3`, `<segment name> 02.mp3` (2 variations each)
- Volume: 40% (`audio.volume = 0.40`)
- Sync soundtracks: `sync soundtrack 1.mp3`, `sync soundtrack 2.mp3`, `sync soundtrack 3.mp3`

## Testing

### Demo Mode
Add `?demo` to URL to force the intro sequence without clearing DB:
```
http://localhost:3000?demo
```

### Full Test Sequence
1. Clear user data from Supabase (users, segment_efforts, activities, greatest_hits)
2. Load localhost:3000 — should see splash with Strava button
3. Click Connect with Strava → auth → redirect back
4. See welcome screen with profile pic and name
5. Sync sequence plays with real-time messages
6. Greatest Hits cards reveal (3-5 cards, [skip] button available)
7. Broadcast starts with leaderboard showing verified entries only

## Next Implementation Sessions

### Session 5: Weather Data & Tier 2 Stats
- Seed weather_daily via Open-Meteo fetch
- Generate Tier 2 ticker stories after sync
- Cross-reference greatest hits with weather

### Session 6: Find Me View
- Show user's rank + surrounding riders
- "You'd need to shave X seconds to crack the top 10"

### Session 7: Club Intro Sequence
- First-time cinematic intro
- Logo reveal → stat counters → segment map

### Session 8: Full Interstitials
- Club photo cards with Ken Burns effect
- "Did You Know" stat cards
- Era summary cards

---

*Last updated: February 22, 2026*
