// =============================================================================
// Mission Cycling — Weather Data Service
// =============================================================================
//
// Fetches historical daily weather for SF Bay Area from Open-Meteo.
// This is a one-time bulk fetch (2008-2022 = ~5,500 days).
// Data is cached in Supabase weather_daily table.
//
// Used for:
// - Tier 2 ticker stories (rides in extreme conditions)
// - Greatest Hits weather crossover stats
// - "Did You Know?" interstitials
//
// Open-Meteo Historical API: https://open-meteo.com/en/docs/historical-weather-api
// Free, no API key required, 80+ years of data
// =============================================================================

const OPEN_METEO_BASE = 'https://archive-api.open-meteo.com/v1/archive';

// SF Bay Area center point (covers SF, Marin, Peninsula)
const SF_LAT = 37.7749;
const SF_LON = -122.4194;

// For Alpe d'Huez / Bourg d'Oisans rides
const ALPE_LAT = 45.0908;
const ALPE_LON = 6.0389;

interface OpenMeteoResponse {
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    temperature_2m_mean: number[];
    precipitation_sum: number[];
    wind_speed_10m_max: number[];
    wind_gusts_10m_max: number[];
    weather_code: number[];
  };
}

export interface DailyWeatherRow {
  date: string;
  temperature_max_f: number;
  temperature_min_f: number;
  temperature_mean_f: number;
  precipitation_inches: number;
  wind_speed_max_mph: number;
  wind_gusts_max_mph: number;
  weather_code: number;
}

// =============================================================================
// Fetch historical weather (batch by year to stay within URL limits)
// =============================================================================

export async function fetchYearWeather(
  year: number,
  lat: number = SF_LAT,
  lon: number = SF_LON
): Promise<DailyWeatherRow[]> {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    start_date: startDate,
    end_date: endDate,
    daily: [
      'temperature_2m_max',
      'temperature_2m_min',
      'temperature_2m_mean',
      'precipitation_sum',
      'wind_speed_10m_max',
      'wind_gusts_10m_max',
      'weather_code',
    ].join(','),
    temperature_unit: 'fahrenheit',
    wind_speed_unit: 'mph',
    precipitation_unit: 'inch',
    timezone: 'America/Los_Angeles',
  });

  const url = `${OPEN_METEO_BASE}?${params}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Open-Meteo error: ${res.status} for year ${year}`);
  }

  const data: OpenMeteoResponse = await res.json();

  return data.daily.time.map((date, i) => ({
    date,
    temperature_max_f: round1(data.daily.temperature_2m_max[i]),
    temperature_min_f: round1(data.daily.temperature_2m_min[i]),
    temperature_mean_f: round1(data.daily.temperature_2m_mean[i]),
    precipitation_inches: round2(data.daily.precipitation_sum[i]),
    wind_speed_max_mph: round1(data.daily.wind_speed_10m_max[i]),
    wind_gusts_max_mph: round1(data.daily.wind_gusts_10m_max[i]),
    weather_code: data.daily.weather_code[i],
  }));
}

/**
 * Fetch all weather data for the Mission Cycling era (2008-2022).
 * ~5,500 rows total. Takes about 15 API calls (one per year).
 * Run this once and cache in Supabase.
 */
export async function fetchAllWeather(): Promise<DailyWeatherRow[]> {
  const allRows: DailyWeatherRow[] = [];

  for (let year = 2008; year <= 2022; year++) {
    console.log(`Fetching weather for ${year}...`);
    const rows = await fetchYearWeather(year);
    allRows.push(...rows);

    // Be polite to the free API
    await sleep(500);
  }

  console.log(`Fetched ${allRows.length} days of weather data.`);
  return allRows;
}

// =============================================================================
// Weather Superlatives (for ticker stories and interstitials)
// =============================================================================

export interface WeatherSuperlatives {
  coldestDay: DailyWeatherRow;
  hottestDay: DailyWeatherRow;
  wettestDay: DailyWeatherRow;
  windiestDay: DailyWeatherRow;
  longestDryStreak: { start: string; end: string; days: number };
  longestWetStreak: { start: string; end: string; days: number };
}

export function computeWeatherSuperlatives(weather: DailyWeatherRow[]): WeatherSuperlatives {
  let coldest = weather[0];
  let hottest = weather[0];
  let wettest = weather[0];
  let windiest = weather[0];

  for (const day of weather) {
    if (day.temperature_min_f < coldest.temperature_min_f) coldest = day;
    if (day.temperature_max_f > hottest.temperature_max_f) hottest = day;
    if (day.precipitation_inches > wettest.precipitation_inches) wettest = day;
    if (day.wind_gusts_max_mph > windiest.wind_gusts_max_mph) windiest = day;
  }

  // Dry streak
  let dryStart = weather[0].date;
  let dryCount = 0;
  let bestDryStart = dryStart;
  let bestDryCount = 0;

  for (const day of weather) {
    if (day.precipitation_inches < 0.01) {
      dryCount++;
    } else {
      if (dryCount > bestDryCount) {
        bestDryCount = dryCount;
        bestDryStart = dryStart;
      }
      dryCount = 0;
      dryStart = day.date;
    }
  }

  // Wet streak
  let wetStart = weather[0].date;
  let wetCount = 0;
  let bestWetStart = wetStart;
  let bestWetCount = 0;

  for (const day of weather) {
    if (day.precipitation_inches > 0.01) {
      wetCount++;
    } else {
      if (wetCount > bestWetCount) {
        bestWetCount = wetCount;
        bestWetStart = wetStart;
      }
      wetCount = 0;
      wetStart = day.date;
    }
  }

  return {
    coldestDay: coldest,
    hottestDay: hottest,
    wettestDay: wettest,
    windiestDay: windiest,
    longestDryStreak: {
      start: bestDryStart,
      end: addDays(bestDryStart, bestDryCount),
      days: bestDryCount,
    },
    longestWetStreak: {
      start: bestWetStart,
      end: addDays(bestWetStart, bestWetCount),
      days: bestWetCount,
    },
  };
}

// =============================================================================
// WMO Weather Codes → Human readable
// =============================================================================

export function weatherCodeToDescription(code: number): string {
  const descriptions: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
  };
  return descriptions[code] || 'Unknown';
}

// =============================================================================
// Helpers
// =============================================================================

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}
