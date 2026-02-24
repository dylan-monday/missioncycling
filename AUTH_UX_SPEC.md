# Auth & Onboarding UX Spec

## Two Modes

### Mode 1: Gated (Pre-Critical Mass)
- Splash screen is the front door
- You MUST authenticate with Strava to enter
- No way to see the broadcast without auth
- Switch to Mode 2 manually when we have ~40-50 users (env var or admin toggle)

### Mode 2: Open (Post-Critical Mass)
- Splash screen shows "Click to Begin" (current behavior)
- Anyone can watch the broadcast
- "Connect with Strava" button lives in the ticker for MC members who want to add their data
- Auth flow works the same, just not required to enter

### Config
```typescript
// Environment variable or Supabase config
NEXT_PUBLIC_GATE_MODE = "gated" | "open"
```

---

## Splash Screen

### Gated Mode
```
[MC Logo]

PREMIUM SUFFERING SINCE 2008

A broadcast experience. Best on desktop with audio.

[ Connect with Strava ]   ← Strava orange button, only action available
```

- Black background
- No ambient video/audio yet (save that for after auth)
- Mobile visitors see: "Come back on a larger screen. This is built for desktop with audio." No Strava button. Dead end.

### Open Mode
```
[MC Logo]

PREMIUM SUFFERING SINCE 2008

A broadcast experience. Best on desktop with audio.

[ Click to Begin ]

```

- Same as current splash behavior
- Audio starts on click, broadcast begins
- Mobile visitors get same desktop message as gated mode

### Mobile Detection
- Check viewport width < 1024px OR touch device
- Show message, no interaction available
- Simple and clear: "This experience is built for desktop. Grab a laptop, turn up the sound, and come back."

---

## Auth Flow (Strava OAuth)

### Step 1: Redirect to Strava
- User clicks "Connect with Strava"
- Redirect to Strava OAuth
- Strava approves, redirects back to callback

### Step 2: Instant Welcome (0-2 seconds)
Token exchange gives us athlete profile immediately. Before ANY sync:

```
[Profile Pic]

Welcome back, [First Name].
[City], [State]

Scanning your ride history...
```

- Full screen, black background, clean typography
- Profile pic fades in, then name, then location
- "Scanning..." appears after 1.5s, transitions to sync sequence

### Step 3: Sync Sequence (~2-3 minutes)
Full-screen experience with real-time progress. NOT a loading bar. Each message is a mini-reveal.

**Visual:** Dark background. Messages appear one at a time, centered, with the previous message fading up/out as the new one fades in. Progress indicator at bottom (e.g., "3 of 8 segments" or a subtle bar).

**Message sequence (driven by actual sync progress):**

As each segment syncs:
```
Scanning Hawk Hill...
→ "23 attempts found. Best: 7:42"

Scanning Radio Road...
→ "8 attempts found. Best: 12:18"

Scanning Old La Honda...
→ "No attempts found"    ← (this is fine, not everyone has ridden every segment)

Scanning Alpe d'Huez...
→ "2 attempts found. Best: 1:06:08"
```

As activities sync:
```
Searching your ride history...
→ "Found 847 rides"
→ "First ride: March 14, 2011"
→ "Last ride: October 3, 2019"
→ "Total distance: 12,400 miles"
```

As Greatest Hits generate:
```
Finding your greatest hits...
→ "Calculating..."
```

**Timing:** Messages should feel conversational, not rushed. Each message holds for 2-3 seconds. If the sync is faster than the messages, queue them. If the sync is slower, the current message just holds longer with a subtle pulsing dot.

**Implementation:** The sync endpoint should support progress reporting. Options:
- Server-Sent Events (SSE) from /api/sync that stream progress updates
- Or: sync endpoint writes progress to a Supabase row, frontend polls every 2 seconds
- Polling is simpler. Write `sync_status` and `sync_progress` (JSON) to the user row. Frontend polls.

```typescript
// User row during sync
{
  sync_status: "syncing",
  sync_progress: {
    step: "segment_efforts",
    current_segment: "hawk-hill",
    segments_complete: 3,
    segments_total: 8,
    efforts_found: 47,
    activities_found: null,  // not started yet
    message: "Scanning Hawk Hill..."
  }
}
```

### Step 4: Greatest Hits Reveal
Sync complete. Transition to the payoff.

```
[Dramatic pause — 1.5s of black]

YOUR GREATEST HITS

[Card 1: "THE HEADLANDS RAIDER" — 47 Hawk Hill attempts]
[Card 2: "EVEREST ×4" — 116,000 ft total climbing]  
[Card 3: "THE MACHINE" — 147 rides in 2016]
[Card 4: "RAIN OR SHINE" — 48 miles in 2.1" of rain]

[Hold last card 3s]

[Fade to broadcast]
```

- 3-5 cards, shown one at a time
- Each card: title, stat, one-line description
- Broadcast-style animation (slam in, hold, transition)
- After Greatest Hits, the main broadcast begins playing segments

### Step 5: Into the Broadcast
- Video background fades in
- Background music starts
- First segment loads
- User is now watching the broadcast

---

## Return Visits

### Returning Authenticated User
- Cookie `mc_session` identifies them
- Skip splash entirely → straight to broadcast
- Their data is already synced, leaderboard shows their verified entries

### Re-viewing Greatest Hits / Personal Stats
- Small button somewhere persistent but unobtrusive
- Options for placement:
  - In the ticker area (left side, small icon/text)
  - Corner of the broadcast frame
  - Keyboard shortcut (press "G" for Greatest Hits, "F" for Find Me)
- Clicking it overlays their Greatest Hits cards over the broadcast
- Or opens a "My Stats" panel: Greatest Hits + segment ranks + total stats
- This is also where "Re-sync" could live if they want to update their data later

### Suggested Implementation
```
Ticker area, far left:
[Profile Pic tiny circle] [Name]  ← clicking this opens stats overlay

Keyboard shortcuts:
G = Greatest Hits overlay
F = Find Me (jump to current segment's Find Me view)
```

---

## Leaderboard Views: Top 10 + Personal Card

### How It Works
The broadcast is passive. Everything auto-plays. The rotation is:

```
Segment 1 — Top 10 leaderboard (full animation: preview → hero → full)
Segment 1 — Personal Card (if user has data on this segment)
[Commercial Break]
Segment 2 — Top 10 leaderboard
Segment 2 — Personal Card
[Commercial Break]
Segment 3 — Top 10 leaderboard
Segment 3 — Personal Card
... etc
```

### Top 10 Leaderboard
Same as current. Preview phase (elevation profile + stats), hero phase (top 3 slam in), full phase (rows 4-10). Segment name audio read plays on open. ~38 seconds.

### Personal Card (not a second leaderboard)
A brief stats card that appears after the Top 10. Quick, informative, doesn't try to be another leaderboard. Just a moment of "here's where you stand."

```
YOUR RIDE — HAWK HILL

#43 of 161
Best: 8:42  ·  23 attempts
47 seconds off the top 10
```

- Same frosted glass card as the leaderboard
- Broadcast-style typography
- Holds for ~8-10 seconds, then auto-advances
- Animation: slides in clean, no hero/slam — more understated than the Top 10

**Rules:**
- If user IS in the top 10: skip the personal card (they already saw themselves)
- If user has NO attempts on this segment: skip, or show "You haven't ridden this one. [X] club members have."
- If user is close to top 10 (rank 11-15): show "X seconds off the top 10" — motivation
- If user is far from top 10: just show rank and stats, no gap message

### Non-Authenticated Viewers (Open Mode)
- No personal cards (no user data)
- Just Top 10 leaderboards in rotation with commercial breaks
- "Connect with Strava" in ticker to add their data

### Future: Interactive Find Me
Later we can add an on-demand detailed view (press F or click a button) that shows the full ± 5 riders leaderboard context. But for launch, the passive personal card is enough. Keep it simple, iterate after people use it.

---

## Strava Button Placement

### Gated Mode
- Splash screen only. Big Strava orange button.

### Open Mode  
- In the ticker, right side: "Connect with Strava" with Strava logo
- Same auth flow, same sync sequence, same Greatest Hits reveal
- After auth, button disappears from ticker, replaced by profile pic + name

---

## Summary of States

| State | What they see |
|---|---|
| First visit, gated mode | Splash → "Connect with Strava" |
| First visit, open mode | Splash → "Click to Begin" → broadcast |
| First visit, mobile | "Come back on desktop" message |
| Just authenticated | Welcome → Sync sequence → Greatest Hits → broadcast |
| Return visit (authed) | Straight to broadcast (skip splash) |
| Return visit (not authed, open mode) | Splash → "Click to Begin" → broadcast |
| Mid-broadcast, clicks stats | Greatest Hits / personal stats overlay |

---

## Files to Create/Modify

- `components/SplashScreen.tsx` — update with gated/open modes, mobile detection
- `components/SyncSequence.tsx` — NEW: the dark sync progress experience  
- `components/GreatestHitsReveal.tsx` — NEW: post-sync payoff cards
- `components/PersonalCard.tsx` — NEW: brief "your rank" card per segment
- `components/CommercialBreak.tsx` — already built (see COMMERCIAL_BREAK_SPEC.md)
- `components/StatsOverlay.tsx` — NEW: re-viewable stats panel for return visits
- `app/page.tsx` — orchestrate the flow: splash → sync → greatest hits → broadcast
- `app/api/sync/route.ts` — update to write progress to user row for polling
- `lib/sequence.ts` — update to interleave personal cards and commercial breaks

---

## Open Design Questions

- [ ] Exact Greatest Hits card design (broadcast style? Simpler?)
- [ ] Personal card highlight style (Strava orange? MC blue? Glow?)
- [ ] Stats overlay design for return visits (modal? Side panel? Full takeover?)
- [ ] Sync sequence has Kraftwerk "Tour de France" inspired ambient audio — Dylan is creating this. File will go in /public/audio/ or /public/segment_audio/

## Sync Sequence Audio
- Dark/minimal visuals during sync — building anticipation for the big reveal
- Dylan creating a Kraftwerk "Tour de France" style ambient track for the sync wait
- Low, electronic, rhythmic — feels like something is computing/processing
- Plays only during sync, stops when Greatest Hits reveal begins

## Commercial Breaks in Rotation
Commercial breaks (see COMMERCIAL_BREAK_SPEC.md) are wired into the sequence:

```
Segment 1 — Top 10 (38s)
Segment 1 — Personal Card (8-10s)
[Commercial Break — 3 sponsors with audio reads, ~20s]
Segment 2 — Top 10 (38s)
Segment 2 — Personal Card (8-10s)
[Commercial Break — 3 different sponsors, ~20s]
Segment 3 — Top 10 (38s)
Segment 3 — Personal Card (8-10s)
[Commercial Break]
... continues through all 8 segments, then loops
```

Full rotation with 8 segments + 8 personal cards + ~4 commercial breaks ≈ 8-9 minutes.
On loop, sponsor selection randomizes so breaks feel different each cycle.
