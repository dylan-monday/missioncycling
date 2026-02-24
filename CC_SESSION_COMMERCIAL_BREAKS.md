# CC Session: Commercial Breaks + Hybrid Leaderboard Data

## Context
Read CLAUDE_CODE_CONTEXT.md, COMMERCIAL_BREAK_SPEC.md, and AUTH_UX_SPEC.md for full background.

The broadcast currently rotates through 8 segments using static data from /data/segments.json. We need to:
1. Wire the CommercialBreak component into the segment rotation
2. Merge the static leaderboard data (ghosts) with any live Supabase data (verified entries from authenticated users)
3. Wire up the segment name audio reads

## Task 1: Migrate Ghost Data to Supabase

The existing /data/segments.json contains leaderboard entries for all 8 segments. These need to be seeded into the Supabase `leaderboard_entries` table as ghost entries so we have one data source.

Create a one-time migration script: `/app/api/migrate-ghosts/route.ts`

For each segment in segments.json, for each entry in `mission_cycling_leaderboard`:
- Parse the time string to seconds (e.g., "8:23" → 503, "1:06:08" → 3968)
- Insert into `leaderboard_entries` with:
  - `segment_id` = segment's id (e.g., "hawk-hill")
  - `rank` = entry's rank
  - `rider_name` = entry's name (or null if unclaimed)
  - `time_seconds` = parsed time
  - `time_display` = original time string
  - `status` = "ghost"
  - `claimed` = false
- Skip entries that already exist (don't duplicate)
- After inserting all entries for a segment, run `recalculate_ranks()` to compute gaps

The sync from Session 2 should have already inserted Dylan's verified entries. After migration, Dylan's entries should be verified (matched by user_id) and the rest should be ghosts. If there are conflicts (Dylan has both a ghost entry and a verified entry on the same segment), keep the verified one and delete the ghost.

## Task 2: Leaderboard Data Source

Update the LeaderboardCard component to fetch from Supabase instead of static JSON.

Create a data fetching layer:
```typescript
// /lib/data.ts or similar
async function getSegmentLeaderboard(segmentId: string): Promise<LeaderboardEntry[]> {
  // Fetch from Supabase leaderboard_entries table
  // ORDER BY rank ASC
  // LIMIT 10 for top 10 view
  // Include status field (ghost/claimed/verified)
  // Include profile_pic for verified entries
}

async function getSegments(): Promise<Segment[]> {
  // Fetch from Supabase segments table
  // WHERE visible = true
  // ORDER BY sort_order ASC
}
```

For now, fetch on the server side (Next.js server components or API route) and pass to client components. Don't fetch on every render — cache per segment rotation or use SWR/React Query with a reasonable stale time.

If Supabase is unreachable or empty, fall back to the static segments.json data. This ensures the site never breaks.

## Task 3: Wire CommercialBreak into Rotation

The CommercialBreak component already exists and works (see COMMERCIAL_BREAK_SPEC.md).

Update the main page.tsx broadcast loop:

**Current flow:**
```
Segment 1 → Segment 2 → Segment 3 → ... → Segment 8 → loop
```

**New flow:**
```
Segment 1 (Top 10, ~38s)
[Commercial Break (~20s)]
Segment 2 (Top 10, ~38s)
[Commercial Break (~20s)]
Segment 3 (Top 10, ~38s)
[Commercial Break (~20s)]
... etc through all 8 segments, then loop
```

A commercial break plays after EVERY segment for now. We can adjust frequency later.

**Implementation:**
- Add a state variable for what's currently showing: `"leaderboard" | "commercial"`
- When a segment's viewing duration ends, transition to CommercialBreak
- When CommercialBreak calls `onComplete`, advance to the next segment
- The video background continues playing behind the commercial break card (don't stop/change it)
- The ticker can continue running under the commercial break, or pause — your call

**Sponsor data:**
The CommercialBreak component needs to know about available sponsors. Build the sponsor list from the filesystem:

```typescript
const SPONSORS = [
  { name: "Amnesia", logo: "/_sponsors/amnesia.png", audio: "/_sponsors/_audio/amnesia.mp3" },
  { name: "Anchor Brewing", logo: "/_sponsors/anchor brewing.png", audio: "/_sponsors/_audio/anchor brewing.mp3" },
  // ... all 19 sponsors
];

const INTRO_CLIPS = [
  "/_sponsors/_audio/Mission cycling.mp3",
  "/_sponsors/_audio/The Mission Cycling Club of San Francisco.mp3"
];

const SPONSORED_BY_CLIP = "/_sponsors/_audio/sponsored by.mp3";
```

Each break picks 3 random sponsors (no repeats within session until all have been shown).

## Task 4: Segment Name Audio Reads

Files are in /public/segment_audio/ with two versions per segment:
- hawk hill 01.mp3, hawk hill 02.mp3
- radio road 01.mp3, radio road 02.mp3
- old la honda 01.mp3, old la honda 02.mp3
- highway one.mp3, highway one 02.mp3
- alpe d'huez 01.mp3, alpe d'huez 02.mp3
- four corners 01.mp3, four corners 02.mp3
- Bofax 01.mp3, Bofax 02.mp3
- bourg d'oisans 01.mp3, bourg d'oisans 02.mp3

Map by segment ID:
```typescript
const SEGMENT_AUDIO: Record<string, string[]> = {
  'hawk-hill': ['/segment_audio/hawk hill 01.mp3', '/segment_audio/hawk hill 02.mp3'],
  'radio-road': ['/segment_audio/radio road 01.mp3', '/segment_audio/radio road 02.mp3'],
  'old-la-honda': ['/segment_audio/old la honda 01.mp3', '/segment_audio/old la honda 02.mp3'],
  'hwy1-muir-beach': ['/segment_audio/highway one.mp3', '/segment_audio/highway one 02.mp3'],
  'alpe-dhuez': ["/segment_audio/alpe d'huez 01.mp3", "/segment_audio/alpe d'huez 02.mp3"],
  'four-corners': ['/segment_audio/four corners 01.mp3', '/segment_audio/four corners 02.mp3'],
  'bofax-climb': ['/segment_audio/Bofax 01.mp3', '/segment_audio/Bofax 02.mp3'],
  'bourg-doisans': ["/segment_audio/bourg d'oisans 01.mp3", "/segment_audio/bourg d'oisans 02.mp3"],
};
```

When a segment loads, pick one randomly and play it. Volume should match the sponsor audio reads. Play it as the card opens (during the preview phase, around 0.5s after the card starts animating in).

Don't play the segment audio on top of the background music — either duck the music briefly or just let them layer (the reads are short enough it should be fine).

## Task 5: Ghost vs Verified Row Styling (Basic)

Now that data comes from Supabase with a `status` field, apply basic visual differentiation:

**Ghost entries (status = "ghost"):**
- Opacity: 0.5
- No profile pic (show blank/default avatar or just the jersey icon)
- Name in slightly muted color
- No verification badge

**Verified entries (status = "verified"):**
- Full opacity
- Profile pic from Strava (small circle, left of name)
- Strava orange checkmark badge next to name (small, subtle)
- Full color name

**Claimed entries (status = "claimed"):**
- Opacity: 0.7
- No profile pic yet
- Slightly brighter than ghost

Keep it simple for now. Don't redesign the row component — just add conditional styling based on status.

## Order of Operations

1. Run the ghost migration (seed segments.json data into Supabase)
2. Verify data: Supabase should have ghost entries + Dylan's verified entries
3. Switch leaderboard data source to Supabase (with JSON fallback)
4. Wire CommercialBreak into the rotation
5. Add segment audio reads
6. Add ghost/verified styling

Test the full loop: segments play with audio reads, commercial breaks appear between them, leaderboard shows mix of ghost and verified rows.
