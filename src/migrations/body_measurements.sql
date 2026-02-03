-- Body Measurements table for body composition tracking
-- Run this migration in Supabase SQL Editor

CREATE TABLE body_measurements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  measured_at DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kgs DECIMAL(5,1),
  body_fat_pct DECIMAL(4,1),
  chest_in DECIMAL(4,1),
  waist_in DECIMAL(4,1),
  hips_in DECIMAL(4,1),
  left_arm_in DECIMAL(4,1),
  right_arm_in DECIMAL(4,1),
  left_thigh_in DECIMAL(4,1),
  right_thigh_in DECIMAL(4,1),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own measurements"
  ON body_measurements FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Coaches can view athlete measurements"
  ON body_measurements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles coach, profiles athlete
      WHERE coach.id = auth.uid() AND coach.role = 'coach'
      AND athlete.id = body_measurements.user_id AND athlete.role = 'athlete'
    )
  );

-- Migration: Rename weight_lbs to weight_kgs
-- Run this if the table was already created with the weight_lbs column
ALTER TABLE body_measurements RENAME COLUMN weight_lbs TO weight_kgs;
