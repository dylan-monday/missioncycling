-- =============================================================================
-- Mission Cycling — Weather Data Schema
-- =============================================================================
-- Run this in Supabase SQL Editor to add weather tracking
-- Then hit /api/weather/seed to populate 2008-2022 data
-- =============================================================================

-- Create weather_daily table for historical SF weather
CREATE TABLE IF NOT EXISTS weather_daily (
  date DATE PRIMARY KEY,
  temperature_max_f REAL,
  temperature_min_f REAL,
  temperature_mean_f REAL,
  precipitation_inches REAL,
  wind_speed_max_mph REAL,
  wind_gusts_max_mph REAL,
  weather_code INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_weather_daily_date ON weather_daily(date);

-- Index for finding extreme weather days
CREATE INDEX IF NOT EXISTS idx_weather_precipitation ON weather_daily(precipitation_inches DESC);
CREATE INDEX IF NOT EXISTS idx_weather_temp_min ON weather_daily(temperature_min_f ASC);
CREATE INDEX IF NOT EXISTS idx_weather_wind ON weather_daily(wind_gusts_max_mph DESC);

-- Enable RLS
ALTER TABLE weather_daily ENABLE ROW LEVEL SECURITY;

-- RLS policies (weather is public data)
CREATE POLICY "Anyone can read weather_daily" ON weather_daily
  FOR SELECT USING (true);

CREATE POLICY "Service role can insert weather_daily" ON weather_daily
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can update weather_daily" ON weather_daily
  FOR UPDATE USING (true);
