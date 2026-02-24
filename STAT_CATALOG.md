# Mission Cycling — Stat Catalog

*All computable stats for Greatest Hits, Ticker Stories, and Interstitials.*
*Feed this to CC when implementing the generators.*

---

## Club-Specific Award Names

These aren't generic labels — they reference real Mission Cycling culture:

| Title | Meaning |
|---|---|
| **The Headlands Raider** | The Tues/Thurs 6:30am Hawk Hill group |
| **Work's for Jerks** | Monday riders who clearly have priorities |
| **Club Rider** | Saturday 9am crew, the official club ride |
| **Easy Like Sunday Morning** | Sunday riders |
| **The Peroni Sprint Champion** | Rides ending near Delfina Pizzeria on 18th |
| **The Gentlemen** | Members who did the Rapha Gentlemen's Races 2009-2012 |

---

## Tier 1 Stats: Activity Data Only

### Day of Week / Time

```
most_tues_thurs_rides:
  title: "The Headlands Raider"
  query: COUNT activities WHERE day_of_week IN (2,4)
  per: all_time, per_year

most_monday_rides:
  title: "Work's for Jerks"
  query: COUNT activities WHERE day_of_week = 1
  per: all_time, per_year

most_saturday_morning_rides:
  title: "Club Rider"
  query: COUNT activities WHERE day_of_week = 6 AND start_hour BETWEEN 8 AND 10
  per: all_time, per_year

most_sunday_rides:
  title: "Easy Like Sunday Morning"
  query: COUNT activities WHERE day_of_week = 0
  per: all_time, per_year

most_rides_before_6am:
  title: "Dawn Patrol"
  query: COUNT activities WHERE start_hour < 6
  per: all_time

most_rides_after_9pm:
  title: "Night Moves"
  query: COUNT activities WHERE start_hour >= 21
  per: all_time

most_friday_rides:
  title: "Early Weekend"
  query: COUNT activities WHERE day_of_week = 5
  per: all_time
```

### Duration / Hours

```
total_hours_all_time:
  title: "The Clock Puncher"
  query: SUM moving_time_seconds / 3600
  display: "X,XXX hours on the bike"
  funfact: "That's X seasons of The Wire" (divide by 60)

total_hours_per_year:
  title: "The Full-Timer"
  query: SUM moving_time_seconds / 3600 GROUP BY year
  display: "XXX hours in [year]"

most_hours_single_month:
  title: "The Binge"
  query: SUM moving_time_seconds / 3600 GROUP BY year, month ORDER BY DESC LIMIT 1
  display: "XX hours in [Month Year]"
```

### Distance

```
longest_ride_overall:
  title: "The Odyssey"
  query: MAX distance_mi
  display: "XXX.X miles on [date]"

longest_ride_per_year:
  title: "Annual Epic"
  query: MAX distance_mi GROUP BY year
  display: "Longest ride in [year]: XXX.X miles"

total_miles_as_trips:
  title: "Road Tripper"
  query: SUM distance_mi
  comparisons:
    - "SF to Portland" (640 mi)
    - "SF to Denver" (1,250 mi)
    - "SF to New York" (2,900 mi)
    - "SF to Tokyo and back" (10,600 mi)
    - "Around the Earth" (24,901 mi)

most_century_rides:
  title: "The Century Club"
  query: COUNT activities WHERE distance_mi >= 100
  display: "X century rides (100+ miles)"

most_miles_single_week:
  title: "The Week"
  query: SUM distance_mi GROUP BY calendar_week ORDER BY DESC LIMIT 1
```

### Elevation

```
total_elevation_as_everests:
  title: "Everest ×[N]"
  query: SUM total_elevation_gain_ft / 29032
  display: "You've climbed Everest X times"

most_elevation_per_mile:
  title: "Mountain Goat"
  query: MAX(total_elevation_gain_ft / distance_mi) WHERE distance_mi > 5
  display: "XXX ft/mile on [date]"

least_elevation_per_mile:
  title: "Flat Earther"
  query: MIN(total_elevation_gain_ft / distance_mi) WHERE distance_mi > 20
  display: "Only XX ft/mile over XX miles"

shortest_ride_most_elevation:
  title: "The Wall"
  query: MAX(total_elevation_gain_ft / distance_mi) WHERE distance_mi < 10
  display: "X,XXX ft in just X.X miles"

most_elevation_single_week:
  title: "Elevation Week"
  query: SUM total_elevation_gain_ft GROUP BY calendar_week ORDER BY DESC LIMIT 1
```

### Frequency / Streaks

```
most_rides_per_year:
  title: "The Machine"
  query: COUNT activities GROUP BY year ORDER BY DESC
  display: "XXX rides in [year] — that's X.X per week"
  per: per_year

most_rides_5_year_span:
  title: "The Era"
  query: COUNT activities GROUP BY 5-year window
  spans: [2008-2012, 2010-2014, 2011-2015, 2012-2016, 2013-2017, 2014-2018, 2015-2019]

most_rides_all_time:
  title: "All-Time Raider"
  query: COUNT activities (2008-2019)

longest_consecutive_days:
  title: "The Streak"
  query: MAX consecutive ride_dates
  display: "XX consecutive days riding"

longest_gap_then_returned:
  title: "The Sabbatical"
  query: MAX gap between consecutive ride_dates WHERE rides exist after gap
  display: "XX days off... then came back"

most_rides_single_month:
  title: "Monthly Maniac"
  query: COUNT activities GROUP BY year, month ORDER BY DESC LIMIT 1

most_rides_january:
  title: "Resolution Keeper"
  query: COUNT activities WHERE month = 1 GROUP BY year

most_rides_december:
  title: "Winter Soldier"
  query: COUNT activities WHERE month = 12 GROUP BY year
```

### Holidays

```
most_holiday_rides_total:
  title: "No Days Off"
  holidays: [Dec 25, Jan 1, Jul 4, Thanksgiving Thursday, Super Bowl Sunday]
  query: COUNT activities WHERE ride_date IN holiday_dates

rode_on_christmas:
  title: "Santa Rides a Bike"
  query: activities WHERE month = 12 AND day = 25
  display: "XX.X miles on Christmas [year]. Priorities."

longest_ride_thanksgiving:
  title: "Earning the Turkey"
  query: MAX distance_mi WHERE ride_date = thanksgiving_date
  display: "XX.X miles on Thanksgiving [year]"

rode_on_super_bowl_sunday:
  title: "Priorities"
  query: activities WHERE ride_date = super_bowl_date
  note: Super Bowl dates 2008-2019 need to be looked up

rode_on_valentines_day:
  title: "Solo Date"
  query: activities WHERE month = 2 AND day = 14

rode_on_new_years_day:
  title: "Starting Strong"
  query: activities WHERE month = 1 AND day = 1

consecutive_holiday_streaks:
  title: "Tradition"
  query: consecutive years riding on same holiday
  display: "Rode every Christmas from 2012-2017"
```

### Fun Math

```
total_calories_as_burritos:
  title: "Burrito Counter"
  query: SUM kilojoules * 0.239 (to kcal) / 1000 (per burrito)
  display: "You've burned the equivalent of X,XXX Mission burritos"
  note: Only works for riders with power meters (kilojoules field)

average_speed_vs_animals:
  title: varies
  query: AVG(average_speed_mph) across all rides
  comparisons:
    - < 8 mph: "Faster than a tortoise (0.2 mph). Congrats."
    - 8-12 mph: "Faster than a chicken (9 mph)"
    - 12-15 mph: "Keeping up with a house cat (12 mph)"
    - 15-18 mph: "Outrunning a squirrel (15 mph)"
    - 18-22 mph: "Faster than a grizzly bear (20 mph)"
    - > 22 mph: "Chasing a racehorse (25 mph)"
```

---

## Tier 2 Stats: Activity Data + Weather

*Requires weather_daily table populated from Open-Meteo.*
*Join activities.ride_date to weather_daily.date.*

```
miles_on_coldest_day:
  title: "Cold Blooded"
  query: JOIN activities ON weather WHERE weather is coldest day of [year/span]
  per: per_year, all_time
  display: "XX.X miles on the coldest day of [year] — [temp]°F"

miles_on_hottest_day:
  title: "Heat Stroke"
  query: same pattern, hottest day
  per: per_year, all_time

miles_on_windiest_day:
  title: "Headwind Hero"
  query: same pattern, windiest day
  per: per_year, all_time

longest_ride_on_coldest_day:
  title: "Ice King"
  query: MAX distance_mi WHERE ride_date = coldest day of [year]
  per: per_year, all_time

most_miles_in_rain:
  title: "Rain or Shine"
  query: MAX distance_mi WHERE precipitation_inches > 0.5
  display: "XX.X miles in X.X inches of rain on [date]"

most_rides_on_foggy_days:
  title: "The Fog Rider"
  query: COUNT activities WHERE weather_code IN (45, 48)
  display: "XX rides in the fog. Classic SF."

rode_on_wettest_day:
  title: "Drowned Rat"
  query: activities WHERE ride_date = MAX precipitation day of [year]
  per: per_year
```

---

## Tier 3: Curated / Interstitials

These are editorial content, not computed. Store in interstitials table.

### Club Lore Cards (full-screen between leaderboards)

```
headlands_raiders:
  title: "THE HEADLANDS RAIDERS"
  body: "6:30am. Tuesday. Thursday. No excuses. Hawk Hill in the dark."
  type: club_lore

the_peroni_sprint:
  title: "THE PERONI SPRINT"
  body: "The only race where the finish line has a pizza oven. Delfina. 18th Street. Saturday afternoons in the sun."
  type: club_lore

the_gentlemen:
  title: "THE GENTLEMEN'S RACES"
  body: "Oregon. Gravel. Tweed. 2009, 2010, 2011, 2012. The Rapha years."
  type: club_lore

saturday_morning:
  title: "SATURDAY 9AM"
  body: "The club ride. The real one. Show up or hear about it Monday."
  type: club_lore

velo_rouge:
  title: "VELO ROUGE"
  body: "The mid-ride stop on Arguello. Coffee. Regroup. Pretend you're not dying."
  type: club_lore

delfina:
  title: "DELFINA PIZZERIA"
  body: "Home of the Peroni Sprint. Post-ride HQ. If the table on 18th Street could talk."
  type: club_lore
```

---

## Parking Lot (Not Implementing Yet)

- Background segments (GG Bridge crossings, Velo Rouge pass-throughs, etc.)
- Rides ending near Delfina (coordinate proximity matching)
- Ride route matching to named loops

---

## Implementation Notes

1. All "per year" stats should compute for each year 2008-2019
2. All "all time" stats span 2008-2019
3. 5-year spans use sliding window: 2008-2012, 2009-2013, etc.
4. Greatest Hits picks the BEST/most interesting stat per user (not all of them)
5. Ticker stories use the CLUB-WIDE version (who holds the record across all members)
6. Weather stats require Session 3 (weather data seed) to be complete first
7. Holiday dates (Thanksgiving, Super Bowl) vary by year — need a lookup table
8. Calorie/burrito stats only work for riders with power meter data (kilojoules not null)
