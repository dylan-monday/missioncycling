# Commercial Break Component — Build Spec

## Overview

A broadcast-style sponsor break that plays between every 2-3 leaderboard segments. Frosted glass card over the existing video background, with synchronized audio reads.

## File to Create

`/components/CommercialBreak.tsx`

## Asset Locations

- **Sponsor logos:** `/_sponsors/*.png` (transparent PNGs, various aspect ratios)
- **Audio intros (pick one randomly per break):**
  - `/_sponsors/_audio/Mission cycling.mp3`
  - `/_sponsors/_audio/The Mission Cycling Club of San Francisco.mp3`
- **Audio bridge:** `/_sponsors/_audio/sponsored by.mp3`
- **Sponsor audio reads:** `/_sponsors/_audio/[sponsor name].mp3` (filenames match or closely match the logo PNGs)

## Sponsor Logo-to-Audio Mapping

Match by filename. The mapping:

| Logo PNG | Audio MP3 |
|---|---|
| amnesia.png | amnesia.mp3 |
| anchor brewing.png | anchor brewing.mp3 |
| aquarius records.png | aquarius records.mp3 |
| bi rite market.png | birite market.mp3 |
| coffee bar.png | coffee bar.mp3 |
| delfina.png | delfina.mp3 |
| delfina pizzeria.png | delfina pizzeria.mp3 |
| flour and water.png | flour and water.mp3 |
| live fit.png | live fit.mp3 |
| paxton gate.png | paxton gate.mp3 |
| range.png | range.mp3 |
| ritual coffee roasters.png | ritual coffee roasters.mp3 |
| self edge.png | self edge.mp3 |
| tartine bakery.png | tartine bakery.mp3 |
| the 500 club.png | the 500 club.mp3 |
| the monks kettle.png | the monks kettle.mp3 |
| unionmade.png | unionmade.mp3 (note: logo says "union made", audio says "unionmade") |
| weird fish.png | weird fish.mp3 |
| woodhouse fish company.png | woodhouse fish company.mp3 |

Build the mapping as a config array. 19 sponsors total.

## Animation Sequence

```
TIME    ACTION
────    ──────
0.0s    Card fades in (frosted glass, scale 0.94→1.0, opacity 0→1, 0.9s ease)
0.5s    MC logo fades in center of card (the real MC logo SVG from the app)
        Audio: play random intro clip ("Mission cycling.mp3" or "The Mission Cycling Club of San Francisco.mp3")
3.0s    MC logo fades out (opacity 1→0, 1s ease)
3.8s    "sponsored by" text fades in centered
        Audio: play "sponsored by.mp3"
5.0s    "sponsored by" slides up to top ~16% of card
        Sponsor #1 logo fades in centered (opacity 0→1, 0.8s ease)
        Audio: play sponsor #1 audio read
~9.5s   Sponsor #1 logo fades out (opacity 1→0, 0.8s ease)
~10.3s  Sponsor #2 logo fades in
        Audio: play sponsor #2 audio read
~14.8s  Sponsor #2 logo fades out
~15.6s  Sponsor #3 logo fades in
        Audio: play sponsor #3 audio read
~19.0s  Sponsor #3 logo fades out
        "sponsored by" fades out
~19.8s  Card fades out (scale 1.0→0.94, opacity 1→0, 0.9s ease)
~20.5s  Break complete — callback to parent to resume leaderboard
```

Total break duration: ~20 seconds for 3 sponsors.

## Audio Timing

Audio clips are short (1-3 seconds each). The logo should appear SIMULTANEOUSLY with the audio read starting — not before, not after. Use the `play()` promise or `onplay` event to sync.

The hold time per sponsor is: audio duration + 2.5 seconds of silence after audio ends. So if "tartine bakery.mp3" is 1.5s, the logo shows for ~4 seconds total.

To calculate: load each audio clip, get its `duration` property, and use that to dynamically time the holds.

## Visual Design

### Card (frosted glass)
- Light frosted glass (NOT dark) — background shows through
- `background: rgba(255, 255, 255, 0.08)`
- `backdrop-filter: blur(24px) saturate(1.4) brightness(1.05)`
- `border: 1px solid rgba(255, 255, 255, 0.18)`
- `border-radius: 12px`
- Width: 72vw, max-width: 940px
- Aspect ratio: 16/9
- Sits over the existing video background (don't create a new background)

### Top/bottom edge lines
- Subtle white gradient lines: `rgba(255, 255, 255, 0.3)` fading to transparent at edges

### Corner accents
- 18px × 18px corner brackets
- `1px solid rgba(255, 255, 255, 0.2)`
- Fade in staggered (0.5s + 0.08s per corner)

### MC Logo (intro frame)
- Use the existing MC logo SVG from the app (in /public/assets or wherever it lives)
- Centered in card
- Fades in with slight scale (0.9→1.0)

### "sponsored by" text
- `rgba(255, 255, 255, 0.4)`
- Letter-spacing: 0.4em
- Uppercase
- Small: clamp(9px, 1.2vw, 14px)

### Sponsor logos
- Centered in card, below "sponsored by"
- Container: 55% width, 50% height of card
- `object-fit: contain` (handles all aspect ratios)
- `filter: drop-shadow(0 2px 20px rgba(0,0,0,0.3))`
- All transitions: 0.8s cubic-bezier(0.16, 1, 0.3, 1)

## Props / Interface

```typescript
interface CommercialBreakProps {
  // Called when the break finishes — parent resumes leaderboard
  onComplete: () => void;
  
  // Number of sponsors to show per break (default: 3)
  sponsorCount?: number;
  
  // If true, start playing immediately on mount
  autoPlay?: boolean;
  
  // Global music volume (match the background music level)
  volume?: number;
}
```

## Sponsor Selection Logic

Each break picks `sponsorCount` sponsors randomly from the full pool of 19. Track which sponsors have been shown this session in a Set/array (passed via context or prop) to avoid repeats until all have been shown.

## Integration with Sequence Engine

The `lib/sequence.ts` SequenceManager calls for a commercial break every 2-3 segments. When a `commercial_break` item comes up in the sequence:

1. Parent component renders `<CommercialBreak onComplete={handleBreakComplete} />`
2. Break plays through
3. `onComplete` fires
4. Parent advances to next sequence item (next leaderboard segment)

## Notes

- No tagline/subhead text under logos — audio carries that
- No "Play" button — this auto-plays when rendered as part of the sequence
- Progress dots at bottom during sponsor phase (28px × 2px bars, white)
- The existing video background continues playing behind the glass card
- Audio volume should match the background music level (currently 11% / 0.11)
