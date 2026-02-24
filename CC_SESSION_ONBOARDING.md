# CC Session: Complete Onboarding Flow

## Goal
Build the full first-time user experience: Splash → Strava Auth → Sync Sequence → Greatest Hits → Broadcast. This is the launch experience. After this session we deploy.

Read AUTH_UX_SPEC.md for the full UX spec. This session implements the gated mode flow.

## The Flow

```
1. SPLASH SCREEN (gated mode)
   - Black background
   - MC logo centered
   - "PREMIUM SUFFERING SINCE 2008"
   - "A broadcast experience. Best on desktop with audio."
   - [ Connect with Strava ] button — Strava orange (#FC4C02)
   - Mobile visitors (viewport < 1024px): show "This experience is built for desktop. Grab a laptop, turn up the sound, and come back." No button.

2. STRAVA AUTH
   - User clicks button → redirect to Strava OAuth
   - Strava approves → callback creates user, stores tokens
   - Redirect to /sync page (or same page with sync state)

3. INSTANT WELCOME (before sync starts, 0-3 seconds)
   - Black background
   - Profile pic fades in (from Strava athlete data)
   - "Welcome back, [First Name]." fades in below
   - "[City], [State]" fades in below that
   - Hold 2 seconds

4. SYNC SEQUENCE (2-3 minutes)
   - Ambient audio starts: /public/audio/sync soundtrack 3.mp3
     Volume: 0.15 (subtle but present). Loop if sync takes longer than track.
   - Black background, centered text, one message at a time
   - Previous message fades up and out, new message fades in
   - Real-time progress from sync endpoint

   Messages driven by actual sync progress:
   
   As each segment scans:
     "Scanning Hawk Hill..."
     → "23 attempts found. Best: 7:42"
     (next segment)
     "Scanning Radio Road..."  
     → "8 attempts found. Best: 12:18"
     (if no attempts)
     "Scanning Old La Honda..."
     → "No attempts yet"
   
   As activities sync:
     "Searching your ride history..."
     → "Found 847 rides"
     → "First ride: March 14, 2011"
     → "Last ride: October 3, 2019"
     → "Total distance: 12,400 miles"
   
   Final:
     "Generating your greatest hits..."
     → (brief pause)

   Each message holds 2-3 seconds. If sync is faster than messages, queue them
   with minimum display time. If sync is slower, current message pulses gently.

   Progress indicator at bottom: subtle bar or "3 of 8 segments" text.

5. GREATEST HITS REVEAL
   - Sync audio fades out over 2 seconds
   - 1.5 second pause (black, silent — building anticipation)
   - "YOUR GREATEST HITS" title fades in, holds 2s, fades out
   - Then 3-5 Greatest Hits cards shown one at a time:

   Each card:
   ```
   [TITLE]              ← e.g., "THE HEADLANDS RAIDER"
   [Stat value]         ← e.g., "47 attempts"  
   [Description]        ← e.g., "Hawk Hill. More than 89% of the club."
   ```

   - Cards slam in broadcast-style (scale + opacity, similar to leaderboard hero)
   - Each card holds 4-5 seconds
   - Crossfade between cards

   After last card holds:
   - Fade to black briefly
   - Broadcast begins (video background fades in, music starts, first segment loads)

6. INTO THE BROADCAST
   - Random background music track starts
   - First segment loads with audio read
   - Full leaderboard rotation begins
   - User is now watching the show
```

## Implementation Details

### Sync Progress Reporting

Update /app/api/sync/route.ts to write progress to the user row as it works:

```typescript
// Update user row with progress at each step
await supabase.from('users').update({
  sync_status: 'syncing',
  sync_progress: {
    step: 'segment_efforts',        // or 'activities' or 'greatest_hits'
    current_segment: 'hawk-hill',   // current segment being scanned
    current_segment_name: 'Hawk Hill',
    segments_complete: 3,
    segments_total: 8,
    efforts_found: 47,              // running total
    best_time_display: '7:42',      // best time on current segment
    activities_found: null,          // null until activities step
    total_distance: null,
    first_ride: null,
    last_ride: null,
    message: 'Scanning Hawk Hill...'
  }
}).eq('id', userId);
```

When sync completes:
```typescript
await supabase.from('users').update({
  sync_status: 'complete',
  sync_progress: {
    step: 'complete',
    segments_complete: 8,
    segments_total: 8,
    efforts_found: 87,
    activities_found: 847,
    total_distance: '12,400',
    first_ride: 'March 14, 2011',
    last_ride: 'October 3, 2019'
  }
}).eq('id', userId);
```

### Frontend Polling

The SyncSequence component polls the user row every 2 seconds:

```typescript
const pollSync = async () => {
  const res = await fetch('/api/user/me');
  const user = await res.json();
  
  if (user.sync_status === 'complete') {
    // Stop polling, transition to Greatest Hits
  } else {
    setSyncProgress(user.sync_progress);
    // Update displayed message based on progress
  }
};

useEffect(() => {
  const interval = setInterval(pollSync, 2000);
  return () => clearInterval(interval);
}, []);
```

### Create /app/api/user/me/route.ts

Returns the current authenticated user's data (read from mc_session cookie):

```typescript
export async function GET(request: Request) {
  // Read user ID from mc_session cookie
  // Fetch user row from Supabase
  // Return { name, profile_pic, city, state, sync_status, sync_progress, ... }
}
```

### Greatest Hits Data

After sync completes, fetch greatest hits:

```typescript
const res = await fetch('/api/greatest-hits/me');
const hits = await res.json();
// hits = [{ title, stat_value, description, category }, ...]
```

Create /app/api/greatest-hits/me/route.ts:
- Read user ID from cookie
- Fetch from greatest_hits table WHERE user_id = userId
- Return top 5 ordered by... some priority (most impressive first)

The greatest hits generator (lib/greatest-hits.ts) should already be running at the end of the sync. Make sure it writes to the greatest_hits table.

### Leaderboard: Verified Only

As discussed: the leaderboard ONLY shows verified entries. Ghost entries stay in Supabase but are hidden from display.

- Fetch leaderboard WHERE status = 'verified'
- Empty slots show as "[ UNCLAIMED ]" rows (styled as empty/dim)
- Always show 10 rows (fill with unclaimed if fewer than 10 verified)
- Bottom of leaderboard card: "[X] riders waiting to be verified" (count of ghost entries for that segment)

### Sync Must Create Verified Leaderboard Entries

CRITICAL: After fetching segment efforts, the sync must:
1. Find the user's best time per segment
2. Insert/update a row in leaderboard_entries with status='verified'
3. Recalculate ranks for that segment

This is what processUserEfforts() in lib/leaderboard.ts does. Make sure the sync calls it.

### State Management

The main page needs to track the overall app state:

```typescript
type AppState = 
  | 'splash'           // Showing splash screen
  | 'authenticating'   // Redirecting to/from Strava  
  | 'welcome'          // Showing welcome with profile pic
  | 'syncing'          // Sync sequence playing
  | 'greatest_hits'    // Greatest hits reveal
  | 'broadcast';       // Main broadcast loop

// On page load:
// - Check mc_session cookie
// - If valid session + sync_status='complete' → 'broadcast'
// - If valid session + sync_status='syncing' → 'syncing' (resume)
// - If valid session + sync_status='pending' → 'welcome' (start sync)
// - If no session → 'splash'
```

### Updated Callback

The OAuth callback should NOT redirect to / with query params anymore. Instead:
- Create/update user in Supabase
- Set mc_session cookie  
- Start the sync in the background (fire and forget, or call the sync endpoint)
- Redirect to / (the main page detects the session and shows welcome → sync)

## Files to Create/Modify

**Create:**
- /components/SyncSequence.tsx — The sync progress screen
- /components/GreatestHitsReveal.tsx — The post-sync reveal
- /components/MobileBlock.tsx — "Come back on desktop" message
- /app/api/user/me/route.ts — Current user data endpoint
- /app/api/greatest-hits/me/route.ts — User's greatest hits endpoint

**Modify:**
- /components/SplashScreen.tsx — Add gated mode with Strava button, mobile detection
- /app/page.tsx — Add AppState management, orchestrate the full flow
- /app/api/sync/route.ts — Add progress reporting (write to user row)
- /app/api/auth/callback/route.ts — Start sync after auth, clean redirect

## Assets

- Sync ambient audio: /public/audio/sync soundtrack 3.mp3
- MC logo: already in the app (mc_logo.svg or similar)
- Strava button: use official Strava orange (#FC4C02) with "Connect with Strava" text

## Environment Variable

Add to .env.local and Vercel:
```
NEXT_PUBLIC_GATE_MODE=gated
```

## Test Sequence

1. Clear Dylan's data from Supabase (delete from users, leaderboard_entries where status='verified', segment_efforts, activities, greatest_hits)
2. Load localhost:3000 — should see splash with Strava button
3. Click Connect with Strava → auth → redirect back
4. See welcome screen with profile pic and name
5. Sync sequence plays with real-time messages and ambient audio
6. Greatest Hits cards reveal
7. Broadcast starts with leaderboard showing Dylan as only verified entry
8. Commercial breaks play between segments
