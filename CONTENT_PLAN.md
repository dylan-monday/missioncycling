# Mission Cycling — Content Plan

*All content types, club lore, asset needs, and audio inventory.*

---

## Interstitial Card Types

Interstitials play between every 2-3 leaderboard segments. Each "commercial break" shows 2-3 cards.

### Card Type Specifications

| Type | Content | Duration | Implementation Status |
|------|---------|----------|----------------------|
| `sponsor` | Full-screen logo + AI voiceover | 4s | ✅ Done |
| `club_photo` | Historical photo + Ken Burns + caption | 5s | ❌ Needs photos |
| `did_you_know` | Big stat card: "DID YOU KNOW? MC members have climbed Everest 47× collectively." | 5s | ❌ Not built |
| `club_lore` | Tier 3 story as full-screen card | 5-6s | ❌ Not built |
| `merch` | MC merchandise photo + URL + promo code | 5s | ❌ Needs assets |
| `greatest_hit` | Highlight a member's greatest hit (with permission) | 5s | ❌ Not built |
| `era_card` | Decade/era summary: "THE RADIO ROAD YEARS 2011-2014" | 5s | ❌ Not built |

### Card Layout (Common)
```
┌─────────────────────────────────────────┐
│                                         │
│            [TITLE]                      │
│            tablet-gothic, white         │
│                                         │
│            [STAT/IMAGE]                 │
│            Large, centered              │
│                                         │
│            [DESCRIPTION]                │
│            white/70, smaller            │
│                                         │
└─────────────────────────────────────────┘
```

### Scheduling Rules
- Never interrupt mid-leaderboard
- Vary types within a break (don't show 3 sponsors in a row)
- Randomize selection, don't repeat within session
- Minimum 2 segments between commercial breaks

---

## Club Lore

Real Mission Cycling culture references for Tier 3 content.

### The Headlands Raiders
```
title: "THE HEADLANDS RAIDERS"
body: "6:30am. Tuesday. Thursday. No excuses. Hawk Hill in the dark."
context: The Tues/Thurs early morning Hawk Hill group ride
```

### The Peroni Sprint
```
title: "THE PERONI SPRINT"
body: "The only race where the finish line has a pizza oven. Delfina. 18th Street. Saturday afternoons in the sun."
context: Informal sprint to Delfina Pizzeria on 18th Street
award_name: "The Peroni Sprint Champion"
```

### Delfina as Title Sponsor
```
title: "DELFINA PIZZERIA"
body: "Home of the Peroni Sprint. Post-ride HQ. If the table on 18th Street could talk."
context: Delfina is the spiritual home of the club
note: Consider "Title Sponsor" treatment in commercial breaks
```

### The Gentlemen's Races
```
title: "THE GENTLEMEN'S RACES"
body: "Oregon. Gravel. Tweed. 2009, 2010, 2011, 2012. The Rapha years."
context: Rapha Gentlemen's Races — the club participated in these organized gravel events
years: 2009-2012
```

### Velo Rouge
```
title: "VELO ROUGE"
body: "The mid-ride stop on Arguello. Coffee. Regroup. Pretend you're not dying."
context: Coffee shop that was a regular regrouping point
```

### Saturday Morning Rides
```
title: "SATURDAY 9AM"
body: "The club ride. The real one. Show up or hear about it Monday."
context: The official Saturday morning club ride
award_name: "Club Rider"
```

### Club-Specific Award Names
| Title | Meaning |
|-------|---------|
| The Headlands Raider | Tues/Thurs 6:30am Hawk Hill group |
| Work's for Jerks | Monday riders |
| Club Rider | Saturday 9am crew |
| Easy Like Sunday Morning | Sunday riders |
| The Peroni Sprint Champion | Rides ending near Delfina |
| The Gentlemen | Rapha Gentlemen's Race participants |

---

## Stat Catalog Reference

See `STAT_CATALOG.md` for the full catalog of computable stats including:

### Tier 1: Activity Data Only
- Day of week patterns (Headlands Raiders, Work's for Jerks, etc.)
- Duration / hours (total hours, hours per year)
- Distance (longest ride, total miles, century count)
- Elevation (Everest count, mountain goat, flat earther)
- Frequency / streaks (rides per year, consecutive days)
- Holiday rides (Christmas, Thanksgiving, Super Bowl)
- Fun math (calories as burritos, speed vs animals)

### Tier 2: Activity Data + Weather
- Coldest/hottest/windiest day rides
- Miles in rain
- Fog rides
- Year superlatives (coldest ride ever, wettest day)

### Tier 3: Curated Club Lore
- See "Club Lore" section above
- Editorial content, not computed

---

## Asset Needs

### Photos Needed
| Type | Description | Status |
|------|-------------|--------|
| Club group photo | High-res historical group shot | ❌ |
| Hawk Hill action | Riders on Hawk Hill | ❌ |
| Saturday morning | Club ride departure | ❌ |
| Delfina post-ride | Outdoor table scene | ❌ |
| Velo Rouge stop | Coffee regrouping | ❌ |
| Era photos | 2008-2012, 2012-2016, 2016-2019 | ❌ |
| Individual portraits | For "greatest hit" cards (with permission) | ❌ |

### Apparel Shots Needed
| Type | Description | Status |
|------|-------------|--------|
| MC jersey front | Club jersey full view | ❌ |
| MC jersey back | With sponsor logos | ❌ |
| Kit on rider | Action shot in club kit | ❌ |
| Historic jerseys | If designs changed over years | ❌ |

### Era Content Needed
| Era | Years | Key Events/Themes |
|-----|-------|-------------------|
| The Founding | 2008-2010 | Club formation, early rides |
| The Rapha Years | 2009-2012 | Gentlemen's Races, peak era |
| The Radio Road Years | 2011-2014 | TBD |
| The Golden Age | 2014-2018 | TBD |
| The Final Chapter | 2018-2022 | Club wind-down |

---

## Sponsor Audio Inventory

All files in `/public/sponsors/_audio/`

### Intro Clips (2)
| Filename | Content |
|----------|---------|
| `Mission cycling.mp3` | "Mission Cycling" |
| `The Mission Cycling Club of San Francisco.mp3` | Full club name |

### Transition Clip
| Filename | Content |
|----------|---------|
| `sponsored by.mp3` | "Sponsored by..." |

### Conjunction Clips (3)
| Filename | Content |
|----------|---------|
| `and 01.mp3` | "and" (variation 1) |
| `and 02.mp3` | "and" (variation 2) |
| `and 03.mp3` | "and" (variation 3) |

### Individual Sponsor Reads (19)
| Filename | Sponsor |
|----------|---------|
| `anchor brewing.mp3` | Anchor Brewing |
| `amnesia.mp3` | Amnesia |
| `aquarius records.mp3` | Aquarius Records |
| `birite market.mp3` | Bi-Rite Market |
| `coffee bar.mp3` | Coffee Bar |
| `delfina.mp3` | Delfina |
| `delfina pizzeria.mp3` | Delfina Pizzeria |
| `flour and water.mp3` | Flour + Water |
| `live fit.mp3` | Live Fit |
| `paxton gate.mp3` | Paxton Gate |
| `range.mp3` | Range |
| `ritual coffee roasters.mp3` | Ritual Coffee Roasters |
| `self edge.mp3` | Self Edge |
| `tartine bakery.mp3` | Tartine Bakery |
| `the 500 club.mp3` | The 500 Club |
| `the monks kettle.mp3` | The Monk's Kettle |
| `unionmade.mp3` | Unionmade |
| `weird fish.mp3` | Weird Fish |
| `woodhouse fish company.mp3` | Woodhouse Fish Company |

### Commercial Break Sequence
```
1. Play random intro clip (Mission cycling.mp3 or The Mission Cycling Club of San Francisco.mp3)
2. Play "sponsored by.mp3"
3. Play 2-3 sponsor logos with individual reads:
   - First sponsor: logo + read
   - Second sponsor: "and" + logo + read
   - Third sponsor (optional): "and" + logo + read
4. Crossfade transitions between all elements
```

---

## Segment Audio Inventory

All files in `/public/segment_audio/`

### Segment Voiceovers (2 per segment)
| Segment | File 1 | File 2 |
|---------|--------|--------|
| Hawk Hill | `hawk hill 01.mp3` | `hawk hill 02.mp3` |
| Radio Road | `radio road 01.mp3` | `radio road 02.mp3` |
| Old La Honda | `old la honda 01.mp3` | `old la honda 02.mp3` |
| Highway One | `highway one 01.mp3` | `highway one 02.mp3` |
| Four Corners | `four corners 01.mp3` | `four corners 02.mp3` |
| BoFax | `Bofax 01.mp3` | `Bofax 02.mp3` |
| Bourg d'Oisans | `bourg d'oisans 01.mp3` | `bourg d'oisans 02.mp3` |
| Alpe d'Huez | `alpe d'huez 01.mp3` | `alpe d'huez 02.mp3` |

### Sync Soundtracks (3)
| Filename | Use |
|----------|-----|
| `sync soundtrack 1.mp3` | Ambient sync music (unused) |
| `sync soundtrack 2.mp3` | Ambient sync music (unused) |
| `sync soundtrack 3.mp3` | **Active** — plays during sync sequence |

### Background Music (root `/public/`)
| Filename | Use |
|----------|-----|
| `victory-circuit.mp3` | Background broadcast music |
| `stadium-flash-86.mp3` | Background broadcast music |
| `triomphe-en-vhs.mp3` | Background broadcast music (if exists) |

---

## Implementation Priority

### Phase 1: Core Content (Now)
- [x] Sponsor commercial breaks
- [x] Segment voiceovers
- [x] Background music
- [x] Greatest Hits reveal

### Phase 2: Tier 3 Club Lore
- [ ] Club lore interstitial cards
- [ ] "Did You Know" stat cards
- [ ] Era summary cards

### Phase 3: Photo Content
- [ ] Collect historical photos
- [ ] Club photo interstitials with Ken Burns effect
- [ ] Individual member highlight cards

### Phase 4: Polish
- [ ] Merch cards (if applicable)
- [ ] Video interstitials (if available)
- [ ] Full interstitial rotation system

---

*Last updated: February 22, 2026*
