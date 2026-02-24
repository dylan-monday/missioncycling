-- =============================================================================
-- Mission Cycling — KOMs Schema Addition
-- =============================================================================
-- Run this in Supabase SQL Editor to add KOM tracking
-- =============================================================================

-- Add kom_count column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS kom_count INTEGER DEFAULT 0;

-- Create athlete_koms table to store individual KOM/QOM records
CREATE TABLE IF NOT EXISTS athlete_koms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  strava_segment_id BIGINT NOT NULL,
  segment_name TEXT NOT NULL,
  kom_type TEXT NOT NULL CHECK (kom_type IN ('kom', 'qom')),
  time_seconds INTEGER,
  time_display TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one KOM per user per segment
  UNIQUE(user_id, strava_segment_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_athlete_koms_user_id ON athlete_koms(user_id);
CREATE INDEX IF NOT EXISTS idx_athlete_koms_segment_id ON athlete_koms(strava_segment_id);

-- Enable RLS
ALTER TABLE athlete_koms ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can read athlete_koms" ON athlete_koms
  FOR SELECT USING (true);

CREATE POLICY "Service role can insert athlete_koms" ON athlete_koms
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can update athlete_koms" ON athlete_koms
  FOR UPDATE USING (true);

CREATE POLICY "Service role can delete athlete_koms" ON athlete_koms
  FOR DELETE USING (true);
